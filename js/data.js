/* ================= SEED DATA ================= */

/* Logo e foto da equipe: arquivos reais em assets/, em vez de base64
   embutido no código (mesmo comportamento, arquivo mais leve de editar). */
const LOGO_BASE64 = "assets/logo.png";
const TEAM_PHOTO_BASE64 = "assets/team-photo.jpg";

const SETORES = ["Acordos", "Jurídico", "RH", "Financeiro", "TI", "Diretoria"];
const CARGOS_ACESSO = ["Administrador", "Diretor", "Líder", "Supervisor", "Negociador", "Cobrador", "RH", "Jurídico", "Financeiro", "TI"];

const MODULES_SEED = [
  { id: 1, name: "Painel do Setor de Acordos", desc: "Negociações e acordos em andamento", icon: "scale", status: "Online", acesso: "Negociadores e operadores", link: "", setor: "Acordos" },
  { id: 2, name: "Painel do RH", desc: "Colaboradores, ponto e benefícios", icon: "users", status: "Online", link: "", setor: "RH" },
  { id: 3, name: "Painel Jurídico", desc: "Processos, prazos e andamentos", icon: "gavel", status: "Online", link: "", setor: "Jurídico" },
  { id: 4, name: "Modelos de Peças e Petições", desc: "Biblioteca de petições e modelos", icon: "file", status: "Online", link: "" },
  { id: 5, name: "Cursos e Oficinas", desc: "Treinamentos e certificações internas", icon: "grad", status: "3 novos", link: "" },
  { id: 6, name: "Arquivos e Lembranças", desc: "Documentos e memórias do escritório", icon: "folder", status: "Online", link: "" },
  { id: 7, name: "Acessos e Senhas", desc: "Somente líderes e administradores", icon: "key", status: "Restrito", locked: true, acesso: "Líderes e administradores", link: "" },
  { id: 8, name: "Ferramentas Tecnológicas Úteis", desc: "Sistemas e apps do dia a dia", icon: "wrench", status: "Online", link: "" },
  { id: 9, name: "Instruções de Trabalho", desc: "Base de conhecimento e procedimentos", icon: "book", status: "Online", link: "" },
  { id: 10, name: "Links dos Tribunais", desc: "Acesso rápido aos portais judiciais", icon: "link", status: "Online", link: "" },
  { id: 11, name: "Provas Sociais", desc: "Depoimentos e resultados", icon: "sparkles", status: "Online", link: "" },
  { id: 12, name: "Atlas", desc: "Inteligência jurídica", icon: "layers", status: "Online", link: "" },
  { id: 13, name: "AdvBox", desc: "Gestão de processos", icon: "gavel", status: "Online", link: "" },
  { id: 14, name: "SOSFY", desc: "Automação de cobrança", icon: "wallet", status: "Online", link: "" },
];

const NAV = [
  { icon: "home", label: "Início" }, { icon: "scale", label: "Acordos" }, { icon: "gavel", label: "Jurídico" },
  { icon: "users", label: "RH" }, { icon: "wallet", label: "Financeiro" }, { icon: "folder", label: "Arquivos" },
  { icon: "grad", label: "Cursos" }, { icon: "book", label: "Instruções" },
];

/* Seções extras — Calculadora, Chat, Sinalizações e Reportar Erro ficam
   destacadas em um grupo separado no menu, abaixo da navegação principal. */
const NAV_EXTRA = [
  { icon: "calc", label: "Calculadora", view: "calculadora" },
  { icon: "chat", label: "Chat", view: "chat" },
  { icon: "target", label: "Metas", view: "metas" },
  { icon: "bell", label: "Notificações", view: "notificacoes" },
  { icon: "flag", label: "Sinalizações de Colaboradores", view: "sinalizacoes" },
  { icon: "chart", label: "Eficiência, Qualidade e Alertas", view: "eficiencia" },
  { icon: "bug", label: "Reportar Erro", view: "reportarErro" },
  { icon: "help", label: "Manual do Sistema", view: "manual" },
];

/* Tipos de erro usados para classificar sinalizações e calcular "tipos de
   erros mais frequentes"/recorrência no Painel de Eficiência, Qualidade e
   Alertas. Lista fixa e curta de propósito (evita que o mesmo tipo de erro
   seja digitado de formas diferentes e "espalhe" a contagem). */
