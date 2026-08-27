/* ================= STATE ================= */
const state = {
  dark: false, collapsed: false, favs: ["AdvBox"],
  logo: LOGO_BASE64, teamPhoto: TEAM_PHOTO_BASE64,
  modal: null, toast: null, notifOpen: false, activeNav: "Início", query: "",
  adminOpen: false, adminTab: "acessoRapido",
  modules: JSON.parse(JSON.stringify(MODULES_SEED)),
  employees: JSON.parse(JSON.stringify(EMPLOYEES_SEED)),
  links: JSON.parse(JSON.stringify(LINKS_SEED)),
  tools: JSON.parse(JSON.stringify(TOOLS_SEED)),
  audiencias: JSON.parse(JSON.stringify(AUDIENCIAS_SEED)),
  avisos: JSON.parse(JSON.stringify(AVISOS_SEED)),
  metas: JSON.parse(JSON.stringify(METAS_GESTAO_SEED)),
  carteiras: JSON.parse(JSON.stringify(CARTEIRAS_SEED)),
  setores: [...SETORES], // editável pelo administrador (Administração > Setores); SETORES é só o valor inicial/local

  cursos: JSON.parse(JSON.stringify(CURSOS_SEED)),
  progressoCursos: {}, // { [employeeId]: { [cursoId]: { aulasConcluidas:[], dataInicio, dataConclusao, percentual } } }
  cursoAtivoId: null,
  aulaAtivaId: null,
  adminCursoGerenciandoId: null,

  parabens: [], // { id, aniversarianteId (funcionarioId), remetenteId, data (ISO) }
  notificacoes: [], // { id, destinatarioId, remetenteId, tipo, data (ISO), lida }
  funcionarioMes: { ...FUNCIONARIO_MES_SEED },
  aniversariantes: JSON.parse(JSON.stringify(ANIVERSARIANTES_SEED)),
  editing: {}, // { employee: id, link: id, tool: id, audiencia: id, aviso: id, setor: id, aniversariante: id }

  /* Rota da área de conteúdo: 'dashboard' | 'calculadora' | 'chat' | 'sinalizacoes' | 'reportarErro' */
  currentView: "dashboard",

  calc: {
    tab: "passivo", // 'passivo' | 'aditivo' | 'assessoria'

    dividas: [
      { id: "d1", tipo: "bancaria", valor: 0, pct: 0 },
    ],
    entradaPctPassivo: 15,

    aditivo: {
      totalContratado: 0, parcelaAtual: 0,
      novasDividas: 0, pctNovasDividas: 3,
      perfil: "bom", descontoPct: 0, descontoFixo: 0,
      entradaPct: 15,
    },

    assessoria: {
      plano: "essencial",
      faturamento: 1500000, funcionarios: 15, pagariaPassivo: 0,
      mostrarComo: false,
    },
    planos: JSON.parse(JSON.stringify(PLANOS_ASSESSORIA)),
  },

  bugReportEmail: BUG_REPORT_EMAIL,

  chatConversas: JSON.parse(JSON.stringify(CHAT_SEED)),
  activeChatId: "ch1",

  sinalizacoes: JSON.parse(JSON.stringify(SINALIZACOES_SEED)),
  novaSinalizacao: false,
  classificacoes: JSON.parse(JSON.stringify(CLASSIFICACOES_SEED)),

  /* ---- Painel de Eficiência, Qualidade e Alertas ---- */
  avaliacoesQualidade: [], // { id, colaboradorId, colaborador, setor, periodo, clarezaComunicacao..reclamacoes (0-10), observacoes, avaliadorId, data }
  atendimentosReferencia: [], // { id, colaboradorId, colaborador, setor, titulo, descricao, registradoPorId, data }
  atendimentosChat: [], // { id, colaboradorId, colaborador, setor, cliente, status, iniciadoEm, primeiraRespostaEm, finalizadoEm, registradoPorId, data }
  novaAvaliacaoQualidade: false,
  novoAtendimentoReferencia: false,
  novoAtendimentoChat: false,
  filtroEficiencia: {
    periodoInicio: null, periodoFim: null, // null = sem filtro de período (mostra tudo)
    setor: "", colaboradorId: "", tipoErro: "", status: "",
  },

  permissoesSetor: JSON.parse(JSON.stringify(PERMISSOES_SETOR_SEED)),
  gestoresSetor: JSON.parse(JSON.stringify(GESTORES_SETOR_SEED)),
  viewingAsId: null, // id de funcionário simulado — recurso exclusivo do administrador, para testes

  bugReports: [],
  ultimoBugReportId: null,

  loggedIn: false,
  currentUser: null,
  loginError: null,
  loginEmailDraft: "",
  loginModo: "colaborador",

  // ---- Backend do portal (manutenção com IA + autenticação/recuperação de acesso) ----
  iaBackendUrl: "http://localhost:3001", // URL do backend Node (ia-manutencao-backend) — usada tanto pela Central de Manutenção IA quanto por "Esqueci minha senha"
  iaAdminToken: "",
  iaHistorico: null,       // preenchido ao consultar o backend (admin)
  iaHistoricoStatus: null, // null | 'carregando' | 'ok' | 'erro_auth' | 'offline'
  consoleLogBuffer: [],    // últimas linhas de console.log/warn/error/info desta sessão
  jsErrorBuffer: [],       // últimos erros de JS / promises rejeitadas capturados automaticamente

  // ---- Recuperação de acesso ("esqueci minha senha") por código enviado por e-mail ----
  loginTela: "form",       // "form" | "recuperarEmail" | "recuperarCodigo"
  loginRecEmail: "",
  loginRecErro: null,
  loginRecMensagem: null,
  loginRecCodigoDemo: null, // só preenchido quando o backend está em modo demonstração (sem SMTP real)
  loginRecEnviando: false,
};

