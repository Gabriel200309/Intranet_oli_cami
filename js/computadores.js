/* ================= CONTROLE DE COMPUTADORES E MANUTENÇÕES =================
   Cadastro, acompanhamento e histórico dos computadores/equipamentos de
   informática do escritório. Reaproveita 100% o que já existe:
   state.employees (colaboradores) e state.setores — nenhum cadastro é
   duplicado aqui. Somente administradores e o setor de TI podem
   cadastrar/editar computadores, registrar e atualizar manutenções e
   controlar computadores reserva (ver fn_pode_gerenciar_computadores() no
   banco); os demais colaboradores têm acesso de leitura (painel, listagem,
   histórico e relatórios), igual ao restante do sistema. */

function podeGerenciarComputadores() {
  if (isAdmin()) return true;
  const emp = getEffectiveEmployee();
  return !!(emp && emp.setor === 'TI');
}
function hojeISO() { return new Date().toISOString().slice(0, 10); }
function diasEntre(dataIsoInicio, dataIsoFim) {
  if (!dataIsoInicio) return null;
  const a = new Date(dataIsoInicio + 'T00:00:00'), b = new Date((dataIsoFim || hojeISO()) + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}
function statusComputadorInfo(status) { return COMPUTADOR_STATUS_OPTS.find(s => s.value === status) || COMPUTADOR_STATUS_OPTS[0]; }
function manutencaoStatusLabel(status) { const o = MANUTENCAO_STATUS_OPTS.find(s => s.value === status); return o ? o.label : status; }
function manutencaoEmAndamento(m) { return m.status !== 'concluida' && m.status !== 'sem_conserto'; }
function computadorPorId(id) { return state.computadores.find(c => c.id === id); }
function manutencoesDoComputador(computadorId) {
  return state.manutencoesComputador.filter(m => m.computadorId === computadorId).slice().sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}
function historicoDoComputador(computadorId) {
  return state.historicoComputador.filter(h => h.computadorId === computadorId).slice().sort((a, b) => new Date(a.criadoEm || a.data) - new Date(b.criadoEm || b.data));
}
function manutencaoAtivaDoComputador(computadorId) {
  return manutencoesDoComputador(computadorId).find(manutencaoEmAndamento) || null;
}
function reservaAtivaPorPrincipal(computadorPrincipalId) {
  return state.reservaAtribuicoes.find(r => r.computadorPrincipalId === computadorPrincipalId && !r.devolvidoEm) || null;
}
function reservaAtivaPorReserva(computadorReservaId) {
  return state.reservaAtribuicoes.find(r => r.computadorReservaId === computadorReservaId && !r.devolvidoEm) || null;
}
function nomeAutor(id) { const e = state.employees.find(x => x.id === id); return e ? e.nome : ''; }

function registrarHistoricoLocal(computadorId, evento, manutencaoId) {
  const emp = getEffectiveEmployee();
  state.historicoComputador.push({
    id: uid('h'), computadorId, manutencaoId: manutencaoId || null, data: hojeISO(),
    evento, autorId: emp ? emp.id : null, criadoEm: new Date().toISOString(),
  });
}

/* ================= FILTROS E BUSCA ================= */
function setFiltroComputadores(campo, valor) { state.filtroComputadores[campo] = valor; renderComputadoresView(); }
function limparFiltroComputadores() {
  state.filtroComputadores = { busca: "", setor: "", status: "", colaboradorId: "", apenasManutencao: false, apenasProblema: false, apenasReserva: false, periodoInicio: null, periodoFim: null };
  renderComputadoresView();
}
function computadorTemManutencaoNoPeriodo(computadorId, ini, fim) {
  return manutencoesDoComputador(computadorId).some(m => {
    const d = m.envioData || m.problemaData;
    if (!d) return false;
    if (ini && d < ini) return false;
    if (fim && d > fim) return false;
    return true;
  });
}
function computadoresFiltrados() {
  const f = state.filtroComputadores;
  const q = f.busca.trim().toLowerCase();
  return state.computadores.filter(c => {
    if (q && !(`${c.codigo} ${c.nome} ${c.colaboradorNome}`.toLowerCase().includes(q))) return false;
    if (f.setor && c.setor !== f.setor) return false;
    if (f.status && c.status !== f.status) return false;
    if (f.colaboradorId && c.colaboradorId !== f.colaboradorId) return false;
    if (f.apenasManutencao && c.status !== 'em_manutencao') return false;
    if (f.apenasProblema && c.status !== 'com_problema') return false;
    if (f.apenasReserva && !c.ehReserva) return false;
    if ((f.periodoInicio || f.periodoFim) && !computadorTemManutencaoNoPeriodo(c.id, f.periodoInicio, f.periodoFim)) return false;
    return true;
  }).sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR'));
}

/* ================= INDICADORES DO PAINEL ================= */
function calcIndicadoresComputadores() {
  const cs = state.computadores;
  return {
    total: cs.length,
    emUso: cs.filter(c => c.status === 'em_uso').length,
    emManutencao: cs.filter(c => c.status === 'em_manutencao').length,
    disponiveisReserva: cs.filter(c => c.status === 'disponivel' || c.status === 'reserva').length,
    comProblema: cs.filter(c => c.status === 'com_problema').length,
    manutencoesConcluidas: state.manutencoesComputador.filter(m => m.status === 'concluida').length,
    manutencoesEmAndamento: state.manutencoesComputador.filter(manutencaoEmAndamento).length,
  };
}

/* ================= ALERTAS ================= */
function alertasComputadores() {
  const alertas = [];
  const LIMITE_DIAS_MANUTENCAO = 7;
  state.manutencoesComputador.filter(manutencaoEmAndamento).forEach(m => {
    const comp = computadorPorId(m.computadorId);
    if (!comp) return;
    const desde = m.envioData || m.dataEntrada || m.problemaData;
    const dias = diasEntre(desde);
    if (dias !== null && dias >= LIMITE_DIAS_MANUTENCAO) {
      alertas.push({ texto: `Computador ${comp.codigo} está em manutenção há ${dias} dias.`, computadorId: comp.id });
    }
    if (m.status === 'aguardando_peca') {
      alertas.push({ texto: `Computador ${comp.codigo} está aguardando peça.`, computadorId: comp.id });
    }
    if (m.previsaoRetorno && m.previsaoRetorno < hojeISO()) {
      alertas.push({ texto: `Computador ${comp.codigo} ultrapassou a previsão de retorno (${formatarDataBR(m.previsaoRetorno)}).`, computadorId: comp.id });
    }
  });
  state.reservaAtribuicoes.filter(r => !r.devolvidoEm).forEach(r => {
    const reserva = computadorPorId(r.computadorReservaId);
    alertas.push({ texto: `${r.colaboradorNome || 'Colaborador'} está utilizando o computador reserva ${reserva ? reserva.codigo : ''}.`, computadorId: r.computadorReservaId });
  });
  const contagem = {};
  state.manutencoesComputador.forEach(m => { contagem[m.computadorId] = (contagem[m.computadorId] || 0) + 1; });
  Object.entries(contagem).filter(([, n]) => n >= 3).forEach(([computadorId, n]) => {
    const comp = computadorPorId(computadorId);
    if (comp) alertas.push({ texto: `Computador ${comp.codigo} tem problemas recorrentes (${n} manutenções registradas).`, computadorId });
  });
  return alertas;
}

/* ================= CADASTRO DE COMPUTADOR ================= */
function toggleNovoComputador() {
  if (!podeGerenciarComputadores()) { showToast('Somente administradores ou o setor de TI podem cadastrar computadores.'); return; }
  state.novoComputador = !state.novoComputador;
  state.editingComputadorId = null;
  renderComputadoresView();
}
function editarComputador(id) {
  if (!podeGerenciarComputadores()) { showToast('Somente administradores ou o setor de TI podem editar computadores.'); return; }
  state.editingComputadorId = id;
  state.novoComputador = false;
  renderComputadoresView();
}
function cancelarFormComputador() { state.novoComputador = false; state.editingComputadorId = null; renderComputadoresView(); }
function onComputadorColaboradorChange() {
  const colabId = val('cp-colaborador');
  const emp = state.employees.find(e => e.id === colabId);
  const el = document.getElementById('cp-setor-auto');
  if (el) el.textContent = emp ? `Setor: ${emp.setor}` : 'Selecione um colaborador para preencher o setor automaticamente.';
}
function lerFormComputador() {
  const codigo = val('cp-codigo').trim();
  const nome = val('cp-nome').trim();
  const colaboradorId = val('cp-colaborador') || null;
  const emp = colaboradorId ? state.employees.find(e => e.id === colaboradorId) : null;
  return {
    codigo, nome,
    patrimonio: val('cp-patrimonio').trim(), marca: val('cp-marca').trim(), modelo: val('cp-modelo').trim(),
    numeroSerie: val('cp-numero-serie').trim(), sistemaOperacional: val('cp-so').trim(),
    dataAquisicao: val('cp-data-aquisicao') || null,
    colaboradorId, colaboradorNome: emp ? emp.nome : '', setor: emp ? emp.setor : '',
    status: val('cp-status'), ehReserva: document.getElementById('cp-eh-reserva').checked,
    localizacao: val('cp-localizacao').trim(), observacoes: val('cp-observacoes').trim(),
  };
}
async function submitComputador() {
  if (!podeGerenciarComputadores()) { showToast('Você não tem permissão para cadastrar computadores.'); return; }
  const f = lerFormComputador();
  if (!f.codigo || !f.nome) { showToast('Informe ao menos o ID da máquina e o nome do computador.'); return; }
  if (state.computadores.some(c => c.codigo.toLowerCase() === f.codigo.toLowerCase())) {
    showToast(`Já existe um computador cadastrado com o ID "${f.codigo}". O ID da máquina precisa ser único.`);
    return;
  }
  const emp = getEffectiveEmployee();
  if (!supabaseClient) {
    const novo = { id: uid('pc'), ...f, criadoPor: emp ? emp.id : null, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
    state.computadores.push(novo);
    registrarHistoricoLocal(novo.id, `Computador cadastrado — status inicial: ${statusComputadorInfo(novo.status).label}`);
    state.novoComputador = false;
    showToast('Computador cadastrado!');
    renderComputadoresView();
    return;
  }
  const payload = {
    codigo: f.codigo, nome: f.nome, patrimonio: f.patrimonio || null, marca: f.marca || null, modelo: f.modelo || null,
    numero_serie: f.numeroSerie || null, sistema_operacional: f.sistemaOperacional || null, data_aquisicao: f.dataAquisicao,
    colaborador_id: f.colaboradorId, colaborador_nome: f.colaboradorNome || null, setor: f.setor || null,
    status: f.status, eh_reserva: f.ehReserva, localizacao: f.localizacao || null, observacoes: f.observacoes || null,
    criado_por: emp ? emp.id : null, atualizado_por: emp ? emp.id : null,
  };
  const { error } = await supabaseClient.from('computadores').insert(payload);
  if (error) { showToast('Não foi possível cadastrar: ' + (error.code === '23505' ? `já existe um computador com o ID "${f.codigo}".` : error.message)); return; }
  state.novoComputador = false;
  showToast('Computador cadastrado!');
  await Promise.all([carregarComputadores(), carregarHistoricoComputador()]);
  renderComputadoresView();
}
async function submitEdicaoComputador(id) {
  if (!podeGerenciarComputadores()) { showToast('Você não tem permissão para editar computadores.'); return; }
  const f = lerFormComputador();
  if (!f.codigo || !f.nome) { showToast('Informe ao menos o ID da máquina e o nome do computador.'); return; }
  if (state.computadores.some(c => c.id !== id && c.codigo.toLowerCase() === f.codigo.toLowerCase())) {
    showToast(`Já existe outro computador cadastrado com o ID "${f.codigo}".`);
    return;
  }
  const emp = getEffectiveEmployee();
  const anterior = computadorPorId(id);
  const statusMudou = anterior && anterior.status !== f.status;
  if (!supabaseClient) {
    Object.assign(anterior, f, { atualizadoPor: emp ? emp.id : null, atualizadoEm: new Date().toISOString() });
    if (statusMudou) registrarHistoricoLocal(id, `Status alterado de "${statusComputadorInfo(anterior.status).label}" para "${statusComputadorInfo(f.status).label}"`);
    state.editingComputadorId = null;
    showToast('Computador atualizado!');
    renderComputadoresView();
    return;
  }
  const payload = {
    codigo: f.codigo, nome: f.nome, patrimonio: f.patrimonio || null, marca: f.marca || null, modelo: f.modelo || null,
    numero_serie: f.numeroSerie || null, sistema_operacional: f.sistemaOperacional || null, data_aquisicao: f.dataAquisicao,
    colaborador_id: f.colaboradorId, colaborador_nome: f.colaboradorNome || null, setor: f.setor || null,
    status: f.status, eh_reserva: f.ehReserva, localizacao: f.localizacao || null, observacoes: f.observacoes || null,
    atualizado_por: emp ? emp.id : null,
  };
  const { error } = await supabaseClient.from('computadores').update(payload).eq('id', id);
  if (error) { showToast('Não foi possível salvar: ' + error.message); return; }
  state.editingComputadorId = null;
  showToast('Computador atualizado!');
  await Promise.all([carregarComputadores(), carregarHistoricoComputador()]);
  renderComputadoresView();
}

/* ================= MANUTENÇÃO: REGISTRAR ================= */
function toggleNovaManutencao(computadorId) {
  if (!podeGerenciarComputadores()) { showToast('Somente administradores ou o setor de TI podem registrar manutenção.'); return; }
  state.novaManutencaoComputadorId = state.novaManutencaoComputadorId === computadorId ? null : computadorId;
  renderComputadoresView();
}
async function aplicarStatusComputadorPelaManutencao(computadorId, statusManutencao) {
  let novoStatus;
  if (statusManutencao === 'concluida') novoStatus = computadorPorId(computadorId).colaboradorId ? 'em_uso' : 'disponivel';
  else if (statusManutencao === 'sem_conserto') novoStatus = 'inativo';
  else if (statusManutencao === 'aguardando_envio') novoStatus = 'com_problema';
  else novoStatus = 'em_manutencao';

  const comp = computadorPorId(computadorId);
  const statusAnterior = comp.status;
  if (statusAnterior === novoStatus) return;
  const emp = getEffectiveEmployee();
  if (!supabaseClient) {
    comp.status = novoStatus; comp.atualizadoEm = new Date().toISOString(); comp.atualizadoPor = emp ? emp.id : null;
    registrarHistoricoLocal(computadorId, `Status alterado de "${statusComputadorInfo(statusAnterior).label}" para "${statusComputadorInfo(novoStatus).label}"`);
    return;
  }
  await supabaseClient.from('computadores').update({ status: novoStatus, atualizado_por: emp ? emp.id : null }).eq('id', computadorId);
}
async function submitManutencao(computadorId) {
  if (!podeGerenciarComputadores()) { showToast('Você não tem permissão para registrar manutenção.'); return; }
  const problemaRelatado = val('mn-problema').trim();
  if (!problemaRelatado) { showToast('Descreva o problema relatado.'); return; }
  const colaboradorUsavaId = val('mn-colaborador-usava') || null;
  const colabUsava = colaboradorUsavaId ? state.employees.find(e => e.id === colaboradorUsavaId) : null;
  const status = val('mn-status') || 'aguardando_envio';
  const emp = getEffectiveEmployee();
  const dados = {
    computadorId,
    problemaData: val('mn-problema-data') || hojeISO(), problemaRelatado, problemaDescricao: val('mn-problema-descricao').trim(),
    identificadoPor: val('mn-identificado-por').trim(), colaboradorUsavaId, colaboradorUsavaNome: colabUsava ? colabUsava.nome : val('mn-identificado-por').trim(),
    envioData: val('mn-envio-data') || null, tecnicoResponsavel: val('mn-tecnico').trim(), motivoEncaminhamento: val('mn-motivo').trim(),
    status, previsaoRetorno: val('mn-previsao-retorno') || null,
    diagnostico: '', servicoExecutado: '', pecasSubstituidas: '', componentesInstalados: '', observacoesTecnicas: '', responsavelManutencao: val('mn-tecnico').trim(),
    dataEntrada: val('mn-envio-data') || null, dataInicioReparo: null, dataConclusao: null, dataRetorno: null,
    valorManutencao: null, valorPecas: null, valorMaoObra: null,
  };
  if (!supabaseClient) {
    const nova = { id: uid('man'), ...dados, custoTotal: 0, criadoPor: emp ? emp.id : null, criadoEm: new Date().toISOString() };
    state.manutencoesComputador.unshift(nova);
    registrarHistoricoLocal(computadorId, `Problema registrado: ${problemaRelatado}`, nova.id);
    await aplicarStatusComputadorPelaManutencao(computadorId, status);
    state.novaManutencaoComputadorId = null;
    showToast('Manutenção registrada!');
    renderComputadoresView();
    return;
  }
  const payload = {
    computador_id: computadorId, problema_data: dados.problemaData, problema_relatado: dados.problemaRelatado,
    problema_descricao: dados.problemaDescricao || null, identificado_por: dados.identificadoPor || null,
    colaborador_usava_id: dados.colaboradorUsavaId, colaborador_usava_nome: dados.colaboradorUsavaNome || null,
    envio_data: dados.envioData, tecnico_responsavel: dados.tecnicoResponsavel || null, motivo_encaminhamento: dados.motivoEncaminhamento || null,
    status: dados.status, previsao_retorno: dados.previsaoRetorno, data_entrada: dados.dataEntrada,
    responsavel_manutencao: dados.responsavelManutencao || null, criado_por: emp ? emp.id : null,
  };
  const { error } = await supabaseClient.from('manutencoes_computador').insert(payload);
  if (error) { showToast('Não foi possível registrar a manutenção: ' + error.message); return; }
  await aplicarStatusComputadorPelaManutencao(computadorId, status);
  state.novaManutencaoComputadorId = null;
  showToast('Manutenção registrada!');
  await Promise.all([carregarManutencoesComputador(), carregarHistoricoComputador(), carregarComputadores()]);
  renderComputadoresView();
}

/* ================= MANUTENÇÃO: ATUALIZAR / ENCERRAR ================= */
function toggleEditarManutencao(id) {
  if (!podeGerenciarComputadores()) { showToast('Você não tem permissão para atualizar manutenções.'); return; }
  state.editingManutencaoId = state.editingManutencaoId === id ? null : id;
  renderComputadoresView();
}
function numOuNull(id) { const v = val(id).trim(); return v === '' ? null : Number(v); }
async function submitAtualizacaoManutencao(id, computadorId) {
  if (!podeGerenciarComputadores()) { showToast('Você não tem permissão para atualizar manutenções.'); return; }
  const status = val('mu-status');
  const dataConclusao = val('mu-data-conclusao') || (status === 'concluida' ? hojeISO() : null);
  const dados = {
    status, diagnostico: val('mu-diagnostico').trim(), servicoExecutado: val('mu-servico').trim(),
    pecasSubstituidas: val('mu-pecas').trim(), componentesInstalados: val('mu-componentes').trim(),
    observacoesTecnicas: val('mu-obs-tecnicas').trim(), responsavelManutencao: val('mu-responsavel').trim(),
    dataInicioReparo: val('mu-data-inicio') || null, dataConclusao, dataRetorno: val('mu-data-retorno') || null,
    previsaoRetorno: val('mu-previsao-retorno') || null,
    valorManutencao: numOuNull('mu-valor-manutencao'), valorPecas: numOuNull('mu-valor-pecas'), valorMaoObra: numOuNull('mu-valor-mao-obra'),
  };
  const m = state.manutencoesComputador.find(x => x.id === id);
  const statusAnterior = m.status;
  if (!supabaseClient) {
    Object.assign(m, dados, { custoTotal: (dados.valorManutencao || 0) + (dados.valorPecas || 0) + (dados.valorMaoObra || 0) });
    if (statusAnterior !== status) registrarHistoricoLocal(computadorId, `Manutenção — status alterado de "${manutencaoStatusLabel(statusAnterior)}" para "${manutencaoStatusLabel(status)}"`, id);
    await aplicarStatusComputadorPelaManutencao(computadorId, status);
    if (status === 'concluida') { const r = reservaAtivaPorPrincipal(computadorId); if (r) await devolverReserva(r.id, true); }
    state.editingManutencaoId = null;
    showToast('Manutenção atualizada!');
    renderComputadoresView();
    return;
  }
  const emp = getEffectiveEmployee();
  const payload = {
    status: dados.status, diagnostico: dados.diagnostico || null, servico_executado: dados.servicoExecutado || null,
    pecas_substituidas: dados.pecasSubstituidas || null, componentes_instalados: dados.componentesInstalados || null,
    observacoes_tecnicas: dados.observacoesTecnicas || null, responsavel_manutencao: dados.responsavelManutencao || null,
    data_inicio_reparo: dados.dataInicioReparo, data_conclusao: dados.dataConclusao, data_retorno: dados.dataRetorno,
    previsao_retorno: dados.previsaoRetorno, valor_manutencao: dados.valorManutencao, valor_pecas: dados.valorPecas, valor_mao_obra: dados.valorMaoObra,
    atualizado_por: emp ? emp.id : null,
  };
  const { error } = await supabaseClient.from('manutencoes_computador').update(payload).eq('id', id);
  if (error) { showToast('Não foi possível salvar: ' + error.message); return; }
  await aplicarStatusComputadorPelaManutencao(computadorId, status);
  if (status === 'concluida') { const r = reservaAtivaPorPrincipal(computadorId); if (r) await devolverReserva(r.id, true); }
  state.editingManutencaoId = null;
  showToast('Manutenção atualizada!');
  await Promise.all([carregarManutencoesComputador(), carregarHistoricoComputador(), carregarComputadores(), carregarReservaAtribuicoes()]);
  renderComputadoresView();
}
async function encerrarManutencao(id, computadorId) {
  if (!podeGerenciarComputadores()) { showToast('Você não tem permissão para encerrar manutenções.'); return; }
  const m = state.manutencoesComputador.find(x => x.id === id);
  const statusAnterior = m.status;
  const dataConclusao = hojeISO();
  if (!supabaseClient) {
    m.status = 'concluida'; m.dataConclusao = dataConclusao; m.dataRetorno = m.dataRetorno || dataConclusao;
    registrarHistoricoLocal(computadorId, `Manutenção — status alterado de "${manutencaoStatusLabel(statusAnterior)}" para "Manutenção concluída"`, id);
    await aplicarStatusComputadorPelaManutencao(computadorId, 'concluida');
    const r = reservaAtivaPorPrincipal(computadorId); if (r) await devolverReserva(r.id, true);
    showToast('Manutenção encerrada — computador voltou a ficar disponível.');
    renderComputadoresView();
    return;
  }
  const { error } = await supabaseClient.from('manutencoes_computador').update({ status: 'concluida', data_conclusao: dataConclusao, data_retorno: m.dataRetorno || dataConclusao }).eq('id', id);
  if (error) { showToast('Não foi possível encerrar: ' + error.message); return; }
  await aplicarStatusComputadorPelaManutencao(computadorId, 'concluida');
  const r = reservaAtivaPorPrincipal(computadorId); if (r) await devolverReserva(r.id, true);
  showToast('Manutenção encerrada — computador voltou a ficar disponível.');
  await Promise.all([carregarManutencoesComputador(), carregarHistoricoComputador(), carregarComputadores(), carregarReservaAtribuicoes()]);
  renderComputadoresView();
}

/* ================= COMPUTADORES RESERVA ================= */
function reservasDisponiveis() { return state.computadores.filter(c => c.ehReserva && !reservaAtivaPorReserva(c.id)); }
function toggleNovaAtribuicaoReserva() {
  if (!podeGerenciarComputadores()) { showToast('Somente administradores ou o setor de TI podem controlar computadores reserva.'); return; }
  state.novaAtribuicaoReserva = !state.novaAtribuicaoReserva;
  renderComputadoresView();
}
async function submitAtribuicaoReserva() {
  if (!podeGerenciarComputadores()) { showToast('Você não tem permissão para esta ação.'); return; }
  const computadorReservaId = val('rs-reserva');
  const computadorPrincipalId = val('rs-principal') || null;
  const colaboradorId = val('rs-colaborador');
  const colab = state.employees.find(e => e.id === colaboradorId);
  if (!computadorReservaId || !colab) { showToast('Selecione o computador reserva e o colaborador que vai utilizá-lo.'); return; }
  const entregueEm = val('rs-entregue-em') || hojeISO();
  const observacoes = val('rs-observacoes').trim();
  const emp = getEffectiveEmployee();
  if (!supabaseClient) {
    const nova = { id: uid('res'), computadorReservaId, computadorPrincipalId, colaboradorId, colaboradorNome: colab.nome, entregueEm, devolvidoEm: null, observacoes, criadoPor: emp ? emp.id : null, criadoEm: new Date().toISOString() };
    state.reservaAtribuicoes.unshift(nova);
    const reserva = computadorPorId(computadorReservaId);
    reserva.status = 'em_uso'; reserva.colaboradorId = colaboradorId; reserva.colaboradorNome = colab.nome; reserva.setor = colab.setor;
    registrarHistoricoLocal(computadorReservaId, `Entregue como reserva para ${colab.nome}`);
    if (computadorPrincipalId) registrarHistoricoLocal(computadorPrincipalId, `Colaborador passou a usar computador reserva (${reserva.codigo}) enquanto este está em manutenção`);
    state.novaAtribuicaoReserva = false;
    showToast('Computador reserva atribuído!');
    renderComputadoresView();
    return;
  }
  const payload = { computador_reserva_id: computadorReservaId, computador_principal_id: computadorPrincipalId, colaborador_id: colaboradorId, colaborador_nome: colab.nome, entregue_em: entregueEm, observacoes: observacoes || null, criado_por: emp ? emp.id : null };
  const { error } = await supabaseClient.from('computador_reserva_atribuicoes').insert(payload);
  if (error) { showToast('Não foi possível registrar: ' + error.message); return; }
  await supabaseClient.from('computadores').update({ status: 'em_uso', colaborador_id: colaboradorId, colaborador_nome: colab.nome, setor: colab.setor, atualizado_por: emp ? emp.id : null }).eq('id', computadorReservaId);
  state.novaAtribuicaoReserva = false;
  showToast('Computador reserva atribuído!');
  await Promise.all([carregarReservaAtribuicoes(), carregarComputadores(), carregarHistoricoComputador()]);
  renderComputadoresView();
}
async function devolverReserva(atribuicaoId, silencioso) {
  if (!silencioso && !podeGerenciarComputadores()) { showToast('Você não tem permissão para esta ação.'); return; }
  const r = state.reservaAtribuicoes.find(x => x.id === atribuicaoId);
  if (!r || r.devolvidoEm) return;
  const devolvidoEm = hojeISO();
  const emp = getEffectiveEmployee();
  if (!supabaseClient) {
    r.devolvidoEm = devolvidoEm; r.devolvidoPor = emp ? emp.id : null;
    const reserva = computadorPorId(r.computadorReservaId);
    if (reserva) { reserva.status = 'reserva'; reserva.colaboradorId = null; reserva.colaboradorNome = ''; }
    registrarHistoricoLocal(r.computadorReservaId, 'Computador reserva devolvido');
    if (!silencioso) { showToast('Devolução registrada!'); renderComputadoresView(); }
    return;
  }
  const { error } = await supabaseClient.from('computador_reserva_atribuicoes').update({ devolvido_em: devolvidoEm, devolvido_por: emp ? emp.id : null }).eq('id', atribuicaoId);
  if (error) { if (!silencioso) showToast('Não foi possível registrar a devolução: ' + error.message); return; }
  await supabaseClient.from('computadores').update({ status: 'reserva', colaborador_id: null, colaborador_nome: null }).eq('id', r.computadorReservaId);
  if (!silencioso) {
    showToast('Devolução registrada!');
    await Promise.all([carregarReservaAtribuicoes(), carregarComputadores(), carregarHistoricoComputador()]);
    renderComputadoresView();
  }
}

/* ================= RELATÓRIOS / EXPORTAÇÃO ================= */
function manutencoesNoPeriodoRelatorio() {
  const f = state.filtroComputadores;
  return state.manutencoesComputador.filter(m => {
    const d = m.problemaData;
    if (f.periodoInicio && d < f.periodoInicio) return false;
    if (f.periodoFim && d > f.periodoFim) return false;
    return true;
  });
}
function calcRelatoriosComputadores() {
  const manutencoes = manutencoesNoPeriodoRelatorio();
  const concluidas = manutencoes.filter(m => m.status === 'concluida' && m.dataEntrada && m.dataConclusao);
  const tempoMedioDias = concluidas.length ? Math.round(concluidas.reduce((acc, m) => acc + diasEntre(m.dataEntrada, m.dataConclusao), 0) / concluidas.length) : null;

  const porProblema = {};
  manutencoes.forEach(m => { const k = m.problemaRelatado.trim(); if (k) porProblema[k] = (porProblema[k] || 0) + 1; });
  const problemasFrequentes = Object.entries(porProblema).map(([texto, total]) => ({ texto, total })).sort((a, b) => b.total - a.total).slice(0, 8);

  const porComputador = {};
  manutencoes.forEach(m => { porComputador[m.computadorId] = (porComputador[m.computadorId] || 0) + 1; });
  const computadoresMaisProblemas = Object.entries(porComputador).map(([id, total]) => ({ computador: computadorPorId(id), total })).filter(x => x.computador).sort((a, b) => b.total - a.total).slice(0, 8);

  const porSetor = {};
  manutencoes.forEach(m => { const c = computadorPorId(m.computadorId); const s = c ? (c.setor || 'Sem setor') : 'Sem setor'; porSetor[s] = (porSetor[s] || 0) + 1; });

  const reservasNoPeriodo = state.reservaAtribuicoes.filter(r => {
    const f = state.filtroComputadores;
    if (f.periodoInicio && r.entregueEm < f.periodoInicio) return false;
    if (f.periodoFim && r.entregueEm > f.periodoFim) return false;
    return true;
  });

  const custoTotal = manutencoes.reduce((acc, m) => acc + (Number(m.custoTotal) || 0), 0);
  const custoPecas = manutencoes.reduce((acc, m) => acc + (Number(m.valorPecas) || 0), 0);
  const custoMaoObra = manutencoes.reduce((acc, m) => acc + (Number(m.valorMaoObra) || 0), 0);

  return {
    totalManutencoesPeriodo: manutencoes.length,
    emAndamento: manutencoes.filter(manutencaoEmAndamento).length,
    tempoMedioDias, problemasFrequentes, computadoresMaisProblemas, porSetor,
    reservasUtilizadas: reservasNoPeriodo.length, custoTotal, custoPecas, custoMaoObra,
  };
}
function baixarCSV(nomeArquivo, linhas) {
  const csv = linhas.map(l => l.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nomeArquivo; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
function exportarComputadoresCSV() {
  const linhas = [['ID da máquina', 'Nome', 'Colaborador', 'Setor', 'Status', 'Localização', 'Observações']];
  computadoresFiltrados().forEach(c => linhas.push([c.codigo, c.nome, c.colaboradorNome, c.setor, statusComputadorInfo(c.status).label, c.localizacao, c.observacoes]));
  baixarCSV('computadores.csv', linhas);
}
function exportarManutencoesCSV() {
  const linhas = [['Computador', 'Problema', 'Status', 'Data do problema', 'Envio', 'Previsão de retorno', 'Data de conclusão', 'Responsável', 'Custo total']];
  manutencoesNoPeriodoRelatorio().forEach(m => {
    const c = computadorPorId(m.computadorId);
    linhas.push([c ? c.codigo : m.computadorId, m.problemaRelatado, manutencaoStatusLabel(m.status), formatarDataBR(m.problemaData), formatarDataBR(m.envioData), formatarDataBR(m.previsaoRetorno), formatarDataBR(m.dataConclusao), m.responsavelManutencao, m.custoTotal]);
  });
  baixarCSV('manutencoes.csv', linhas);
}

/* ================= NAVEGAÇÃO ================= */
function setComputadoresTab(tab) { state.computadoresTab = tab; renderComputadoresView(); }
function abrirComputador(id) { state.computadorAtivoId = id; state.editingManutencaoId = null; state.novaManutencaoComputadorId = null; renderComputadoresView(); }
function voltarListaComputadores() { state.computadorAtivoId = null; renderComputadoresView(); }

/* ================= COMPONENTES DE RENDER ================= */
function metricCardComputador(label, value, sub) {
  return `
    <div class="card" style="padding:16px;">
      <div style="font-size:22px; font-weight:800;">${value}</div>
      <div style="font-size:11.5px; color:var(--text-3); margin-top:2px;">${esc(label)}</div>
      ${sub ? `<div style="font-size:10.5px; color:var(--text-3); margin-top:4px;">${esc(sub)}</div>` : ''}
    </div>
  `;
}
function statusPillComputador(status) {
  const info = statusComputadorInfo(status);
  return `<span class="status-pill" style="background:${info.cor}22; color:${info.cor};">${info.emoji} ${esc(info.label)}</span>`;
}
function formComputador(computador) {
  const editando = !!computador;
  const idAcao = editando ? computador.id : null;
  return `
    <div class="card" style="padding:18px; margin-bottom:16px; max-width:820px;">
      <div class="form-grid" style="grid-template-columns:1fr 1fr;">
        <div class="form-field"><label>ID da máquina *</label><input id="cp-codigo" placeholder="Ex.: PC-023" value="${esc(computador ? computador.codigo : '')}"></div>
        <div class="form-field"><label>Nome do computador *</label><input id="cp-nome" placeholder="Ex.: Notebook Financeiro 2" value="${esc(computador ? computador.nome : '')}"></div>
        <div class="form-field"><label>Número de patrimônio</label><input id="cp-patrimonio" value="${esc(computador ? computador.patrimonio : '')}"></div>
        <div class="form-field"><label>Marca</label><input id="cp-marca" value="${esc(computador ? computador.marca : '')}"></div>
        <div class="form-field"><label>Modelo</label><input id="cp-modelo" value="${esc(computador ? computador.modelo : '')}"></div>
        <div class="form-field"><label>Número de série</label><input id="cp-numero-serie" value="${esc(computador ? computador.numeroSerie : '')}"></div>
        <div class="form-field"><label>Sistema operacional</label><input id="cp-so" value="${esc(computador ? computador.sistemaOperacional : '')}"></div>
        <div class="form-field"><label>Data de aquisição</label><input id="cp-data-aquisicao" type="date" value="${computador && computador.dataAquisicao ? computador.dataAquisicao.slice(0,10) : ''}"></div>
        <div class="form-field"><label>Colaborador responsável</label>
          <select id="cp-colaborador" onchange="onComputadorColaboradorChange()">
            <option value="">— Nenhum / equipamento livre —</option>
            ${state.employees.map(e => `<option value="${e.id}" ${computador && computador.colaboradorId === e.id ? 'selected' : ''}>${esc(e.nome)} — ${esc(e.cargo)}</option>`).join('')}
          </select>
          <span id="cp-setor-auto" style="font-size:10.5px; color:var(--text-3);">${computador && computador.setor ? `Setor: ${esc(computador.setor)}` : 'Selecione um colaborador para preencher o setor automaticamente.'}</span>
        </div>
        <div class="form-field"><label>Status do computador</label>
          <select id="cp-status">${COMPUTADOR_STATUS_OPTS.map(s => `<option value="${s.value}" ${computador && computador.status === s.value ? 'selected' : (!computador && s.value === 'disponivel' ? 'selected' : '')}>${s.emoji} ${esc(s.label)}</option>`).join('')}</select>
        </div>
        <div class="form-field"><label>Localização física</label><input id="cp-localizacao" value="${esc(computador ? computador.localizacao : '')}"></div>
        <div class="form-field" style="grid-column:span 2;"><label>Observações</label><input id="cp-observacoes" value="${esc(computador ? computador.observacoes : '')}"></div>
        <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:600; grid-column:span 2;">
          <input type="checkbox" id="cp-eh-reserva" ${computador && computador.ehReserva ? 'checked' : ''} style="width:16px; height:16px;">
          Este computador faz parte do pool de computadores reserva
        </label>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="admin-add-btn" onclick="${editando ? `submitEdicaoComputador('${idAcao}')` : 'submitComputador()'}"><i class="fa-solid fa-check"></i> ${editando ? 'Salvar alterações' : 'Cadastrar computador'}</button>
        <button class="admin-cancel-btn" onclick="cancelarFormComputador()">Cancelar</button>
      </div>
    </div>
  `;
}
function filtrosComputadoresBar() {
  const f = state.filtroComputadores;
  return `
    <div class="card" style="padding:14px 16px; margin-bottom:18px;">
      <div class="form-grid" style="grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); margin-bottom:10px;">
        <div class="form-field"><label>Buscar</label><input placeholder="ID, nome ou colaborador..." value="${esc(f.busca)}" oninput="setFiltroComputadores('busca', this.value)"></div>
        <div class="form-field"><label>Setor</label>
          <select onchange="setFiltroComputadores('setor', this.value)">
            <option value="" ${!f.setor ? 'selected' : ''}>Todos</option>
            ${state.setores.map(s => `<option value="${esc(s)}" ${f.setor === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field"><label>Status</label>
          <select onchange="setFiltroComputadores('status', this.value)">
            <option value="" ${!f.status ? 'selected' : ''}>Todos</option>
            ${COMPUTADOR_STATUS_OPTS.map(s => `<option value="${s.value}" ${f.status === s.value ? 'selected' : ''}>${s.emoji} ${esc(s.label)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field"><label>Colaborador</label>
          <select onchange="setFiltroComputadores('colaboradorId', this.value)">
            <option value="" ${!f.colaboradorId ? 'selected' : ''}>Todos</option>
            ${state.employees.map(e => `<option value="${e.id}" ${f.colaboradorId === e.id ? 'selected' : ''}>${esc(e.nome)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field"><label>Período de manutenção — de</label><input type="date" value="${f.periodoInicio || ''}" onchange="setFiltroComputadores('periodoInicio', this.value || null)"></div>
        <div class="form-field"><label>até</label><input type="date" value="${f.periodoFim || ''}" onchange="setFiltroComputadores('periodoFim', this.value || null)"></div>
      </div>
      <div style="display:flex; gap:14px; flex-wrap:wrap; align-items:center;">
        <label style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600;"><input type="checkbox" ${f.apenasManutencao?'checked':''} onchange="setFiltroComputadores('apenasManutencao', this.checked)"> Somente em manutenção</label>
        <label style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600;"><input type="checkbox" ${f.apenasProblema?'checked':''} onchange="setFiltroComputadores('apenasProblema', this.checked)"> Somente com problema</label>
        <label style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600;"><input type="checkbox" ${f.apenasReserva?'checked':''} onchange="setFiltroComputadores('apenasReserva', this.checked)"> Somente reserva</label>
        <button class="admin-cancel-btn" style="margin-top:0;" onclick="limparFiltroComputadores()"><i class="fa-solid fa-filter-circle-xmark"></i> Limpar filtros</button>
      </div>
    </div>
  `;
}
function linhaComputador(c) {
  const manutAtiva = manutencaoAtivaDoComputador(c.id);
  return `
    <div class="admin-list-item" style="cursor:pointer; align-items:flex-start;" onclick="abrirComputador('${c.id}')">
      <div style="flex:1; min-width:0;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span class="mono" style="font-weight:800; font-size:13px;">${esc(c.codigo)}</span>
          <span style="font-weight:700; font-size:13px;">${esc(c.nome)}</span>
          ${statusPillComputador(c.status)}
          ${c.ehReserva ? `<span class="status-pill" style="background:#2E6DB422; color:#2E6DB4;">🔵 Reserva</span>` : ''}
        </div>
        <div class="admin-list-meta">
          ${c.colaboradorNome ? `<i class="fa-solid fa-user" style="font-size:9px;"></i> ${esc(c.colaboradorNome)} · ${esc(c.setor || '—')}` : 'Sem colaborador vinculado'}
          ${manutAtiva ? ` · <span style="color:#C06A2C; font-weight:700;">${esc(manutencaoStatusLabel(manutAtiva.status))}</span>` : ''}
          ${c.localizacao ? ` · ${esc(c.localizacao)}` : ''}
        </div>
      </div>
      <i class="fa-solid fa-chevron-right" style="color:var(--text-3); font-size:12px; margin-top:6px;"></i>
    </div>
  `;
}

/* ================= DETALHE DO COMPUTADOR ================= */
function renderComputadorDetalhe() {
  const c = computadorPorId(state.computadorAtivoId);
  if (!c) { state.computadorAtivoId = null; renderComputadoresView(); return; }
  const manutencoes = manutencoesDoComputador(c.id);
  const manutAtiva = manutencaoAtivaDoComputador(c.id);
  const historico = historicoDoComputador(c.id);
  const reservaUsandoAqui = reservaAtivaPorPrincipal(c.id); // se este é o principal, quem está com a reserva
  const estaComoReservaEmprestado = reservaAtivaPorReserva(c.id); // se este próprio é uma reserva emprestada
  const podeGerenciar = podeGerenciarComputadores();

  document.getElementById('content').innerHTML = `
    <button class="open-btn" style="margin-bottom:10px;" onclick="voltarListaComputadores()"><i class="fa-solid fa-arrow-left"></i> Voltar à listagem</button>

    <div class="card" style="padding:22px; margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
        <div>
          <div style="font-size:11px; font-weight:800; letter-spacing:.06em; color:var(--text-3); margin-bottom:4px;">SITUAÇÃO ATUAL</div>
          <div style="font-size:20px; font-weight:800;">${esc(c.codigo)} — ${esc(c.nome)}</div>
          <div style="margin-top:8px;">${statusPillComputador(c.status)} ${c.ehReserva ? `<span class="status-pill" style="background:#2E6DB422; color:#2E6DB4; margin-left:6px;">🔵 Faz parte do pool de reserva</span>` : ''}</div>
        </div>
        ${podeGerenciar ? `<button class="admin-edit-btn" title="Editar cadastro" onclick="editarComputador('${c.id}')" style="width:36px; height:36px;"><i class="fa-solid fa-pen"></i></button>` : ''}
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px,1fr)); gap:14px; margin-top:18px; font-size:12.5px; color:var(--text-2); line-height:1.8;">
        <div><strong>Colaborador:</strong> ${esc(c.colaboradorNome || '—')}</div>
        <div><strong>Setor:</strong> ${esc(c.setor || '—')}</div>
        <div><strong>Localização:</strong> ${esc(c.localizacao || '—')}</div>
        <div><strong>Patrimônio:</strong> ${esc(c.patrimonio || '—')}</div>
        <div><strong>Marca/Modelo:</strong> ${esc([c.marca, c.modelo].filter(Boolean).join(' ') || '—')}</div>
        <div><strong>Nº de série:</strong> ${esc(c.numeroSerie || '—')}</div>
        <div><strong>Sistema operacional:</strong> ${esc(c.sistemaOperacional || '—')}</div>
        <div><strong>Data de aquisição:</strong> ${c.dataAquisicao ? esc(formatarDataBR(c.dataAquisicao.slice(0,10))) : '—'}</div>
      </div>
      ${c.observacoes ? `<div style="font-size:12px; color:var(--text-3); margin-top:12px;"><strong>Observações:</strong> ${esc(c.observacoes)}</div>` : ''}
      ${manutAtiva ? `
        <div style="margin-top:16px; padding:14px; border-radius:10px; background:var(--surface-2); border-left:3px solid #C06A2C;">
          <div style="font-weight:700; font-size:12.5px; margin-bottom:4px;">Manutenção atual: ${esc(manutencaoStatusLabel(manutAtiva.status))}</div>
          <div style="font-size:12px; color:var(--text-2);">Problema: ${esc(manutAtiva.problemaRelatado)}</div>
          <div style="font-size:11px; color:var(--text-3); margin-top:4px;">
            Enviado para manutenção: ${manutAtiva.envioData ? esc(formatarDataBR(manutAtiva.envioData)) : '—'}
            · Previsão de retorno: ${manutAtiva.previsaoRetorno ? esc(formatarDataBR(manutAtiva.previsaoRetorno)) : '—'}
            · Responsável: ${esc(manutAtiva.tecnicoResponsavel || manutAtiva.responsavelManutencao || '—')}
          </div>
        </div>
      ` : ''}
      ${reservaUsandoAqui ? `<div style="margin-top:12px; font-size:12px; color:#2E6DB4;"><i class="fa-solid fa-right-left"></i> ${esc(reservaUsandoAqui.colaboradorNome)} está usando o computador reserva ${esc((computadorPorId(reservaUsandoAqui.computadorReservaId)||{}).codigo || '')} enquanto este está em manutenção.</div>` : ''}
      ${estaComoReservaEmprestado ? `<div style="margin-top:12px; font-size:12px; color:#2E6DB4;"><i class="fa-solid fa-right-left"></i> Este computador reserva está emprestado para ${esc(estaComoReservaEmprestado.colaboradorNome)} desde ${esc(formatarDataBR(estaComoReservaEmprestado.entregueEm))}. ${podeGerenciar ? `<button class="open-btn" style="display:inline;" onclick="devolverReserva('${estaComoReservaEmprestado.id}')">Registrar devolução</button>` : ''}</div>` : ''}
    </div>

    ${state.editingComputadorId === c.id ? formComputador(c) : ''}

    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:10px;">
      <div class="section-title" style="margin-bottom:0;">Histórico de Manutenções</div>
      ${podeGerenciar ? `<button class="btn-brass" onclick="toggleNovaManutencao('${c.id}')"><i class="fa-solid fa-plus"></i> Registrar manutenção</button>` : ''}
    </div>
    ${state.novaManutencaoComputadorId === c.id ? formNovaManutencao(c) : ''}
    ${manutencoes.length ? manutencoes.map(m => cardManutencao(m, c)).join('') : `<div class="card" style="padding:24px; text-align:center; color:var(--text-3); font-size:13px; margin-bottom:20px;">Nenhuma manutenção registrada para este computador ainda.</div>`}

    <div class="section-title">Histórico Completo (linha do tempo)</div>
    <div class="card" style="overflow:hidden;">
      ${historico.length ? historico.map(h => `
        <div class="aviso-row" style="cursor:default;">
          <div class="priority-bar" style="background:var(--text-3);"></div>
          <div style="flex:1;">
            <div style="font-size:12.5px; font-weight:600;">${esc(h.evento)}</div>
            <div class="mono" style="font-size:10.5px; color:var(--text-3); margin-top:2px;">${esc(formatarDataBR(h.data))}${h.autorId ? ' · ' + esc(nomeAutor(h.autorId)) : ''}</div>
          </div>
        </div>
      `).join('') : `<div style="padding:20px; text-align:center; color:var(--text-3); font-size:12.5px;">Nenhum evento registrado ainda.</div>`}
    </div>
  `;
}
function formNovaManutencao(c) {
  return `
    <div class="card" style="padding:18px; margin-bottom:16px;">
      <div style="font-weight:700; font-size:13px; margin-bottom:10px;">Problema</div>
      <div class="form-grid" style="grid-template-columns:1fr 1fr;">
        <div class="form-field"><label>Data da identificação do problema</label><input id="mn-problema-data" type="date" value="${hojeISO()}"></div>
        <div class="form-field"><label>Quem identificou o problema</label><input id="mn-identificado-por" placeholder="Nome de quem identificou"></div>
        <div class="form-field" style="grid-column:span 2;"><label>Problema relatado *</label><input id="mn-problema" placeholder="Ex.: Computador apresentando travamentos frequentes"></div>
        <div class="form-field" style="grid-column:span 2;"><label>Descrição detalhada</label><input id="mn-problema-descricao" placeholder="Detalhes do problema"></div>
        <div class="form-field"><label>Colaborador que utilizava o computador</label>
          <select id="mn-colaborador-usava">
            <option value="">— Não informado —</option>
            ${state.employees.map(e => `<option value="${e.id}" ${c.colaboradorId === e.id ? 'selected' : ''}>${esc(e.nome)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="font-weight:700; font-size:13px; margin:14px 0 10px;">Encaminhamento</div>
      <div class="form-grid" style="grid-template-columns:1fr 1fr;">
        <div class="form-field"><label>Data de envio para manutenção</label><input id="mn-envio-data" type="date"></div>
        <div class="form-field"><label>Local/técnico responsável</label><input id="mn-tecnico" placeholder="Ex.: Assistência TechFix"></div>
        <div class="form-field" style="grid-column:span 2;"><label>Motivo do encaminhamento</label><input id="mn-motivo" placeholder="Ex.: Diagnóstico de hardware"></div>
        <div class="form-field"><label>Status da manutenção</label>
          <select id="mn-status">${MANUTENCAO_STATUS_OPTS.map(s => `<option value="${s.value}">${esc(s.label)}</option>`).join('')}</select>
        </div>
        <div class="form-field"><label>Previsão de retorno</label><input id="mn-previsao-retorno" type="date"></div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="admin-add-btn" onclick="submitManutencao('${c.id}')"><i class="fa-solid fa-plus"></i> Registrar</button>
        <button class="admin-cancel-btn" onclick="toggleNovaManutencao('${c.id}')">Cancelar</button>
      </div>
    </div>
  `;
}
function cardManutencao(m, c) {
  const editando = state.editingManutencaoId === m.id;
  const podeGerenciar = podeGerenciarComputadores();
  const ativa = manutencaoEmAndamento(m);
  return `
    <div class="card" style="padding:18px; margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
        <div>
          <div style="font-weight:700; font-size:13.5px;">${esc(m.problemaRelatado)}</div>
          <div class="mono" style="font-size:10.5px; color:var(--text-3); margin-top:4px;">
            Identificado em ${esc(formatarDataBR(m.problemaData))}${m.identificadoPor ? ' por ' + esc(m.identificadoPor) : ''}
          </div>
        </div>
        <span class="status-pill" style="background:${ativa ? '#C06A2C22' : 'var(--success)22'}; color:${ativa ? '#C06A2C' : 'var(--success)'};">${esc(manutencaoStatusLabel(m.status))}</span>
      </div>
      ${m.problemaDescricao ? `<div style="font-size:12px; color:var(--text-2); margin-top:8px;">${esc(m.problemaDescricao)}</div>` : ''}
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:8px; font-size:11.5px; color:var(--text-2); margin-top:10px; line-height:1.7;">
        <div><strong>Envio:</strong> ${m.envioData ? esc(formatarDataBR(m.envioData)) : '—'}</div>
        <div><strong>Técnico/local:</strong> ${esc(m.tecnicoResponsavel || '—')}</div>
        <div><strong>Previsão de retorno:</strong> ${m.previsaoRetorno ? esc(formatarDataBR(m.previsaoRetorno)) : '—'}</div>
        ${m.diagnostico ? `<div><strong>Diagnóstico:</strong> ${esc(m.diagnostico)}</div>` : ''}
        ${m.servicoExecutado ? `<div><strong>Serviço executado:</strong> ${esc(m.servicoExecutado)}</div>` : ''}
        ${m.pecasSubstituidas ? `<div><strong>Peças substituídas:</strong> ${esc(m.pecasSubstituidas)}</div>` : ''}
        ${m.dataConclusao ? `<div><strong>Concluída em:</strong> ${esc(formatarDataBR(m.dataConclusao))}</div>` : ''}
        ${podeGerenciar && (m.valorManutencao || m.valorPecas || m.valorMaoObra) ? `<div><strong>Custo total:</strong> ${currency(m.custoTotal)}</div>` : ''}
      </div>
      ${podeGerenciar ? `
        <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
          <button class="admin-cancel-btn" style="margin-top:0;" onclick="toggleEditarManutencao('${m.id}')"><i class="fa-solid fa-pen"></i> ${editando ? 'Fechar edição' : 'Atualizar manutenção'}</button>
          ${ativa ? `<button class="admin-add-btn" style="margin-top:0;" onclick="encerrarManutencao('${m.id}','${c.id}')"><i class="fa-solid fa-flag-checkered"></i> Encerrar manutenção</button>` : ''}
        </div>
      ` : ''}
      ${editando ? formAtualizarManutencao(m, c) : ''}
    </div>
  `;
}
function formAtualizarManutencao(m, c) {
  return `
    <div style="margin-top:14px; padding-top:14px; border-top:1px solid var(--border);">
      <div class="form-grid" style="grid-template-columns:1fr 1fr;">
        <div class="form-field"><label>Status da manutenção</label>
          <select id="mu-status">${MANUTENCAO_STATUS_OPTS.map(s => `<option value="${s.value}" ${m.status===s.value?'selected':''}>${esc(s.label)}</option>`).join('')}</select>
        </div>
        <div class="form-field"><label>Responsável pela manutenção</label><input id="mu-responsavel" value="${esc(m.responsavelManutencao || m.tecnicoResponsavel || '')}"></div>
        <div class="form-field" style="grid-column:span 2;"><label>Diagnóstico realizado</label><input id="mu-diagnostico" value="${esc(m.diagnostico)}"></div>
        <div class="form-field" style="grid-column:span 2;"><label>Manutenção executada / serviço realizado</label><input id="mu-servico" value="${esc(m.servicoExecutado)}"></div>
        <div class="form-field"><label>Peças substituídas</label><input id="mu-pecas" value="${esc(m.pecasSubstituidas)}"></div>
        <div class="form-field"><label>Componentes instalados</label><input id="mu-componentes" value="${esc(m.componentesInstalados)}"></div>
        <div class="form-field" style="grid-column:span 2;"><label>Observações técnicas</label><input id="mu-obs-tecnicas" value="${esc(m.observacoesTecnicas)}"></div>
        <div class="form-field"><label>Data de início do reparo</label><input id="mu-data-inicio" type="date" value="${m.dataInicioReparo || ''}"></div>
        <div class="form-field"><label>Previsão de retorno</label><input id="mu-previsao-retorno" type="date" value="${m.previsaoRetorno || ''}"></div>
        <div class="form-field"><label>Data de conclusão</label><input id="mu-data-conclusao" type="date" value="${m.dataConclusao || ''}"></div>
        <div class="form-field"><label>Data de retorno ao escritório</label><input id="mu-data-retorno" type="date" value="${m.dataRetorno || ''}"></div>
        <div class="form-field"><label>Valor da manutenção (R$)</label><input id="mu-valor-manutencao" type="number" step="0.01" value="${m.valorManutencao ?? ''}"></div>
        <div class="form-field"><label>Valor das peças (R$)</label><input id="mu-valor-pecas" type="number" step="0.01" value="${m.valorPecas ?? ''}"></div>
        <div class="form-field"><label>Valor da mão de obra (R$)</label><input id="mu-valor-mao-obra" type="number" step="0.01" value="${m.valorMaoObra ?? ''}"></div>
      </div>
      <button class="admin-add-btn" onclick="submitAtualizacaoManutencao('${m.id}','${c.id}')"><i class="fa-solid fa-check"></i> Salvar atualização</button>
    </div>
  `;
}

/* ================= ABA: PAINEL / LISTAGEM ================= */
function renderComputadoresPainel() {
  const ind = calcIndicadoresComputadores();
  const alertas = alertasComputadores();
  const lista = computadoresFiltrados();
  return `
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:14px; margin-bottom:20px;">
      ${metricCardComputador('Total de computadores', ind.total)}
      ${metricCardComputador('Em uso', ind.emUso)}
      ${metricCardComputador('Em manutenção', ind.emManutencao)}
      ${metricCardComputador('Disponíveis/reserva', ind.disponiveisReserva)}
      ${metricCardComputador('Com problemas', ind.comProblema)}
      ${metricCardComputador('Manutenções concluídas', ind.manutencoesConcluidas)}
      ${metricCardComputador('Manutenções em andamento', ind.manutencoesEmAndamento)}
    </div>
    ${alertas.length ? `
      <div class="card" style="padding:16px; margin-bottom:20px; border-left:3px solid var(--danger);">
        <div style="font-weight:700; font-size:13px; margin-bottom:8px;"><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i> Alertas</div>
        ${alertas.map(a => `<div style="font-size:12px; color:var(--text-2); padding:4px 0; cursor:pointer;" onclick="abrirComputador('${a.computadorId}')">⚠️ ${esc(a.texto)}</div>`).join('')}
      </div>
    ` : ''}
    ${filtrosComputadoresBar()}
    <div class="section-title">Computadores cadastrados (${lista.length})</div>
    ${lista.length ? lista.map(linhaComputador).join('') : `<div class="card" style="padding:30px; text-align:center; color:var(--text-3);">Nenhum computador encontrado com os filtros selecionados.</div>`}
  `;
}

/* ================= ABA: RESERVAS ================= */
function renderComputadoresReservas() {
  const ativas = state.reservaAtribuicoes.filter(r => !r.devolvidoEm);
  const historico = state.reservaAtribuicoes.filter(r => r.devolvidoEm).sort((a,b) => new Date(b.devolvidoEm) - new Date(a.devolvidoEm));
  const disponiveis = reservasDisponiveis();
  const podeGerenciar = podeGerenciarComputadores();
  return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:10px;">
      <div class="section-title" style="margin-bottom:0;">Computadores Reserva Disponíveis (${disponiveis.length})</div>
      ${podeGerenciar ? `<button class="btn-brass" onclick="toggleNovaAtribuicaoReserva()"><i class="fa-solid fa-plus"></i> Atribuir computador reserva</button>` : ''}
    </div>
    ${state.novaAtribuicaoReserva ? `
      <div class="card" style="padding:18px; margin-bottom:16px; max-width:760px;">
        <div class="form-grid" style="grid-template-columns:1fr 1fr;">
          <div class="form-field"><label>Computador reserva</label>
            <select id="rs-reserva">${disponiveis.map(c => `<option value="${c.id}">${esc(c.codigo)} — ${esc(c.nome)}</option>`).join('') || '<option value="">Nenhum reserva disponível</option>'}</select>
          </div>
          <div class="form-field"><label>Computador principal (em manutenção)</label>
            <select id="rs-principal">
              <option value="">— Não vincular a um computador principal —</option>
              ${state.computadores.filter(c => !c.ehReserva).map(c => `<option value="${c.id}">${esc(c.codigo)} — ${esc(c.nome)}</option>`).join('')}
            </select>
          </div>
          <div class="form-field"><label>Colaborador que vai utilizar</label>
            <select id="rs-colaborador">${state.employees.map(e => `<option value="${e.id}">${esc(e.nome)}</option>`).join('')}</select>
          </div>
          <div class="form-field"><label>Entregue em</label><input id="rs-entregue-em" type="date" value="${hojeISO()}"></div>
          <div class="form-field" style="grid-column:span 2;"><label>Observações</label><input id="rs-observacoes" placeholder="Opcional"></div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="admin-add-btn" onclick="submitAtribuicaoReserva()"><i class="fa-solid fa-check"></i> Confirmar entrega</button>
          <button class="admin-cancel-btn" onclick="toggleNovaAtribuicaoReserva()">Cancelar</button>
        </div>
      </div>
    ` : ''}
    ${disponiveis.length ? disponiveis.map(linhaComputador).join('') : `<div class="card" style="padding:20px; text-align:center; color:var(--text-3); font-size:12.5px; margin-bottom:20px;">Nenhum computador reserva disponível no momento.</div>`}

    <div class="section-title">Empréstimos ativos (${ativas.length})</div>
    <div class="card" style="overflow:hidden; margin-bottom:24px;">
      ${ativas.length ? ativas.map(r => {
        const reserva = computadorPorId(r.computadorReservaId), principal = r.computadorPrincipalId ? computadorPorId(r.computadorPrincipalId) : null;
        return `
        <div class="aviso-row" style="cursor:default;">
          <div class="priority-bar" style="background:#2E6DB4;"></div>
          <div style="flex:1;">
            <div style="font-size:13px; font-weight:700;">${esc(r.colaboradorNome)} está com ${esc(reserva ? reserva.codigo : '—')}${principal ? ` (principal: ${esc(principal.codigo)} em manutenção)` : ''}</div>
            <div class="mono" style="font-size:10.5px; color:var(--text-3); margin-top:3px;">Entregue em ${esc(formatarDataBR(r.entregueEm))}</div>
          </div>
          ${podeGerenciar ? `<button class="admin-edit-btn" title="Registrar devolução" onclick="devolverReserva('${r.id}')"><i class="fa-solid fa-rotate-left" style="font-size:12px;"></i></button>` : ''}
        </div>
      `;}).join('') : `<div style="padding:20px; text-align:center; color:var(--text-3); font-size:12.5px;">Nenhum empréstimo de computador reserva ativo no momento.</div>`}
    </div>

    <div class="section-title">Histórico de empréstimos</div>
    <div class="card" style="overflow:hidden;">
      ${historico.length ? historico.slice(0,20).map(r => {
        const reserva = computadorPorId(r.computadorReservaId);
        return `
        <div class="aviso-row" style="cursor:default;">
          <div style="flex:1;">
            <div style="font-size:12.5px; font-weight:600;">${esc(r.colaboradorNome)} usou ${esc(reserva ? reserva.codigo : '—')}</div>
            <div class="mono" style="font-size:10.5px; color:var(--text-3); margin-top:2px;">${esc(formatarDataBR(r.entregueEm))} até ${esc(formatarDataBR(r.devolvidoEm))}</div>
          </div>
        </div>
      `;}).join('') : `<div style="padding:20px; text-align:center; color:var(--text-3); font-size:12.5px;">Nenhum empréstimo concluído ainda.</div>`}
    </div>
  `;
}

/* ================= ABA: RELATÓRIOS ================= */
function renderComputadoresRelatorios() {
  const f = state.filtroComputadores;
  const r = calcRelatoriosComputadores();
  return `
    <div class="card" style="padding:14px 16px; margin-bottom:18px;">
      <div class="form-grid" style="grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); margin-bottom:0;">
        <div class="form-field"><label>Período de</label><input type="date" value="${f.periodoInicio || ''}" onchange="setFiltroComputadores('periodoInicio', this.value || null)"></div>
        <div class="form-field"><label>até</label><input type="date" value="${f.periodoFim || ''}" onchange="setFiltroComputadores('periodoFim', this.value || null)"></div>
      </div>
      <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
        <button class="admin-cancel-btn" style="margin-top:0;" onclick="limparFiltroComputadores()"><i class="fa-solid fa-filter-circle-xmark"></i> Limpar período</button>
        <button class="open-btn" onclick="exportarComputadoresCSV()"><i class="fa-solid fa-file-csv"></i> Exportar computadores (CSV)</button>
        <button class="open-btn" onclick="exportarManutencoesCSV()"><i class="fa-solid fa-file-csv"></i> Exportar manutenções (CSV)</button>
      </div>
    </div>
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:14px; margin-bottom:20px;">
      ${metricCardComputador('Manutenções no período', r.totalManutencoesPeriodo)}
      ${metricCardComputador('Em andamento', r.emAndamento)}
      ${metricCardComputador('Tempo médio de manutenção', r.tempoMedioDias === null ? 'Sem dados suficientes' : `${r.tempoMedioDias} dia(s)`)}
      ${metricCardComputador('Computadores reserva utilizados', r.reservasUtilizadas)}
      ${podeGerenciarComputadores() ? metricCardComputador('Custo total no período', currency(r.custoTotal)) : ''}
      ${podeGerenciarComputadores() ? metricCardComputador('Custo de peças', currency(r.custoPecas)) : ''}
      ${podeGerenciarComputadores() ? metricCardComputador('Custo de mão de obra', currency(r.custoMaoObra)) : ''}
    </div>
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px,1fr)); gap:14px; margin-bottom:24px;">
      <div class="card" style="padding:18px;">
        <div style="font-weight:700; font-size:13px; margin-bottom:10px;">Problemas mais frequentes</div>
        ${r.problemasFrequentes.length ? r.problemasFrequentes.map(p => `
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
            <div style="flex:1; font-size:12px; color:var(--text-2);">${esc(p.texto)}</div>
            <div style="flex:2; height:8px; background:var(--surface-2); border-radius:8px; overflow:hidden;">
              <div style="height:100%; width:${Math.max((p.total / r.problemasFrequentes[0].total) * 100, 4)}%; background:var(--danger); border-radius:8px;"></div>
            </div>
            <div class="mono" style="font-size:12px; font-weight:800; width:22px; text-align:right;">${p.total}</div>
          </div>
        `).join('') : `<div style="font-size:12px; color:var(--text-3);">Nenhuma manutenção registrada no período selecionado.</div>`}
      </div>
      <div class="card" style="padding:18px;">
        <div style="font-weight:700; font-size:13px; margin-bottom:10px;">Computadores que mais apresentaram problemas</div>
        ${r.computadoresMaisProblemas.length ? r.computadoresMaisProblemas.map(x => `
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px; cursor:pointer;" onclick="abrirComputador('${x.computador.id}')">
            <div style="flex:1; font-size:12px; color:var(--text-2);">${esc(x.computador.codigo)} — ${esc(x.computador.nome)}</div>
            <div class="mono" style="font-size:12px; font-weight:800;">${x.total}</div>
          </div>
        `).join('') : `<div style="font-size:12px; color:var(--text-3);">Nenhuma manutenção registrada no período selecionado.</div>`}
      </div>
    </div>
    <div class="card" style="padding:18px;">
      <div style="font-weight:700; font-size:13px; margin-bottom:10px;">Manutenções por setor</div>
      ${Object.keys(r.porSetor).length ? Object.entries(r.porSetor).sort((a,b)=>b[1]-a[1]).map(([setor, total]) => `
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
          <div style="flex:1; font-size:12px; color:var(--text-2);">${esc(setor)}</div>
          <div class="mono" style="font-size:12px; font-weight:800;">${total}</div>
        </div>
      `).join('') : `<div style="font-size:12px; color:var(--text-3);">Nenhuma manutenção registrada no período selecionado.</div>`}
    </div>
  `;
}

/* ================= RENDER PRINCIPAL ================= */
function renderComputadoresView() {
  if (state.computadorAtivoId) { renderComputadorDetalhe(); return; }
  const podeGerenciar = podeGerenciarComputadores();
  document.getElementById('content').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:10px;">
      <div class="section-title" style="margin-bottom:0;">Computadores e Equipamentos</div>
      ${podeGerenciar ? `<button class="btn-brass" onclick="toggleNovoComputador()"><i class="fa-solid fa-plus"></i> Novo computador</button>` : ''}
    </div>
    <div style="font-size:12px; color:var(--text-2); max-width:820px; margin-bottom:16px; line-height:1.5;">
      Controle, acompanhamento e histórico dos computadores e equipamentos de informática utilizados pelos colaboradores.
      ${!podeGerenciar ? ' Seu acesso é somente leitura — cadastro, edição e manutenção são exclusivos de administradores e do setor de TI.' : ''}
    </div>
    <div style="display:flex; gap:8px; margin-bottom:18px; flex-wrap:wrap;">
      <button class="nav-item" style="width:auto; padding:8px 16px; ${state.computadoresTab==='painel'?'background:var(--brass-soft); color:var(--brass);':''}" onclick="setComputadoresTab('painel')"><i class="fa-solid fa-gauge"></i> Painel</button>
      <button class="nav-item" style="width:auto; padding:8px 16px; ${state.computadoresTab==='reservas'?'background:var(--brass-soft); color:var(--brass);':''}" onclick="setComputadoresTab('reservas')"><i class="fa-solid fa-right-left"></i> Computadores Reserva</button>
      <button class="nav-item" style="width:auto; padding:8px 16px; ${state.computadoresTab==='relatorios'?'background:var(--brass-soft); color:var(--brass);':''}" onclick="setComputadoresTab('relatorios')"><i class="fa-solid fa-chart-column"></i> Relatórios</button>
    </div>
    ${state.novoComputador ? formComputador(null) : ''}
    ${state.editingComputadorId && !state.computadorAtivoId ? formComputador(computadorPorId(state.editingComputadorId)) : ''}
    ${state.computadoresTab === 'reservas' ? renderComputadoresReservas() : state.computadoresTab === 'relatorios' ? renderComputadoresRelatorios() : renderComputadoresPainel()}
  `;
}
