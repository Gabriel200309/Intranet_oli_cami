/* ================= SISTEMA DE FELICITAÇÕES DE ANIVERSÁRIO =================
   Reaproveita e expande o sistema de notificações já existente (sino no
   cabeçalho): antes ele só mostrava uma lista estática de avisos; agora
   também guarda notificações reais, por destinatário, com remetente,
   data/hora, status de lida e link para o perfil de quem enviou. */
function tempoRelativo(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d===1?'':'s'}`;
}
function funcionarioPorId(id) { return state.employees.find(e => e.id === id); }
function jaEnviouParabens(aniversarianteId) {
  const emp = getEffectiveEmployee();
  if (!emp) return false;
  return state.parabens.some(p => p.remetenteId === emp.id && p.aniversarianteId === aniversarianteId);
}
function enviarParabens(aniversarianteId) {
  const emp = getEffectiveEmployee();
  if (!emp) { showToast('Faça login para enviar parabéns.'); return; }
  if (!aniversarianteId) { showToast('Este aniversariante não está vinculado a um funcionário cadastrado.'); return; }
  if (aniversarianteId === emp.id) { showToast('Você não pode enviar parabéns para si mesmo.'); return; }
  if (jaEnviouParabens(aniversarianteId)) { showToast('Você já enviou parabéns para essa pessoa.'); return; }
  const agora = new Date().toISOString();
  state.parabens.push({ id: uid('pb'), aniversarianteId, remetenteId: emp.id, data: agora });
  state.notificacoes.push({ id: uid('ntf'), destinatarioId: aniversarianteId, remetenteId: emp.id, tipo: 'parabens', data: agora, lida: false });
  const destinatario = funcionarioPorId(aniversarianteId);
  showToast(`🎉 Parabéns enviados para ${destinatario ? destinatario.nome.split(' ')[0] : 'colaborador'}!`);
  renderAniversariantes();
  renderHeader();
  if (state.currentView === 'notificacoes') renderNotificacoesView();
}
function notificacoesDoUsuario() {
  const emp = getEffectiveEmployee();
  if (!emp) return [];
  return state.notificacoes.filter(n => n.destinatarioId === emp.id).sort((a,b) => new Date(b.data) - new Date(a.data));
}
function notificacoesNaoLidasCount() { return notificacoesDoUsuario().filter(n => !n.lida).length; }
function marcarNotificacaoLida(id) {
  const n = state.notificacoes.find(x => x.id === id);
  if (n) n.lida = true;
  renderHeader();
  if (state.currentView === 'notificacoes') renderNotificacoesView();
}
function marcarTodasNotificacoesLidas() {
  notificacoesDoUsuario().forEach(n => n.lida = true);
  renderHeader();
  if (state.notifOpen) renderNotifDropdown();
  if (state.currentView === 'notificacoes') renderNotificacoesView();
}
function textoNotificacao(n) {
  const remetente = funcionarioPorId(n.remetenteId);
  const nomeRem = remetente ? remetente.nome.split(' ')[0] : 'Alguém';
  if (n.tipo === 'parabens') return `🎉 ${nomeRem} desejou feliz aniversário para você!`;
  return n.texto || 'Nova notificação';
}
function abrirPerfilFuncionario(id) {
  const f = funcionarioPorId(id);
  if (!f) { showToast('Perfil não encontrado.'); return; }
  state.modal = { kind: 'perfil', ...f };
  renderModal();
}

function setViewingAs(id) {
  if (!isAdmin()) { showToast('Apenas administradores podem simular a visão de outro colaborador.'); return; }
  state.viewingAsId = id || null;
  renderHeader();
  renderContentView();
}


