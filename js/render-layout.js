/* ================= RENDER: SIDEBAR ================= */
function renderSidebar() {
  const collapsedW = state.collapsed ? '76px' : '236px';
  document.getElementById('sidebar').style.width = collapsedW;
  const logoW = state.collapsed ? '40px' : '170px';
  document.getElementById('sidebar').innerHTML = `
    <div class="side-logo">
      <button class="side-logo-mark" style="width:${logoW}; cursor:${isAdmin() ? 'pointer':'default'}" onclick="onLogoClick()" title="${isAdmin() ? 'Clique para alterar a logo':'Oliveira & Camilo'}">
        ${state.logo ? `<img src="${state.logo}" style="object-fit:${state.collapsed?'cover':'contain'}; object-position:left center;">` : icon('building','', )}
      </button>
    </div>
    <div style="padding:12px 0; flex:1; overflow-y:auto;">
      ${NAV.map(n => {
        const acesso = n.label === "Início" ? { locked:false } : navSectionAccess(n.label);
        return `
        <button class="nav-item ${state.activeNav===n.label?'active':''} ${acesso.locked?'disabled':''}" onclick="setActiveNav('${n.label}')" title="${acesso.locked ? 'Você não possui permissão para acessar este módulo.' : ''}">
          ${icon(n.icon)} ${state.collapsed ? '' : esc(n.label)}
          ${(!state.collapsed && acesso.locked) ? `<i class="fa-solid fa-lock nav-lock-badge"></i>` : ''}
        </button>
      `;}).join('')}
      <div style="height:1px; background:var(--border); margin:10px 16px;"></div>
      ${!state.collapsed ? `<div style="padding:0 16px 6px; font-size:10.5px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:var(--text-3);">Ferramentas</div>` : ''}
      ${NAV_EXTRA.filter(n => n.view !== 'eficiencia' || podeVerPainelEficiencia()).map(n => `
        <button class="nav-item ${state.activeNav===n.label?'active':''}" onclick="setActiveNav('${n.label}')">
          ${icon(n.icon)} ${state.collapsed ? '' : esc(n.label)}
          ${(!state.collapsed && n.view==='sinalizacoes' && state.sinalizacoes.filter(s=>s.status==='aberta').length) ? `<span style="margin-left:auto; background:var(--danger); color:#fff; font-size:10px; font-weight:800; border-radius:100px; padding:1px 7px;">${state.sinalizacoes.filter(s=>s.status==='aberta').length}</span>` : ''}
        </button>
      `).join('')}
    </div>
    <button class="collapse-btn" onclick="toggleCollapsed()"><i class="fa-solid ${state.collapsed?'fa-chevron-right':'fa-chevron-left'}"></i></button>
  `;
}
function toggleCollapsed() { state.collapsed = !state.collapsed; renderSidebar(); }
function setActiveNav(label) {
  const extra = NAV_EXTRA.find(n => n.label === label);
  if (extra) {
    state.activeNav = label;
    state.currentView = extra.view;
    renderSidebar();
    renderContentView();
    return;
  }
  if (label === "Início" || !(label in NAV_MODULE_MAP)) {
    state.activeNav = label;
    state.currentView = "dashboard";
    renderSidebar();
    renderContentView();
    return;
  }
  // Item do menu principal ligado a um módulo/sistema
  const acesso = navSectionAccess(label);
  if (acesso.locked) {
    showToast('Você não possui permissão para acessar este módulo.');
  }
  state.activeNav = label;
  state.currentView = navSlug(label);
  renderSidebar();
  renderContentView();
}
function onLogoClick() { if (isAdmin()) document.getElementById('logoFileInput').click(); }

