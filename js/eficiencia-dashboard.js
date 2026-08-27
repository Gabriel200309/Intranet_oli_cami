/* ================= PAINEL DE EFICIÊNCIA, QUALIDADE E ALERTAS =================
   Painel de acompanhamento gerencial pedido pela direção: reúne (1) os
   alertas/reincidências já registrados em "Sinalizações de Colaboradores",
   (2) indicadores numéricos de eficiência operacional (incluindo o registro
   manual de atendimentos — início e primeira resposta — que alimenta
   "Tempo de primeira resposta" e "Chats aguardando"), (3) avaliações de
   Qualidade e Encantamento (nota 0 a 10 por critério) e (4) o registro de
   atendimentos de referência.

   Não duplica nenhum cadastro: colaboradores/setores continuam vindo de
   state.employees/state.setores, e "alertas" é a própria tabela de
   sinalizações (ampliada com tipo_erro/prazo/resolvido_em — ver migração
   0016). Os três conceitos que não existiam no sistema (avaliação de
   qualidade, atendimento de referência e registro de atendimento/chat —
   ver migração 0017) ganharam tabela nova.

   Visível apenas para quem já tem hoje um papel de gestão: administrador,
   quem tem a permissão "ver sinalizações de todas" (RH/Diretoria por
   padrão) ou gestor de algum setor — nenhuma permissão nova foi criada. */

const CRITERIOS_QUALIDADE = [
  { key: 'clarezaComunicacao', campo: 'clareza_comunicacao', label: 'Clareza da comunicação' },
  { key: 'cordialidade', campo: 'cordialidade', label: 'Cordialidade' },
  { key: 'personalizacao', campo: 'personalizacao', label: 'Personalização' },
  { key: 'proatividade', campo: 'proatividade', label: 'Proatividade' },
  { key: 'cumprimentoPromessas', campo: 'cumprimento_promessas', label: 'Cumprimento das promessas feitas ao cliente' },
  { key: 'qualidadeSolucao', campo: 'qualidade_solucao', label: 'Qualidade da solução apresentada' },
  { key: 'segurancaCuidado', campo: 'seguranca_cuidado', label: 'Capacidade de transmitir segurança e cuidado' },
  { key: 'reclamacoes', campo: 'reclamacoes', label: 'Ocorrência de reclamações (10 = nenhuma)' },
];

function souGestorDeAlgumSetor() {
  const emp = getEffectiveEmployee();
  if (!emp) return false;
  return Object.values(state.gestoresSetor || {}).some(lista => (lista || []).includes(emp.id));
}
function podeVerPainelEficiencia() {
  return isAdmin() || hasPermission('verSinalizacoesTodas') || souGestorDeAlgumSetor();
}

/* Na primeira vez que a tela é aberta, o período default é "mês atual",
   igual ao exemplo do escopo. Depois disso, respeita o que a pessoa
   escolher (inclusive limpar o filtro). */
function garantirFiltroEficienciaPadrao() {
  const f = state.filtroEficiencia;
  if (f.periodoInicio === null && f.periodoFim === null && !f._tocado) {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    f.periodoInicio = inicio.toISOString().slice(0, 10);
    f.periodoFim = hoje.toISOString().slice(0, 10);
  }
}
function setFiltroEficiencia(campo, valor) {
  state.filtroEficiencia[campo] = valor;
  state.filtroEficiencia._tocado = true;
  renderEficienciaView();
}
function limparFiltroEficiencia() {
  state.filtroEficiencia = { periodoInicio: null, periodoFim: null, setor: '', colaboradorId: '', tipoErro: '', status: '', _tocado: true };
  renderEficienciaView();
}