const TIPOS_ERRO_SINALIZACAO = [
  "Atraso no prazo", "Erro de comunicação", "Erro de procedimento",
  "Erro de cálculo/financeiro", "Descumprimento de instrução",
  "Erro de sistema/lançamento", "Outro",
];

const NOTIFICACOES = [
  { texto: "Novo aviso publicado: protocolo digital", tempo: "há 2h" },
  { texto: "Meta do setor de RH atingida!", tempo: "há 5h" },
  { texto: "3 novos cursos disponíveis", tempo: "ontem" },
  { texto: "Aniversário de Felipe Oliveira se aproxima", tempo: "ontem" },
];

/* Liga cada item do menu principal (NAV) ao módulo correspondente em
   MODULES_SEED, para que o botão do menu abra o sistema certo. "Início"
   não precisa de módulo (vai para o painel). "Financeiro" não tem um
   módulo de link próprio — mostra o relatório financeiro interno,
   controlado pela permissão "verMetasGeral". */
const NAV_MODULE_MAP = {
  "Acordos": 1,
  "Jurídico": 3,
  "RH": 2,
  "Financeiro": null,
  "Arquivos": 6,
  "Cursos": 5,
  "Instruções": 9,
};

const EMPLOYEES_SEED = [
  { id: "e1", nome: "Camila Prado", numero: "0001", setor: "Jurídico", cargo: "Advogada Sênior", nivel: "Líder", nascimento: "15/03/1990", telefone: "(31) 99999-0001", email: "camila.prado@oliveiracamilo.com.br" },
  { id: "e2", nome: "Felipe Oliveira", numero: "0002", setor: "Diretoria", cargo: "Diretor Jurídico", nivel: "Diretor", nascimento: "28/07/1985", telefone: "(31) 99999-0002", email: "felipe.oliveira@oliveiracamilo.com.br" },
  { id: "e3", nome: "Bruna Castro", numero: "0003", setor: "Acordos", cargo: "Negociadora", nivel: "Negociador", nascimento: "30/07/1994", telefone: "(31) 99999-0003", email: "bruna.castro@oliveiracamilo.com.br" },
  { id: "e8", nome: "Rodrigo Lima", numero: "0008", setor: "Acordos", cargo: "Negociador", nivel: "Negociador", nascimento: "22/10/1993", telefone: "(31) 99999-0008", email: "rodrigo.lima@oliveiracamilo.com.br" },
  { id: "e4", nome: "Diego Martins", numero: "0004", setor: "TI", cargo: "Analista de TI", nivel: "TI", nascimento: "31/07/1997", telefone: "(31) 99999-0004", email: "diego.martins@oliveiracamilo.com.br" },
  { id: "e5", nome: "Juliana Torres", numero: "0005", setor: "RH", cargo: "Analista de RH", nivel: "RH", nascimento: "12/05/1992", telefone: "(31) 99999-0005", email: "juliana.torres@oliveiracamilo.com.br" },
  { id: "e6", nome: "Marcos Andrade", numero: "0006", setor: "Financeiro", cargo: "Analista Financeiro", nivel: "Financeiro", nascimento: "03/09/1991", telefone: "(31) 99999-0006", email: "marcos.andrade@oliveiracamilo.com.br" },
  { id: "e7", nome: "Rafael Camilo", numero: "0007", setor: "Diretoria", cargo: "Sócio-Administrador", nivel: "Administrador", nascimento: "19/02/1982", telefone: "(31) 99999-0007", email: "rafael.camilo@oliveiracamilo.com.br" },
];

const LINKS_SEED = [
  { id: "l1", nome: "TJMG", url: "https://www.tjmg.jus.br" }, { id: "l2", nome: "TJSP", url: "https://www.tjsp.jus.br" },
  { id: "l3", nome: "TRF", url: "https://www.trf1.jus.br" }, { id: "l4", nome: "STJ", url: "https://www.stj.jus.br" },
  { id: "l5", nome: "STF", url: "https://www.stf.jus.br" }, { id: "l6", nome: "PJe", url: "https://pje.jus.br" },
  { id: "l7", nome: "e-SAJ", url: "https://esaj.tjsp.jus.br" }, { id: "l8", nome: "Projudi", url: "https://projudi.tjmg.jus.br" },
  { id: "l9", nome: "CNJ", url: "https://www.cnj.jus.br" }, { id: "l10", nome: "Receita Federal", url: "https://www.gov.br/receitafederal" },
  { id: "l11", nome: "INSS", url: "https://www.gov.br/inss" }, { id: "l12", nome: "e-CAC", url: "https://cav.receita.fazenda.gov.br" },
];