/* ================= RENDER: HEADER ================= */
function renderHeader() {
  const usuarioLogado = state.currentUser || state.employees[0];
  const admin = isAdmin();
  const simulando = admin && getViewingEmployee();
  document.getElementById('header').innerHTML = `
    <div class="search-wrap">
      <div class="search-box">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input id="searchInput" placeholder="Buscar arquivos, pessoas, cursos, avisos..." value="${esc(state.query)}" oninput="onSearchInput(this.value)">
      </div>
      <div id="searchResults"></div>
    </div>
    <div style="display:flex; align-items:center; gap:12px; position:relative;">
      <div class="role-chip" title="${admin ? 'Você está logado como administrador (acesso total)' : `Seu acesso é definido pelo setor ${esc(usuarioLogado.setor)}`}" style="cursor:default;">
        <i class="fa-solid ${admin ? 'fa-shield-halved' : 'fa-user'}"></i> ${admin ? 'Administrador' : `Colaborador · ${esc(usuarioLogado.setor)}`}
      </div>
      ${admin ? `
        <select onchange="setViewingAs(this.value)" title="Simular a visão de acesso de um colaborador (somente para testes de administrador)" style="font-size:11.5px; font-weight:700; padding:7px 10px; border-radius:100px; border:1px solid var(--border); background:var(--surface-2); color:var(--text-2); max-width:190px;">
          <option value="">Visualizando: Eu (acesso total)</option>
          ${state.employees.filter(e=>e.id!==usuarioLogado.id).map(e => `<option value="${e.id}" ${state.viewingAsId===e.id?'selected':''}>Ver como: ${esc(e.nome)} (${esc(e.setor)})</option>`).join('')}
        </select>
      ` : ''}
      ${simulando ? `<span class="status-pill" style="background:var(--danger-soft); color:var(--danger);" title="Você está vendo o portal como outro colaborador, para fins de teste"><i class="fa-solid fa-eye"></i> Simulando: ${esc(simulando.nome)}</span>` : ''}
      <div class="toggle-track" onclick="toggleDark()"><div class="toggle-thumb" style="transform:translateX(${state.dark?'18px':'0'})"></div></div>
      <button class="icon-btn" onclick="toggleNotif()"><i class="fa-solid fa-bell"></i>${notificacoesNaoLidasCount() > 0 ? `<span class="badge-dot"></span>` : ''}</button>
      ${admin ? `<button class="icon-btn" onclick="openAdmin()" title="Configurações administrativas"><i class="fa-solid fa-gear"></i></button>` : ''}
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="avatar">${esc(initials(usuarioLogado.nome))}</div>
        ${state.collapsed ? '' : `<div style="line-height:1.1;"><div style="font-size:13px; font-weight:700;">${esc(usuarioLogado.nome)}</div><div style="font-size:11px; color:var(--text-3);">${esc(usuarioLogado.cargo)}</div></div>`}
      </div>
      <button class="icon-btn" onclick="logout()" title="Sair do portal"><i class="fa-solid fa-right-from-bracket"></i></button>
      <div id="notifDropdown"></div>
    </div>
  `;
  renderSearchResults();
  renderNotifDropdown();
}
function toggleDark() { state.dark = !state.dark; document.getElementById('portal').classList.toggle('dark', state.dark); renderHeader(); }
function toggleNotif() { state.notifOpen = !state.notifOpen; renderNotifDropdown(); }
function renderNotifDropdown() {
  const el = document.getElementById('notifDropdown');
  if (!state.notifOpen) { el.innerHTML = ''; return; }
  const pessoais = notificacoesDoUsuario().slice(0, 6);
  el.innerHTML = `
    <div class="notif-dropdown">
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px 6px;">
        <span style="font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; color:var(--text-3);">Notificações</span>
        ${notificacoesNaoLidasCount() > 0 ? `<button class="open-btn" style="font-size:11px;" onclick="marcarTodasNotificacoesLidas()">Marcar todas como lidas</button>` : ''}
      </div>
      ${pessoais.length === 0 ? `<div class="notif-item" style="color:var(--text-3);">Nenhuma notificação pessoal ainda.</div>` : pessoais.map(n => {
        const remetente = funcionarioPorId(n.remetenteId);
        return `
        <div class="notif-item" style="display:flex; gap:10px; align-items:flex-start; background:${n.lida?'transparent':'var(--surface-2)'}; cursor:pointer;" onclick="marcarNotificacaoLida('${n.id}')">
          <div class="avatar" style="width:28px; height:28px; font-size:10px; flex-shrink:0;">${remetente?esc(initials(remetente.nome)):'?'}</div>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; line-height:1.35;">${textoNotificacao(n)}</div>
            <div style="color:var(--text-3); font-size:11px; margin-top:2px;">${tempoRelativo(n.data)}${!n.lida?' · <span style="color:var(--brass); font-weight:700;">nova</span>':''}</div>
          </div>
        </div>
      `;}).join('')}
      ${NOTIFICACOES.map(n => `<div class="notif-item"><div style="font-weight:700;">${esc(n.texto)}</div><div style="color:var(--text-3); font-size:11px; margin-top:2px;">${esc(n.tempo)}</div></div>`).join('')}
      <div style="padding:8px 14px 4px;">
        <button class="open-btn" onclick="setActiveNav('Notificações'); toggleNotif();">Ver central de notificações <i class="fa-solid fa-arrow-right"></i></button>
      </div>
    </div>`;
}
function onSearchInput(v) { state.query = v; renderSearchResults(); }
function renderSearchResults() {
  const q = state.query.trim().toLowerCase();
  const el = document.getElementById('searchResults');
  if (!q) { el.innerHTML = ''; return; }
  // Módulos sem permissão nem aparecem na busca — evita expor a existência
  // de sistemas de outro setor a quem não deveria ter acesso a eles.
  const results = state.modules.filter(m => m.name.toLowerCase().includes(q) && moduleAccessCheck(m).allowed);
  el.innerHTML = results.length ? `
    <div class="search-results">
      ${results.map(m => `<div class="search-result-item" onclick="openModuleModal(${m.id}); clearSearch();">${esc(m.name)}</div>`).join('')}
    </div>` : '';
}
function clearSearch() { state.query = ''; document.getElementById('searchInput').value=''; renderSearchResults(); }

