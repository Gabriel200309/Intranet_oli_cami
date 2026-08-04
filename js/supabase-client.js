/* ================= CAPTURA AUTOMÁTICA DE DIAGNÓSTICO =================
   Instalado uma única vez, no carregamento da página: intercepta os
   métodos de console e os eventos globais de erro para manter um buffer
   recente. É esse buffer que alimenta a análise da IA quando o
   colaborador usa "Reportar Erro" — sem precisar que ele descreva
   manualmente o erro técnico. */
/* ================= CONEXÃO COM O SUPABASE =================
   Lê a URL e a anon key de window.SUPABASE_URL / window.SUPABASE_ANON_KEY,
   definidas no arquivo separado "supabase-config.js" (editável no Bloco de
   Notas — veja instruções nesse arquivo). Nada de sensível fica aqui: a
   anon key é pública por design, a segurança real vem do RLS configurado
   no banco (ver supabase-project/supabase/migrations). */
let supabaseClient = null;
state.supabaseStatus = 'nao_configurado'; // nao_configurado | configurado | conectado | erro
state.supabaseErro = null;

function chavesSupabasePreenchidas() {
  const url = window.SUPABASE_URL, key = window.SUPABASE_ANON_KEY;
  return !!(url && key && !url.includes('COLE_AQUI') && !key.includes('COLE_AQUI'));
}
function inicializarSupabase() {
  if (!chavesSupabasePreenchidas()) {
    state.supabaseStatus = 'nao_configurado';
    return;
  }
  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    state.supabaseStatus = 'erro';
    state.supabaseErro = 'A biblioteca do Supabase não carregou (verifique sua conexão com a internet e recarregue a página).';
    return;
  }
  try {
    supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    state.supabaseStatus = 'configurado';
  } catch (e) {
    state.supabaseStatus = 'erro';
    state.supabaseErro = e.message;
  }
}
inicializarSupabase();

/* Faz uma consulta real e simples (tabela "modulos", que qualquer usuário
   autenticado pode ler) só para confirmar que a URL/chave realmente
   conectam a um projeto Supabase existente com o schema já aplicado. */
async function testarConexaoSupabase() {
  if (!chavesSupabasePreenchidas()) {
    state.supabaseStatus = 'nao_configurado';
    state.supabaseErro = 'Configure a URL e a anon key em supabase-config.js.';
    return;
  }
  if (!supabaseClient) inicializarSupabase();
  if (!supabaseClient) return;
  state.supabaseStatus = 'conectando';
  renderConexaoSupabaseConteudo();
  try {
    const { error } = await supabaseClient.from('modulos').select('id', { count: 'exact', head: true });
    if (error) throw error;
    state.supabaseStatus = 'conectado';
    state.supabaseErro = null;
    showToast('Conectado ao Supabase com sucesso!');
  } catch (e) {
    state.supabaseStatus = 'erro';
    state.supabaseErro = e.message || 'Falha desconhecida ao conectar.';
  }
  renderConexaoSupabaseConteudo();
}

(function instalarCapturaDeDiagnostico() {
  const MAX_LOGS = 50, MAX_ERROS = 20;
  ["log", "warn", "error", "info"].forEach(nivel => {
    const original = console[nivel] ? console[nivel].bind(console) : function(){};
    console[nivel] = function(...args) {
      try {
        const texto = args.map(a => {
          if (typeof a === "string") return a;
          try { return JSON.stringify(a); } catch (e) { return String(a); }
        }).join(" ");
        state.consoleLogBuffer.push(`[${nivel}] ${new Date().toLocaleTimeString("pt-BR")} ${texto}`);
        if (state.consoleLogBuffer.length > MAX_LOGS) state.consoleLogBuffer.shift();
      } catch (e) { /* nunca deixar a captura quebrar o app */ }
      original(...args);
    };
  });
  window.addEventListener("error", (ev) => {
    state.jsErrorBuffer.push({
      mensagem: ev.message || "Erro desconhecido",
      stack: (ev.error && ev.error.stack) ? ev.error.stack : `${ev.filename || ""}:${ev.lineno || ""}:${ev.colno || ""}`,
    });
    if (state.jsErrorBuffer.length > MAX_ERROS) state.jsErrorBuffer.shift();
  });
  window.addEventListener("unhandledrejection", (ev) => {
    const motivo = ev.reason;
    state.jsErrorBuffer.push({
      mensagem: "Promise rejeitada: " + (motivo && motivo.message ? motivo.message : String(motivo)),
      stack: (motivo && motivo.stack) ? motivo.stack : "",
    });
    if (state.jsErrorBuffer.length > MAX_ERROS) state.jsErrorBuffer.shift();
  });
})();