function eficienciaDataDentroPeriodo(isoDataOuNull) {
  const f = state.filtroEficiencia;
  if (!isoDataOuNull) return true; // registro sem data (ex.: dado de exemplo local) não é excluído por período
  const dia = String(isoDataOuNull).slice(0, 10);
  if (f.periodoInicio && dia < f.periodoInicio) return false;
  if (f.periodoFim && dia > f.periodoFim) return false;
  return true;
}
function sinalizacoesFiltradasEficiencia() {
  const f = state.filtroEficiencia;
  return state.sinalizacoes.filter(s =>
    eficienciaDataDentroPeriodo(s.criadoEm) &&
    (!f.setor || s.setor === f.setor) &&
    (!f.colaboradorId || s.colaboradorId === f.colaboradorId) &&
    (!f.tipoErro || s.tipoErro === f.tipoErro) &&
    (!f.status || s.status === f.status)
  );
}
function avaliacoesQualidadeFiltradas() {
  const f = state.filtroEficiencia;
  return state.avaliacoesQualidade.filter(a =>
    eficienciaDataDentroPeriodo(a.data) &&
    (!f.setor || a.setor === f.setor) &&
    (!f.colaboradorId || a.colaboradorId === f.colaboradorId)
  );
}
function atendimentosReferenciaFiltrados() {
  const f = state.filtroEficiencia;
  return state.atendimentosReferencia.filter(r =>
    eficienciaDataDentroPeriodo(r.data) &&
    (!f.setor || r.setor === f.setor) &&
    (!f.colaboradorId || r.colaboradorId === f.colaboradorId)
  );
}
function atendimentosChatFiltrados() {
  const f = state.filtroEficiencia;
  return state.atendimentosChat.filter(a =>
    eficienciaDataDentroPeriodo(a.iniciadoEm) &&
    (!f.setor || a.setor === f.setor) &&
    (!f.colaboradorId || a.colaboradorId === f.colaboradorId)
  );
}
/* Tempo médio de primeira resposta, em minutos, só entre atendimentos que já
   têm a primeira resposta registrada. null = nenhum atendimento com esse
   dado no período/filtro selecionado ("Sem dados suficientes"). */
function calcTempoPrimeiraRespostaMin(lista) {
  const comResposta = lista.filter(a => a.primeiraRespostaEm && a.iniciadoEm);
  if (!comResposta.length) return null;
  const totalMin = comResposta.reduce((acc, a) => acc + (new Date(a.primeiraRespostaEm) - new Date(a.iniciadoEm)) / 60000, 0);
  return Math.round(totalMin / comResposta.length);
}
function formatarDuracaoMin(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  if (h < 24) return `${h}h${m ? ' ' + m + 'min' : ''}`;
  const d = Math.floor(h / 24), hr = h % 24;
  return `${d}d${hr ? ' ' + hr + 'h' : ''}`;
}

function calcIndicadoresAlertas() {
  const alertas = sinalizacoesFiltradasEficiencia();

  const porEquipeMap = {};
  alertas.forEach(s => { porEquipeMap[s.setor] = (porEquipeMap[s.setor] || 0) + 1; });
  const setoresConhecidos = new Set(state.setores);
  const porEquipe = state.setores.map(s => ({ setor: s, total: porEquipeMap[s] || 0 }))
    .concat(Object.keys(porEquipeMap).filter(s => !setoresConhecidos.has(s)).map(s => ({ setor: s, total: porEquipeMap[s] })))
    .sort((a, b) => b.total - a.total);

  const comPrazo = alertas.filter(s => s.prazo);
  const dentroPrazo = comPrazo.filter(s => s.resolvidoEm && String(s.resolvidoEm).slice(0, 10) <= s.prazo);

  const porColaboradorMap = {};
  alertas.forEach(s => {
    const chave = s.colaboradorId || ('nome:' + (s.colaborador || '—'));
    if (!porColaboradorMap[chave]) porColaboradorMap[chave] = { nome: s.colaborador || 'Colaborador removido', total: 0 };
    porColaboradorMap[chave].total++;
  });
  const reincidencias = Object.values(porColaboradorMap).filter(c => c.total >= 2).sort((a, b) => b.total - a.total).slice(0, 8);

  const porTipoMap = {};
  alertas.forEach(s => { if (s.tipoErro) porTipoMap[s.tipoErro] = (porTipoMap[s.tipoErro] || 0) + 1; });
  const tiposFrequentes = Object.entries(porTipoMap).map(([tipo, total]) => ({ tipo, total })).sort((a, b) => b.total - a.total);

  const recorrenciaErros = alertas.filter(s => s.tipoErro && porTipoMap[s.tipoErro] >= 2).length;

  return {
    alertas, porEquipe, totalAlertas: alertas.length,
    dentroPrazoQtd: dentroPrazo.length, comPrazoQtd: comPrazo.length,
    reincidencias, tiposFrequentes, recorrenciaErros,
    solucionados: alertas.filter(s => s.status === 'resolvida').length,
    pendentes: alertas.filter(s => s.status === 'aberta').length,
  };
}
function mediaCriterioQualidade(lista, chave) {
  if (!lista.length) return null;
  const soma = lista.reduce((acc, a) => acc + (Number(a[chave]) || 0), 0);
  return Math.round((soma / lista.length) * 10) / 10;
}

function metricCard(label, value, sub) {
  const pequeno = typeof value === 'string' && value.length > 6;
  return `
    <div class="card" style="padding:16px;">
      <div style="font-size:${pequeno ? '14px' : '22px'}; font-weight:800; ${pequeno ? 'color:var(--text-3);' : ''}">${value}</div>
      <div style="font-size:11.5px; color:var(--text-3); margin-top:2px;">${esc(label)}</div>
      ${sub ? `<div style="font-size:10.5px; color:var(--text-3); margin-top:4px;">${sub}</div>` : ''}
    </div>
  `;
}

