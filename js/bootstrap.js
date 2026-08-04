/* Se já existir uma sessão válida do Supabase (login anterior, sem ter
   clicado em Sair), entra automaticamente em vez de mostrar a tela de
   login de novo — evita ter que logar toda hora que a página recarrega. */
async function restaurarSessaoSupabase() {
  if (!supabaseClient) return;
  const { data } = await supabaseClient.auth.getSession();
  const usuario = data && data.session && data.session.user;
  if (!usuario) return;
  const emp = await buscarFuncionarioAutenticado(usuario.id);
  if (emp) await completeLogin(emp);
}
restaurarSessaoSupabase();