const TOOLS_SEED = [
  { id: "f1", nome: "AdvBox", desc: "Gestão de processos", url: "https://app.advbox.com.br" },
  { id: "f2", nome: "SOSFY", desc: "Automação de cobrança", url: "" },
  { id: "f3", nome: "Atlas", desc: "Inteligência jurídica", url: "" },
  { id: "f4", nome: "Microsoft 365", desc: "Produtividade", url: "https://www.office.com" },
  { id: "f5", nome: "Google Workspace", desc: "Colaboração", url: "https://workspace.google.com" },
  { id: "f6", nome: "ChatGPT", desc: "Assistente de IA", url: "https://chat.openai.com" },
];

const AUDIENCIAS_SEED = [
  { id: "a1", hora: "09:00", cliente: "Marcos Vinícius Souza", advogado: "Dra. Camila Prado", status: "Confirmada" },
  { id: "a2", hora: "10:30", cliente: "Empresa Rota Log. Ltda", advogado: "Dr. Felipe Oliveira", status: "Confirmada" },
  { id: "a3", hora: "14:00", cliente: "Sandra Regina Alves", advogado: "Dra. Camila Prado", status: "Aguardando pauta" },
  { id: "a4", hora: "16:15", cliente: "João Pedro Nunes", advogado: "Dr. Rafael Camilo", status: "Confirmada" },
];

const AVISOS_SEED = [
  { id: "v1", titulo: "Novo procedimento de protocolo digital", desc: "A partir de 01/08 todos os protocolos passam pelo módulo de Arquivos.", prioridade: "alta", fixado: true, data: "26/07" },
  { id: "v2", titulo: "Manutenção programada — AdvBox", desc: "Indisponibilidade das 22h às 23h desta quarta-feira.", prioridade: "media", fixado: false, data: "25/07" },
  { id: "v3", titulo: "Nova turma do curso de LGPD", desc: "Inscrições abertas para todos os setores até sexta-feira.", prioridade: "baixa", fixado: false, data: "23/07" },
];

/* ================= MÓDULO DE GESTÃO DE METAS =================
   Substitui o antigo sistema fixo (meta geral + % por setor) por um
   cadastro completo, gerenciado pelo administrador: cada meta tem nome,
   descrição, valor-alvo, valor já atingido (para calcular o progresso),
   período, tipo (Geral / Setor / Carteira), setor e/ou carteira
   vinculados, responsável e status. */
const CARTEIRAS_SEED = [
  { id: "cw1", nome: "Carteira Banco Alfa" },
  { id: "cw2", nome: "Carteira Financeira Sul" },
  { id: "cw3", nome: "Carteira Varejo XPTO" },
];
const METAS_TIPOS = ["Geral", "Setor", "Carteira"];
const METAS_STATUS = ["Em andamento", "Atingida", "Não atingida", "Pausada"];
const METAS_GESTAO_SEED = [
  {
    id: "mg1", nome: "Meta Geral — Julho/2026",
    descricao: "Meta consolidada de recebimentos do escritório no mês.",
    valorMeta: 850000, valorAtingido: 682000,
    dataInicial: "2026-07-01", dataFinal: "2026-07-31",
    tipo: "Geral", setor: "", carteira: "",
    responsavelId: "e2", status: "Em andamento",
  },
  {
    id: "mg2", nome: "Meta Acordos — Julho/2026",
    descricao: "Meta de valor total fechado em acordos pelo setor.",
    valorMeta: 300000, valorAtingido: 273000,
    dataInicial: "2026-07-01", dataFinal: "2026-07-31",
    tipo: "Setor", setor: "Acordos", carteira: "",
    responsavelId: "e3", status: "Em andamento",
  },
  {
    id: "mg3", nome: "Meta Jurídico — Julho/2026",
    descricao: "Meta de audiências e prazos cumpridos no mês.",
    valorMeta: 150000, valorAtingido: 111000,
    dataInicial: "2026-07-01", dataFinal: "2026-07-31",
    tipo: "Setor", setor: "Jurídico", carteira: "",
    responsavelId: "e1", status: "Em andamento",
  },
  {
    id: "mg4", nome: "Meta RH — Julho/2026",
    descricao: "Meta de processos de recrutamento concluídos.",
    valorMeta: 40000, valorAtingido: 40000,
    dataInicial: "2026-07-01", dataFinal: "2026-07-31",
    tipo: "Setor", setor: "RH", carteira: "",
    responsavelId: "e5", status: "Atingida",
  },
  {
    id: "mg5", nome: "Carteira Banco Alfa — Julho/2026",
    descricao: "Meta de recuperação de crédito da carteira Banco Alfa.",
    valorMeta: 120000, valorAtingido: 96000,
    dataInicial: "2026-07-01", dataFinal: "2026-07-31",
    tipo: "Carteira", setor: "Acordos", carteira: "cw1",
    responsavelId: "e3", status: "Em andamento",
  },
  {
    id: "mg6", nome: "Carteira Financeira Sul — Julho/2026",
    descricao: "Meta de recuperação de crédito da carteira Financeira Sul.",
    valorMeta: 90000, valorAtingido: 27000,
    dataInicial: "2026-07-01", dataFinal: "2026-07-31",
    tipo: "Carteira", setor: "Acordos", carteira: "cw2",
    responsavelId: "e8", status: "Não atingida",
  },
];