/* ================= RENDER: HERO ================= */
function ringSvg(pct, size, stroke) {
  size = size||56; stroke = stroke||6;
  const r = (size-stroke)/2, c = 2*Math.PI*r;
  return `<svg width="${size}" height="${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" class="ring-track" stroke-width="${stroke}" fill="none"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" class="ring-fill" fill="none" stroke-width="${stroke}"
      stroke-dasharray="${c}" stroke-dashoffset="${c - (c*pct)/100}" stroke-linecap="round"
      transform="rotate(-90 ${size/2} ${size/2})"/>
  </svg>`;
}
function renderHero() {
  const el = document.getElementById('heroRoot');
  if (!el) return;
  const admin = isAdmin();
  el.innerHTML = `
    <button class="hero" onclick="onTeamPhotoClick()" title="${admin?'Clique para atualizar a foto do time':'Foto do time'}" style="cursor:${admin?'pointer':'default'}">
      ${state.teamPhoto ? `<img class="team-bg" src="${state.teamPhoto}">` : ''}
      <div class="hero-overlay"></div>
      ${!state.teamPhoto ? `<div class="hero-empty-hint"><i class="fa-solid fa-image" style="font-size:28px;"></i><span style="font-size:12.5px; font-weight:600;">${admin?'Clique para adicionar a foto do time':'Foto do time em breve'}</span></div>` : ''}
      <div class="hero-content">
        <div style="font-size:11px; font-weight:800; letter-spacing:.14em; color:var(--brass-light); margin-bottom:6px;">INTRANET</div>
        <div class="serif" style="font-size:30px; font-weight:700; color:var(--brass-light);">Oliveira & Camilo</div>
        <div style="font-size:12.5px; opacity:.8; margin-top:6px;">Tudo o que sua equipe precisa, em um só lugar.</div>
      </div>
      ${admin ? `<div class="hero-edit-badge"><i class="fa-solid fa-camera"></i> ${state.teamPhoto?'Alterar foto do time':'Adicionar foto do time'}</div>` : ''}
    </button>
  `;
}
function onTeamPhotoClick() { if (isAdmin()) document.getElementById('teamFileInput').click(); }

