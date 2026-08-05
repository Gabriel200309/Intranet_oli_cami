// supabase/functions/criar-funcionario/index.ts
//
// Edge Function (Deno) chamada pela tela Administração → Funcionários ao
// cadastrar um colaborador novo. Faz, numa única chamada, o que antes
// exigia um passo manual no painel do Supabase:
//   1. Cria o usuário no Supabase Auth (Authentication → Users).
//   2. Cria a linha correspondente em `funcionarios`, já vinculada pelo
//      mesmo id (funcionarios.id = auth.users.id).
//
// Só administradores podem chamar esta função — verificado aqui no
// servidor (não confie em nada que o navegador diga sobre quem está
// logado). Usa a chave service_role, que nunca pode existir no
// navegador, por isso a criação de usuário só pode acontecer aqui.
//
// A senha é definida pelo administrador no próprio formulário de
// cadastro e repassada ao colaborador por fora do sistema — a pessoa já
// entra com e-mail + essa senha. Quem quiser trocar depois usa o
// "Esqueci minha senha" (código por e-mail) normalmente.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // em produção, troque pelo domínio real do portal
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function responder(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CORS_HEADERS, "content-type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return responder({ erro: "Não autenticado." }, 401);

    // Cliente "no contexto de quem chamou" (respeita RLS) — só para
    // confirmar que quem está pedindo isso é, de fato, um administrador.
    const supabaseAsUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabaseAsUser.auth.getUser();
    if (userErr || !userData?.user) return responder({ erro: "Sessão inválida." }, 401);

    const { data: chamador, error: chamadorErr } = await supabaseAsUser
      .from("funcionarios").select("nivel").eq("id", userData.user.id).single();
    if (chamadorErr || !chamador || chamador.nivel !== "Administrador") {
      return responder({ erro: "Apenas administradores podem cadastrar novos funcionários." }, 403);
    }

    const body = await req.json();
    const { nome, numero, setor, cargo, nivel, nascimento, telefone, email, fotoUrl, senha } = body;
    if (!nome || !setor || !cargo || !nivel || !email) {
      return responder({ erro: "Nome, setor, cargo, nível e e-mail são obrigatórios." }, 400);
    }
    if (!senha || String(senha).length < 6) {
      return responder({ erro: "A senha precisa ter pelo menos 6 caracteres." }, 400);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: novoUsuario, error: erroCriarUsuario } = await supabaseAdmin.auth.admin.createUser({
      email, password: senha, email_confirm: true,
    });
    if (erroCriarUsuario || !novoUsuario?.user) {
      const msg = erroCriarUsuario?.message || "Falha ao criar o usuário.";
      const jaExiste = /already been registered|already exists/i.test(msg);
      return responder({ erro: jaExiste ? "Já existe uma conta com esse e-mail." : msg }, 400);
    }

    const { data: funcionario, error: erroFuncionario } = await supabaseAdmin
      .from("funcionarios")
      .insert({
        id: novoUsuario.user.id, nome, numero: numero || null, setor, cargo, nivel,
        nascimento: nascimento || null, telefone: telefone || null, email, foto_url: fotoUrl || null,
      })
      .select().single();

    if (erroFuncionario) {
      // Não deixa um usuário de Auth "fantasma" (sem funcionário vinculado) para trás.
      await supabaseAdmin.auth.admin.deleteUser(novoUsuario.user.id);
      return responder({ erro: "Falha ao salvar o cadastro: " + erroFuncionario.message }, 400);
    }

    return responder({ funcionario });
  } catch (err) {
    return responder({ erro: String(err) }, 500);
  }
});
