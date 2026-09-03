/* ================= SINCRONIZAÇÃO COM O SUPABASE =================
   Busca cada tabela do banco e preenche `state.*` no MESMO formato que os
   `render*` já esperavam quando os dados vinham de data.js (SEED). Assim,
   quase nenhuma tela precisou ser reescrita — só passou a receber dados
   reais em vez de exemplos fixos. Chamado uma vez, logo após o login
   (ver completeLogin() em auth.js).

   Cada tabela tem RLS: o próprio Postgres já devolve só o que o usuário
   logado pode ver (ver supabase/migrations/0007_rls_policies.sql). */

function dataBRparaISO(br) {
  if (!br) return null;
  const m = String(br).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mes, y] = m;
  return `${y}-${mes.padStart(2,'0')}-${d.padStart(2,'0')}`;
}

async function carregarModulos() {
  const { data, error } = await supabaseClient.from('modulos').select('*').order('ordem');
  if (error) { console.error('Erro ao carregar módulos:', error.message); return; }
  state.modules = (data || []).map(m => ({
    id: m.id, name: m.nome, desc: m.descricao, icon: m.icone, status: m.status,
    acesso: m.acesso_restrito_texto, link: m.link || '', setor: m.setor || undefined,
    locked: m.locked, ordem: m.ordem,
  }));
}

async function carregarLinks() {
  const { data, error } = await supabaseClient.from('links_uteis').select('*').order('nome');
  if (error) { console.error('Erro ao carregar links:', error.message); return; }
  state.links = (data || []).map(l => ({ id: l.id, nome: l.nome, url: l.url }));
}

async function carregarFerramentas() {
  const { data, error } = await supabaseClient.from('ferramentas').select('*').order('nome');
  if (error) { console.error('Erro ao carregar ferramentas:', error.message); return; }
  state.tools = (data || []).map(f => ({ id: f.id, nome: f.nome, desc: f.descricao || '', url: f.url || '' }));
}

async function carregarAudiencias() {
  const { data, error } = await supabaseClient.from('audiencias').select('*').eq('data', new Date().toISOString().slice(0,10)).order('hora');
  if (error) { console.error('Erro ao carregar audiências:', error.message); return; }
  state.audiencias = (data || []).map(a => ({ id: a.id, hora: (a.hora||'').slice(0,5), cliente: a.cliente, advogado: a.advogado || '', status: a.status }));
}

async function carregarAvisos() {
  const { data, error } = await supabaseClient.from('avisos').select('*').order('criado_em', { ascending: false });
  if (error) { console.error('Erro ao carregar avisos:', error.message); return; }
  state.avisos = (data || []).map(v => ({ id: v.id, titulo: v.titulo, desc: v.descricao || '', prioridade: v.prioridade, fixado: v.fixado, data: v.data_exibicao || '' }));
}

async function carregarCarteiras() {
  const { data, error } = await supabaseClient.from('carteiras').select('*').order('nome');
  if (error) { console.error('Erro ao carregar carteiras:', error.message); return; }
  state.carteiras = (data || []).map(c => ({ id: c.id, nome: c.nome }));
}

async function carregarClassificacoes() {
  const { data, error } = await supabaseClient.from('classificacoes_sinalizacao').select('*').order('nome');
  if (error) { console.error('Erro ao carregar classificações:', error.message); return; }
  state.classificacoes = (data || []).map(c => ({ id: c.id, nome: c.nome, cor: c.cor }));
}

async function carregarSinalizacoes() {
  const { data, error } = await supabaseClient.from('sinalizacoes').select('*').order('criado_em', { ascending: false });
  if (error) { console.error('Erro ao carregar sinalizações:', error.message); return; }
  state.sinalizacoes = (data || []).map(s => {
    const autorEmp = state.employees.find(e => e.id === s.autor_id);
    return {
      id: s.id, titulo: s.titulo, colaboradorId: s.colaborador_id, colaborador: s.colaborador_nome || '',
      setor: s.setor, classificacaoId: s.classificacao_id, status: s.status, descricao: s.descricao || '',
      autorId: s.autor_id, autor: autorEmp ? autorEmp.nome : 'Colaborador removido',
      data: s.criado_em ? `${s.criado_em.slice(8,10)}/${s.criado_em.slice(5,7)}` : '',
      criadoEm: s.criado_em, tipoErro: s.tipo_erro || '', prazo: s.prazo || null, resolvidoEm: s.resolvido_em || null,
    };
  });
}