function filtrosEficienciaBar() {
  const f = state.filtroEficiencia;
  return `
    <div class="card" style="padding:14px 16px; margin-bottom:18px;">
      <div class="form-grid" style="grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); margin-bottom:0;">
        <div class="form-field"><label>Período de</label><input type="date" value="${f.periodoInicio || ''}" onchange="setFiltroEficiencia('periodoInicio', this.value || null)"></div>
        <div class="form-field"><label>até</label><input type="date" value="${f.periodoFim || ''}" onchange="setFiltroEficiencia('periodoFim', this.value || null)"></div>
        <div class="form-field"><label>Equipe</label>
          <select onchange="setFiltroEficiencia('setor', this.value)">
            <option value="" ${!f.setor ? 'selected' : ''}>Todas</option>
            ${state.setores.map(s => `<option value="${esc(s)}" ${f.setor === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field"><label>Colaborador</label>
          <select onchange="setFiltroEficiencia('colaboradorId', this.value)">
            <option value="" ${!f.colaboradorId ? 'selected' : ''}>Todos</option>
            ${state.employees.map(e => `<option value="${e.id}" ${f.colaboradorId === e.id ? 'selected' : ''}>${esc(e.nome)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field"><label>Tipo de erro</label>
          <select onchange="setFiltroEficiencia('tipoErro', this.value)">
            <option value="" ${!f.tipoErro ? 'selected' : ''}>Todos</option>
            ${TIPOS_ERRO_SINALIZACAO.map(t => `<option value="${esc(t)}" ${f.tipoErro === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field"><label>Status</label>
          <select onchange="setFiltroEficiencia('status', this.value)">
            <option value="" ${!f.status ? 'selected' : ''}>Todos</option>
            <option value="aberta" ${f.status === 'aberta' ? 'selected' : ''}>Aberta</option>
            <option value="resolvida" ${f.status === 'resolvida' ? 'selected' : ''}>Resolvida</option>
          </select>
        </div>
      </div>
      <button class="admin-cancel-btn" style="margin-top:10px;" onclick="limparFiltroEficiencia()"><i class="fa-solid fa-filter-circle-xmark"></i> Limpar filtros</button>
    </div>
  `;
}

/* ---------------- Qualidade e Encantamento: registro de avaliação ---------------- */
function toggleNovaAvaliacaoQualidade() { state.novaAvaliacaoQualidade = !state.novaAvaliacaoQualidade; renderEficienciaView(); }
async function submitAvaliacaoQualidade() {
  if (!isAdmin()) { showToast('Só administradores podem registrar avaliações de qualidade.'); return; }
  const colaboradorId = val('aq-colaborador');
  const colaboradorEmp = state.employees.find(e => e.id === colaboradorId);
  if (!colaboradorEmp) { showToast('Selecione o colaborador avaliado.'); return; }
  const periodo = val('aq-periodo') || new Date().toISOString().slice(0, 10);
  const notas = {};
  for (const c of CRITERIOS_QUALIDADE) {
    const bruto = val('aq-' + c.key);
    const n = Number(bruto);
    if (bruto === '' || !Number.isInteger(n) || n < 0 || n > 10) {
      showToast(`Nota inválida em "${c.label}": informe um número inteiro de 0 a 10.`);
      return;
    }
    notas[c.key] = n;
  }
  const observacoes = val('aq-observacoes');
  if (!supabaseClient) {
    state.avaliacoesQualidade.unshift({
      id: uid('aq'), colaboradorId, colaborador: colaboradorEmp.nome, setor: colaboradorEmp.setor,
      periodo, ...notas, observacoes, avaliadorId: state.currentUser.id, data: new Date().toISOString(),
    });
    state.novaAvaliacaoQualidade = false;
    showToast('Avaliação de qualidade registrada!');
    renderEficienciaView();
    return;
  }
  const payload = {
    colaborador_id: colaboradorId, colaborador_nome: colaboradorEmp.nome, setor: colaboradorEmp.setor,
    periodo, observacoes, avaliador_id: state.currentUser.id,
  };
  CRITERIOS_QUALIDADE.forEach(c => { payload[c.campo] = notas[c.key]; });
  const { error } = await supabaseClient.from('avaliacoes_qualidade').insert(payload);
  if (error) { showToast('Não foi possível registrar a avaliação: ' + error.message); return; }
  state.novaAvaliacaoQualidade = false;
  showToast('Avaliação de qualidade registrada!');
  await carregarAvaliacoesQualidade();
  renderEficienciaView();
}
async function removerAvaliacaoQualidade(id) {
  if (supabaseClient) {
    const { error } = await supabaseClient.from('avaliacoes_qualidade').delete().eq('id', id);
    if (error) { showToast('Não foi possível excluir: ' + error.message); return; }
  }
  state.avaliacoesQualidade = state.avaliacoesQualidade.filter(a => a.id !== id);
  renderEficienciaView();
}

/* ---------------- Reconhecimento: atendimentos de referência ---------------- */
function toggleNovoAtendimentoReferencia() { state.novoAtendimentoReferencia = !state.novoAtendimentoReferencia; renderEficienciaView(); }
async function submitAtendimentoReferencia() {
  if (!isAdmin()) { showToast('Só administradores podem registrar atendimentos de referência.'); return; }
  const colaboradorId = val('ar-colaborador'), titulo = val('ar-titulo'), descricao = val('ar-descricao');
  const colaboradorEmp = state.employees.find(e => e.id === colaboradorId);
  if (!titulo.trim() || !colaboradorEmp) { showToast('Informe ao menos o colaborador e um título para o atendimento.'); return; }
  if (!supabaseClient) {
    state.atendimentosReferencia.unshift({
      id: uid('ar'), colaboradorId, colaborador: colaboradorEmp.nome, setor: colaboradorEmp.setor,
      titulo, descricao, registradoPorId: state.currentUser.id, data: new Date().toISOString(),
    });
    state.novoAtendimentoReferencia = false;
    showToast('Atendimento de referência registrado!');
    renderEficienciaView();
    return;
  }
  const payload = {
    colaborador_id: colaboradorId, colaborador_nome: colaboradorEmp.nome, setor: colaboradorEmp.setor,
    titulo, descricao, registrado_por: state.currentUser.id,
  };
  const { error } = await supabaseClient.from('atendimentos_referencia').insert(payload);
  if (error) { showToast('Não foi possível registrar: ' + error.message); return; }
  state.novoAtendimentoReferencia = false;
  showToast('Atendimento de referência registrado!');
  await carregarAtendimentosReferencia();
  renderEficienciaView();
}
async function removerAtendimentoReferencia(id) {
  if (supabaseClient) {
    const { error } = await supabaseClient.from('atendimentos_referencia').delete().eq('id', id);
    if (error) { showToast('Não foi possível excluir: ' + error.message); return; }
  }
  state.atendimentosReferencia = state.atendimentosReferencia.filter(r => r.id !== id);
  renderEficienciaView();
}

/* ---------------- Atendimentos (chat): início + primeira resposta ---------------- */
function toggleNovoAtendimentoChat() { state.novoAtendimentoChat = !state.novoAtendimentoChat; renderEficienciaView(); }
async function submitAtendimentoChat() {
  if (!isAdmin()) { showToast('Só administradores podem registrar atendimentos.'); return; }
  const colaboradorId = val('at-colaborador'), cliente = val('at-cliente'), inicioBruto = val('at-inicio');
  const colaboradorEmp = state.employees.find(e => e.id === colaboradorId);
  if (!colaboradorEmp) { showToast('Selecione o colaborador do atendimento.'); return; }
  const iniciadoEm = (inicioBruto ? new Date(inicioBruto) : new Date()).toISOString();
  if (!supabaseClient) {
    state.atendimentosChat.unshift({
      id: uid('at'), colaboradorId, colaborador: colaboradorEmp.nome, setor: colaboradorEmp.setor,
      cliente, status: 'aguardando', iniciadoEm, primeiraRespostaEm: null, finalizadoEm: null,
      registradoPorId: state.currentUser.id, data: new Date().toISOString(),
    });
    state.novoAtendimentoChat = false;
    showToast('Atendimento registrado!');
    renderEficienciaView();
    return;
  }
  const payload = {
    colaborador_id: colaboradorId, colaborador_nome: colaboradorEmp.nome, setor: colaboradorEmp.setor,
    cliente: cliente || null, iniciado_em: iniciadoEm, registrado_por: state.currentUser.id,
  };
  const { error } = await supabaseClient.from('atendimentos_chat').insert(payload);
  if (error) { showToast('Não foi possível registrar: ' + error.message); return; }
  state.novoAtendimentoChat = false;
  showToast('Atendimento registrado!');
  await carregarAtendimentosChat();
  renderEficienciaView();
}
async function registrarPrimeiraRespostaAtendimento(id) {
  const agora = new Date().toISOString();
  if (!supabaseClient) {
    const a = state.atendimentosChat.find(x => x.id === id);
    if (a && !a.primeiraRespostaEm) { a.primeiraRespostaEm = agora; if (a.status === 'aguardando') a.status = 'respondido'; }
    renderEficienciaView();
    return;
  }
  const { error } = await supabaseClient.from('atendimentos_chat').update({ primeira_resposta_em: agora }).eq('id', id);
  if (error) { showToast('Não foi possível registrar: ' + error.message); return; }
  await carregarAtendimentosChat();
  renderEficienciaView();
}
async function finalizarAtendimentoChat(id) {
  const agora = new Date().toISOString();
  if (!supabaseClient) {
    const a = state.atendimentosChat.find(x => x.id === id);
    if (a) { a.finalizadoEm = agora; a.status = 'finalizado'; }
    renderEficienciaView();
    return;
  }
  const { error } = await supabaseClient.from('atendimentos_chat').update({ finalizado_em: agora }).eq('id', id);
  if (error) { showToast('Não foi possível finalizar: ' + error.message); return; }
  await carregarAtendimentosChat();
  renderEficienciaView();
}
async function removerAtendimentoChat(id) {
  if (supabaseClient) {
    const { error } = await supabaseClient.from('atendimentos_chat').delete().eq('id', id);
    if (error) { showToast('Não foi possível excluir: ' + error.message); return; }
  }
  state.atendimentosChat = state.atendimentosChat.filter(a => a.id !== id);
  renderEficienciaView();
}
function statusAtendimentoChatLabel(status) {
  if (status === 'respondido') return 'Respondido';
  if (status === 'finalizado') return 'Finalizado';
  return 'Aguardando';
}
function statusAtendimentoChatCor(status) {
  if (status === 'finalizado') return 'var(--text-3)';
  if (status === 'respondido') return 'var(--success)';
  return 'var(--danger)';
}

/* ---------------- Render principal ---------------- */
function renderEficienciaView() {
  if (!podeVerPainelEficiencia()) {
    document.getElementById('content').innerHTML = `
      <div class="section-title">Eficiência, Qualidade e Alertas</div>
      <div class="card" style="padding:24px; text-align:center; color:var(--text-3); font-size:13px; max-width:520px;">
        <i class="fa-solid fa-lock" style="margin-bottom:6px; display:block; font-size:18px;"></i>
        Este painel é destinado à gestão (administradores, gestores de setor ou quem tem a permissão "ver sinalizações de todas").
      </div>
    `;
    return;
  }
  garantirFiltroEficienciaPadrao();
  const ind = calcIndicadoresAlertas();
  const avaliacoes = avaliacoesQualidadeFiltradas();
  const atendimentosRef = atendimentosReferenciaFiltrados();
  const atendimentosChat = atendimentosChatFiltrados();

  const cumprimentoPrazoValor = ind.comPrazoQtd === 0 ? 'Sem dados suficientes' : String(ind.dentroPrazoQtd);
  const cumprimentoPrazoSub = ind.comPrazoQtd === 0 ? 'Nenhum alerta filtrado tem prazo definido.' : `${ind.dentroPrazoQtd} de ${ind.comPrazoQtd} com prazo definido`;

  const chatsAguardandoQtd = atendimentosChat.filter(a => a.status === 'aguardando').length;
  const tempoPrimeiraRespostaMin = calcTempoPrimeiraRespostaMin(atendimentosChat);
  const tempoPrimeiraRespostaValor = tempoPrimeiraRespostaMin === null ? 'Sem dados suficientes' : formatarDuracaoMin(tempoPrimeiraRespostaMin);
  const tempoPrimeiraRespostaSub = tempoPrimeiraRespostaMin === null
    ? 'Nenhum atendimento com primeira resposta registrada no período/filtro selecionado.'
    : `Média de ${atendimentosChat.filter(a => a.primeiraRespostaEm).length} atendimento(s) com resposta registrada`;

  document.getElementById('content').innerHTML = `
    <div class="section-title" style="margin-bottom:6px;">Eficiência, Qualidade e Alertas</div>
    <div style="font-size:12px; color:var(--text-2); max-width:820px; margin-bottom:16px; line-height:1.5;">
      Acompanhamento quantitativo e qualitativo do desempenho das equipes, a partir dos dados já registrados no portal (sinalizações de colaboradores) e das avaliações de qualidade/atendimentos de referência registrados aqui.
    </div>

    ${filtrosEficienciaBar()}

    <div class="section-title" style="margin-top:6px;">Alertas</div>
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:14px; margin-bottom:16px;">
      ${metricCard('Total de alertas', ind.totalAlertas)}
      ${metricCard('Resolvidos dentro do prazo', cumprimentoPrazoValor, cumprimentoPrazoSub)}
      ${metricCard('Pessoas com reincidência', ind.reincidencias.length)}
      ${metricCard('Tipos de erro registrados', ind.tiposFrequentes.length)}
    </div>
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px,1fr)); gap:14px; margin-bottom:24px;">
      <div class="card" style="padding:18px;">
        <div style="font-weight:700; font-size:13px; margin-bottom:10px;">Alertas por equipe</div>
        ${ind.porEquipe.length ? ind.porEquipe.map(p => `
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
            <div style="flex:1; font-size:12px; color:var(--text-2);">${esc(p.setor)}</div>
            <div style="flex:2; height:8px; background:var(--surface-2); border-radius:8px; overflow:hidden;">
              <div style="height:100%; width:${ind.totalAlertas ? Math.max((p.total / ind.totalAlertas) * 100, p.total ? 4 : 0) : 0}%; background:var(--brass); border-radius:8px;"></div>
            </div>
            <div class="mono" style="font-size:12px; font-weight:800; width:22px; text-align:right;">${p.total}</div>
          </div>
        `).join('') : `<div style="font-size:12px; color:var(--text-3);">Nenhum alerta no período/filtro selecionado.</div>`}
      </div>
      <div class="card" style="padding:18px;">
        <div style="font-weight:700; font-size:13px; margin-bottom:10px;">Tipos de erro mais frequentes</div>
        ${ind.tiposFrequentes.length ? ind.tiposFrequentes.map(t => `
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
            <div style="flex:1; font-size:12px; color:var(--text-2);">${esc(t.tipo)}</div>
            <div style="flex:2; height:8px; background:var(--surface-2); border-radius:8px; overflow:hidden;">
              <div style="height:100%; width:${Math.max((t.total / ind.tiposFrequentes[0].total) * 100, 4)}%; background:var(--danger); border-radius:8px;"></div>
            </div>
            <div class="mono" style="font-size:12px; font-weight:800; width:22px; text-align:right;">${t.total}</div>
          </div>
        `).join('') : `<div style="font-size:12px; color:var(--text-3);">Nenhuma sinalização com tipo de erro classificado no período/filtro selecionado.</div>`}
      </div>
    </div>
    <div class="card" style="overflow:hidden; margin-bottom:24px;">
      <div style="padding:14px 16px; font-weight:700; font-size:13px; border-bottom:1px solid var(--border);">Reincidências (colaboradores com mais de uma sinalização)</div>
      ${ind.reincidencias.length ? ind.reincidencias.map(r => `
        <div class="aviso-row" style="cursor:default;">
          <div style="flex:1; font-size:13px; font-weight:600;">${esc(r.nome)}</div>
          <span class="status-pill" style="background:var(--danger-soft, var(--surface-2)); color:var(--danger);">${r.total} ocorrências</span>
        </div>
      `).join('') : `<div style="padding:20px; text-align:center; color:var(--text-3); font-size:12.5px;">Nenhum colaborador com reincidência no período/filtro selecionado.</div>`}
    </div>

    <div class="section-title">Eficiência Operacional</div>
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:14px; margin-bottom:16px;">
      ${metricCard('Tempo de primeira resposta', tempoPrimeiraRespostaValor, tempoPrimeiraRespostaSub)}
      ${metricCard('Chats aguardando', chatsAguardandoQtd)}
      ${metricCard('Prazos cumpridos', cumprimentoPrazoValor, cumprimentoPrazoSub)}
      ${metricCard('Pendências sem retorno', ind.pendentes, 'Alertas com status "aberta" no período/filtro selecionado.')}
      ${metricCard('Alertas solucionados', ind.solucionados)}
      ${metricCard('Erros recorrentes', ind.recorrenciaErros, 'Alertas cujo tipo de erro já ocorreu 2 ou mais vezes no período/filtro selecionado.')}
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:10px;">
      <div class="section-title" style="margin-bottom:0;">Registro de Atendimentos <span style="color:var(--text-3); text-transform:none; font-weight:600;">(alimenta o tempo de primeira resposta e os chats aguardando acima)</span></div>
      ${isAdmin() ? `<button class="btn-brass" onclick="toggleNovoAtendimentoChat()"><i class="fa-solid fa-plus"></i> Novo atendimento</button>` : ''}
    </div>
    ${state.novoAtendimentoChat && isAdmin() ? `
      <div class="card" style="padding:18px; margin-bottom:16px; max-width:760px;">
        <div class="form-grid" style="grid-template-columns:1fr 1fr;">
          <div class="form-field"><label>Colaborador</label>
            <select id="at-colaborador">${state.employees.map(e => `<option value="${e.id}">${esc(e.nome)} — ${esc(e.cargo)}</option>`).join('')}</select>
          </div>
          <div class="form-field"><label>Cliente <span style="font-weight:400; color:var(--text-3);">(opcional)</span></label><input id="at-cliente" placeholder="Nome do cliente atendido"></div>
          <div class="form-field" style="grid-column:span 2;"><label>Início do atendimento</label><input id="at-inicio" type="datetime-local" value="${new Date(Date.now() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)}"></div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="admin-add-btn" onclick="submitAtendimentoChat()"><i class="fa-solid fa-plus"></i> Registrar</button>
          <button class="admin-cancel-btn" onclick="toggleNovoAtendimentoChat()">Cancelar</button>
        </div>
      </div>
    ` : ''}
    <div class="card" style="overflow:hidden; margin-bottom:24px;">
      ${atendimentosChat.length ? atendimentosChat.slice(0, 20).map(a => {
        const podeGerenciar = isAdmin() || a.registradoPorId === (getEffectiveEmployee()||{}).id || isGestorDoSetor(a.setor);
        const tempoResposta = a.primeiraRespostaEm ? formatarDuracaoMin(Math.round((new Date(a.primeiraRespostaEm) - new Date(a.iniciadoEm)) / 60000)) : null;
        return `
        <div class="aviso-row" style="cursor:default;">
          <div class="priority-bar" style="background:${statusAtendimentoChatCor(a.status)};"></div>
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <div style="font-size:13px; font-weight:700;">${esc(a.colaborador || '')}${a.cliente ? ' — ' + esc(a.cliente) : ''}</div>
              <span class="status-pill" style="background:${statusAtendimentoChatCor(a.status)}22; color:${statusAtendimentoChatCor(a.status)};">${statusAtendimentoChatLabel(a.status)}</span>
            </div>
            <div class="mono" style="font-size:10.5px; color:var(--text-3); margin-top:3px;">${esc(a.setor||'')} · início ${esc(formatarDataBR((a.iniciadoEm||'').slice(0,10)))} ${esc((a.iniciadoEm||'').slice(11,16))}${tempoResposta ? ` · 1ª resposta em ${tempoResposta}` : ''}</div>
          </div>
          ${podeGerenciar ? `
          <div style="display:flex; gap:6px; align-items:flex-start;">
            ${!a.primeiraRespostaEm ? `<button class="admin-edit-btn" title="Registrar 1ª resposta agora" onclick="registrarPrimeiraRespostaAtendimento('${a.id}')"><i class="fa-solid fa-reply" style="font-size:12px;"></i></button>` : ''}
            ${a.status !== 'finalizado' ? `<button class="admin-edit-btn" title="Finalizar atendimento" onclick="finalizarAtendimentoChat('${a.id}')"><i class="fa-solid fa-flag-checkered" style="font-size:12px;"></i></button>` : ''}
            <button class="admin-del-btn" title="Remover" onclick="removerAtendimentoChat('${a.id}')"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>
          </div>` : ''}
        </div>
      `;}).join('') : `<div style="padding:24px; text-align:center; color:var(--text-3); font-size:13px;">Nenhum atendimento registrado no período/filtro selecionado.</div>`}
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:10px;">
      <div class="section-title" style="margin-bottom:0;">Qualidade e Encantamento <span style="color:var(--text-3); text-transform:none; font-weight:600;">(escala de 0 a 10)</span></div>
      ${isAdmin() ? `<button class="btn-brass" onclick="toggleNovaAvaliacaoQualidade()"><i class="fa-solid fa-plus"></i> Nova avaliação</button>` : ''}
    </div>
    ${state.novaAvaliacaoQualidade && isAdmin() ? `
      <div class="card" style="padding:18px; margin-bottom:16px; max-width:820px;">
        <div class="form-grid" style="grid-template-columns:1fr 1fr;">
          <div class="form-field"><label>Colaborador avaliado</label>
            <select id="aq-colaborador">${state.employees.map(e => `<option value="${e.id}">${esc(e.nome)} — ${esc(e.cargo)}</option>`).join('')}</select>
          </div>
          <div class="form-field"><label>Período (competência)</label><input id="aq-periodo" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
          ${CRITERIOS_QUALIDADE.map(c => `
            <div class="form-field"><label>${esc(c.label)}</label><input id="aq-${c.key}" type="number" min="0" max="10" step="1" placeholder="0 a 10"></div>
          `).join('')}
          <div class="form-field" style="grid-column:span 2;"><label>Observações (opcional)</label><input id="aq-observacoes" placeholder="Contexto da avaliação"></div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="admin-add-btn" onclick="submitAvaliacaoQualidade()"><i class="fa-solid fa-plus"></i> Registrar avaliação</button>
          <button class="admin-cancel-btn" onclick="toggleNovaAvaliacaoQualidade()">Cancelar</button>
        </div>
      </div>
    ` : ''}
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:14px; margin-bottom:16px;">
      ${CRITERIOS_QUALIDADE.map(c => {
        const media = mediaCriterioQualidade(avaliacoes, c.key);
        return metricCard(c.label, media === null ? 'Sem dados suficientes' : media.toFixed(1).replace('.0','') + ' / 10');
      }).join('')}
    </div>
    <div class="card" style="overflow:hidden; margin-bottom:24px;">
      <div style="padding:14px 16px; font-weight:700; font-size:13px; border-bottom:1px solid var(--border);">Avaliações registradas (${avaliacoes.length})</div>
      ${avaliacoes.length ? avaliacoes.slice(0, 20).map(a => {
        const podeGerenciar = isAdmin() || a.avaliadorId === (getEffectiveEmployee()||{}).id || isGestorDoSetor(a.setor);
        const mediaGeral = Math.round((CRITERIOS_QUALIDADE.reduce((acc,c)=>acc+(Number(a[c.key])||0),0)/CRITERIOS_QUALIDADE.length)*10)/10;
        return `
        <div class="aviso-row" style="cursor:default;">
          <div style="flex:1;">
            <div style="font-size:13px; font-weight:700;">${esc(a.colaborador || '')} <span class="status-pill" style="margin-left:6px;">média ${mediaGeral.toFixed(1)}</span></div>
            <div class="mono" style="font-size:10.5px; color:var(--text-3); margin-top:3px;">${esc(a.setor||'')} · competência ${esc(formatarDataBR(a.periodo))}${a.observacoes ? ' · ' + esc(a.observacoes) : ''}</div>
          </div>
          ${podeGerenciar ? `<button class="admin-del-btn" title="Remover" onclick="removerAvaliacaoQualidade('${a.id}')"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>` : ''}
        </div>
      `;}).join('') : `<div style="padding:20px; text-align:center; color:var(--text-3); font-size:12.5px;">Nenhuma avaliação de qualidade registrada no período/filtro selecionado.</div>`}
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:10px;">
      <div class="section-title" style="margin-bottom:0;">Reconhecimento</div>
      ${isAdmin() ? `<button class="btn-brass" onclick="toggleNovoAtendimentoReferencia()"><i class="fa-solid fa-plus"></i> Novo atendimento de referência</button>` : ''}
    </div>
    ${state.novoAtendimentoReferencia && isAdmin() ? `
      <div class="card" style="padding:18px; margin-bottom:16px; max-width:760px;">
        <div class="form-grid" style="grid-template-columns:1fr 1fr;">
          <div class="form-field" style="grid-column:span 2;"><label>Título</label><input id="ar-titulo" placeholder="Ex: Renegociação resolvida com elogio do cliente"></div>
          <div class="form-field"><label>Colaborador</label>
            <select id="ar-colaborador">${state.employees.map(e => `<option value="${e.id}">${esc(e.nome)} — ${esc(e.cargo)}</option>`).join('')}</select>
          </div>
          <div class="form-field" style="grid-column:span 2;"><label>Descrição (opcional)</label><input id="ar-descricao" placeholder="Por que esse atendimento é referência"></div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="admin-add-btn" onclick="submitAtendimentoReferencia()"><i class="fa-solid fa-plus"></i> Registrar</button>
          <button class="admin-cancel-btn" onclick="toggleNovoAtendimentoReferencia()">Cancelar</button>
        </div>
      </div>
    ` : ''}
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:14px; margin-bottom:16px;">
      ${metricCard('Atendimentos de referência', atendimentosRef.length)}
    </div>
    <div class="card" style="overflow:hidden;">
      ${atendimentosRef.length ? atendimentosRef.slice(0, 20).map(r => {
        const podeGerenciar = isAdmin() || r.registradoPorId === (getEffectiveEmployee()||{}).id || isGestorDoSetor(r.setor);
        return `
        <div class="aviso-row" style="cursor:default;">
          <div style="flex:1;">
            <div style="font-size:13px; font-weight:700;">${esc(r.titulo)}</div>
            <div style="font-size:12px; color:var(--text-2); margin:4px 0;">${esc(r.descricao || '')}</div>
            <div class="mono" style="font-size:10.5px; color:var(--text-3);"><i class="fa-solid fa-user" style="font-size:9px;"></i> ${esc(r.colaborador || '')} · ${esc(r.setor || '')} · ${esc(formatarDataBR((r.data||'').slice(0,10)))}</div>
          </div>
          ${podeGerenciar ? `<button class="admin-del-btn" title="Remover" onclick="removerAtendimentoReferencia('${r.id}')"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>` : ''}
        </div>
      `;}).join('') : `<div style="padding:24px; text-align:center; color:var(--text-3); font-size:13px;">Nenhum atendimento de referência registrado no período/filtro selecionado.</div>`}
    </div>
  `;
}