/* ================= RENDER: QUICK ACCESS ================= */
function openModuleLink(m) {
  const check = moduleAccessCheck(m);
  if (!check.allowed) { showToast(check.motivo || 'Você não possui permissão para acessar este módulo.'); return; }
  if (m.link && m.link.trim()) { window.open(m.link, '_blank', 'noopener,noreferrer'); }
  else { showToast(isAdmin() ? 'Nenhum link configurado — adicione em Configurações' : 'Link ainda não configurado'); }
}
function openModuleLinkById(id, ev) { if (ev) ev.stopPropagation(); const m = state.modules.find(x=>x.id===id); if (m) openModuleLink(m); }
function openModuleModal(id) {
  const m = state.modules.find(x=>x.id===id);
  if (!m) return;
  const check = moduleAccessCheck(m);
  if (!check.allowed) { showToast(check.motivo || 'Você não possui permissão para acessar este módulo.'); return; }
  state.modal = { kind: 'module', ...m };
  renderModal();
}
function renderQuickAccess() {
  const el = document.getElementById('quickAccessGrid');
  if (!el) return;
  el.innerHTML = state.modules.map(m => {
    const check = moduleAccessCheck(m);
    const bloqueado = !check.allowed;
    return `
    <button class="card module-card" onclick="${bloqueado ? `showToast('${(check.motivo || 'Você não possui permissão para acessar este módulo.').replace(/'/g, "\\'")}')` : `openModuleModal(${m.id})`}" style="${bloqueado ? 'opacity:.55;' : ''}">
      <div class="module-icon ${(m.locked||bloqueado)?'locked':''}">${(m.locked||bloqueado) ? '<i class="fa-solid fa-lock"></i>' : icon(m.icon)}</div>
      <div style="font-size:14px; font-weight:700; margin-bottom:4px;">${esc(m.name)}</div>
      <div style="font-size:12px; color:var(--text-2); margin-bottom:10px; line-height:1.4;">${esc(m.desc)}</div>
      <span class="status-pill">${esc(m.status)}</span>
      ${m.acesso ? `<span class="access-tag">Acesso: ${esc(m.acesso)}</span>` : (m.setor ? `<span class="access-tag">Setor: ${esc(m.setor)}</span>` : '')}
      ${bloqueado
        ? `<div class="open-btn" style="color:var(--text-3);" onclick="event.stopPropagation(); showToast('${(check.motivo || 'Você não possui permissão para acessar este módulo.').replace(/'/g, "\\'")}')">Sem permissão <i class="fa-solid fa-lock" style="font-size:11px;"></i></div>`
        : (m.link && m.link.trim()
          ? `<a class="open-btn" href="${esc(m.link)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Abrir <i class="fa-solid fa-arrow-right"></i></a>`
          : `<div class="open-btn" onclick="openModuleLinkById(${m.id}, event)">Abrir <i class="fa-solid fa-arrow-right"></i> <span class="link-missing-dot" title="Link não configurado"></span></div>`)}
    </button>
  `;}).join('');
}

/* ================= RENDER: AUDIENCIAS ================= */
function renderAudiencias() {
  const el = document.getElementById('audienciasList');
  if (!el) return; // a Home não está em tela agora — nada a atualizar
  el.innerHTML = state.audiencias.map((a,i) => `
    <div class="row-hover" style="display:flex; align-items:center; gap:14px; padding:10px 4px; border-bottom:${i<state.audiencias.length-1?'1px solid var(--border)':'none'};">
      <div class="mono" style="font-size:13px; font-weight:700; color:var(--navy); width:48px;">${esc(a.hora)}</div>
      <div style="flex:1;">
        <div style="font-size:13px; font-weight:700;">${esc(a.cliente)}</div>
        <div style="font-size:11.5px; color:var(--text-3);">${esc(a.advogado)}</div>
      </div>
      <span class="status-pill" ${a.status!=='Confirmada' ? 'style="background:var(--danger-soft); color:var(--danger);"' : ''}>${esc(a.status)}</span>
    </div>
  `).join('');
}

/* ================= RENDER: METAS ================= */
function renderMetas() {
  const metasBodyEl = document.getElementById('metasBody');
  if (!metasBodyEl) return; // a Home não está em tela agora — nada a atualizar
  const visiveis = metasVisiveis();
  const metaGeral = visiveis.find(m => m.tipo === 'Geral');
  const pct = metaGeral ? metaProgressoPct(metaGeral) : 0;
  const setoresVisiveis = visiveis.filter(m => m.tipo === 'Setor');
  document.getElementById('metasBody').innerHTML = `
    ${metaGeral ? `
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:16px;">
        ${ringSvg(pct)}
        <div>
          <div style="font-size:20px; font-weight:800;">${currency(metaGeral.valorAtingido)}</div>
          <div style="font-size:12px; color:var(--text-3);">de ${currency(metaGeral.valorMeta)} (${esc(metaGeral.nome)})</div>
        </div>
      </div>
    ` : `
      <div style="font-size:12px; color:var(--text-3); margin-bottom:14px;">Nenhuma meta geral cadastrada no momento.</div>
    `}
    ${setoresVisiveis.length ? setoresVisiveis.map(m => { const p = metaProgressoPct(m); return `
      <div style="margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
          <span style="font-weight:600; color:var(--text-2);">${esc(m.setor)}</span>
          <span class="mono" style="font-weight:700;">${p}%</span>
        </div>
        <div style="height:6px; background:var(--surface-2); border-radius:8px; overflow:hidden;">
          <div style="height:100%; width:${Math.min(p,100)}%; background:${metaStatusCor(m.status)}; border-radius:8px;"></div>
        </div>
      </div>
    `;}).join('') : `<div style="font-size:12px; color:var(--text-3);">Nenhuma meta de setor disponível para o seu perfil.</div>`}
    <button class="open-btn" style="margin-top:4px;" onclick="setActiveNav('Metas')">Ver painel completo de metas <i class="fa-solid fa-arrow-right"></i></button>
  `;
}


/* ================= RENDER: AVISOS ================= */
function openAvisoModal(id) {
  const a = state.avisos.find(x=>x.id===id);
  if (!a) return;
  state.modal = { kind: 'aviso', name: a.titulo, desc: a.desc };
  renderModal();
}
function renderAvisos() {
  const el = document.getElementById('avisosList');
  if (!el) return;
  el.innerHTML = state.avisos.map(a => `
    <div class="aviso-row" onclick="openAvisoModal('${a.id}')">
      <div class="priority-bar priority-${a.prioridade}"></div>
      <div style="flex:1;">
        <div style="display:flex; align-items:center; gap:6px;">
          ${a.fixado ? '<i class="fa-solid fa-thumbtack star-fav" style="font-size:11px;"></i>' : ''}
          <div style="font-size:13px; font-weight:700;">${esc(a.titulo)}</div>
        </div>
        <div style="font-size:11.5px; color:var(--text-2); margin:4px 0;">${esc(a.desc)}</div>
        <div class="mono" style="font-size:10.5px; color:var(--text-3);">${esc(a.data)}</div>
      </div>
    </div>
  `).join('');
}

/* ================= RENDER: FUNCIONARIO DO MES ================= */
function renderFuncionarioMes() {
  const el = document.getElementById('funcionarioMesCard');
  if (!el) return;
  const f = state.funcionarioMes;
  if (!f.nome) {
    el.innerHTML = `
      <div style="font-size:11px; font-weight:800; letter-spacing:.06em; color:var(--brass); margin-bottom:14px;"><i class="fa-solid fa-trophy"></i> FUNCIONÁRIO DO MÊS</div>
      <div style="font-size:12px; opacity:.7;">Nenhum funcionário do mês definido ainda.</div>
    `;
    return;
  }
  const meuId = getEffectiveEmployee() ? getEffectiveEmployee().id : null;
  // Se o destaque não tem funcionario_id salvo (ex.: registro antigo, editado
  // antes de existir o seletor, ou salvo digitando o nome direto), tenta
  // achar o vínculo pelo nome, pra o botão continuar funcionando mesmo
  // assim — evita depender só do admin re-selecionar no formulário.
  const funcionarioIdEfetivo = f.funcionarioId || (funcionarioPorNome(f.nome) || {}).id || null;
  const jaEnviou = funcionarioIdEfetivo ? jaEnviouParabens(funcionarioIdEfetivo) : false;
  const souEu = funcionarioIdEfetivo && funcionarioIdEfetivo === meuId;
  const desabilitado = !funcionarioIdEfetivo || jaEnviou || souEu;
  const titulo = !funcionarioIdEfetivo ? 'Este destaque não está vinculado a um funcionário cadastrado' : souEu ? 'Você não pode parabenizar a si mesmo' : jaEnviou ? 'Parabéns já enviado' : 'Enviar parabéns';
  el.innerHTML = `
    <div style="font-size:11px; font-weight:800; letter-spacing:.06em; color:var(--brass); margin-bottom:14px;"><i class="fa-solid fa-trophy"></i> FUNCIONÁRIO DO MÊS</div>
    ${avatarHTML(f.nome, f.foto_url, 'width:52px; height:52px; font-size:16px; margin-bottom:12px; background:rgba(255,255,255,.12);')}
    <div class="serif" style="font-size:18px; font-weight:700; color:var(--brass-light);">${esc(f.nome)}</div>
    <div style="font-size:12px; opacity:.7; margin-bottom:10px;">${esc(f.cargo)}</div>
    <div style="font-size:12px; opacity:.85; line-height:1.5; margin-bottom:14px;">${esc(f.mensagem)}</div>
    <button class="btn-brass" style="background:rgba(255,255,255,.14); ${desabilitado?'opacity:.5; cursor:not-allowed;':''}" ${desabilitado?'disabled':''} title="${titulo}" onclick="enviarParabens('${funcionarioIdEfetivo||''}','funcionario_mes')">${jaEnviou?'Parabéns enviado':'Parabenizar'}</button>
  `;
}

/* ================= RENDER: ANIVERSARIANTES ================= */
function renderAniversariantes() {
  const el = document.getElementById('aniversariantesList');
  if (!el) return;
  const meuId = getEffectiveEmployee() ? getEffectiveEmployee().id : null;
  const lista = aniversariantesDoMes();
  if (!lista.length) {
    el.innerHTML = `<div style="font-size:12px; color:var(--text-3); padding:8px 0;">Ninguém faz aniversário este mês.</div>`;
    return;
  }
  el.innerHTML = lista.map((p,i) => {
    const jaEnviou = jaEnviouParabens(p.funcionarioId);
    const souEu = p.funcionarioId === meuId;
    const desabilitado = jaEnviou || souEu;
    const titulo = souEu ? 'Você não pode parabenizar a si mesmo' : jaEnviou ? 'Parabéns já enviado' : 'Enviar parabéns';
    const tamanho = p.ehHoje ? 36 : 30;
    const avatarStyle = `width:${tamanho}px; height:${tamanho}px; font-size:11px; cursor:pointer; ${p.ehHoje?'box-shadow:0 0 0 2px var(--brass);':''}`;
    const avatar = p.fotoUrl
      ? `<img src="${esc(p.fotoUrl)}" alt="" style="${avatarStyle} border-radius:50%; object-fit:cover; display:block;">`
      : `<div class="avatar" style="${avatarStyle}">${esc(initials(p.nome))}</div>`;
    return `
    <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:${i<lista.length-1?'1px solid var(--border)':'none'}; ${p.ehHoje?'background:var(--brass-soft); margin:0 -10px; padding-left:10px; padding-right:10px; border-radius:8px;':''}">
      <div onclick="abrirPerfilFuncionario('${p.funcionarioId}')">${avatar}</div>
      <div style="flex:1;">
        <div style="font-size:12.5px; font-weight:700; display:flex; align-items:center; gap:6px;">${esc(p.nome)} ${p.ehHoje?'<span class="status-pill" style="background:var(--brass); color:var(--navy);">Hoje <i class="fa-solid fa-cake-candles"></i></span>':`<span style="font-weight:600; color:var(--text-3); font-size:10.5px;">${esc(p.data)}</span>`}</div>
        <div style="font-size:11px; color:var(--text-3);">${esc(p.cargo)}</div>
      </div>
      <button class="congrats-btn" ${desabilitado?'disabled style="opacity:.4; cursor:not-allowed;"':''} title="${titulo}" onclick="enviarParabens('${p.funcionarioId}')"><i class="fa-solid fa-cake-candles" style="font-size:13px; ${jaEnviou?'color:var(--success);':''}"></i></button>
    </div>
  `;}).join('');
}

/* ================= RENDER: LINKS UTEIS / FERRAMENTAS ================= */
function renderLinks() {
  const el = document.getElementById('linksGrid');
  if (!el) return;
  el.innerHTML = state.links.map(l =>
    `<a class="link-chip" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.nome)}</a>`
  ).join('');
}
function toggleFav(nome) {
  const i = state.favs.indexOf(nome);
  if (i>-1) state.favs.splice(i,1); else state.favs.push(nome);
  renderTools();
}
function renderTools() {
  const el = document.getElementById('toolsGrid');
  if (!el) return;
  el.innerHTML = state.tools.map(f => {
    const fav = state.favs.includes(f.nome);
    const hasUrl = f.url && f.url.trim();
    const body = `
        <div style="font-size:13px; font-weight:700;">${esc(f.nome)}</div>
        <div style="font-size:11px; color:var(--text-3);">${esc(f.desc)}</div>
    `;
    const clickable = hasUrl
      ? `<a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:inherit; flex:1; min-width:0;">${body}</a>`
      : `<div style="flex:1; min-width:0; cursor:pointer;" onclick="showToast('Abrindo ${esc(f.nome).replace(/'/g,"&#39;")}...')">${body}</div>`;
    return `
    <div class="card" style="padding:14px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
      ${clickable}
      <button class="congrats-btn" style="border-color:${fav?'var(--brass)':'var(--border)'};" onclick="toggleFav('${esc(f.nome)}')">
        <i class="fa-solid fa-star" style="font-size:13px; color:${fav?'var(--brass)':'var(--text-3)'};"></i>
      </button>
    </div>`;
  }).join('');
}