async function carregarAvaliacoesQualidade() {
  const { data, error } = await supabaseClient.from('avaliacoes_qualidade').select('*').order('criado_em', { ascending: false });
  if (error) { console.error('Erro ao carregar avaliações de qualidade:', error.message); return; }
  state.avaliacoesQualidade = (data || []).map(a => ({
    id: a.id, colaboradorId: a.colaborador_id, colaborador: a.colaborador_nome || '', setor: a.setor,
    periodo: a.periodo, clarezaComunicacao: a.clareza_comunicacao, cordialidade: a.cordialidade,
    personalizacao: a.personalizacao, proatividade: a.proatividade, cumprimentoPromessas: a.cumprimento_promessas,
    qualidadeSolucao: a.qualidade_solucao, segurancaCuidado: a.seguranca_cuidado, reclamacoes: a.reclamacoes,
    observacoes: a.observacoes || '', avaliadorId: a.avaliador_id, data: a.criado_em,
  }));
}

async function carregarAtendimentosReferencia() {
  const { data, error } = await supabaseClient.from('atendimentos_referencia').select('*').order('criado_em', { ascending: false });
  if (error) { console.error('Erro ao carregar atendimentos de referência:', error.message); return; }
  state.atendimentosReferencia = (data || []).map(r => ({
    id: r.id, colaboradorId: r.colaborador_id, colaborador: r.colaborador_nome || '', setor: r.setor,
    titulo: r.titulo, descricao: r.descricao || '', registradoPorId: r.registrado_por, data: r.criado_em,
  }));
}

async function carregarAtendimentosChat() {
  const { data, error } = await supabaseClient.from('atendimentos_chat').select('*').order('iniciado_em', { ascending: false });
  if (error) { console.error('Erro ao carregar atendimentos (chat):', error.message); return; }
  state.atendimentosChat = (data || []).map(a => ({
    id: a.id, colaboradorId: a.colaborador_id, colaborador: a.colaborador_nome || '', setor: a.setor,
    cliente: a.cliente || '', status: a.status, iniciadoEm: a.iniciado_em,
    primeiraRespostaEm: a.primeira_resposta_em || null, finalizadoEm: a.finalizado_em || null,
    registradoPorId: a.registrado_por, data: a.criado_em,
  }));
}

async function carregarSetores() {
  const { data, error } = await supabaseClient.from('setores').select('*').order('nome');
  if (error) { console.error('Erro ao carregar setores:', error.message); return; }
  state.setores = (data || []).map(s => s.nome);
}

async function carregarEquipes() {
  const { data, error } = await supabaseClient.from('equipes').select('*').order('nome');
  if (error) { console.error('Erro ao carregar equipes:', error.message); return; }
  state.equipes = (data || []).map(eq => ({
    id: eq.id, nome: eq.nome, setor: eq.setor || '', ordem: eq.ordem, ativa: eq.ativa !== false, criadoEm: eq.criado_em,
  }));
}

async function carregarPermissoesEGestores() {
  const [{ data: permData, error: permErr }, { data: gestData, error: gestErr }] = await Promise.all([
    supabaseClient.from('permissoes_setor').select('*'),
    supabaseClient.from('gestores_setor').select('*'),
  ]);
  if (permErr) { console.error('Erro ao carregar permissões:', permErr.message); }
  else {
    const obj = {};
    (permData || []).forEach(p => {
      obj[p.setor] = {
        acessoAcordos: p.acesso_acordos, acessoJuridico: p.acesso_juridico, acessoRH: p.acesso_rh,
        acessoFinanceiro: p.acesso_financeiro, verMetasGeral: p.ver_metas_geral,
        verSinalizacoesTodas: p.ver_sinalizacoes_todas, verFuncionariosTodos: p.ver_funcionarios_todos,
      };
    });
    state.setores.forEach(s => { if (!obj[s]) obj[s] = { acessoAcordos:false, acessoJuridico:false, acessoRH:false, acessoFinanceiro:false, verMetasGeral:false, verSinalizacoesTodas:false, verFuncionariosTodos:false }; });
    state.permissoesSetor = obj;
  }
  if (gestErr) { console.error('Erro ao carregar gestores:', gestErr.message); }
  else {
    const obj = {};
    state.setores.forEach(s => obj[s] = []);
    (gestData || []).forEach(g => { (obj[g.setor] ||= []).push(g.funcionario_id); });
    state.gestoresSetor = obj;
  }
}