/* ================= MÓDULO DE CURSOS E OFICINAS (EAD) =================
   Conteúdo de treinamento interno. Somente o administrador cria, edita,
   exclui e organiza cursos e aulas (state.cursos). Colaboradores apenas
   consomem: assistem vídeos, abrem PDFs, baixam materiais e marcam aulas
   como concluídas — progresso rastreado por pessoa em state.progressoCursos. */
const AULA_TIPOS = [
  { value: "video", label: "Vídeo", icon: "fa-circle-play" },
  { value: "pdf", label: "PDF", icon: "fa-file-pdf" },
  { value: "apresentacao", label: "Apresentação", icon: "fa-file-powerpoint" },
  { value: "arquivo", label: "Arquivo complementar", icon: "fa-file-arrow-down" },
];
const CURSOS_SEED = [
  {
    id: "crs1", ordem: 1, status: "Publicado",
    nome: "Fundamentos de LGPD para o Escritório",
    tema: "Compliance",
    descricao: "Curso introdutório sobre a Lei Geral de Proteção de Dados aplicada à rotina jurídica, de acordos e de cobrança do escritório.",
    palestrante: {
      nome: "Dra. Helena Marques", cargo: "Consultora em Proteção de Dados", empresa: "Marques Compliance",
      foto: "", linkedin: "https://linkedin.com/in/helenamarques", instagram: "https://instagram.com/helenamarques",
      website: "https://marquescompliance.com.br", contato: "helena.marques@marquescompliance.com.br",
    },
    aulas: [
      { id: "a1", ordem: 1, titulo: "Introdução à LGPD", tipo: "video", url: "", duracaoMin: 12 },
      { id: "a2", ordem: 2, titulo: "Apostila — Conceitos e Definições", tipo: "pdf", url: "" },
      { id: "a3", ordem: 3, titulo: "Bases legais para tratamento de dados", tipo: "video", url: "", duracaoMin: 18 },
      { id: "a4", ordem: 4, titulo: "Slides da Oficina de LGPD", tipo: "apresentacao", url: "" },
    ],
    materiaisExtras: [
      { id: "m1", nome: "Checklist de conformidade LGPD.pdf", tipo: "arquivo", url: "" },
    ],
  },
  {
    id: "crs2", ordem: 2, status: "Publicado",
    nome: "Técnicas de Negociação em Acordos",
    tema: "Negociação",
    descricao: "Oficina prática com técnicas de negociação para aumentar a taxa de acordos fechados, voltada ao time de Acordos e Cobrança.",
    palestrante: {
      nome: "Rafael Camilo", cargo: "Sócio-Administrador", empresa: "Oliveira & Camilo",
      foto: "", linkedin: "", instagram: "", website: "", contato: "rafael.camilo@oliveiracamilo.com.br",
    },
    aulas: [
      { id: "a5", ordem: 1, titulo: "Abertura: por que negociação é a chave", tipo: "video", url: "", duracaoMin: 9 },
      { id: "a6", ordem: 2, titulo: "Script de abordagem — modelo", tipo: "arquivo", url: "" },
      { id: "a7", ordem: 3, titulo: "Estudo de caso: carteira Banco Alfa", tipo: "video", url: "", duracaoMin: 15 },
    ],
    materiaisExtras: [],
  },
  {
    id: "crs3", ordem: 3, status: "Rascunho",
    nome: "Segurança da Informação no Dia a Dia",
    tema: "Tecnologia",
    descricao: "Boas práticas de segurança digital para toda a equipe — senhas, phishing e uso correto dos sistemas internos.",
    palestrante: {
      nome: "Diego Martins", cargo: "Analista de TI", empresa: "Oliveira & Camilo",
      foto: "", linkedin: "", instagram: "", website: "", contato: "diego.martins@oliveiracamilo.com.br",
    },
    aulas: [
      { id: "a8", ordem: 1, titulo: "Senhas fortes e autenticação em duas etapas", tipo: "video", url: "", duracaoMin: 8 },
    ],
    materiaisExtras: [],
  },
];

