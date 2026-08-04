// ============================================================================
// CONFIGURAÇÃO DO SUPABASE — Portal Oliveira & Camilo
// ============================================================================
//
// COMO USAR:
//   1. Copie este arquivo e renomeie a cópia para "supabase-config.js"
//      (na MESMA PASTA deste index.html). Esse arquivo é ignorado pelo
//      Git (veja .gitignore) — cada máquina/ambiente mantém o seu.
//   2. Abra o "supabase-config.js" no Bloco de Notas (ou qualquer editor).
//   3. No painel do seu projeto Supabase, vá em:
//        Project Settings (ícone de engrenagem)  →  API
//   4. Copie o campo "Project URL" e cole no lugar de COLE_AQUI_A_URL.
//   5. Copie o campo "anon public" (a chave pública, NÃO a "service_role")
//      e cole no lugar de COLE_AQUI_A_ANON_KEY.
//   6. Salve o arquivo (Ctrl+S) e recarregue a página no navegador.
//
// IMPORTANTE:
//   - Use só a chave "anon public". Ela é pública por design — a segurança
//     real vem das políticas de RLS configuradas no banco (veja
//     supabase/migrations/0007_rls_policies.sql), não do segredo desta chave.
//   - NUNCA cole aqui a chave "service_role" — essa dá acesso total ao
//     banco, ignorando toda a segurança, e não pode aparecer no navegador
//     de jeito nenhum.
//   - Sem este arquivo preenchido, o portal funciona normalmente com dados
//     de exemplo locais (modo "não configurado"), só sem persistir nada.
//
// ============================================================================

window.SUPABASE_URL = "COLE_AQUI_A_URL";
window.SUPABASE_ANON_KEY = "COLE_AQUI_A_ANON_KEY";
