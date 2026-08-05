// supabase/functions/alterar-senha-funcionario/index.ts
//
// Edge Function (Deno) chamada pela tela Administração → Funcionários ao
// editar um colaborador existente, quando o admin preenche o campo
// "Nova senha". Ninguém — nem o administrador — consegue ver a senha
// atual de alguém (ela fica só como um hash no banco, é assim que
// autenticação segura funciona em qualquer sistema sério); o que dá para
// fazer é definir uma senha NOVA para a pessoa, o que resolve o caso de
// "esqueci/preciso trocar a senha do colaborador".
//
// Só administradores podem chamar esta função — verificado aqui no
// servidor. Usa a chave service_role, que nunca pode existir no
// navegador, por isso a troca de senha só pode acontecer aqui.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
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

    const supabaseAsUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabaseAsUser.auth.getUser();
    if (userErr || !userData?.user) return responder({ erro: "Sessão inválida." }, 401);

    const { data: chamador, error: chamadorErr } = await supabaseAsUser
      .from("funcionarios").select("nivel").eq("id", userData.user.id).single();
    if (chamadorErr || !chamador || chamador.nivel !== "Administrador") {
      return responder({ erro: "Apenas administradores podem alterar a senha de um colaborador." }, 403);
    }

    const body = await req.json();
    const { funcionarioId, novaSenha } = body;
    if (!funcionarioId || !novaSenha || String(novaSenha).length < 6) {
      return responder({ erro: "Informe o funcionário e uma senha com pelo menos 6 caracteres." }, 400);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error: erroAlterar } = await supabaseAdmin.auth.admin.updateUserById(funcionarioId, { password: novaSenha });
    if (erroAlterar) return responder({ erro: erroAlterar.message }, 400);

    return responder({ ok: true });
  } catch (err) {
    return responder({ erro: String(err) }, 500);
  }
});
