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

/* ================= REGISTRO DE ATENDIMENTOS — ciclo de vida vinculado =================
   O atendimento (atendimentos_chat) é o registro principal: alerta enviado,
   resposta, resolução, encerramento, avaliação e reconhecimento/bônus são
   sempre vinculados a ele (nunca informações soltas) — ver migração 0020.
   "Respondido" (alguém respondeu) e "Resolvido" (o problema foi realmente
   solucionado) são informações DIFERENTES: "status" é só o andamento do
   atendimento (fluxo); a resolução é uma pergunta própria e independente —
   "A demanda foi resolvida?" (Sim/Não/Pendente) — na coluna "resolucao",
   nunca inferida de "respondido". Os estados "aguardando"/"finalizado" já
   existiam (migração 0017) e continuam sendo gravados exatamente como
   antes — só ganharam um rótulo mais claro na interface
   ("Pendente"/"Encerrado"), para não invalidar nenhum atendimento já
   registrado.

   REGRA PRINCIPAL DE TEMPO: "tempo de resposta" é sempre
   primeiraRespostaEm - iniciadoEm (mensagem do cliente até a resposta do
   colaborador), independente do horário do alerta — o alerta é só
   registrado à parte, para acompanhamento do processo (calcIndicadoresAtendimento). */
const STATUS_ATENDIMENTO_CHAT = [
  { value: 'aguardando', label: 'Pendente', cor: 'var(--danger)' },
  { value: 'alerta_enviado', label: 'Alerta enviado', cor: '#B4881F' },
  { value: 'em_atendimento', label: 'Em atendimento', cor: '#2E6DB4' },
  { value: 'respondido', label: 'Respondido', cor: 'var(--success)' },
  { value: 'finalizado', label: 'Encerrado', cor: 'var(--text-3)' },
];
/* "A demanda foi resolvida?" — resposta explícita, independente do status
   do fluxo acima. Pode ser alterada/revertida a qualquer momento. */
const RESOLUCAO_ATENDIMENTO_INFO = {
  pendente: { label: 'Pendente', emoji: '⚪', cor: 'var(--text-3)' },
  resolvida: { label: 'Sim — Resolvida', emoji: '🟢', cor: 'var(--success)' },
  nao_resolvida: { label: 'Não — Não resolvida', emoji: '🔴', cor: 'var(--danger)' },
};
/* Mesma regra de gestão já usada nas ações de atendimento (antes repetida
   inline): administrador, quem registrou, gestor do setor, ou o próprio
   colaborador responsável pelo atendimento (agora também pode agir sobre o
   próprio atendimento — ver policy atendimentos_chat_update em 0020). */
function podeGerenciarAtendimentoChat(a) {
  const emp = getEffectiveEmployee();
  if (!emp) return false;
  return isAdmin() || a.registradoPorId === emp.id || a.colaboradorId === emp.id || isGestorDoSetor(a.setor);
}
function eventosDoAtendimento(atendimentoId) {
  return state.atendimentoChatEventos.filter(e => e.atendimentoId === atendimentoId)
    .slice().sort((x, y) => new Date(x.ocorridoEm) - new Date(y.ocorridoEm));
}
/* Só usado no modo local/demonstração (sem Supabase): no banco real, a
   linha do tempo é gerada automaticamente pelos triggers da migração 0020 —
   aqui replicamos o mesmo texto/comportamento para a experiência offline
   continuar idêntica. */
function registrarEventoAtendimentoLocal(atendimentoId, evento, ocorridoEmIso) {
  const emp = getEffectiveEmployee();
  state.atendimentoChatEventos.push({
    id: uid('atev'), atendimentoId, evento, ocorridoEm: ocorridoEmIso || new Date().toISOString(),
    autorId: emp ? emp.id : null,
  });
}
function avaliacoesDoAtendimento(atendimentoId) { return state.avaliacoesQualidade.filter(a => a.atendimentoChatId === atendimentoId); }
function referenciasDoAtendimento(atendimentoId) { return state.atendimentosReferencia.filter(r => r.atendimentoChatId === atendimentoId); }
function mediaAvaliacaoQualidade(a) {
  return Math.round((CRITERIOS_QUALIDADE.reduce((acc, c) => acc + (Number(a[c.key]) || 0), 0) / CRITERIOS_QUALIDADE.length) * 10) / 10;
}
/* Indicadores de tempo do atendimento individual (seção "Indicadores" do
   detalhe) — null quando faltar algum dos dois horários envolvidos
   ("Sem dados suficientes" na tela, nunca um cálculo incorreto/negativo). */
function calcMinutosEntre(isoInicio, isoFim) {
  if (!isoInicio || !isoFim) return null;
  return Math.max(0, Math.round((new Date(isoFim) - new Date(isoInicio)) / 60000));
}
function calcIndicadoresAtendimento(a) {
  return {
    ateAlertaMin: calcMinutosEntre(a.iniciadoEm, a.alertaEnviadoEm), // só para acompanhamento do processo — nunca usado no tempo de resposta
    tempoRespostaMin: calcMinutosEntre(a.iniciadoEm, a.primeiraRespostaEm), // mensagem do cliente -> resposta do colaborador, sempre, independente do alerta
    resolucaoMin: calcMinutosEntre(a.iniciadoEm, a.resolvidoEm), // mensagem do cliente -> resolução (só existe data quando resolucao = "resolvida")
  };
}

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
  state.filtroEficiencia = { periodoInicio: null, periodoFim: null, setor: '', equipeId: '', colaboradorId: '', tipoErro: '', status: '', _tocado: true };
  renderEficienciaView();
}

/* A equipe de um colaborador não é gravada no alerta — o alerta guarda o
   setor. A equipe é sempre resolvida a partir da equipe ATUAL do
   colaborador sinalizado (por isso, se alguém mudar de equipe, os alertas
   antigos dele passam a contar para a equipe nova — ver texto explicativo
   na tela). Não altera nenhum registro para "preencher" isso retroativamente. */
function equipeIdDoColaborador(colaboradorId) {
  if (!colaboradorId) return null;
  const emp = state.employees.find(e => e.id === colaboradorId);
  return (emp && emp.equipe_id) || null;
}
function passaFiltroEquipe(colaboradorId) {
  const f = state.filtroEficiencia;
  if (!f.equipeId) return true;
  const eqId = equipeIdDoColaborador(colaboradorId);
  if (f.equipeId === '__sem_equipe__') return !eqId;
  return eqId === f.equipeId;
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
    passaFiltroEquipe(s.colaboradorId) &&
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
    passaFiltroEquipe(a.colaboradorId) &&
    (!f.colaboradorId || a.colaboradorId === f.colaboradorId)
  );
}
function atendimentosReferenciaFiltrados() {
  const f = state.filtroEficiencia;
  return state.atendimentosReferencia.filter(r =>
    eficienciaDataDentroPeriodo(r.data) &&
    (!f.setor || r.setor === f.setor) &&
    passaFiltroEquipe(r.colaboradorId) &&
    (!f.colaboradorId || r.colaboradorId === f.colaboradorId)
  );
}
function atendimentosChatFiltrados() {
  const f = state.filtroEficiencia;
  return state.atendimentosChat.filter(a =>
    eficienciaDataDentroPeriodo(a.iniciadoEm) &&
    (!f.setor || a.setor === f.setor) &&
    passaFiltroEquipe(a.colaboradorId) &&
    (!f.colaboradorId || a.colaboradorId === f.colaboradorId)
  );
}
/* Tempo médio de primeira resposta, em minutos, só entre atendimentos que já
   têm a primeira resposta registrada. null = nenhum atendimento com esse
   dado no período/filtro selecionado ("Sem dados suficientes"). */