const FUNCIONARIO_MES_SEED = {
  nome: "Camila Prado", cargo: "Advogada Sênior",
  motivo: "Maior índice de acordos fechados no trimestre",
  mensagem: "Camila tem sido peça-chave nos resultados do setor. Obrigado pelo empenho!",
};

const ANIVERSARIANTES_SEED = [
  { id: "n1", funcionarioId: "e2", nome: "Felipe Oliveira", cargo: "Diretor Jurídico", data: "28/07" },
  { id: "n2", funcionarioId: "e3", nome: "Bruna Castro", cargo: "Negociadora", data: "30/07" },
  { id: "n3", funcionarioId: "e4", nome: "Diego Martins", cargo: "TI", data: "31/07" },
];

/* ================= CHAT — dados de exemplo ================= */
/* ================= CALCULADORA — configuração (baseada nos prints do Defline) =================
   Os limites de faixa/fator abaixo foram inferidos a partir do único exemplo numérico
   fornecido (faturamento R$1.500.000 + 15 funcionários = FF 1,50 e FE 2,00). Ajuste os
   valores nas constantes se os critérios reais do Defline forem diferentes.
*/
const TIPOS_DIVIDA = [
  { valor: "bancaria", label: "Bancária", faixa: "8% – 12%" },
  { valor: "fiscal", label: "Fiscal / Tributária", faixa: "10% – 15%" },
  { valor: "trabalhista", label: "Trabalhista", faixa: "15% – 20%" },
  { valor: "fornecedores", label: "Fornecedores", faixa: "6% – 10%" },
  { valor: "cartao", label: "Cartão de Crédito", faixa: "10% – 15%" },
  { valor: "judicial", label: "Judicial / Execução", faixa: "15% – 25%" },
  { valor: "outros", label: "Outros", faixa: "—" },
];

const PERFIS_CLIENTE = [
  { valor: "otimo", label: "Ótimo — cliente fiel", desconto: 10 },
  { valor: "bom", label: "Bom — cliente regular", desconto: 5 },
  { valor: "regular", label: "Regular — atenção", desconto: 2 },
  { valor: "novo", label: "Novo cliente", desconto: 0 },
];

const PLANOS_ASSESSORIA = [
  { id: "essencial", nome: "Essencial", base: 4000 },
  { id: "estrategico", nome: "Estratégico", base: 6000 },
  { id: "premium", nome: "Premium", base: 10000 },
];

const FATOR_FATURAMENTO_TIERS = [
  { max: 200000, fator: 1.00 }, { max: 500000, fator: 1.15 }, { max: 1000000, fator: 1.30 },
  { max: 2000000, fator: 1.50 }, { max: 5000000, fator: 1.75 }, { max: 10000000, fator: 2.00 },
  { max: Infinity, fator: 2.25 },
];
const FATOR_ESTRUTURA_TIERS = [
  { max: 4, fator: 1.00 }, { max: 9, fator: 1.50 }, { max: 19, fator: 2.00 },
  { max: 39, fator: 2.50 }, { max: Infinity, fator: 3.00 },
];
function fatorFaturamento(v) { for (const t of FATOR_FATURAMENTO_TIERS) if (v <= t.max) return t.fator; return 2.25; }
function fatorEstrutura(n) { for (const t of FATOR_ESTRUTURA_TIERS) if (n <= t.max) return t.fator; return 3.00; }

