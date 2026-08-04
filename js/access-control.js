/* ================= NÚCLEO DE CONTROLE DE ACESSO =================
   Revisão completa (auditoria + correção). Regras:
   1) isAdmin() reflete o funcionário REALMENTE logado (nivel === "Administrador"),
      nunca uma preferência de UI — antes era um botão que qualquer um clicava
      para virar "administrador" instantaneamente (falha crítica corrigida).
   2) getEffectiveEmployee() é a identidade usada em TODA checagem de acesso.
      Por padrão é o usuário logado; só o administrador pode trocar essa
      identidade (via "Visualizando como", exclusivo para testes).
      Antes, sem simulação ativa, o sistema tratava "ninguém simulado" como
      "acesso total" — ou seja, qualquer colaborador comum tinha acesso
      irrestrito por padrão. Essa era a falha mais grave encontrada na
      auditoria e foi corrigida: agora sempre há uma identidade real e as
      regras valem para ela.
   3) hasPermission()/moduleAccessCheck() são "fail-closed": se não houver
      identidade, ou a combinação setor+chave não estiver definida, o
      acesso é NEGADO por padrão (antes era liberado por padrão). */
function isAdmin() {
  return !!(state.currentUser && state.currentUser.nivel === "Administrador");
}
function getEffectiveEmployee() {
  if (isAdmin() && state.viewingAsId) {
    const simulado = state.employees.find(e => e.id === state.viewingAsId);
    if (simulado) return simulado;
  }
  return state.currentUser || null;
}
// Mantido por compatibilidade com trechos que só querem saber se há uma
// simulação de administrador ativa (ex.: badges de "modo teste" na UI).
function getViewingEmployee() {
  return (isAdmin() && state.viewingAsId) ? state.employees.find(e => e.id === state.viewingAsId) : null;
}
function setorPermissoes(setor) {
  return state.permissoesSetor[setor] || {};
}
// Bypass total só vale para o administrador real E quando ele não está
// simulando outra pessoa. Sem isso, a simulação "Visualizando como" nunca
// restringiria nada (o bypass do admin disparava antes) — bug encontrado
// e corrigido durante esta auditoria.
function isFullBypassAdmin() {
  return isAdmin() && !state.viewingAsId;
}
function hasPermission(key) {
  if (isFullBypassAdmin()) return true;
  const emp = getEffectiveEmployee();
  if (!emp) return false; // fail-closed: sem identidade válida, sem acesso
  const perms = setorPermissoes(emp.setor);
  return perms[key] === true; // chave ausente/indefinida = negado
}
function getModuleForNavLabel(label) {
  const id = NAV_MODULE_MAP[label];
  if (!id) return null;
  return state.modules.find(m => m.id === id) || null;
}
/* Checagem única de acesso a um módulo, reutilizada em TODAS as telas que
   exibem/abrem módulos (dashboard, busca, menu lateral) — antes cada tela
   tinha (ou não tinha) sua própria checagem, o que deixava brechas
   (ex: busca e o modal de módulo abriam qualquer sistema sem checar nada). */
function moduleAccessCheck(mod) {
  if (!mod) return { allowed: false, motivo: 'Módulo não encontrado.' };
  if (isFullBypassAdmin()) return { allowed: true, motivo: '' };
  const emp = getEffectiveEmployee();
  if (!emp) return { allowed: false, motivo: 'Faça login para acessar este módulo.' };
  if (mod.locked) {
    const permitidoPorNivel = emp.nivel === 'Administrador' || emp.nivel === 'Diretor' || emp.nivel === 'Líder';
    if (!permitidoPorNivel) {
      return { allowed: false, motivo: mod.acesso ? `Este módulo é restrito a: ${mod.acesso}.` : 'Este módulo tem acesso restrito.' };
    }
  }
  if (mod.setor) {
    const key = SETOR_MODULE_KEY[mod.setor];
    const perms = setorPermissoes(emp.setor);
    const permitido = key ? perms[key] === true : false;
    if (!permitido) {
      return { allowed: false, motivo: `Este módulo pertence ao setor ${mod.setor}. Seu setor (${emp.setor}) não tem acesso liberado a ele.` };
    }
  }
  return { allowed: true, motivo: '' };
}
/* Retorna { locked, motivo } para os botões do menu principal (NAV) que
   representam sistemas/setores (Acordos, Jurídico, RH, Financeiro). */