function calcTempoPrimeiraRespostaMin(lista) {
  const comResposta = lista.filter(a => a.primeiraRespostaEm && a.iniciadoEm);
  if (!comResposta.length) return null;
  const totalMin = comResposta.reduce((acc, a) => acc + Math.max(0, (new Date(a.primeiraRespostaEm) - new Date(a.iniciadoEm)) / 60000), 0);
  return Math.round(totalMin / comResposta.length);
}
function formatarDuracaoMin(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  if (h < 24) return `${h}h${m ? ' ' + m + 'min' : ''}`;
  const d = Math.floor(h / 24), hr = h % 24;
  return `${d}d${hr ? ' ' + hr + 'h' : ''}`;
}

/* Ranking "Alertas por equipe": agrupa por EQUIPE (não por setor). Se ainda
   não houver nenhuma equipe cadastrada, cai de volta para o agrupamento por
   setor (comportamento anterior) — transição seguindo o pedido de que nada
   quebre nem fique em branco enquanto o administrador não cadastra as
   equipes em Administração > Equipes.
   Regras de ordenação: pontuação (nº de alertas no período/filtro) da
   maior para a menor; empate é desfeito pela "ordem" cadastrada na equipe
   (menor primeiro); equipe sem ordem definida vai para o fim, em ordem
   alfabética. Todas as equipes cadastradas aparecem, mesmo zeradas; um
   alerta de colaborador sem equipe atribuída cai no grupo "Sem equipe". */
function calcRankingPorEquipe(alertas) {
  const usaEquipes = state.equipes.length > 0;
  if (!usaEquipes) {
    const porSetorMap = {};
    alertas.forEach(s => { porSetorMap[s.setor] = (porSetorMap[s.setor] || 0) + 1; });
    const setoresConhecidos = new Set(state.setores);
    const porEquipe = state.setores.map(s => ({ nome: s, total: porSetorMap[s] || 0 }))
      .concat(Object.keys(porSetorMap).filter(s => !setoresConhecidos.has(s)).map(s => ({ nome: s, total: porSetorMap[s] })))
      .sort((a, b) => b.total - a.total);
    return { usaEquipes, porEquipe };
  }
  const contagemPorEquipeId = {};
  alertas.forEach(s => {
    const eqId = equipeIdDoColaborador(s.colaboradorId) || '__sem_equipe__';
    contagemPorEquipeId[eqId] = (contagemPorEquipeId[eqId] || 0) + 1;
  });
  const grupos = state.equipes.map(eq => ({ nome: eq.nome, ordem: eq.ordem, total: contagemPorEquipeId[eq.id] || 0 }));
  grupos.push({ nome: 'Sem equipe', ordem: null, total: contagemPorEquipeId.__sem_equipe__ || 0 });
  grupos.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    const aTemOrdem = a.ordem !== null && a.ordem !== undefined;
    const bTemOrdem = b.ordem !== null && b.ordem !== undefined;
    if (aTemOrdem && bTemOrdem) return a.ordem - b.ordem;
    if (aTemOrdem) return -1;
    if (bTemOrdem) return 1;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
  return { usaEquipes, porEquipe: grupos };
}

