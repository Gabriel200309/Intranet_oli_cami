// supabase/functions/analisar-erro-ia/index.ts
//
// Edge Function (Deno) chamada pelo front-end sempre que um relato é
// registrado em "Reportar Erro". Roda no servidor do Supabase — a
// ANTHROPIC_API_KEY fica em "Project Settings > Edge Functions > Secrets"
// e NUNCA é enviada ao navegador.
//
// Arquitetura modular (igual ao backend Node original): a lógica de
// montagem do prompt e a chamada ao provedor de IA ficam isoladas em
// funções próprias, para que trocar o Claude por outro modelo no futuro
// não exija reescrever o resto da function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // ignora RLS — só usada aqui, no servidor
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const AI_MODEL = Deno.env.get("AI_MODEL") || "claude-sonnet-5";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // em produção, troque pelo domínio real do portal
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function montarPrompt(payload: any) {
  const {
    nomeUsuario, setor, sistemaModulo, titulo, descricao, dataHora, urlPagina,
    consoleLogs = [], jsErrors = [], stackTrace, requestInfo, anexos = [],
  } = payload;

  const linhas = [
    `Nome do usuário: ${nomeUsuario || "não informado"}`,
    `Setor: ${setor || "não informado"}`,
    `Sistema/Módulo: ${sistemaModulo || "não informado"}`,
    `Título do erro: ${titulo}`,
    `Descrição detalhada: ${descricao}`,
    `Data e horário: ${dataHora}`,
    `URL da página: ${urlPagina || "não informado"}`,
    `Anexos enviados: ${anexos.length ? anexos.map((a: any) => `${a.nome} (${a.tipo})`).join(", ") : "nenhum"}`,
    "",
    "Logs do console do navegador (mais recentes primeiro):",
    consoleLogs.length ? consoleLogs.slice(0, 30).map((l: string) => `- ${l}`).join("\n") : "(nenhum log capturado)",
    "",
    "Erros de JavaScript capturados na página:",
    jsErrors.length
      ? jsErrors.map((e: any) => `- ${e.mensagem}${e.stack ? `\n  Stack: ${e.stack}` : ""}`).join("\n")
      : "(nenhum erro de JS capturado automaticamente)",
    "",
    `Stack trace informado manualmente: ${stackTrace || "(nenhum)"}`,
    "",
    `Informações da requisição (quando aplicável): ${requestInfo ? JSON.stringify(requestInfo) : "(não aplicável a este relato)"}`,
  ];

  const system = `Você é um engenheiro de software sênior responsável pela manutenção de um portal corporativo interno.
Responda SEMPRE e SOMENTE com um objeto JSON válido, sem markdown, sem crases, sem texto antes ou depois, seguindo exatamente este formato:
{
  "diagnostico": string,
  "causaProvavel": string,
  "solucaoSugerida": string,
  "arquivosAfetados": string[],
  "codigoProposto": string | null,
  "grauConfianca": number,
  "relatorioTecnico": string
}
Se as evidências não permitirem gerar código de correção com segurança, retorne "codigoProposto": null.
Nunca invente nomes de arquivo sem evidência. Seja honesto sobre incerteza — reflita isso em um "grauConfianca" baixo quando a causa não estiver clara.`;

  return { system, user: `Analise o seguinte relato de erro:\n\n${linhas.join("\n")}` };
}