function navSectionAccess(label) {
  if (label === "Financeiro") {
    const virtualMod = { setor: "Financeiro", locked: false };
    const check = moduleAccessCheck(virtualMod);
    return { locked: !check.allowed, motivo: check.motivo || 'Este módulo mostra dados financeiros gerais do escritório, disponíveis apenas ao setor Financeiro, Diretoria e administradores.' };
  }
  const mod = getModuleForNavLabel(label);
  if (!mod) return { locked: false, motivo: '' };
  const check = moduleAccessCheck(mod);
  return { locked: !check.allowed, motivo: check.motivo };
}
function navSlug(label) { return 'nav_' + label; }
function navLabelFromSlug(slug) { return slug.slice(4); }
function classificacaoById(id) { return state.classificacoes.find(c => c.id === id); }

/* ================= HELPERS: GESTÃO DE METAS ================= */
function metaProgressoPct(meta) {
  if (!meta.valorMeta || meta.valorMeta <= 0) return 0;
  return Math.round((meta.valorAtingido / meta.valorMeta) * 100);
}
function formatarDataBR(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return (d && m && y) ? `${d}/${m}/${y}` : iso;
}
function responsavelNome(id) {
  const e = state.employees.find(x => x.id === id);
  return e ? e.nome : 'Não definido';
}
function carteiraNome(id) {
  const c = state.carteiras.find(x => x.id === id);
  return c ? c.nome : '—';
}
function metaStatusCor(status) {
  if (status === 'Atingida') return 'var(--success)';
  if (status === 'Não atingida') return 'var(--danger)';
  if (status === 'Pausada') return 'var(--text-3)';
  return 'var(--brass)'; // Em andamento
}
function isGestorDoSetor(setor) {
  if (!setor) return false;
  const emp = getEffectiveEmployee();
  if (!emp) return false;
  const lista = state.gestoresSetor[setor] || [];
  return lista.includes(emp.id);
}
/* ================= REGRAS DE VISUALIZAÇÃO DE METAS =================
   1) Administrador: acesso irrestrito a todas as metas.
   2) Todo colaborador vê SEMPRE: (a) metas Gerais — são do escritório
      inteiro, não vazam nada de outro setor/colaborador; (b) qualquer
      meta da qual ele seja o responsável direto ("sua própria meta").
   3) Metas tipo Setor são a meta coletiva do time: visíveis a todos os
      colaboradores do MESMO setor (não é "desempenho individual", é o
      objetivo compartilhado do time) — nunca a colaboradores de outro
      setor.
   4) Metas tipo Carteira são tratadas como desempenho individual de quem
      é responsável por aquela carteira: só o próprio responsável, o(s)
      gestor(es) do setor e o administrador as veem — um colega do mesmo
      setor que cuida de outra carteira NÃO enxerga (impede ver
      "desempenho de outros colaboradores").
   5) Gestor de um setor vê TODAS as metas daquele setor (Setor e
      Carteira, de qualquer responsável) — mas não de outros setores que
      não administra. */
function metaVisivelPara(meta) {
  if (isFullBypassAdmin()) return true;
  const emp = getEffectiveEmployee();
  if (!emp) return false; // fail-closed: sem identidade, sem acesso
  if (meta.tipo === 'Geral') return true; // meta geral é sempre visível a todos
  if (meta.responsavelId === emp.id) return true; // sua própria meta, sempre
  if (meta.setor && isGestorDoSetor(meta.setor)) return true; // gestor vê tudo do setor que administra
  if (meta.tipo === 'Setor' && meta.setor === emp.setor) return true; // meta coletiva do próprio setor
  // Carteira de outro colaborador, ou meta de outro setor/carteira: negado.
  return false;
}
function metasVisiveis() { return state.metas.filter(metaVisivelPara); }
function metaQuemPodeVer(meta) {
  const gestores = (state.gestoresSetor[meta.setor] || []).map(id => responsavelNome(id));
  if (meta.tipo === 'Geral') return 'Todos os colaboradores (meta geral)';
  const partes = [`Responsável: ${responsavelNome(meta.responsavelId)}`];
  if (meta.tipo === 'Setor') partes.push(`todo o setor ${meta.setor}`);
  else partes.push(`apenas o responsável`);
  if (gestores.length) partes.push(`gestor(es): ${gestores.join(', ')}`);
  partes.push('administradores');
  return partes.join(' · ');
}

