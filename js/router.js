/* ================= INITIAL LAYOUT ================= */
function buildContentSkeleton() {
  document.getElementById('content').innerHTML = `
    <div id="heroRoot"></div>
    <div class="section-title">Acesso rápido</div>
    <div id="quickAccessGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(210px, 1fr)); gap:14px; margin-bottom:32px;"></div>

    <div style="display:grid; grid-template-columns:1.3fr 1fr; gap:20px; margin-bottom:32px;">
      <div class="card" style="padding:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <div class="section-title" style="margin-bottom:0;">Pauta de audiências — hoje</div>
          <button style="font-size:12.5px; font-weight:700; color:var(--brass); display:flex; align-items:center; gap:4px; background:none; border:none;" onclick="state.modal={kind:'info', name:'Pauta completa de audiências', desc:'Aqui aparecerá o calendário completo, integrado aos sistemas jurídicos.'}; renderModal();">
            Ver tudo <i class="fa-solid fa-arrow-right" style="font-size:11px;"></i>
          </button>
        </div>
        <div id="audienciasList"></div>
      </div>
      <div class="card" style="padding:20px;">
        <div class="section-title">Metas do mês</div>
        <div id="metasBody"></div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; margin-bottom:32px;">
      <div class="card" style="overflow:hidden;">
        <div style="padding:16px 16px 0;" class="section-title">Avisos importantes</div>
        <div id="avisosList"></div>
      </div>
      <div class="card" id="funcionarioMesCard" style="padding:20px; background:var(--navy); color:#fff; border:none;"></div>
      <div class="card" style="padding:16px;">
        <div class="section-title">Aniversariantes</div>
        <div id="aniversariantesList"></div>
      </div>
    </div>

    <div class="section-title">Links úteis</div>
    <div id="linksGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(100px, 1fr)); gap:10px; margin-bottom:32px;"></div>

    <div class="section-title">Ferramentas tecnológicas</div>
    <div id="toolsGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:12px;"></div>
  `;
}

/* ================= ROTEADOR DE CONTEÚDO ================= */
function renderDashboardView() {
  buildContentSkeleton();
  renderHero();
  renderQuickAccess();
  renderAudiencias();
  renderMetas();
  renderAvisos();
  renderFuncionarioMes();
  renderAniversariantes();
  renderLinks();
  renderTools();
}
/* ================= SEÇÕES DO MENU PRINCIPAL (Acordos, Jurídico, RH, Financeiro, Arquivos, Cursos, Instruções) =================
   Cada botão do menu lateral abre aqui sua respectiva seção/sistema,
   reaproveitando os dados já cadastrados (módulos, metas, audiências,
   aniversariantes). Se o usuário (real ou simulado) não tiver
   permissão, mostra a mensagem de acesso negado em vez do conteúdo. */
/* ================= CURSOS E OFICINAS — VISÃO DO COLABORADOR (EAD) =================
   Catálogo de cursos publicados + player de aulas com progresso. Criação,
   edição, exclusão e organização são exclusivas do administrador (aba
   "Cursos e Oficinas" em Administração) — aqui o colaborador só consome:
   assiste vídeos, abre PDFs, baixa materiais, marca aulas concluídas. */
/* ================= CENTRAL DE NOTIFICAÇÕES =================
   Lista completa das notificações do usuário (parabéns recebidos e
   avisos do sistema), com marcação de lida/não lida e link para o
   perfil de quem enviou. Abrir a central marca as notificações como
   lidas (mantendo, na própria renderização, o destaque visual de quem
   ainda estava "não lida" no momento em que a tela foi aberta). */