async function carregarMetas() {
  const { data, error } = await supabaseClient.from('metas').select('*').order('criado_em', { ascending: false });
  if (error) { console.error('Erro ao carregar metas:', error.message); return; }
  state.metas = (data || []).map(m => ({
    id: m.id, nome: m.nome, descricao: m.descricao || '',
    valorMeta: Number(m.valor_meta), valorAtingido: Number(m.valor_atingido),
    dataInicial: m.data_inicial, dataFinal: m.data_final,
    tipo: m.tipo, setor: m.setor || '', carteira: m.carteira_id || '',
    responsavelId: m.responsavel_id || '', status: m.status,
  }));
}

async function carregarCursos() {
  const { data, error } = await supabaseClient
    .from('cursos')
    .select('*, aulas(*), materiais_extras(*)')
    .order('ordem');
  if (error) { console.error('Erro ao carregar cursos:', error.message); return; }
  state.cursos = (data || []).map(c => ({
    id: c.id, ordem: c.ordem, status: c.status, nome: c.nome, tema: c.tema || '', descricao: c.descricao || '',
    palestrante: {
      nome: c.palestrante_nome || '', cargo: c.palestrante_cargo || '', empresa: c.palestrante_empresa || '',
      foto: c.palestrante_foto_url || '', linkedin: c.palestrante_linkedin || '', instagram: c.palestrante_instagram || '',
      website: c.palestrante_website || '', contato: c.palestrante_contato || '',
    },
    aulas: (c.aulas || []).slice().sort((a,b)=>a.ordem-b.ordem).map(a => ({
      id: a.id, ordem: a.ordem, titulo: a.titulo, tipo: a.tipo, url: a.url || '', duracaoMin: a.duracao_min || null,
    })),
    materiaisExtras: (c.materiais_extras || []).map(m => ({ id: m.id, nome: m.nome, tipo: 'arquivo', url: m.url })),
  }));
}

/* Progresso: cada usuário só enxerga (via RLS) as próprias linhas de
   aula_conclusoes/progresso_cursos — perfeito, é exatamente o que
   progressoUsuarioCurso() precisa mostrar. */
async function carregarProgressoCursos() {
  const emp = getEffectiveEmployee();
  if (!emp) return;
  const [{ data: concl, error: e1 }, { data: prog, error: e2 }] = await Promise.all([
    supabaseClient.from('aula_conclusoes').select('aula_id, aulas(curso_id)').eq('funcionario_id', emp.id),
    supabaseClient.from('progresso_cursos').select('*').eq('funcionario_id', emp.id),
  ]);
  if (e1) { console.error('Erro ao carregar progresso (aulas):', e1.message); return; }
  if (e2) { console.error('Erro ao carregar progresso (cursos):', e2.message); return; }
  const porCurso = {};
  (concl || []).forEach(row => {
    const cursoId = row.aulas && row.aulas.curso_id;
    if (!cursoId) return;
    (porCurso[cursoId] ||= []).push(row.aula_id);
  });
  const resultado = {};
  (prog || []).forEach(p => {
    resultado[p.curso_id] = {
      aulasConcluidas: porCurso[p.curso_id] || [],
      percentual: p.percentual,
      dataInicio: p.data_inicio,
      dataConclusao: p.data_conclusao,
    };
  });
  Object.keys(porCurso).forEach(cursoId => {
    if (!resultado[cursoId]) resultado[cursoId] = { aulasConcluidas: porCurso[cursoId], percentual: 0, dataInicio: null, dataConclusao: null };
  });
  state.progressoCursos[emp.id] = resultado;
}