async function analisarComAnthropic(payload: any) {
  if (!ANTHROPIC_API_KEY) {
    return {
      provider: "mock",
      modelo: "mock-demo-v1",
      diagnostico: `[MODO DEMONSTRAÇÃO — sem ANTHROPIC_API_KEY configurada nos secrets do projeto] Relato: "${payload.titulo}".`,
      causaProvavel: "Configure o secret ANTHROPIC_API_KEY no projeto Supabase para obter uma análise real.",
      solucaoSugerida: "supabase secrets set ANTHROPIC_API_KEY=sk-ant-...",
      arquivosAfetados: [],
      codigoProposto: null,
      grauConfianca: 0,
      relatorioTecnico: `Payload recebido:\n${JSON.stringify(payload, null, 2)}`,
    };
  }

  const { system, user } = montarPrompt(payload);
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 2048,
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!resp.ok) {
    throw new Error(`Anthropic API respondeu ${resp.status}: ${await resp.text()}`);
  }
  const data = await resp.json();
  const texto = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");

  let json;
  try {
    const limpo = texto.trim().replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
    json = JSON.parse(limpo);
  } catch (_e) {
    json = {
      diagnostico: "Não foi possível interpretar a resposta da IA como JSON estruturado.",
      causaProvavel: "Resposta do modelo fora do formato esperado.",
      solucaoSugerida: "Revise manualmente o relatório técnico bruto abaixo.",
      arquivosAfetados: [],
      codigoProposto: null,
      grauConfianca: 0,
      relatorioTecnico: texto,
    };
  }

  return {
    provider: "anthropic",
    modelo: AI_MODEL,
    diagnostico: json.diagnostico || "",
    causaProvavel: json.causaProvavel || "",
    solucaoSugerida: json.solucaoSugerida || "",
    arquivosAfetados: Array.isArray(json.arquivosAfetados) ? json.arquivosAfetados : [],
    codigoProposto: json.codigoProposto || null,
    grauConfianca: typeof json.grauConfianca === "number" ? json.grauConfianca : null,
    relatorioTecnico: json.relatorioTecnico || texto,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ erro: "Não autenticado." }), { status: 401, headers: CORS_HEADERS });
    }

    // Cliente "no contexto do usuário" (respeita RLS) só para confirmar quem
    // é o autor do relato — nunca confie em campos enviados pelo body para isso.
    const supabaseAsUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabaseAsUser.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ erro: "Sessão inválida." }), { status: 401, headers: CORS_HEADERS });
    }
    const funcionarioId = userData.user.id;

    const body = await req.json();
    if (!body.titulo || !body.descricao) {
      return new Response(JSON.stringify({ erro: "Título e descrição são obrigatórios." }), { status: 400, headers: CORS_HEADERS });
    }

    // Cliente com service_role: ignora RLS, só é usado aqui no servidor.
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: relato, error: erroInsert } = await supabaseAdmin
      .from("bug_reports")
      .insert({
        funcionario_id: funcionarioId,
        nome_usuario: body.nomeUsuario,
        setor: body.setor,
        sistema_modulo: body.sistemaModulo,
        titulo: body.titulo,
        descricao: body.descricao,
        prioridade: body.prioridade,
        data_hora: body.dataHora || new Date().toISOString(),
        url_pagina: body.urlPagina,
        console_logs: body.consoleLogs || [],
        js_errors: body.jsErrors || [],
        stack_trace: body.stackTrace || null,
        request_info: body.requestInfo || null,
        anexos: (body.anexos || []).map((a: any) => ({ nome: a.nome, tipo: a.tipo, tamanhoBytes: a.tamanhoBytes })),
        status: "pendente",
      })
      .select()
      .single();
    if (erroInsert) throw erroInsert;

    try {
      const resultado = await analisarComAnthropic({ ...body, nomeUsuario: body.nomeUsuario });
      await supabaseAdmin.from("analises_ia").insert({
        relato_id: relato.id,
        provider: resultado.provider,
        modelo: resultado.modelo,
        diagnostico: resultado.diagnostico,
        causa_provavel: resultado.causaProvavel,
        solucao_sugerida: resultado.solucaoSugerida,
        arquivos_afetados: resultado.arquivosAfetados,
        codigo_proposto: resultado.codigoProposto,
        grau_confianca: resultado.grauConfianca,
        relatorio_tecnico: resultado.relatorioTecnico,
      });
      await supabaseAdmin.from("bug_reports").update({ status: "analisado" }).eq("id", relato.id);

      return new Response(JSON.stringify({
        relatoId: relato.id,
        status: "analisado",
        // Resumo público: nunca inclui arquivos afetados, código ou stack —
        // isso só é liberado para admins, via SELECT direto em analises_ia (RLS).
        resumo: { diagnostico: resultado.diagnostico, grauConfianca: resultado.grauConfianca },
      }), { headers: { ...CORS_HEADERS, "content-type": "application/json" } });
    } catch (erroAnalise) {
      await supabaseAdmin.from("bug_reports").update({ status: "erro_analise" }).eq("id", relato.id);
      return new Response(JSON.stringify({
        relatoId: relato.id,
        status: "erro_analise",
        aviso: "O relato foi salvo, mas a análise automática pela IA falhou.",
      }), { status: 201, headers: { ...CORS_HEADERS, "content-type": "application/json" } });
    }
  } catch (err) {
    return new Response(JSON.stringify({ erro: String(err) }), { status: 500, headers: CORS_HEADERS });
  }
});