const CHAT_SEED = [
  {
    id: "ch1", nome: "Felipe Oliveira", cargo: "Diretor Jurídico", online: true, tipo: "individual",
    mensagens: [
      { de: "them", texto: "Bom dia! Pode revisar a petição do caso Souza hoje?", hora: "09:12" },
      { de: "me", texto: "Bom dia, Felipe! Já estou vendo, te retorno até o meio-dia.", hora: "09:15" },
      { de: "them", texto: "Perfeito, obrigado!", hora: "09:16" },
    ],
  },
  {
    id: "ch2", nome: "Bruna Castro", cargo: "Negociadora", online: true, tipo: "individual",
    mensagens: [
      { de: "them", texto: "O acordo da Rota Log. foi confirmado pelo cliente.", hora: "10:40" },
      { de: "me", texto: "Ótima notícia! Vou gerar os documentos.", hora: "10:42" },
    ],
  },
  {
    id: "ch3", nome: "Diego Martins", cargo: "TI", online: false, tipo: "individual",
    mensagens: [
      { de: "them", texto: "Abri um chamado sobre a lentidão no AdvBox, já estamos verificando.", hora: "ontem" },
    ],
  },
  {
    id: "ch4", nome: "Equipe Financeiro", cargo: "Grupo · setor Financeiro", online: true, tipo: "grupo", membros: [],
    mensagens: [
      { de: "them", texto: "Fechamento do mês entra em conferência amanhã às 14h.", hora: "ontem" },
    ],
  },
];

/* ================= CLASSIFICAÇÕES DE SINALIZAÇÃO =================
   Definem a gravidade de uma sinalização (ex: Leve, Média, Grave). O
   administrador pode criar, editar e excluir essas classificações na
   seção de Administração. Cada sinalização referencia uma classificação
   pelo id. */
const CLASSIFICACOES_SEED = [
  { id: "c1", nome: "Leve", cor: "#2F9E6E" },
  { id: "c2", nome: "Média", cor: "#B4881F" },
  { id: "c3", nome: "Grave", cor: "#B8483A" },
  { id: "c4", nome: "Crítica", cor: "#7A1E14" },
];

/* ================= SINALIZAÇÕES — dados de exemplo =================
   Sinalizações servem para a liderança/RH registrar e sinalizar
   colaboradores a respeito de erros, falhas ou comportamentos que
   precisam de atenção — não são sobre clientes. */
const SINALIZACOES_SEED = [
  { id: "s1", titulo: "Prazo processual perdido por falha no acompanhamento", colaborador: "Camila Prado", setor: "Jurídico", classificacaoId: "c3", status: "aberta", descricao: "Prazo para manifestação venceu sem que o andamento fosse verificado no sistema.", autor: "Felipe Oliveira", data: "27/07" },
  { id: "s2", titulo: "Atraso recorrente no retorno a clientes", colaborador: "Bruna Castro", setor: "Acordos", classificacaoId: "c2", status: "aberta", descricao: "Terceira ocorrência no mês de demora acima de 48h para retorno a clientes em negociação.", autor: "Felipe Oliveira", data: "26/07" },
  { id: "s3", titulo: "Documentação enviada com valor divergente", colaborador: "Diego Martins", setor: "TI", classificacaoId: "c1", status: "resolvida", descricao: "Nota fiscal enviada com valor incorreto; corrigido após alerta do financeiro.", autor: "Camila Prado", data: "24/07" },
];

/* ================= PERMISSÕES DE ACESSO — BASEADAS EM SETOR =================
   Revisão completa do sistema de permissões: agora o controle de acesso é
   feito por SETOR do colaborador (Acordos, Jurídico, RH, Financeiro, TI,
   Diretoria), não mais por cargo isoladamente. Cada setor só enxerga o
   próprio painel/módulo por padrão; acessos cruzados (ex: ver o painel de
   outro setor, ver a meta geral, ver sinalizações/funcionários de todos
   os setores) precisam ser concedidos explicitamente aqui pelo
   administrador. Qualquer combinação setor+chave não listada é NEGADA
   por padrão (fail-closed) — diferente do modelo antigo, que liberava
   acesso quando não encontrava uma regra.
   Administradores (nivel "Administrador") sempre têm acesso total e
   não passam por esta tabela. */