function calcIndicadoresAlertas() {
  const alertas = sinalizacoesFiltradasEficiencia();

  const { usaEquipes, porEquipe } = calcRankingPorEquipe(alertas);

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
    alertas, porEquipe, usaEquipes, totalAlertas: alertas.length,
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
        <div class="form-field"><label>Setor</label>
          <select onchange="setFiltroEficiencia('setor', this.value)">
            <option value="" ${!f.setor ? 'selected' : ''}>Todos</option>
            ${state.setores.map(s => `<option value="${esc(s)}" ${f.setor === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field"><label>Equipe</label>
          <select onchange="setFiltroEficiencia('equipeId', this.value)">
            <option value="" ${!f.equipeId ? 'selected' : ''}>Todas</option>
            ${state.equipes.map(eq => `<option value="${eq.id}" ${f.equipeId === eq.id ? 'selected' : ''}>${esc(eq.nome)}</option>`).join('')}
            <option value="__sem_equipe__" ${f.equipeId === '__sem_equipe__' ? 'selected' : ''}>Sem equipe</option>
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
/* atendimentoId opcional: quando informado (aberto a partir do detalhe de um
   atendimento), a avaliação nasce já vinculada a ele e o colaborador vem
   travado no responsável daquele atendimento — chamado sem argumento (do
   painel geral) continua funcionando exatamente como antes. */
function toggleNovaAvaliacaoQualidade(atendimentoId) {
  if (atendimentoId) {
    const jaAbertaParaEste = state.novaAvaliacaoQualidade && state.avaliarAtendimentoChatId === atendimentoId;
    state.novaAvaliacaoQualidade = !jaAbertaParaEste;
    state.avaliarAtendimentoChatId = jaAbertaParaEste ? null : atendimentoId;
  } else {
    state.novaAvaliacaoQualidade = !state.novaAvaliacaoQualidade;
    state.avaliarAtendimentoChatId = null;
  }
  renderEficienciaView();
}
async function submitAvaliacaoQualidade() {
  if (!isAdmin()) { showToast('Só administradores podem registrar avaliações de qualidade.'); return; }
  const colaboradorId = val('aq-colaborador');
  const colaboradorEmp = state.employees.find(e => e.id === colaboradorId);
  if (!colaboradorEmp) { showToast('Selecione o colaborador avaliado.'); return; }
  const atendimentoChatId = state.avaliarAtendimentoChatId || null;
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
      atendimentoChatId,
    });
    state.novaAvaliacaoQualidade = false;
    state.avaliarAtendimentoChatId = null;
    showToast('Avaliação de qualidade registrada!');
    renderEficienciaView();
    return;
  }
  const payload = {
    colaborador_id: colaboradorId, colaborador_nome: colaboradorEmp.nome, setor: colaboradorEmp.setor,
    periodo, observacoes, avaliador_id: state.currentUser.id, atendimento_chat_id: atendimentoChatId,
  };
  CRITERIOS_QUALIDADE.forEach(c => { payload[c.campo] = notas[c.key]; });
  const { error } = await supabaseClient.from('avaliacoes_qualidade').insert(payload);
  if (error) { showToast('Não foi possível registrar a avaliação: ' + error.message); return; }
  state.novaAvaliacaoQualidade = false;
  state.avaliarAtendimentoChatId = null;
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
/* atendimentoId opcional (mesmo esquema de toggleNovaAvaliacaoQualidade):
   aberto a partir do detalhe de um atendimento, já nasce vinculado a ele. */
function toggleNovoAtendimentoReferencia(atendimentoId) {
  if (atendimentoId) {
    const jaAbertoParaEste = state.novoAtendimentoReferencia && state.vincularReferenciaAtendimentoChatId === atendimentoId;
    state.novoAtendimentoReferencia = !jaAbertoParaEste;
    state.vincularReferenciaAtendimentoChatId = jaAbertoParaEste ? null : atendimentoId;
  } else {
    state.novoAtendimentoReferencia = !state.novoAtendimentoReferencia;
    state.vincularReferenciaAtendimentoChatId = null;
  }
  renderEficienciaView();
}
async function submitAtendimentoReferencia() {
  if (!isAdmin()) { showToast('Só administradores podem registrar atendimentos de referência.'); return; }
  const colaboradorId = val('ar-colaborador'), titulo = val('ar-titulo'), descricao = val('ar-descricao');
  const colaboradorEmp = state.employees.find(e => e.id === colaboradorId);
  if (!titulo.trim() || !colaboradorEmp) { showToast('Informe ao menos o colaborador e um título para o atendimento.'); return; }
  const atendimentoChatId = state.vincularReferenciaAtendimentoChatId || (document.getElementById('ar-atendimento') ? (val('ar-atendimento') || null) : null);
  if (!supabaseClient) {
    state.atendimentosReferencia.unshift({
      id: uid('ar'), colaboradorId, colaborador: colaboradorEmp.nome, setor: colaboradorEmp.setor,
      titulo, descricao, registradoPorId: state.currentUser.id, data: new Date().toISOString(),
      atendimentoChatId,
    });
    state.novoAtendimentoReferencia = false;
    state.vincularReferenciaAtendimentoChatId = null;
    showToast('Atendimento de referência registrado!');
    renderEficienciaView();
    return;
  }
  const payload = {
    colaborador_id: colaboradorId, colaborador_nome: colaboradorEmp.nome, setor: colaboradorEmp.setor,
    titulo, descricao, registrado_por: state.currentUser.id, atendimento_chat_id: atendimentoChatId,
  };
  const { error } = await supabaseClient.from('atendimentos_referencia').insert(payload);
  if (error) { showToast('Não foi possível registrar: ' + error.message); return; }
  state.novoAtendimentoReferencia = false;
  state.vincularReferenciaAtendimentoChatId = null;
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

/* ---------------- Atendimentos (chat): ciclo completo do atendimento ---------------- */
/* Cliente envia mensagem -> Atendimento registrado -> Alerta enviado ao
   grupo -> Colaborador responde -> Atendimento resolvido -> (Encerrado /
   avaliado). Cada passo grava sua própria data/hora, nunca sobrescrevendo
   a anterior — "respondido" e "resolvido" são sempre eventos distintos
   (ver migração 0020). */
function toggleNovoAtendimentoChat() { state.novoAtendimentoChat = !state.novoAtendimentoChat; renderEficienciaView(); }
/* Valor padrão para inputs <input type="datetime-local"> — "agora" no fuso
   local do navegador (o value desses inputs é sempre "naive", sem fuso).
   Quem registra pode editar livremente antes de confirmar. */
function agoraParaDatetimeLocal() { return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
async function submitAtendimentoChat() {
  if (!isAdmin()) { showToast('Só administradores podem registrar atendimentos.'); return; }
  const colaboradorId = val('at-colaborador'), cliente = val('at-cliente'), inicioBruto = val('at-inicio');
  const linkChatguru = val('at-link-chatguru').trim();
  const colaboradorEmp = state.employees.find(e => e.id === colaboradorId);
  if (!colaboradorEmp) { showToast('Selecione o colaborador do atendimento.'); return; }
  const iniciadoEm = (inicioBruto ? new Date(inicioBruto) : new Date()).toISOString();
  if (!supabaseClient) {
    const novo = {
      id: uid('at'), colaboradorId, colaborador: colaboradorEmp.nome, setor: colaboradorEmp.setor,
      cliente, linkChatguru, status: 'aguardando', iniciadoEm, alertaEnviadoEm: null, primeiraRespostaEm: null,
      resolucao: 'pendente', resolvidoEm: null, finalizadoEm: null, registradoPorId: state.currentUser.id, data: new Date().toISOString(),
    };
    state.atendimentosChat.unshift(novo);
    registrarEventoAtendimentoLocal(novo.id, `Atendimento registrado — cliente enviou mensagem/solicitação${cliente ? ' (' + cliente + ')' : ''}`, iniciadoEm);
    state.novoAtendimentoChat = false;
    showToast('Atendimento registrado!');
    renderEficienciaView();
    return;
  }
  const payload = {
    colaborador_id: colaboradorId, colaborador_nome: colaboradorEmp.nome, setor: colaboradorEmp.setor,
    cliente: cliente || null, link_chatguru: linkChatguru || null, iniciado_em: iniciadoEm, registrado_por: state.currentUser.id,
  };
  const { error } = await supabaseClient.from('atendimentos_chat').insert(payload);
  if (error) { showToast('Não foi possível registrar: ' + error.message); return; }
  state.novoAtendimentoChat = false;
  showToast('Atendimento registrado!');
  await Promise.all([carregarAtendimentosChat(), carregarAtendimentoChatEventos()]);
  renderEficienciaView();
}
/* Enviar alerta e registrar resposta SEMPRE perguntam o horário em que o
   evento realmente aconteceu (pré-preenchido com "agora", mas editável) —
   nunca gravam o horário do clique automaticamente, para não registrar um
   horário errado quando o lançamento é feito depois do fato. */
/* Todos os sub-formulários do detalhe do atendimento (alerta/resposta/
   reatribuição/link) são mutuamente exclusivos — abrir um sempre fecha os
   demais, para nunca ter dois formulários abertos ao mesmo tempo sobre o
   mesmo atendimento. */
function fecharSubFormsAtendimentoChat() {
  state.enviarAlertaAtendimentoChatAberto = false;
  state.registrarRespostaAtendimentoChatAberto = false;
  state.reatribuirAtendimentoChatAberto = false;
  state.editarLinkChatguruAberto = false;
}
function toggleEnviarAlertaAtendimentoChat() {
  const abrir = !state.enviarAlertaAtendimentoChatAberto;
  fecharSubFormsAtendimentoChat();
  state.enviarAlertaAtendimentoChatAberto = abrir;
  renderEficienciaView();
}
function toggleRegistrarRespostaAtendimentoChat() {
  const abrir = !state.registrarRespostaAtendimentoChatAberto;
  fecharSubFormsAtendimentoChat();
  state.registrarRespostaAtendimentoChatAberto = abrir;
  renderEficienciaView();
}
/* Atalhos da listagem: abrem o atendimento já com o formulário de
   horário aberto, em vez de gravar "agora" direto no clique. */
function abrirAtendimentoParaAlerta(id) { state.atendimentoChatAtivoId = id; fecharSubFormsAtendimentoChat(); state.enviarAlertaAtendimentoChatAberto = true; renderEficienciaView(); }
function abrirAtendimentoParaResposta(id) { state.atendimentoChatAtivoId = id; fecharSubFormsAtendimentoChat(); state.registrarRespostaAtendimentoChatAberto = true; renderEficienciaView(); }
async function confirmarAlertaAtendimentoChat(id) {
  const quando = val('alerta-quando');
  if (!quando) { showToast('Informe a data e hora em que o alerta foi enviado.'); return; }
  const quandoIso = new Date(quando).toISOString();
  const a = state.atendimentosChat.find(x => x.id === id);
  if (a && a.iniciadoEm && new Date(quandoIso) < new Date(a.iniciadoEm)) { showToast('O horário do alerta não pode ser anterior ao início do atendimento.'); return; }
  // fecha o formulário ANTES de chamar a ação (que já re-renderiza a tela
  // sozinha) — senão o formulário aparece aberto por mais um clique.
  state.enviarAlertaAtendimentoChatAberto = false;
  await enviarAlertaAtendimentoChat(id, quandoIso);
}
async function confirmarRespostaAtendimentoChat(id) {
  const quando = val('resposta-quando');
  if (!quando) { showToast('Informe a data e hora em que o colaborador respondeu.'); return; }
  const quandoIso = new Date(quando).toISOString();
  const a = state.atendimentosChat.find(x => x.id === id);
  if (a && a.iniciadoEm && new Date(quandoIso) < new Date(a.iniciadoEm)) { showToast('O horário da resposta não pode ser anterior ao início do atendimento.'); return; }
  state.registrarRespostaAtendimentoChatAberto = false;
  await registrarPrimeiraRespostaAtendimento(id, quandoIso);
}
async function enviarAlertaAtendimentoChat(id, quandoIso) {
  const quando = quandoIso || new Date().toISOString();
  if (!supabaseClient) {
    const a = state.atendimentosChat.find(x => x.id === id);
    if (a && !a.alertaEnviadoEm) {
      a.alertaEnviadoEm = quando;
      if (a.status === 'aguardando') a.status = 'alerta_enviado';
      registrarEventoAtendimentoLocal(id, 'Alerta enviado ao grupo', quando);
    }
    renderEficienciaView();
    return;
  }
  const { error } = await supabaseClient.from('atendimentos_chat').update({ alerta_enviado_em: quando }).eq('id', id);
  if (error) { showToast('Não foi possível registrar o alerta: ' + error.message); return; }
  await Promise.all([carregarAtendimentosChat(), carregarAtendimentoChatEventos()]);
  renderEficienciaView();
}
async function registrarPrimeiraRespostaAtendimento(id, quandoIso) {
  const quando = quandoIso || new Date().toISOString();
  if (!supabaseClient) {
    const a = state.atendimentosChat.find(x => x.id === id);
    if (a && !a.primeiraRespostaEm) {
      a.primeiraRespostaEm = quando;
      if (['aguardando', 'alerta_enviado', 'em_atendimento'].includes(a.status)) a.status = 'respondido';
      registrarEventoAtendimentoLocal(id, `Cliente respondido${a.colaborador ? ' por ' + a.colaborador : ''}`, quando);
    }
    renderEficienciaView();
    return;
  }
  const { error } = await supabaseClient.from('atendimentos_chat').update({ primeira_resposta_em: quando }).eq('id', id);
  if (error) { showToast('Não foi possível registrar: ' + error.message); return; }
  await Promise.all([carregarAtendimentosChat(), carregarAtendimentoChatEventos()]);
  renderEficienciaView();
}
/* Resposta explícita a "A demanda foi resolvida?" — nunca inferida a partir
   de "respondido". Pode ser revertida (ex.: marcada como resolvida por
   engano) a qualquer momento; resolvido_em é mantido coerente
   automaticamente (só existe enquanto valor === 'resolvida'). */
async function definirResolucaoAtendimento(id, valor) {
  const a = state.atendimentosChat.find(x => x.id === id);
  if (a && a.resolucao === valor) return;
  const agora = new Date().toISOString();
  if (!supabaseClient) {
    if (a) {
      a.resolucao = valor;
      a.resolvidoEm = valor === 'resolvida' ? (a.resolvidoEm || agora) : null;
      const evento = valor === 'resolvida' ? 'Demanda resolvida' : valor === 'nao_resolvida' ? 'Demanda marcada como NÃO resolvida' : 'Resolução revertida para pendente';
      registrarEventoAtendimentoLocal(id, evento, valor === 'resolvida' ? a.resolvidoEm : agora);
    }
    renderEficienciaView();
    return;
  }
  const { error } = await supabaseClient.from('atendimentos_chat').update({ resolucao: valor }).eq('id', id);
  if (error) { showToast('Não foi possível registrar: ' + error.message); return; }
  await Promise.all([carregarAtendimentosChat(), carregarAtendimentoChatEventos()]);
  renderEficienciaView();
}
async function finalizarAtendimentoChat(id) {
  const agora = new Date().toISOString();
  if (!supabaseClient) {
    const a = state.atendimentosChat.find(x => x.id === id);
    if (a) { a.finalizadoEm = agora; a.status = 'finalizado'; registrarEventoAtendimentoLocal(id, 'Atendimento encerrado', agora); }
    renderEficienciaView();
    return;
  }
  const { error } = await supabaseClient.from('atendimentos_chat').update({ finalizado_em: agora }).eq('id', id);
  if (error) { showToast('Não foi possível finalizar: ' + error.message); return; }
  await Promise.all([carregarAtendimentosChat(), carregarAtendimentoChatEventos()]);
  renderEficienciaView();
}
async function removerAtendimentoChat(id) {
  if (supabaseClient) {
    const { error } = await supabaseClient.from('atendimentos_chat').delete().eq('id', id);
    if (error) { showToast('Não foi possível excluir: ' + error.message); return; }
  }
  state.atendimentosChat = state.atendimentosChat.filter(a => a.id !== id);
  if (state.atendimentoChatAtivoId === id) state.atendimentoChatAtivoId = null;
  renderEficienciaView();
}
/* Histórico de troca de responsável (regra 4 do pedido): quem assumiu antes
   fica registrado na linha do tempo — nunca sobrescrito, só o
   colaborador_id/nome "atual" do atendimento muda. */
function toggleReatribuirAtendimentoChat() {
  const abrir = !state.reatribuirAtendimentoChatAberto;
  fecharSubFormsAtendimentoChat();
  state.reatribuirAtendimentoChatAberto = abrir;
  renderEficienciaView();
}
async function submitReatribuicaoAtendimentoChat(id) {
  const a = state.atendimentosChat.find(x => x.id === id);
  const novoColaboradorId = val('reat-colaborador');
  const novoColaborador = state.employees.find(e => e.id === novoColaboradorId);
  if (!a || !novoColaborador) { showToast('Selecione o novo colaborador responsável.'); return; }
  if (novoColaboradorId === a.colaboradorId) { state.reatribuirAtendimentoChatAberto = false; renderEficienciaView(); return; }
  const antigoNome = a.colaborador;
  if (!supabaseClient) {
    a.colaboradorId = novoColaboradorId; a.colaborador = novoColaborador.nome; a.setor = novoColaborador.setor;
    registrarEventoAtendimentoLocal(id, `Atendimento assumido por ${novoColaborador.nome}${antigoNome ? ' (antes: ' + antigoNome + ')' : ''}`);
    state.reatribuirAtendimentoChatAberto = false;
    showToast('Atendimento reatribuído!');
    renderEficienciaView();
    return;
  }
  const { error } = await supabaseClient.from('atendimentos_chat')
    .update({ colaborador_id: novoColaboradorId, colaborador_nome: novoColaborador.nome, setor: novoColaborador.setor }).eq('id', id);
  if (error) { showToast('Não foi possível reatribuir: ' + error.message); return; }
  state.reatribuirAtendimentoChatAberto = false;
  showToast('Atendimento reatribuído!');
  await Promise.all([carregarAtendimentosChat(), carregarAtendimentoChatEventos()]);
  renderEficienciaView();
}
/* Link da conversa com o cliente no ChatGuru — opcional, pode ser
   adicionado já no cadastro ou preenchido/editado depois, a qualquer
   momento (a conversa muitas vezes só existe/URL só fica disponível depois
   que o atendimento já foi registrado). */
function toggleEditarLinkChatguru() {
  const abrir = !state.editarLinkChatguruAberto;
  fecharSubFormsAtendimentoChat();
  state.editarLinkChatguruAberto = abrir;
  renderEficienciaView();
}
async function salvarLinkChatguru(id) {
  const link = val('link-chatguru-edit').trim();
  if (!supabaseClient) {
    const a = state.atendimentosChat.find(x => x.id === id);
    if (a) a.linkChatguru = link;
    state.editarLinkChatguruAberto = false;
    showToast('Link do ChatGuru salvo!');
    renderEficienciaView();
    return;
  }
  const { error } = await supabaseClient.from('atendimentos_chat').update({ link_chatguru: link || null }).eq('id', id);
  if (error) { showToast('Não foi possível salvar o link: ' + error.message); return; }
  state.editarLinkChatguruAberto = false;
  showToast('Link do ChatGuru salvo!');
  await carregarAtendimentosChat();
  renderEficienciaView();
}
function statusAtendimentoChatLabel(status) {
  return (STATUS_ATENDIMENTO_CHAT.find(s => s.value === status) || STATUS_ATENDIMENTO_CHAT[0]).label;
}
function statusAtendimentoChatCor(status) {
  return (STATUS_ATENDIMENTO_CHAT.find(s => s.value === status) || STATUS_ATENDIMENTO_CHAT[0]).cor;
}

/* ---------------- Detalhe do atendimento: linha do tempo completa ---------------- */
function abrirAtendimentoChat(id) {
  state.atendimentoChatAtivoId = id;
  fecharSubFormsAtendimentoChat();
  renderEficienciaView();
}
function fecharAtendimentoChat() {
  state.atendimentoChatAtivoId = null;
  // fecha também qualquer sub-formulário pendente aberto a partir do
  // detalhe (avaliação/referência/reatribuição/horários/link) — evita que
  // ele reapareça "solto" (sem o contexto do atendimento) no painel geral.
  if (state.avaliarAtendimentoChatId) { state.novaAvaliacaoQualidade = false; state.avaliarAtendimentoChatId = null; }
  if (state.vincularReferenciaAtendimentoChatId) { state.novoAtendimentoReferencia = false; state.vincularReferenciaAtendimentoChatId = null; }
  fecharSubFormsAtendimentoChat();
  renderEficienciaView();
}

function formNovaAvaliacaoQualidade(atendimentoId) {
  const atendimento = atendimentoId ? state.atendimentosChat.find(x => x.id === atendimentoId) : null;
  return `
    <div class="card" style="padding:18px; margin-bottom:16px; max-width:820px;">
      ${atendimento ? `<div style="font-size:11.5px; color:var(--text-3); margin-bottom:10px;"><i class="fa-solid fa-link"></i> Vinculada ao atendimento de ${esc(atendimento.cliente || 'cliente não identificado')} — ${esc(atendimento.colaborador || '')}</div>` : ''}
      <div class="form-grid" style="grid-template-columns:1fr 1fr;">
        <div class="form-field"><label>Colaborador avaliado</label>
          <select id="aq-colaborador" ${atendimento ? 'disabled' : ''}>${state.employees.map(e => `<option value="${e.id}" ${atendimento && e.id === atendimento.colaboradorId ? 'selected' : ''}>${esc(e.nome)} — ${esc(e.cargo)}</option>`).join('')}</select>
        </div>
        <div class="form-field"><label>Período (competência)</label><input id="aq-periodo" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
        ${CRITERIOS_QUALIDADE.map(c => `
          <div class="form-field"><label>${esc(c.label)}</label><input id="aq-${c.key}" type="number" min="0" max="10" step="1" placeholder="0 a 10"></div>
        `).join('')}
        <div class="form-field" style="grid-column:span 2;"><label>Observações (opcional)</label><input id="aq-observacoes" placeholder="Contexto da avaliação"></div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="admin-add-btn" onclick="submitAvaliacaoQualidade()"><i class="fa-solid fa-plus"></i> Registrar avaliação</button>
        <button class="admin-cancel-btn" onclick="toggleNovaAvaliacaoQualidade(${atendimentoId ? `'${atendimentoId}'` : ''})">Cancelar</button>
      </div>
    </div>
  `;
}
function cardAvaliacaoQualidade(av) {
  const media = mediaAvaliacaoQualidade(av);
  const podeGerenciar = isAdmin() || av.avaliadorId === (getEffectiveEmployee()||{}).id || isGestorDoSetor(av.setor);
  return `
    <div class="card" style="padding:18px; margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
        <div style="font-size:12px; color:var(--text-3);">Avaliado em ${esc(formatarDataBR((av.data||'').slice(0,10)))}${av.observacoes ? ' · ' + esc(av.observacoes) : ''}</div>
        ${podeGerenciar ? `<button class="admin-del-btn" title="Remover" onclick="removerAvaliacaoQualidade('${av.id}')"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>` : ''}
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:10px; margin-top:12px;">
        ${CRITERIOS_QUALIDADE.map(c => `<div style="font-size:12px; color:var(--text-2);">${esc(c.label)}: <strong>${Number(av[c.key])}/10</strong></div>`).join('')}
      </div>
      <div style="margin-top:12px; font-size:15px; font-weight:800;">Nota média: <span style="color:var(--brass);">${media.toFixed(1).replace('.0','')} / 10</span></div>
    </div>
  `;
}
function formNovoAtendimentoReferencia(atendimentoId) {
  const atendimento = atendimentoId ? state.atendimentosChat.find(x => x.id === atendimentoId) : null;
  return `
    <div class="card" style="padding:18px; margin-bottom:16px; max-width:760px;">
      ${atendimento ? `<div style="font-size:11.5px; color:var(--text-3); margin-bottom:10px;"><i class="fa-solid fa-link"></i> Vinculado ao atendimento de ${esc(atendimento.cliente || 'cliente não identificado')} — ${esc(atendimento.colaborador || '')}</div>` : ''}
      <div class="form-grid" style="grid-template-columns:1fr 1fr;">
        <div class="form-field" style="grid-column:span 2;"><label>Título</label><input id="ar-titulo" placeholder="Ex: Renegociação resolvida com elogio do cliente"></div>
        <div class="form-field"><label>Colaborador</label>
          <select id="ar-colaborador" ${atendimento ? 'disabled' : ''}>${state.employees.map(e => `<option value="${e.id}" ${atendimento && e.id === atendimento.colaboradorId ? 'selected' : ''}>${esc(e.nome)} — ${esc(e.cargo)}</option>`).join('')}</select>
        </div>
        ${!atendimento ? `
        <div class="form-field"><label>Vincular a um atendimento <span style="font-weight:400; color:var(--text-3);">(opcional)</span></label>
          <select id="ar-atendimento">
            <option value="">— Nenhum —</option>
            ${state.atendimentosChat.map(a => `<option value="${a.id}">${esc(a.cliente || 'sem cliente')} — ${esc(a.colaborador || '')} (${esc(formatarDataBR((a.iniciadoEm||'').slice(0,10)))})</option>`).join('')}
          </select>
        </div>` : ''}
        <div class="form-field" style="grid-column:span 2;"><label>Descrição (opcional)</label><input id="ar-descricao" placeholder="Por que esse atendimento é referência"></div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="admin-add-btn" onclick="submitAtendimentoReferencia()"><i class="fa-solid fa-plus"></i> Registrar</button>
        <button class="admin-cancel-btn" onclick="toggleNovoAtendimentoReferencia(${atendimentoId ? `'${atendimentoId}'` : ''})">Cancelar</button>
      </div>
    </div>
  `;
}
function renderAtendimentoChatDetalhe() {
  const a = state.atendimentosChat.find(x => x.id === state.atendimentoChatAtivoId);
  if (!a) { state.atendimentoChatAtivoId = null; renderEficienciaView(); return; }
  const podeGerenciar = podeGerenciarAtendimentoChat(a);
  const eventos = eventosDoAtendimento(a.id);
  const ind = calcIndicadoresAtendimento(a);
  const avaliacoes = avaliacoesDoAtendimento(a.id);
  const referencias = referenciasDoAtendimento(a.id);
  const statusInfo = STATUS_ATENDIMENTO_CHAT.find(s => s.value === a.status) || STATUS_ATENDIMENTO_CHAT[0];

  document.getElementById('content').innerHTML = `
    <button class="open-btn" style="margin-bottom:10px;" onclick="fecharAtendimentoChat()"><i class="fa-solid fa-arrow-left"></i> Voltar ao Registro de Atendimentos</button>

    <div class="card" style="padding:22px; margin-bottom:20px;">
      <div style="font-size:11px; font-weight:800; letter-spacing:.06em; color:var(--text-3); margin-bottom:4px;">
        ATENDIMENTO${referencias.length ? ' · <span style="color:var(--brass);">⭐ Referência/bônus</span>' : ''}
      </div>
      <div style="font-size:20px; font-weight:800;">${esc(a.cliente || 'Cliente não identificado')}</div>
      <div style="margin-top:8px;"><span class="status-pill" style="background:${statusInfo.cor}22; color:${statusInfo.cor};">${esc(statusInfo.label)}</span></div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:14px; margin-top:18px; font-size:12.5px; color:var(--text-2); line-height:1.8;">
        <div><strong>Colaborador:</strong> ${esc(a.colaborador || '—')}</div>
        <div><strong>Setor:</strong> ${esc(a.setor || '—')}</div>
        <div><strong>Data:</strong> ${esc(formatarDataBR((a.iniciadoEm||'').slice(0,10)))}</div>
      </div>
      <div style="margin-top:10px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; font-size:12.5px;">
        <strong>Conversa no ChatGuru:</strong>
        ${a.linkChatguru ? `<a href="${esc(a.linkChatguru)}" target="_blank" rel="noopener noreferrer" class="open-btn" style="margin-top:0; display:inline-flex;"><i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir conversa</a>` : `<span style="color:var(--text-3);">Nenhum link cadastrado</span>`}
        ${podeGerenciar ? `<button class="admin-edit-btn" title="${a.linkChatguru ? 'Editar link' : 'Adicionar link'}" style="width:26px; height:26px;" onclick="toggleEditarLinkChatguru()"><i class="fa-solid fa-pen" style="font-size:11px;"></i></button>` : ''}
      </div>
      ${state.editarLinkChatguruAberto ? `
        <div style="margin-top:10px; display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap;">
          <div class="form-field" style="min-width:280px; flex:1;"><label>Link do ChatGuru</label><input id="link-chatguru-edit" placeholder="https://app.chatguru.app/..." value="${esc(a.linkChatguru || '')}"></div>
          <button class="admin-add-btn" onclick="salvarLinkChatguru('${a.id}')"><i class="fa-solid fa-check"></i> Salvar</button>
          <button class="admin-cancel-btn" onclick="toggleEditarLinkChatguru()">Cancelar</button>
        </div>
      ` : ''}
      ${podeGerenciar ? `
        <div style="display:flex; gap:8px; margin-top:16px; flex-wrap:wrap;">
          ${!a.alertaEnviadoEm ? `<button class="admin-add-btn" style="margin-top:0;" onclick="toggleEnviarAlertaAtendimentoChat()"><i class="fa-solid fa-bullhorn"></i> Enviar alerta ao grupo</button>` : ''}
          ${!a.primeiraRespostaEm ? `<button class="admin-add-btn" style="margin-top:0;" onclick="toggleRegistrarRespostaAtendimentoChat()"><i class="fa-solid fa-reply"></i> Registrar resposta</button>` : ''}
          ${!a.finalizadoEm ? `<button class="admin-cancel-btn" style="margin-top:0;" onclick="finalizarAtendimentoChat('${a.id}')"><i class="fa-solid fa-flag-checkered"></i> Encerrar atendimento</button>` : ''}
          <button class="admin-cancel-btn" style="margin-top:0;" onclick="toggleReatribuirAtendimentoChat()"><i class="fa-solid fa-user-pen"></i> Reatribuir</button>
        </div>
        ${state.enviarAlertaAtendimentoChatAberto ? `
          <div style="margin-top:14px; padding-top:14px; border-top:1px solid var(--border); display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap;">
            <div class="form-field"><label>Data e hora em que o alerta foi enviado</label><input id="alerta-quando" type="datetime-local" value="${agoraParaDatetimeLocal()}"></div>
            <button class="admin-add-btn" onclick="confirmarAlertaAtendimentoChat('${a.id}')"><i class="fa-solid fa-check"></i> Confirmar</button>
            <button class="admin-cancel-btn" onclick="toggleEnviarAlertaAtendimentoChat()">Cancelar</button>
          </div>
        ` : ''}
        ${state.registrarRespostaAtendimentoChatAberto ? `
          <div style="margin-top:14px; padding-top:14px; border-top:1px solid var(--border); display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap;">
            <div class="form-field"><label>Data e hora em que o colaborador respondeu</label><input id="resposta-quando" type="datetime-local" value="${agoraParaDatetimeLocal()}"></div>
            <button class="admin-add-btn" onclick="confirmarRespostaAtendimentoChat('${a.id}')"><i class="fa-solid fa-check"></i> Confirmar</button>
            <button class="admin-cancel-btn" onclick="toggleRegistrarRespostaAtendimentoChat()">Cancelar</button>
          </div>
        ` : ''}
        ${state.reatribuirAtendimentoChatAberto ? `
          <div style="margin-top:14px; padding-top:14px; border-top:1px solid var(--border); display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap;">
            <div class="form-field" style="min-width:220px;"><label>Novo colaborador responsável</label>
              <select id="reat-colaborador">${state.employees.map(e => `<option value="${e.id}" ${e.id===a.colaboradorId?'selected':''}>${esc(e.nome)} — ${esc(e.cargo)}</option>`).join('')}</select>
            </div>
            <button class="admin-add-btn" onclick="submitReatribuicaoAtendimentoChat('${a.id}')"><i class="fa-solid fa-check"></i> Confirmar</button>
            <button class="admin-cancel-btn" onclick="toggleReatribuirAtendimentoChat()">Cancelar</button>
          </div>
        ` : ''}
      ` : ''}
    </div>

    <div class="section-title">Linha do tempo do atendimento</div>
    <div class="card" style="overflow:hidden; margin-bottom:24px;">
      ${eventos.length ? eventos.map(ev => `
        <div class="aviso-row" style="cursor:default;">
          <div class="priority-bar" style="background:var(--brass);"></div>
          <div style="flex:1;">
            <div style="font-size:12.5px; font-weight:600;">${esc(ev.evento)}</div>
            <div class="mono" style="font-size:10.5px; color:var(--text-3); margin-top:2px;">${esc(formatarDataBR((ev.ocorridoEm||'').slice(0,10)))} às ${esc((ev.ocorridoEm||'').slice(11,16))}${ev.autorId ? ' · ' + esc(responsavelNome(ev.autorId)) : ''}</div>
          </div>
        </div>
      `).join('') : `<div style="padding:20px; text-align:center; color:var(--text-3); font-size:12.5px;">Nenhum evento registrado ainda.</div>`}
    </div>

    <div class="section-title">Indicadores de tempo</div>
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:14px; margin-bottom:24px;">
      ${metricCard('Tempo até o alerta', ind.ateAlertaMin === null ? 'Sem dados suficientes' : formatarDuracaoMin(ind.ateAlertaMin), 'Só para acompanhamento do processo — não entra no tempo de resposta.')}
      ${metricCard('Tempo de resposta', ind.tempoRespostaMin === null ? 'Sem dados suficientes' : formatarDuracaoMin(ind.tempoRespostaMin), 'Mensagem do cliente até a resposta do colaborador.')}
      ${metricCard('Tempo de resolução', ind.resolucaoMin === null ? 'Sem dados suficientes' : formatarDuracaoMin(ind.resolucaoMin), 'Mensagem do cliente até a demanda ser marcada como resolvida.')}
    </div>

    <div class="section-title">A demanda foi resolvida?</div>
    <div class="card" style="padding:20px; margin-bottom:24px;">
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:${a.resolucao === 'resolvida' ? '12px' : '0'};">
        ${['resolvida', 'nao_resolvida', 'pendente'].map(v => {
          const info = RESOLUCAO_ATENDIMENTO_INFO[v];
          const ativo = a.resolucao === v;
          return `<button class="status-pill" style="font-size:12.5px; padding:8px 14px; border:1px solid ${ativo ? info.cor : 'var(--border)'}; background:${ativo ? info.cor + '22' : 'transparent'}; color:${ativo ? info.cor : 'var(--text-2)'}; ${podeGerenciar ? 'cursor:pointer;' : 'cursor:default; opacity:.6;'}" ${podeGerenciar ? `onclick="definirResolucaoAtendimento('${a.id}','${v}')"` : 'disabled'}>${info.emoji} ${esc(info.label)}</button>`;
        }).join('')}
      </div>
      ${a.resolucao === 'resolvida' && a.resolvidoEm ? `
        <div style="font-size:12.5px; color:var(--text-2);">
          Resolvida às <strong>${esc((a.resolvidoEm||'').slice(11,16))}</strong>
          ${ind.resolucaoMin !== null ? ` · Tempo total de resolução: <strong>${formatarDuracaoMin(ind.resolucaoMin)}</strong>` : ''}
        </div>
      ` : ''}
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:10px;">
      <div class="section-title" style="margin-bottom:0;">Avaliação</div>
      ${isAdmin() ? `<button class="btn-brass" onclick="toggleNovaAvaliacaoQualidade('${a.id}')"><i class="fa-solid fa-star"></i> Avaliar este atendimento</button>` : ''}
    </div>
    ${state.novaAvaliacaoQualidade && state.avaliarAtendimentoChatId === a.id ? formNovaAvaliacaoQualidade(a.id) : ''}
    ${avaliacoes.length ? avaliacoes.map(cardAvaliacaoQualidade).join('') : `<div class="card" style="padding:20px; text-align:center; color:var(--text-3); font-size:12.5px; margin-bottom:24px;">Nenhuma avaliação registrada para este atendimento ainda.</div>`}

    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:10px;">
      <div class="section-title" style="margin-bottom:0;">Referência/bônus</div>
      ${isAdmin() && !referencias.length ? `<button class="btn-brass" onclick="toggleNovoAtendimentoReferencia('${a.id}')"><i class="fa-solid fa-award"></i> Marcar como referência/bônus</button>` : ''}
    </div>
    ${state.novoAtendimentoReferencia && state.vincularReferenciaAtendimentoChatId === a.id ? formNovoAtendimentoReferencia(a.id) : ''}
    ${referencias.length ? referencias.map(r => `
      <div class="card" style="padding:16px; margin-bottom:12px;">
        <div style="font-size:13px; font-weight:700;">⭐ ${esc(r.titulo)}</div>
        <div style="font-size:12px; color:var(--text-2); margin-top:4px;">${esc(r.descricao || '')}</div>
      </div>
    `).join('') : `<div class="card" style="padding:20px; text-align:center; color:var(--text-3); font-size:12.5px;">Nenhum reconhecimento vinculado a este atendimento.</div>`}
  `;
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
  if (state.atendimentoChatAtivoId) { renderAtendimentoChatDetalhe(); return; }
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
        <div style="font-weight:700; font-size:13px; margin-bottom:2px;">Alertas por equipe</div>
        ${!ind.usaEquipes ? `
          <div style="font-size:10.5px; color:var(--text-3); margin-bottom:10px;"><i class="fa-solid fa-circle-info"></i> Nenhuma equipe cadastrada ainda — agrupando por setor. Cadastre as equipes em Administração &gt; Equipes para ver o ranking por equipe.</div>
        ` : `
          <div style="font-size:10.5px; color:var(--text-3); margin-bottom:10px;">A equipe de cada alerta é a equipe <strong>atual</strong> do colaborador sinalizado — se ele mudar de equipe, o alerta passa a contar para a equipe nova.</div>
        `}
        ${ind.porEquipe.length ? ind.porEquipe.map(p => `
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
            <div style="flex:1; font-size:12px; color:var(--text-2);">${esc(p.nome)}</div>
            <div style="flex:2; height:8px; background:var(--surface-2); border-radius:8px; overflow:hidden;">
              <div style="height:100%; width:${ind.totalAlertas ? Math.max((p.total / ind.totalAlertas) * 100, p.total ? 4 : 0) : 0}%; background:var(--brass); border-radius:8px;"></div>
            </div>
            <div class="mono" style="font-size:12px; font-weight:800; width:22px; text-align:right;">${p.total}</div>
          </div>
        `).join('') : `<div style="font-size:12px; color:var(--text-3);">Nenhuma equipe cadastrada.</div>`}
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
          <div class="form-field"><label>Início do atendimento</label><input id="at-inicio" type="datetime-local" value="${agoraParaDatetimeLocal()}"></div>
          <div class="form-field" style="grid-column:span 2;"><label>Link do ChatGuru <span style="font-weight:400; color:var(--text-3);">(opcional)</span></label><input id="at-link-chatguru" placeholder="https://app.chatguru.app/..."></div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="admin-add-btn" onclick="submitAtendimentoChat()"><i class="fa-solid fa-plus"></i> Registrar</button>
          <button class="admin-cancel-btn" onclick="toggleNovoAtendimentoChat()">Cancelar</button>
        </div>
      </div>
    ` : ''}
    <div class="card" style="overflow:hidden; margin-bottom:24px;">
      ${atendimentosChat.length ? atendimentosChat.slice(0, 20).map(a => {
        const podeGerenciar = podeGerenciarAtendimentoChat(a);
        const temReferencia = referenciasDoAtendimento(a.id).length > 0;
        const tempoRespostaMinRow = calcMinutosEntre(a.iniciadoEm, a.primeiraRespostaEm);
        const tempoResposta = tempoRespostaMinRow === null ? null : formatarDuracaoMin(tempoRespostaMinRow);
        return `
        <div class="aviso-row" onclick="abrirAtendimentoChat('${a.id}')">
          <div class="priority-bar" style="background:${statusAtendimentoChatCor(a.status)};"></div>
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <div style="font-size:13px; font-weight:700;">${esc(a.colaborador || '')}${a.cliente ? ' — ' + esc(a.cliente) : ''}</div>
              <span class="status-pill" style="background:${statusAtendimentoChatCor(a.status)}22; color:${statusAtendimentoChatCor(a.status)};">${statusAtendimentoChatLabel(a.status)}</span>
              ${a.resolucao && a.resolucao !== 'pendente' ? `<span class="status-pill" style="background:${RESOLUCAO_ATENDIMENTO_INFO[a.resolucao].cor}22; color:${RESOLUCAO_ATENDIMENTO_INFO[a.resolucao].cor};">${RESOLUCAO_ATENDIMENTO_INFO[a.resolucao].emoji} ${esc(RESOLUCAO_ATENDIMENTO_INFO[a.resolucao].label)}</span>` : ''}
              ${temReferencia ? `<span class="status-pill" style="background:var(--brass-soft); color:var(--brass);">⭐ Referência</span>` : ''}
            </div>
            <div class="mono" style="font-size:10.5px; color:var(--text-3); margin-top:3px;">${esc(a.setor||'')} · início ${esc(formatarDataBR((a.iniciadoEm||'').slice(0,10)))} ${esc((a.iniciadoEm||'').slice(11,16))}${tempoResposta ? ` · tempo de resposta ${tempoResposta}` : ''}</div>
          </div>
          ${podeGerenciar ? `
          <div style="display:flex; gap:6px; align-items:flex-start;" onclick="event.stopPropagation()">
            ${!a.alertaEnviadoEm ? `<button class="admin-edit-btn" title="Enviar alerta ao grupo" onclick="abrirAtendimentoParaAlerta('${a.id}')"><i class="fa-solid fa-bullhorn" style="font-size:12px;"></i></button>` : ''}
            ${!a.primeiraRespostaEm ? `<button class="admin-edit-btn" title="Registrar resposta" onclick="abrirAtendimentoParaResposta('${a.id}')"><i class="fa-solid fa-reply" style="font-size:12px;"></i></button>` : ''}
            ${!a.finalizadoEm ? `<button class="admin-edit-btn" title="Encerrar atendimento" onclick="finalizarAtendimentoChat('${a.id}')"><i class="fa-solid fa-flag-checkered" style="font-size:12px;"></i></button>` : ''}
            <button class="admin-del-btn" title="Remover" onclick="removerAtendimentoChat('${a.id}')"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>
          </div>` : ''}
        </div>
      `;}).join('') : `<div style="padding:24px; text-align:center; color:var(--text-3); font-size:13px;">Nenhum atendimento registrado no período/filtro selecionado.</div>`}
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:10px;">
      <div class="section-title" style="margin-bottom:0;">Qualidade e Encantamento <span style="color:var(--text-3); text-transform:none; font-weight:600;">(escala de 0 a 10)</span></div>
      ${isAdmin() ? `<button class="btn-brass" onclick="toggleNovaAvaliacaoQualidade()"><i class="fa-solid fa-plus"></i> Nova avaliação</button>` : ''}
    </div>
    ${state.novaAvaliacaoQualidade && isAdmin() && !state.avaliarAtendimentoChatId ? formNovaAvaliacaoQualidade(null) : ''}
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
        const mediaGeral = mediaAvaliacaoQualidade(a);
        const atendimentoVinculado = a.atendimentoChatId ? state.atendimentosChat.find(x => x.id === a.atendimentoChatId) : null;
        return `
        <div class="aviso-row" style="cursor:default;">
          <div style="flex:1;">
            <div style="font-size:13px; font-weight:700;">${esc(a.colaborador || '')} <span class="status-pill" style="margin-left:6px;">média ${mediaGeral.toFixed(1)}</span></div>
            <div class="mono" style="font-size:10.5px; color:var(--text-3); margin-top:3px;">${esc(a.setor||'')} · competência ${esc(formatarDataBR(a.periodo))}${a.observacoes ? ' · ' + esc(a.observacoes) : ''}</div>
            ${atendimentoVinculado ? `<button class="open-btn" style="margin-top:6px; display:inline-flex;" onclick="abrirAtendimentoChat('${atendimentoVinculado.id}')"><i class="fa-solid fa-link"></i> Ver atendimento: ${esc(atendimentoVinculado.cliente || 'sem cliente')}</button>` : ''}
          </div>
          ${podeGerenciar ? `<button class="admin-del-btn" title="Remover" onclick="removerAvaliacaoQualidade('${a.id}')"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>` : ''}
        </div>
      `;}).join('') : `<div style="padding:20px; text-align:center; color:var(--text-3); font-size:12.5px;">Nenhuma avaliação de qualidade registrada no período/filtro selecionado.</div>`}
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:10px;">
      <div class="section-title" style="margin-bottom:0;">Reconhecimento</div>
      ${isAdmin() ? `<button class="btn-brass" onclick="toggleNovoAtendimentoReferencia()"><i class="fa-solid fa-plus"></i> Novo atendimento de referência</button>` : ''}
    </div>
    ${state.novoAtendimentoReferencia && isAdmin() && !state.vincularReferenciaAtendimentoChatId ? formNovoAtendimentoReferencia(null) : ''}
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:14px; margin-bottom:16px;">
      ${metricCard('Atendimentos de referência', atendimentosRef.length)}
    </div>
    <div class="card" style="overflow:hidden;">
      ${atendimentosRef.length ? atendimentosRef.slice(0, 20).map(r => {
        const podeGerenciar = isAdmin() || r.registradoPorId === (getEffectiveEmployee()||{}).id || isGestorDoSetor(r.setor);
        const atendimentoVinculado = r.atendimentoChatId ? state.atendimentosChat.find(x => x.id === r.atendimentoChatId) : null;
        return `
        <div class="aviso-row" style="cursor:default;">
          <div style="flex:1;">
            <div style="font-size:13px; font-weight:700;">⭐ ${esc(r.titulo)}</div>
            <div style="font-size:12px; color:var(--text-2); margin:4px 0;">${esc(r.descricao || '')}</div>
            <div class="mono" style="font-size:10.5px; color:var(--text-3);"><i class="fa-solid fa-user" style="font-size:9px;"></i> ${esc(r.colaborador || '')} · ${esc(r.setor || '')} · ${esc(formatarDataBR((r.data||'').slice(0,10)))}</div>
            ${atendimentoVinculado ? `<button class="open-btn" style="margin-top:6px; display:inline-flex;" onclick="abrirAtendimentoChat('${atendimentoVinculado.id}')"><i class="fa-solid fa-link"></i> Ver atendimento vinculado</button>` : ''}
          </div>
          ${podeGerenciar ? `<button class="admin-del-btn" title="Remover" onclick="removerAtendimentoReferencia('${r.id}')"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>` : ''}
        </div>
      `;}).join('') : `<div style="padding:24px; text-align:center; color:var(--text-3); font-size:13px;">Nenhum atendimento de referência registrado no período/filtro selecionado.</div>`}
    </div>
  `;
}