async function carregarAniversariantes() {
  const { data, error } = await supabaseClient.from('aniversariantes').select('*').order('nome');
  if (error) { console.error('Erro ao carregar aniversariantes:', error.message); return; }
  state.aniversariantes = (data || []).map(a => ({ id: a.id, funcionarioId: a.funcionario_id, nome: a.nome, cargo: a.cargo || '', data: a.data_aniversario || '' }));
}

async function carregarFuncionarioMes() {
  const { data, error } = await supabaseClient.from('funcionario_mes').select('*').eq('id', true).maybeSingle();
  if (error) { console.error('Erro ao carregar funcionário do mês:', error.message); return; }
  if (data) state.funcionarioMes = { nome: data.nome || '', cargo: data.cargo || '', motivo: data.motivo || '', mensagem: data.mensagem || '', foto_url: data.foto_url || null, funcionarioId: data.funcionario_id || null };
}

async function carregarParabens() {
  const emp = getEffectiveEmployee();
  if (!emp) return;
  let query = supabaseClient.from('parabens').select('*');
  if (!isAdmin()) query = query.or(`remetente_id.eq.${emp.id},aniversariante_id.eq.${emp.id}`);
  const { data, error } = await query;
  if (error) { console.error('Erro ao carregar parabéns:', error.message); return; }
  state.parabens = (data || []).map(p => ({ id: p.id, aniversarianteId: p.aniversariante_id, remetenteId: p.remetente_id, data: p.enviado_em, origem: p.origem || 'aniversario' }));
}

async function carregarNotificacoes() {
  const emp = getEffectiveEmployee();
  if (!emp) return;
  const { data, error } = await supabaseClient.from('notificacoes').select('*').eq('destinatario_id', emp.id).order('criado_em', { ascending: false });
  if (error) { console.error('Erro ao carregar notificações:', error.message); return; }
  state.notificacoes = (data || []).map(n => ({ id: n.id, destinatarioId: n.destinatario_id, remetenteId: n.remetente_id, tipo: n.tipo, texto: n.texto, data: n.criado_em, lida: n.lida }));
}

let notificacoesRealtimeChannel = null;
function assinarNotificacoesRealtime() {
  const emp = getEffectiveEmployee();
  if (!supabaseClient || !emp) return;
  if (notificacoesRealtimeChannel) { supabaseClient.removeChannel(notificacoesRealtimeChannel); notificacoesRealtimeChannel = null; }
  notificacoesRealtimeChannel = supabaseClient
    .channel('notificacoes-' + emp.id)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes', filter: `destinatario_id=eq.${emp.id}` }, (payload) => {
      const n = payload.new;
      state.notificacoes.unshift({ id: n.id, destinatarioId: n.destinatario_id, remetenteId: n.remetente_id, tipo: n.tipo, texto: n.texto, data: n.criado_em, lida: n.lida });
      renderHeader();
      if (state.currentView === 'notificacoes') renderNotificacoesView();
      showToast(textoNotificacao({ tipo: n.tipo, texto: n.texto, remetenteId: n.remetente_id }));
    })
    .subscribe();
}

async function carregarComputadores() {
  const { data, error } = await supabaseClient.from('computadores').select('*').order('codigo');
  if (error) { console.error('Erro ao carregar computadores:', error.message); return; }
  state.computadores = (data || []).map(c => ({
    id: c.id, codigo: c.codigo, nome: c.nome, patrimonio: c.patrimonio || '', marca: c.marca || '',
    modelo: c.modelo || '', numeroSerie: c.numero_serie || '', sistemaOperacional: c.sistema_operacional || '',
    dataAquisicao: c.data_aquisicao, colaboradorId: c.colaborador_id, colaboradorNome: c.colaborador_nome || '',
    setor: c.setor || '', status: c.status, ehReserva: !!c.eh_reserva, localizacao: c.localizacao || '',
    observacoes: c.observacoes || '', criadoPor: c.criado_por, criadoEm: c.criado_em,
    atualizadoPor: c.atualizado_por, atualizadoEm: c.atualizado_em,
  }));
}