const PERMISSOES_SETOR_KEYS = [
  { key: "acessoAcordos", label: "Painel do Setor de Acordos", desc: "Ver o painel/sistema do setor de Acordos." },
  { key: "acessoJuridico", label: "Painel Jurídico", desc: "Ver o painel/sistema do setor Jurídico." },
  { key: "acessoRH", label: "Painel do RH", desc: "Ver o painel/sistema do setor de RH." },
  { key: "acessoFinanceiro", label: "Painel Financeiro", desc: "Ver o painel/sistema do setor Financeiro." },
  { key: "verMetasGeral", label: "Ver meta geral do escritório", desc: "Ver o total consolidado (financeiro) de todos os setores, não só o próprio." },
  { key: "verSinalizacoesTodas", label: "Ver sinalizações de todos os setores", desc: "Ver sinalizações de colaboradores de qualquer setor, não só do próprio." },
  { key: "verFuncionariosTodos", label: "Ver funcionários de todos os setores", desc: "Ver o quadro completo de funcionários, não só os do próprio setor." },
];
const PERMISSOES_SETOR_SEED = {
  Acordos:    { acessoAcordos: true,  acessoJuridico: false, acessoRH: false, acessoFinanceiro: false, verMetasGeral: false, verSinalizacoesTodas: false, verFuncionariosTodos: false },
  Jurídico:   { acessoAcordos: false, acessoJuridico: true,  acessoRH: false, acessoFinanceiro: false, verMetasGeral: false, verSinalizacoesTodas: false, verFuncionariosTodos: false },
  RH:         { acessoAcordos: false, acessoJuridico: false, acessoRH: true,  acessoFinanceiro: false, verMetasGeral: false, verSinalizacoesTodas: true,  verFuncionariosTodos: true  },
  Financeiro: { acessoAcordos: false, acessoJuridico: false, acessoRH: false, acessoFinanceiro: true,  verMetasGeral: true,  verSinalizacoesTodas: false, verFuncionariosTodos: false },
  TI:         { acessoAcordos: false, acessoJuridico: false, acessoRH: false, acessoFinanceiro: false, verMetasGeral: false, verSinalizacoesTodas: false, verFuncionariosTodos: false },
  Diretoria:  { acessoAcordos: true,  acessoJuridico: true,  acessoRH: true,  acessoFinanceiro: true,  verMetasGeral: true,  verSinalizacoesTodas: true,  verFuncionariosTodos: true  },
};
/* Liga cada painel de setor à chave de permissão correspondente. */
const SETOR_MODULE_KEY = { "Acordos": "acessoAcordos", "Jurídico": "acessoJuridico", "RH": "acessoRH", "Financeiro": "acessoFinanceiro" };

/* ================= GESTORES POR SETOR =================
   Um "gestor" é um funcionário com permissão de ver TODAS as metas do(s)
   setor(es) que administra — inclusive metas de carteira/individuais de
   colegas do time, o que um colaborador comum não pode ver. Configurável
   pelo administrador em Administração > Permissões de acesso por setor.
   Seed: Felipe (Diretor) administra todos os setores operacionais;
   Camila (Líder) administra especificamente o Jurídico. */
const GESTORES_SETOR_SEED = {
  Acordos: ["e2"],
  Jurídico: ["e1", "e2"],
  RH: ["e2"],
  Financeiro: ["e2"],
  TI: ["e2"],
  Diretoria: [],
};

/* ================= REPORTAR ERRO — configuração de e-mail =================
   Este protótipo roda 100% no navegador (sem servidor), então o envio real
   de e-mail é feito abrindo o programa de e-mail padrão do usuário (mailto),
   já preenchido com o relato. Troque o e-mail abaixo pelo endereço que deve
   receber os reports. Para enviar em segundo plano, sem abrir o app de
   e-mail, seria necessário um serviço com back-end (ex: EmailJS, Formspree)
   configurado com uma chave de API própria.
*/
const BUG_REPORT_EMAIL = "gabriel.camiloo20211@gmail.com"; // e-mail padrão (o admin pode trocar dentro da própria seção "Reportar Erro")