/* ================= MODAL ================= */
function closeModal() { state.modal = null; renderModal(); }
function renderModal() {
  const m = state.modal;
  if (!m) { document.getElementById('modalRoot').innerHTML = ''; return; }
  if (m.kind === 'perfil') {
    document.getElementById('modalRoot').innerHTML = `
      <div class="modal-overlay" onclick="closeModal()">
        <div class="modal-box" onclick="event.stopPropagation()">
          <button class="modal-close" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button>
          <div style="clear:both;"></div>
          <div class="avatar" style="width:64px; height:64px; font-size:20px; margin-bottom:14px;">${esc(initials(m.nome))}</div>
          <div style="font-size:17px; font-weight:800; margin-bottom:2px;">${esc(m.nome)}</div>
          <div style="font-size:13px; color:var(--text-2); margin-bottom:14px;">${esc(m.cargo)} · ${esc(m.setor)}</div>
          <div style="font-size:12.5px; color:var(--text-2); line-height:2; text-align:left; background:var(--surface-2); border-radius:10px; padding:12px 14px; margin-bottom:16px;">
            <div><i class="fa-solid fa-envelope" style="width:16px; color:var(--text-3);"></i> ${esc(m.email||'—')}</div>
            <div><i class="fa-solid fa-phone" style="width:16px; color:var(--text-3);"></i> ${esc(m.telefone||'—')}</div>
            <div><i class="fa-solid fa-id-badge" style="width:16px; color:var(--text-3);"></i> Nível: ${esc(m.nivel||'—')}</div>
          </div>
          <button class="btn-brass" onclick="closeModal()">Fechar</button>
        </div>
      </div>
    `;
    return;
  }
  document.getElementById('modalRoot').innerHTML = `
    <div class="modal-overlay" onclick="closeModal()">
      <div class="modal-box" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button>
        <div style="clear:both;"></div>
        <div class="module-icon" style="margin-bottom:14px;">${m.icon ? icon(m.icon) : '<i class="fa-solid fa-image"></i>'}</div>
        <div style="font-size:17px; font-weight:800; margin-bottom:8px;">${esc(m.name)}</div>
        <div style="font-size:13px; color:var(--text-2); line-height:1.5; margin-bottom:${m.acesso?8:18}px;">${esc(m.desc)}</div>
        ${m.acesso ? `<div style="font-size:11.5px; color:var(--text-3); margin-bottom:18px;">Acesso: ${esc(m.acesso)}</div>` : ''}
        ${m.kind === 'module' && m.link && m.link.trim()
          ? `<a class="btn-brass" href="${esc(m.link)}" target="_blank" rel="noopener noreferrer" onclick="closeModal()">Entrar no módulo <i class="fa-solid fa-arrow-right"></i></a>`
          : `<button class="btn-brass" onclick="onModalAction()">Entrar no módulo <i class="fa-solid fa-arrow-right"></i></button>`}
      </div>
    </div>
  `;
}
function onModalAction() {
  const m = state.modal;
  if (m.kind === 'module') { openModuleLink(m); }
  else { showToast(`Abrindo: ${m.name}`); }
  closeModal();
}