function renderNotificacoesView() {
  const emp = getEffectiveEmployee();
  const todas = notificacoesDoUsuario();
  const eramNaoLidas = new Set(todas.filter(n => !n.lida).map(n => n.id));
  document.getElementById('content').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:10px;">
      <div class="section-title" style="margin-bottom:0;">Central de Notificações</div>
      ${todas.length ? `<button class="open-btn" onclick="marcarTodasNotificacoesLidas()">Marcar todas como lidas</button>` : ''}
    </div>
    <div style="font-size:12px; color:var(--text-2); max-width:760px; margin-bottom:20px; line-height:1.5;">
      Aqui ficam todas as felicitações de aniversário que você recebeu e os avisos do sistema.
    </div>
    <div class="card" style="max-width:640px; overflow:hidden; margin-bottom:24px;">
      ${todas.length === 0 ? `<div style="padding:24px; text-align:center; color:var(--text-3); font-size:13px;">Você ainda não recebeu nenhuma notificação.</div>` : todas.map(n => {
        const remetente = funcionarioPorId(n.remetenteId);
        const dataObj = new Date(n.data);
        return `
        <div class="aviso-row" style="background:${eramNaoLidas.has(n.id)?'var(--surface-2)':'transparent'};">
          <div class="priority-bar" style="background:${n.tipo==='parabens'?'var(--brass)':'var(--text-3)'};"></div>
          <div style="display:flex; align-items:center; gap:12px; flex:1;">
            ${remetente ? `<div class="avatar" style="width:38px; height:38px; flex-shrink:0; cursor:pointer;" onclick="abrirPerfilFuncionario('${remetente.id}')">${esc(initials(remetente.nome))}</div>` : `<div class="avatar" style="width:38px; height:38px; flex-shrink:0;"><i class="fa-solid fa-bell"></i></div>`}
            <div style="flex:1; min-width:0;">
              <div style="font-size:13.5px; font-weight:700;">${textoNotificacao(n)}</div>
              <div class="mono" style="font-size:10.5px; color:var(--text-3); margin-top:4px;">
                ${dataObj.toLocaleDateString('pt-BR')} às ${dataObj.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · ${tempoRelativo(n.data)}
                ${remetente ? ` · <span style="color:var(--brass); cursor:pointer; font-weight:700;" onclick="abrirPerfilFuncionario('${remetente.id}')">Ver perfil de ${esc(remetente.nome.split(' ')[0])}</span>` : ''}
              </div>
            </div>
            ${eramNaoLidas.has(n.id) ? `<span class="status-pill" style="background:var(--brass); color:var(--navy);">nova</span>` : ''}
          </div>
        </div>
      `;}).join('')}
    </div>
    <div class="section-title">Avisos do sistema</div>
    <div class="card" style="max-width:640px; overflow:hidden;">
      ${NOTIFICACOES.map(n => `
        <div class="aviso-row">
          <div class="priority-bar" style="background:var(--text-3);"></div>
          <div style="flex:1;">
            <div style="font-size:13px; font-weight:700;">${esc(n.texto)}</div>
            <div class="mono" style="font-size:10.5px; color:var(--text-3); margin-top:3px;">${esc(n.tempo)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  // abrir a central marca as notificações como lidas
  if (eramNaoLidas.size > 0) { todas.forEach(n => n.lida = true); renderHeader(); }
}

function renderCursosCatalogo() {
  state.cursoAtivoId = null;
  const visiveis = isAdmin() ? state.cursos : state.cursos.filter(c => c.status === 'Publicado');
  const ordenados = [...visiveis].sort((a,b) => a.ordem - b.ordem);
  document.getElementById('content').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:10px;">
      <div class="section-title" style="margin-bottom:0;">Cursos e Oficinas</div>
      ${isAdmin() ? `<button class="btn-brass" onclick="openAdmin(); setAdminTab('cursos');"><i class="fa-solid fa-gear"></i> Gerenciar cursos</button>` : ''}
    </div>
    <div style="font-size:12px; color:var(--text-2); max-width:760px; margin-bottom:22px; line-height:1.5;">
      Treinamentos e oficinas internas do escritório. Assista as aulas, baixe os materiais e acompanhe seu progresso — ele fica salvo por aula concluída.
    </div>
    ${ordenados.length === 0 ? `<div class="card" style="padding:30px; text-align:center; color:var(--text-3);">Nenhum curso disponível no momento.</div>` : `
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(270px, 1fr)); gap:16px;">
        ${ordenados.map(curso => {
          const pct = cursoPercentual(curso);
          return `
          <div class="card curso-card" onclick="abrirCurso('${curso.id}')">
            <div class="curso-banner">
              <span class="curso-banner-tema">${esc(curso.tema)}</span>
              ${curso.status === 'Rascunho' ? `<span class="status-pill" style="position:absolute; top:10px; right:10px; background:rgba(255,255,255,.15); color:#fff;">Rascunho</span>` : ''}
            </div>
            <div class="curso-body">
              <div style="font-size:14.5px; font-weight:800; margin-bottom:6px;">${esc(curso.nome)}</div>
              <div style="font-size:12px; color:var(--text-2); line-height:1.5; margin-bottom:2px;">${esc(curso.descricao.length > 100 ? curso.descricao.slice(0,99)+'…' : curso.descricao)}</div>
              <div class="curso-speaker-row">
                ${curso.palestrante.foto ? `<img class="curso-speaker-avatar" src="${curso.palestrante.foto}">` : `<div class="curso-speaker-avatar" style="display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:700; color:var(--text-3);">${esc(initials(curso.palestrante.nome))}</div>`}
                <span>${esc(curso.palestrante.nome)}</span>
              </div>
              <div style="font-size:11px; color:var(--text-3); margin-top:8px;"><i class="fa-solid fa-layer-group" style="font-size:9px;"></i> ${totalAulas(curso)} aula${totalAulas(curso)===1?'':'s'}</div>
              <div class="curso-progress-row">
                <div class="curso-progress-track"><div class="curso-progress-fill" style="width:${pct}%;"></div></div>
                <span class="mono" style="font-size:11px; font-weight:700; color:var(--text-2);">${pct}%</span>
              </div>
            </div>
          </div>
        `;}).join('')}
      </div>
    `}
  `;
}
function abrirCurso(id) {
  const curso = state.cursos.find(c => c.id === id);
  if (!curso) return;
  state.cursoAtivoId = id;
  const primeira = [...curso.aulas].sort((a,b)=>a.ordem-b.ordem)[0];
  state.aulaAtivaId = primeira ? primeira.id : null;
  garantirProgressoIniciado(id);
  renderCursoDetalhe();
}
function voltarCatalogoCursos() { renderCursosCatalogo(); }
function setAulaAtiva(aulaId) { state.aulaAtivaId = aulaId; renderCursoDetalhe(); }
function renderAulaConteudo(aula) {
  const info = aulaTipoInfo(aula.tipo);
  if (!aula.url) {
    return `<div class="card" style="padding:40px; text-align:center; color:var(--text-3);">
      <i class="fa-solid ${info.icon}" style="font-size:32px; margin-bottom:12px; display:block;"></i>
      O administrador ainda não enviou o conteúdo desta aula.
    </div>`;
  }
  if (aula.tipo === 'video') {
    if (/youtube\.com|youtu\.be/.test(aula.url)) {
      return `<div class="curso-player-frame"><iframe src="${esc(toYoutubeEmbed(aula.url))}" allowfullscreen allow="autoplay; encrypted-media"></iframe></div>`;
    }
    if (/vimeo\.com/.test(aula.url)) {
      return `<div class="curso-player-frame"><iframe src="${esc(toVimeoEmbed(aula.url))}" allowfullscreen allow="autoplay; encrypted-media"></iframe></div>`;
    }
    return `<div class="curso-player-frame"><video controls src="${esc(aula.url)}"></video></div>`;
  }
  if (aula.tipo === 'pdf') {
    return `
      <div class="curso-pdf-frame"><iframe src="${esc(aula.url)}"></iframe></div>
      <a class="btn-brass" href="${esc(aula.url)}" download="${esc(nomeArquivoDeUrl(aula.url))}" style="margin-top:12px; display:inline-flex;">Baixar PDF <i class="fa-solid fa-download"></i></a>
    `;
  }
  return `
    <div class="card" style="padding:36px; text-align:center;">
      <i class="fa-solid ${info.icon}" style="font-size:36px; color:var(--brass); margin-bottom:16px; display:block;"></i>
      <div style="font-weight:700; margin-bottom:16px;">${esc(aula.titulo)}</div>
      <a class="btn-brass" href="${esc(aula.url)}" download="${esc(nomeArquivoDeUrl(aula.url))}">Baixar arquivo <i class="fa-solid fa-download"></i></a>
    </div>
  `;
}
function renderCursoDetalhe() {
  const curso = state.cursos.find(c => c.id === state.cursoAtivoId);
  if (!curso) { renderCursosCatalogo(); return; }
  const aulasOrdenadas = [...curso.aulas].sort((a,b) => a.ordem - b.ordem);
  const aula = aulasOrdenadas.find(a => a.id === state.aulaAtivaId) || aulasOrdenadas[0];
  const progresso = progressoUsuarioCurso(curso.id);
  const p = curso.palestrante;
  document.getElementById('content').innerHTML = `
    <button class="open-btn" style="margin-bottom:10px;" onclick="voltarCatalogoCursos()"><i class="fa-solid fa-arrow-left"></i> Voltar aos cursos</button>
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:14px;">
      <div>
        <div class="section-title" style="margin-bottom:4px;">${esc(curso.nome)}</div>
        <span class="status-pill">${esc(curso.tema)}</span>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="curso-progress-track" style="width:120px;"><div class="curso-progress-fill" style="width:${progresso.percentual}%;"></div></div>
        <span class="mono" style="font-size:12px; font-weight:800;">${progresso.percentual}%</span>
      </div>
    </div>

    <div class="curso-layout">
      <div class="curso-sidebar-aulas">
        <div class="card" style="padding:12px;">
          <div style="font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--text-3); padding:4px 8px 10px;">Aulas (${aulasOrdenadas.length})</div>
          ${aulasOrdenadas.map(a => {
            const concluida = progresso.aulasConcluidas.includes(a.id);
            const info = aulaTipoInfo(a.tipo);
            return `
            <div class="aula-item ${aula && a.id===aula.id?'active':''}" onclick="setAulaAtiva('${a.id}')">
              <div class="aula-check ${concluida?'done':''}"><i class="fa-solid fa-check"></i></div>
              <div class="aula-titulo">${esc(a.titulo)}${a.tipo==='video' && a.duracaoMin ? ` <span style="color:var(--text-3); font-weight:500;">· ${a.duracaoMin} min</span>` : ''}</div>
              <i class="fa-solid ${info.icon} aula-tipo-icon"></i>
            </div>
          `;}).join('')}
        </div>
        <div class="card" style="padding:16px; margin-top:14px;">
          <div style="font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--text-3); margin-bottom:10px;">Sobre o palestrante</div>
          <div class="speaker-card">
            ${p.foto ? `<img class="speaker-photo" src="${p.foto}">` : `<div class="speaker-photo" style="display:flex; align-items:center; justify-content:center; font-weight:700; color:var(--text-3);">${esc(initials(p.nome))}</div>`}
            <div style="flex:1; min-width:0;">
              <div style="font-size:13px; font-weight:800;">${esc(p.nome)}</div>
              <div style="font-size:11.5px; color:var(--text-3);">${esc(p.cargo)}${p.empresa?` · ${esc(p.empresa)}`:''}</div>
            </div>
          </div>
          <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
            ${p.linkedin ? `<a class="speaker-social-btn" href="${esc(p.linkedin)}" target="_blank" rel="noopener noreferrer" title="LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a>` : ''}
            ${p.instagram ? `<a class="speaker-social-btn" href="${esc(p.instagram)}" target="_blank" rel="noopener noreferrer" title="Instagram"><i class="fa-brands fa-instagram"></i></a>` : ''}
            ${p.website ? `<a class="speaker-social-btn" href="${esc(p.website)}" target="_blank" rel="noopener noreferrer" title="Website"><i class="fa-solid fa-globe"></i></a>` : ''}
            ${p.contato ? `<a class="speaker-social-btn" href="mailto:${esc(p.contato)}" title="Contato"><i class="fa-solid fa-envelope"></i></a>` : ''}
          </div>
        </div>
        ${curso.materiaisExtras.length ? `
          <div class="card" style="padding:16px; margin-top:14px;">
            <div style="font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--text-3); margin-bottom:10px;">Materiais extras</div>
            ${curso.materiaisExtras.map(m => `
              <div class="material-item">
                <div class="material-icon"><i class="fa-solid fa-paperclip"></i></div>
                <div style="flex:1; min-width:0; font-size:12px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(m.nome)}</div>
                ${m.url ? `<a class="admin-edit-btn" href="${esc(m.url)}" download="${esc(m.nome)}" title="Baixar"><i class="fa-solid fa-download" style="font-size:12px;"></i></a>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <div style="flex:1; min-width:0;">
        ${aula ? `
          <div style="font-size:15px; font-weight:800; margin-bottom:12px;">${esc(aula.titulo)}</div>
          ${renderAulaConteudo(aula)}
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
            <label style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:700; cursor:pointer;">
              <input type="checkbox" ${progresso.aulasConcluidas.includes(aula.id)?'checked':''} onchange="toggleAulaConcluida('${curso.id}','${aula.id}')" style="width:18px; height:18px; cursor:pointer;">
              Marcar aula como concluída
            </label>
            <span style="font-size:11px; color:var(--text-3);">${progresso.dataInicio ? `Iniciado em ${new Date(progresso.dataInicio).toLocaleDateString('pt-BR')}` : ''}${progresso.dataConclusao ? ` · Concluído em ${new Date(progresso.dataConclusao).toLocaleDateString('pt-BR')}` : ''}</span>
          </div>
          <div style="font-size:12.5px; color:var(--text-2); margin-top:16px; line-height:1.6; max-width:760px;">${esc(curso.descricao)}</div>
        ` : `<div class="card" style="padding:30px; text-align:center; color:var(--text-3);">Este curso ainda não tem aulas cadastradas.</div>`}
      </div>
    </div>
  `;
}

function renderNavSectionView(viewKey) {
  const label = navLabelFromSlug(viewKey);
  const acesso = navSectionAccess(label);
  const mod = getModuleForNavLabel(label);
  const content = document.getElementById('content');

  if (acesso.locked) {
    content.innerHTML = `
      <div class="section-title">${esc(label)}</div>
      <div class="card permission-denied-card">
        <div class="permission-denied-icon"><i class="fa-solid fa-lock"></i></div>
        <div style="font-size:15.5px; font-weight:800; margin-bottom:8px;">Você não possui permissão para acessar este módulo.</div>
        <div style="font-size:12.5px; color:var(--text-2); line-height:1.6;">${esc(acesso.motivo)}</div>
        <div style="font-size:11.5px; color:var(--text-3); margin-top:16px;">Fale com o administrador do portal caso acredite que deveria ter acesso a esta área.</div>
      </div>
    `;
    return;
  }
  if (label === 'Cursos') { renderCursosCatalogo(); return; }

  const iconName = mod ? mod.icon : 'wallet';
  const desc = mod ? mod.desc : 'Relatório financeiro geral do escritório, com meta consolidada e desempenho por setor.';
  const status = mod ? mod.status : 'Online';
  let extra = '';

  if (label === 'Acordos') {
    const metasSetor = state.metas.filter(mt => mt.tipo !== 'Geral' && mt.setor === 'Acordos' && metaVisivelPara(mt));
    extra = `
      <div class="card" style="padding:20px; max-width:560px; margin-top:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <div class="section-title" style="margin-bottom:0;">Metas do setor</div>
          <button class="open-btn" onclick="setActiveNav('Metas')">Ver todas <i class="fa-solid fa-arrow-right"></i></button>
        </div>
        ${metasSetor.length ? metasSetor.map(m => { const p = metaProgressoPct(m); return `
          <div style="margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
              <span style="font-weight:600; color:var(--text-2);">${esc(m.nome)}</span>
              <span class="mono" style="font-weight:700;">${p}%</span>
            </div>
            <div style="height:8px; background:var(--surface-2); border-radius:8px; overflow:hidden;">
              <div style="height:100%; width:${Math.min(p,100)}%; background:${metaStatusCor(m.status)}; border-radius:8px;"></div>
            </div>
          </div>
        `;}).join('') : `<div style="font-size:12.5px; color:var(--text-3);">Nenhuma meta cadastrada para este setor.</div>`}
      </div>
    `;
  } else if (label === 'Jurídico') {
    extra = `
      <div class="card" style="padding:20px; max-width:640px; margin-top:20px;">
        <div class="section-title" style="margin-bottom:10px;">Pauta de audiências — hoje</div>
        <div id="navAudienciasList"></div>
      </div>
    `;
  } else if (label === 'RH') {
    const podeVerTodos = hasPermission('verFuncionariosTodos');
    const equipe = podeVerTodos ? state.employees : state.employees.filter(e => e.setor === 'RH');
    extra = `
      <div class="card" style="padding:20px; max-width:640px; margin-top:20px;">
        <div class="section-title" style="margin-bottom:10px;">Aniversariantes do mês</div>
        <div id="navAniversariantesList"></div>
      </div>
      <div class="card" style="padding:20px; max-width:640px; margin-top:16px;">
        <div class="section-title" style="margin-bottom:10px;">${podeVerTodos ? 'Todos os funcionários' : 'Equipe de RH'}</div>
        ${!podeVerTodos ? `<div style="font-size:11px; color:var(--text-3); margin-bottom:10px;"><i class="fa-solid fa-lock" style="font-size:9px;"></i> Seu acesso mostra apenas o setor de RH. A permissão "Ver funcionários de todos os setores" está desativada.</div>` : ''}
        ${equipe.length ? equipe.map(e => `
          <div class="admin-list-item">
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="avatar" style="width:30px; height:30px; font-size:11px;">${esc(initials(e.nome))}</div>
              <div style="font-size:13px; font-weight:700;">${esc(e.nome)} <span style="color:var(--text-3); font-weight:600;">— ${esc(e.cargo)} · ${esc(e.setor)}</span></div>
            </div>
          </div>
        `).join('') : `<div style="font-size:12.5px; color:var(--text-3);">Nenhum colaborador cadastrado neste setor.</div>`}
      </div>
    `;
  } else if (label === 'Financeiro') {
    const metaGeral = state.metas.find(mt => mt.tipo === 'Geral');
    const pct = metaGeral ? metaProgressoPct(metaGeral) : 0;
    const metasSetoresLista = state.metas.filter(mt => mt.tipo === 'Setor' && metaVisivelPara(mt));
    extra = `
      <div class="card" style="padding:20px; max-width:560px; margin-top:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <div class="section-title" style="margin-bottom:0;">${metaGeral ? esc(metaGeral.nome) : 'Meta geral do escritório'}</div>
          <button class="open-btn" onclick="setActiveNav('Metas')">Ver painel completo <i class="fa-solid fa-arrow-right"></i></button>
        </div>
        ${metaGeral ? `
          <div style="display:flex; align-items:center; gap:16px; margin-bottom:16px;">
            ${ringSvg(pct)}
            <div>
              <div style="font-size:20px; font-weight:800;">${currency(metaGeral.valorAtingido)}</div>
              <div style="font-size:12px; color:var(--text-3);">de ${currency(metaGeral.valorMeta)}</div>
            </div>
          </div>
        ` : `<div style="font-size:12.5px; color:var(--text-3); margin-bottom:14px;">Nenhuma meta geral cadastrada.</div>`}
        ${metasSetoresLista.map(m => { const p = metaProgressoPct(m); return `
          <div style="margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
              <span style="font-weight:600; color:var(--text-2);">${esc(m.setor)}</span>
              <span class="mono" style="font-weight:700;">${p}%</span>
            </div>
            <div style="height:6px; background:var(--surface-2); border-radius:8px; overflow:hidden;">
              <div style="height:100%; width:${Math.min(p,100)}%; background:${metaStatusCor(m.status)}; border-radius:8px;"></div>
            </div>
          </div>
        `;}).join('')}
      </div>
    `;
  }

  content.innerHTML = `
    <div class="section-title">${esc(label)}</div>
    <div class="card" style="padding:22px; max-width:640px;">
      <div style="display:flex; align-items:flex-start; gap:16px;">
        <div class="module-icon" style="margin-bottom:0;">${icon(iconName)}</div>
        <div style="flex:1;">
          <div style="font-size:16px; font-weight:800; margin-bottom:4px;">${esc(label)}</div>
          <div style="font-size:12.5px; color:var(--text-2); line-height:1.5; margin-bottom:10px;">${esc(desc)}</div>
          <span class="status-pill">${esc(status)}</span>
          ${mod && mod.acesso ? `<span class="access-tag">Acesso: ${esc(mod.acesso)}</span>` : ''}
        </div>
      </div>
      ${mod ? `
        <div style="margin-top:18px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          ${mod.link && mod.link.trim()
            ? `<a class="btn-brass" href="${esc(mod.link)}" target="_blank" rel="noopener noreferrer">Abrir sistema <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`
            : `<button class="btn-brass" onclick="openModuleLinkById(${mod.id}, event)">Abrir sistema <i class="fa-solid fa-arrow-up-right-from-square"></i></button>
               <span style="font-size:11px; color:var(--text-3);"><span class="link-missing-dot"></span> Link não configurado${isAdmin() ? ' — configure em Administração › Acesso rápido' : ''}</span>`}
        </div>
      ` : ''}
    </div>
    ${extra}
  `;

  if (label === 'Jurídico') renderNavAudiencias();
  if (label === 'RH') renderNavAniversariantes();
}
function renderNavAudiencias() {
  const el = document.getElementById('navAudienciasList');
  if (!el) return;
  el.innerHTML = state.audiencias.map((a,i) => `
    <div class="row-hover" style="display:flex; align-items:center; gap:14px; padding:10px 4px; border-bottom:${i<state.audiencias.length-1?'1px solid var(--border)':'none'};">
      <div class="mono" style="font-size:13px; font-weight:700; color:var(--navy); width:48px;">${esc(a.hora)}</div>
      <div style="flex:1;">
        <div style="font-size:13px; font-weight:700;">${esc(a.cliente)}</div>
        <div style="font-size:11.5px; color:var(--text-3);">${esc(a.advogado)}</div>
      </div>
      <span class="status-pill" ${a.status!=='Confirmada' ? 'style="background:var(--danger-soft); color:var(--danger);"' : ''}>${esc(a.status)}</span>
    </div>
  `).join('') || `<div style="font-size:12.5px; color:var(--text-3);">Nenhuma audiência na pauta.</div>`;
}
function renderNavAniversariantes() {
  const el = document.getElementById('navAniversariantesList');
  if (!el) return;
  const meuId = getEffectiveEmployee() ? getEffectiveEmployee().id : null;
  el.innerHTML = aniversariantesDoMes().map(p => {
    const jaEnviou = jaEnviouParabens(p.funcionarioId);
    const souEu = p.funcionarioId === meuId;
    const desabilitado = jaEnviou || souEu;
    return `
    <div class="admin-list-item" style="${p.ehHoje?'border-color:var(--brass); background:var(--brass-soft);':''}">
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="avatar" style="width:30px; height:30px; font-size:11px; ${p.ehHoje?'box-shadow:0 0 0 2px var(--brass);':''}">${esc(initials(p.nome))}</div>
        <div>
          <div style="font-size:13px; font-weight:700; display:flex; align-items:center; gap:6px;">${esc(p.nome)} ${p.ehHoje?'<span class="status-pill" style="background:var(--brass); color:var(--navy);">Hoje 🎂</span>':''}</div>
          <div class="admin-list-meta">${esc(p.cargo)} · ${esc(p.data)}</div>
        </div>
      </div>
      <button class="congrats-btn" ${desabilitado?'disabled style="opacity:.4; cursor:not-allowed;"':''} title="${jaEnviou?'Parabéns já enviado':'Enviar parabéns'}" onclick="enviarParabens('${p.funcionarioId}')"><i class="fa-solid fa-cake-candles" style="font-size:13px; ${jaEnviou?'color:var(--success);':''}"></i></button>
    </div>
  `;}).join('') || `<div style="font-size:12.5px; color:var(--text-3);">Nenhum aniversariante este mês.</div>`;
}

function renderContentView() {
  const v = state.currentView;
  if (v === "calculadora") renderCalculadoraView();
  else if (v === "chat") abrirChatView();
  else if (v === "metas") renderMetasDashboardView();
  else if (v === "notificacoes") renderNotificacoesView();
  else if (v === "sinalizacoes") renderSinalizacoesView();
  else if (v === "eficiencia") renderEficienciaView();
  else if (v === "reportarErro") renderReportarErroView();
  else if (v === "manual") renderManualView();
  else if (typeof v === "string" && v.indexOf("nav_") === 0) renderNavSectionView(v);
  else renderDashboardView();
  // anima a troca de seção suavemente (reinicia a animação a cada navegação)
  const contentEl = document.getElementById('content');
  if (contentEl) {
    contentEl.classList.remove('view-fade-in');
    void contentEl.offsetWidth;
    contentEl.classList.add('view-fade-in');
  }
}

function renderAll() {
  renderSidebar();
  renderHeader();
  renderContentView();
  renderModal();
  renderAdmin();
  renderToast();
  renderLogin();
}
renderAll();