async function carregarManutencoesComputador() {
  const { data, error } = await supabaseClient.from('manutencoes_computador').select('*').order('criado_em', { ascending: false });
  if (error) { console.error('Erro ao carregar manutenções de computador:', error.message); return; }
  state.manutencoesComputador = (data || []).map(m => ({
    id: m.id, computadorId: m.computador_id,
    problemaData: m.problema_data, problemaRelatado: m.problema_relatado, problemaDescricao: m.problema_descricao || '',
    identificadoPor: m.identificado_por || '', colaboradorUsavaId: m.colaborador_usava_id, colaboradorUsavaNome: m.colaborador_usava_nome || '',
    envioData: m.envio_data, tecnicoResponsavel: m.tecnico_responsavel || '', motivoEncaminhamento: m.motivo_encaminhamento || '',
    status: m.status, diagnostico: m.diagnostico || '', servicoExecutado: m.servico_executado || '',
    pecasSubstituidas: m.pecas_substituidas || '', componentesInstalados: m.componentes_instalados || '',
    observacoesTecnicas: m.observacoes_tecnicas || '', responsavelManutencao: m.responsavel_manutencao || '',
    dataEntrada: m.data_entrada, dataInicioReparo: m.data_inicio_reparo, dataConclusao: m.data_conclusao,
    dataRetorno: m.data_retorno, previsaoRetorno: m.previsao_retorno,
    valorManutencao: m.valor_manutencao, valorPecas: m.valor_pecas, valorMaoObra: m.valor_mao_obra,
    custoTotal: Number(m.custo_total || 0), criadoPor: m.criado_por, criadoEm: m.criado_em, atualizadoPor: m.atualizado_por,
  }));
}

async function carregarHistoricoComputador() {
  const { data, error } = await supabaseClient.from('historico_computador').select('*').order('criado_em');
  if (error) { console.error('Erro ao carregar histórico de computadores:', error.message); return; }
  state.historicoComputador = (data || []).map(h => ({
    id: h.id, computadorId: h.computador_id, manutencaoId: h.manutencao_id, data: h.data,
    evento: h.evento, autorId: h.autor_id, criadoEm: h.criado_em,
  }));
}

async function carregarReservaAtribuicoes() {
  const { data, error } = await supabaseClient.from('computador_reserva_atribuicoes').select('*').order('entregue_em', { ascending: false });
  if (error) { console.error('Erro ao carregar atribuições de reserva:', error.message); return; }
  state.reservaAtribuicoes = (data || []).map(r => ({
    id: r.id, computadorReservaId: r.computador_reserva_id, computadorPrincipalId: r.computador_principal_id,
    colaboradorId: r.colaborador_id, colaboradorNome: r.colaborador_nome || '',
    entregueEm: r.entregue_em, devolvidoEm: r.devolvido_em, devolvidoPor: r.devolvido_por, observacoes: r.observacoes || '',
    criadoPor: r.criado_por, criadoEm: r.criado_em,
  }));
}

/* Chamado uma vez, logo depois do login — carrega tudo que a tela inicial
   precisa. Cursos/progresso/aniversariantes/notificações entram aqui
   também porque aparecem no dashboard principal. */
async function sincronizarDadosSupabase() {
  if (!supabaseClient) return;
  await carregarSetores(); // precisa terminar antes: carregarPermissoesEGestores() usa state.setores
  await Promise.all([
    carregarModulos(), carregarLinks(), carregarFerramentas(), carregarAudiencias(),
    carregarAvisos(), carregarCarteiras(), carregarClassificacoes(), carregarSinalizacoes(),
    carregarPermissoesEGestores(), carregarMetas(), carregarCursos(), carregarAniversariantes(),
    carregarFuncionarioMes(), carregarParabens(), carregarNotificacoes(),
    carregarAvaliacoesQualidade(), carregarAtendimentosReferencia(), carregarAtendimentosChat(), carregarEquipes(),
    carregarComputadores(), carregarManutencoesComputador(), carregarHistoricoComputador(), carregarReservaAtribuicoes(),
  ]);
  await carregarProgressoCursos();
  assinarNotificacoesRealtime();
}