/* ================= FILE UPLOADS ================= */
document.getElementById('logoFileInput').addEventListener('change', function(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { state.logo = reader.result; renderSidebar(); showToast('Logo atualizada!'); };
  reader.readAsDataURL(file);
});
document.getElementById('teamFileInput').addEventListener('change', function(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { state.teamPhoto = reader.result; renderHero(); showToast('Foto do time atualizada!'); };
  reader.readAsDataURL(file);
});
async function uploadParaBucket(bucket, file) {
  const caminho = `${Date.now()}-${uid('f')}-${file.name}`.replace(/\s+/g, '_');
  const { error } = await supabaseClient.storage.from(bucket).upload(caminho, file);
  if (error) throw error;
  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(caminho);
  return data.publicUrl;
}
document.getElementById('cursoUploadInput').addEventListener('change', async function(e) {
  const file = e.target.files[0]; if (!file) return;
  const target = this.dataset.target;
  this.value = '';
  if (!supabaseClient) {
    const reader = new FileReader();
    reader.onload = () => aplicarUploadCurso(target, file.name, reader.result);
    reader.readAsDataURL(file);
    return;
  }
  showToast('Enviando arquivo...');
  try {
    const url = await uploadParaBucket('cursos', file);
    aplicarUploadCurso(target, file.name, url);
  } catch (err) {
    showToast('Não foi possível enviar o arquivo: ' + err.message + ' (crie o bucket "cursos" no Supabase Storage)');
  }
});
document.getElementById('funcionarioFotoInput').addEventListener('change', async function(e) {
  const file = e.target.files[0]; if (!file) return;
  this.value = '';
  const aplicar = (url) => {
    state.editing.employeeFotoTemp = url;
    const img = document.getElementById('f-foto-preview');
    if (img) { img.src = url; img.style.display = ''; }
    showToast('Foto carregada!');
  };
  if (!supabaseClient) {
    const reader = new FileReader();
    reader.onload = () => aplicar(reader.result);
    reader.readAsDataURL(file);
    return;
  }
  showToast('Enviando foto...');
  try {
    const url = await uploadParaBucket('avatares', file);
    aplicar(url);
  } catch (err) {
    showToast('Não foi possível enviar a foto: ' + err.message + ' (crie o bucket "avatares" no Supabase Storage)');
  }
});
function aplicarUploadCurso(target, nomeArquivo, url) {
  if (target === 'foto') {
    state.editing.speakerFotoTemp = url;
    const img = document.getElementById('crs-foto-preview');
    if (img) { img.src = url; img.style.display = ''; }
    showToast('Foto carregada!');
  } else if (target === 'aula') {
    state.editing.aulaArquivoTemp = { nome: nomeArquivo, url };
    const span = document.getElementById('aula-arquivo-status');
    if (span) span.textContent = 'Arquivo carregado: ' + nomeArquivo;
    const urlInput = document.getElementById('aula-url');
    if (urlInput) { urlInput.value = ''; urlInput.placeholder = 'Arquivo enviado — ' + nomeArquivo; }
    showToast('Arquivo da aula carregado!');
  } else if (target === 'material') {
    state.editing.materialArquivoTemp = { nome: nomeArquivo, url };
    const span = document.getElementById('material-arquivo-status');
    if (span) span.textContent = 'Arquivo carregado: ' + nomeArquivo;
    showToast('Material carregado!');
  }
}
document.getElementById('bugAnexoInput').addEventListener('change', function(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  if (!state.editing.bugAnexos) state.editing.bugAnexos = [];
  let restantes = files.length;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      state.editing.bugAnexos.push({ nome: file.name, tipo: file.type || 'arquivo', url: reader.result, tamanhoBytes: file.size });
      restantes--;
      if (restantes === 0) { renderReportarErroView(); showToast(`${files.length} anexo(s) carregado(s)!`); }
    };
    reader.readAsDataURL(file);
  });
  this.value = '';
});
function removerBugAnexo(i) {
  if (!state.editing.bugAnexos) return;
  state.editing.bugAnexos.splice(i, 1);
  renderReportarErroView();
}

