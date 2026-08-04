/* ================= ADMIN PANEL ================= */
function openAdmin() { state.adminOpen = true; renderAdmin(); }
function closeAdmin() { state.adminOpen = false; state.editing = {}; renderAdmin(); }
function setAdminTab(tab) { state.adminTab = tab; state.editing = {}; renderAdmin(); }

function val(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v; }

const ADMIN_TABS = [
  { key: 'acessoRapido', label: 'Acesso rápido', icon: 'fa-arrow-up-right-from-square' },
  { key: 'funcionarios', label: 'Funcionários', icon: 'fa-user-plus' },
  { key: 'audiencias', label: 'Audiências', icon: 'fa-gavel' },
  { key: 'avisos', label: 'Avisos', icon: 'fa-thumbtack' },
  { key: 'metas', label: 'Gestão de Metas', icon: 'fa-bullseye' },
  { key: 'funcionarioMes', label: 'Funcionário do mês', icon: 'fa-star' },
  { key: 'aniversariantes', label: 'Aniversariantes', icon: 'fa-cake-candles' },
  { key: 'links', label: 'Links de sistemas', icon: 'fa-link' },
  { key: 'ferramentas', label: 'Ferramentas', icon: 'fa-screwdriver-wrench' },
  { key: 'classificacoes', label: 'Classificações', icon: 'fa-flag' },
  { key: 'permissoes', label: 'Permissões de acesso', icon: 'fa-user-shield' },
  { key: 'gruposChat', label: 'Grupos de chat', icon: 'fa-users' },
  { key: 'cursos', label: 'Cursos e Oficinas', icon: 'fa-graduation-cap' },
  { key: 'parabens', label: 'Relatório de Parabéns', icon: 'fa-cake-candles' },
  { key: 'manutencaoIA', label: 'Central de Manutenção IA', icon: 'fa-robot' },
  { key: 'conexaoSupabase', label: 'Conexão Supabase', icon: 'fa-database' },
];
const ADMIN_TITLES = {
  acessoRapido: 'Links do Acesso Rápido', funcionarios: 'Cadastro de funcionários', audiencias: 'Pauta de audiências',
  avisos: 'Avisos importantes', metas: 'Gestão de Metas — Geral, Setor e Carteira', funcionarioMes: 'Funcionário do mês',
  aniversariantes: 'Aniversariantes', links: 'Links dos sistemas da empresa', ferramentas: 'Ferramentas acessadas pela equipe',
  classificacoes: 'Classificações de Sinalização', permissoes: 'Permissões e Gestores por Setor', gruposChat: 'Grupos de chat internos',
  cursos: 'Cursos e Oficinas — conteúdo de treinamento', parabens: 'Relatório de Parabéns de Aniversário',
  manutencaoIA: 'Central de Manutenção Inteligente (IA)', conexaoSupabase: 'Conexão com o Supabase',
};

function renderAdmin() {
  const root = document.getElementById('adminRoot');
  if (!isAdmin() || !state.adminOpen) { root.innerHTML = ''; return; }
  root.innerHTML = `
    <div class="admin-overlay" onclick="closeAdmin()">
      <div class="admin-panel" onclick="event.stopPropagation()">
        <div class="admin-side">
          <div class="admin-side-title">ADMINISTRAÇÃO</div>
          ${ADMIN_TABS.map(t => `<button class="admin-tab ${state.adminTab===t.key?'active':''}" onclick="setAdminTab('${t.key}')"><i class="fa-solid ${t.icon}"></i> ${t.label}</button>`).join('')}
        </div>
        <div class="admin-main">
          <div class="admin-header-row">
            <div class="admin-title">${ADMIN_TITLES[state.adminTab]}</div>
            <button class="modal-close" onclick="closeAdmin()"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div id="adminTabContent"></div>
        </div>
      </div>
    </div>
  `;
  renderAdminTabContent();
}

function renderAdminTabContent() {
  const c = document.getElementById('adminTabContent');
  if (!c) return;
  const tab = state.adminTab;
  if (tab === 'acessoRapido') return renderAdminAcessoRapido(c);
  if (tab === 'funcionarios') return renderAdminFuncionarios(c);
  if (tab === 'audiencias') return renderAdminAudiencias(c);
  if (tab === 'avisos') return renderAdminAvisos(c);
  if (tab === 'metas') return renderAdminMetas(c);
  if (tab === 'funcionarioMes') return renderAdminFuncionarioMes(c);
  if (tab === 'aniversariantes') return renderAdminAniversariantes(c);
  if (tab === 'links') return renderAdminLinks(c);
  if (tab === 'ferramentas') return renderAdminFerramentas(c);
  if (tab === 'classificacoes') return renderAdminClassificacoes(c);
  if (tab === 'permissoes') return renderAdminPermissoes(c);
  if (tab === 'gruposChat') return renderAdminGruposChat(c);
  if (tab === 'cursos') return renderAdminCursos(c);
  if (tab === 'parabens') return renderAdminParabens(c);
  if (tab === 'manutencaoIA') return renderAdminManutencaoIA(c);
  if (tab === 'conexaoSupabase') return renderAdminConexaoSupabase(c);
}

/* --- ACESSO RÁPIDO --- */
function renderAdminAcessoRapido(c) {
  c.innerHTML = `
    <div class="admin-list-meta" style="margin-bottom:14px;">Defina para onde cada cartão do "Acesso rápido" da Home deve levar, e qual setor é dono do módulo (controla quem pode acessá-lo — veja em Permissões de acesso por setor). Deixe o setor em branco para um módulo geral, aberto a todos.</div>
    ${state.modules.map(m => `
      <div class="admin-list-item" style="align-items:center;">
        <div style="display:flex; align-items:center; gap:10px; flex:1;">
          <div class="module-icon ${m.locked?'locked':''}" style="width:32px; height:32px; margin-bottom:0; font-size:13px;">${m.locked?'<i class="fa-solid fa-lock"></i>':icon(m.icon)}</div>
          <div style="flex:1;">
            <div style="font-size:13px; font-weight:700; margin-bottom:4px;">${esc(m.name)}</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <input id="modlink-${m.id}" value="${esc(m.link)}" placeholder="https://..." style="flex:1; min-width:160px; border:1px solid var(--border); background:var(--surface-2); border-radius:8px; padding:7px 10px; font-size:12.5px; color:var(--text); font-family:inherit; outline:none;">
              <select id="modsetor-${m.id}" style="border:1px solid var(--border); background:var(--surface-2); border-radius:8px; padding:7px 10px; font-size:12.5px; color:var(--text); font-family:inherit; outline:none;">
                <option value="">Módulo geral (todos os setores)</option>
                ${SETORES.map(s => `<option value="${esc(s)}" ${m.setor===s?'selected':''}>Setor: ${esc(s)}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <button class="admin-edit-btn" style="margin-left:10px;" onclick="saveModuleLink(${m.id})" title="Salvar link e setor"><i class="fa-solid fa-plus"></i></button>
      </div>
    `).join('')}
  `;
}
function saveModuleLink(id) {
  const v = normalizeUrl(val('modlink-'+id));
  const setorSel = val('modsetor-'+id);
  const m = state.modules.find(x=>x.id===id);
  if (m) { m.link = v; m.setor = setorSel || undefined; }
  setVal('modlink-'+id, v);
  renderQuickAccess(); renderSearchResults(); renderAdminTabContent();
  showToast('Módulo atualizado!');
}


/* --- FUNCIONÁRIOS --- */
function renderAdminFuncionarios(c) {
  const ed = state.editing.employee;
  const e = ed ? state.employees.find(x=>x.id===ed) : null;
  c.innerHTML = `
    <div class="form-grid">
      <div class="form-field"><label>Nome completo</label><input id="f-nome" value="${esc(e?e.nome:'')}" placeholder="Ex: Ana Souza"></div>
      <div class="form-field"><label>Número (matrícula)</label><input id="f-numero" value="${esc(e?e.numero:'')}" placeholder="Ex: 0012"></div>
      <div class="form-field"><label>Setor</label><select id="f-setor">${SETORES.map(s=>`<option ${e&&e.setor===s?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="form-field"><label>Cargo</label><input id="f-cargo" value="${esc(e?e.cargo:'')}" placeholder="Ex: Negociadora"></div>
      <div class="form-field"><label>Nível de acesso</label><select id="f-nivel">${CARGOS_ACESSO.map(cg=>`<option ${e&&e.nivel===cg?'selected':''}>${cg}</option>`).join('')}</select></div>
      <div class="form-field"><label>Data de nascimento</label><input id="f-nasc" value="${esc(e?e.nascimento:'')}" placeholder="DD/MM/AAAA"></div>
      <div class="form-field"><label>Telefone</label><input id="f-tel" value="${esc(e?e.telefone:'')}" placeholder="(31) 90000-0000"></div>
      <div class="form-field" style="grid-column:span 2;"><label>E-mail corporativo</label><input id="f-email" value="${esc(e?e.email:'')}" placeholder="nome@oliveiracamilo.com.br"></div>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="admin-add-btn" onclick="submitEmployee()"><i class="fa-solid fa-plus"></i> ${ed?'Salvar alterações':'Cadastrar funcionário'}</button>
      ${ed ? `<button class="admin-cancel-btn" onclick="cancelEdit('employee')">Cancelar</button>` : ''}
    </div>
    <div class="admin-section-label">Funcionários cadastrados (${state.employees.length})</div>
    ${state.employees.map(emp => `
      <div class="admin-list-item">
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="avatar" style="width:30px; height:30px; font-size:11px;">${initials(emp.nome)}</div>
          <div>
            <div style="font-size:13px; font-weight:700;">${esc(emp.nome)} <span style="color:var(--text-3); font-weight:600;">· nº ${esc(emp.numero)}</span></div>
            <div class="admin-list-meta">${esc(emp.cargo)} — ${esc(emp.setor)} · <i class="fa-solid fa-calendar-days" style="font-size:10px;"></i> ${esc(emp.nascimento)} · <i class="fa-solid fa-phone" style="font-size:10px;"></i> ${esc(emp.telefone)}</div>
            <span class="access-tag"><i class="fa-solid fa-shield-halved" style="font-size:10px;"></i> Acesso: ${esc(emp.nivel)}</span>
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="admin-edit-btn" onclick="editEmployee('${emp.id}')"><i class="fa-solid fa-pen" style="font-size:12px;"></i></button>
          <button class="admin-del-btn" onclick="removeEmployee('${emp.id}')"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>
        </div>
      </div>
    `).join('')}
  `;
}
function submitEmployee() {
  const data = { nome: val('f-nome'), numero: val('f-numero'), setor: val('f-setor'), cargo: val('f-cargo'), nivel: val('f-nivel'), nascimento: val('f-nasc'), telefone: val('f-tel'), email: val('f-email') };
  if (!data.nome.trim()) return;
  const ed = state.editing.employee;
  if (ed) { const i = state.employees.findIndex(x=>x.id===ed); state.employees[i] = { ...data, id: ed }; showToast('Funcionário atualizado!'); }
  else { state.employees.push({ ...data, id: uid('e') }); showToast('Funcionário cadastrado!'); }
  state.editing.employee = null;
  renderAdminTabContent();
}
function editEmployee(id) { state.editing.employee = id; renderAdminTabContent(); }
function removeEmployee(id) { state.employees = state.employees.filter(x=>x.id!==id); renderAdminTabContent(); }
function cancelEdit(kind) { state.editing[kind] = null; renderAdminTabContent(); }

/* --- AUDIÊNCIAS --- */
function renderAdminAudiencias(c) {
  const ed = state.editing.audiencia;
  const a = ed ? state.audiencias.find(x=>x.id===ed) : null;
  c.innerHTML = `
    <div class="form-grid">
      <div class="form-field"><label>Horário</label><input id="au-hora" value="${esc(a?a.hora:'')}" placeholder="Ex: 09:00"></div>
      <div class="form-field"><label>Status</label><select id="au-status">
        ${['Confirmada','Aguardando pauta','Cancelada'].map(s=>`<option ${a&&a.status===s?'selected':''}>${s}</option>`).join('')}
      </select></div>
      <div class="form-field"><label>Cliente</label><input id="au-cliente" value="${esc(a?a.cliente:'')}" placeholder="Nome do cliente"></div>
      <div class="form-field"><label>Advogado responsável</label><input id="au-advogado" value="${esc(a?a.advogado:'')}" placeholder="Ex: Dra. Camila Prado"></div>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="admin-add-btn" onclick="submitAudiencia()"><i class="fa-solid fa-plus"></i> ${ed?'Salvar alterações':'Adicionar à pauta'}</button>
      ${ed ? `<button class="admin-cancel-btn" onclick="cancelEdit('audiencia')">Cancelar</button>` : ''}
    </div>
    <div class="admin-section-label">Audiências na pauta (${state.audiencias.length})</div>
    ${state.audiencias.map(x => `
      <div class="admin-list-item">
        <div><div style="font-size:13px; font-weight:700;">${esc(x.hora)} — ${esc(x.cliente)}</div><div class="admin-list-meta">${esc(x.advogado)} · ${esc(x.status)}</div></div>
        <div style="display:flex; gap:6px;">
          <button class="admin-edit-btn" onclick="editAudiencia('${x.id}')"><i class="fa-solid fa-pen" style="font-size:12px;"></i></button>
          <button class="admin-del-btn" onclick="removeAudiencia('${x.id}')"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>
        </div>
      </div>
    `).join('')}
  `;
}
function submitAudiencia() {
  const data = { hora: val('au-hora'), cliente: val('au-cliente'), advogado: val('au-advogado'), status: val('au-status') };
  if (!data.cliente.trim() || !data.hora.trim()) return;
  const ed = state.editing.audiencia;
  if (ed) { const i = state.audiencias.findIndex(x=>x.id===ed); state.audiencias[i] = { ...data, id: ed }; showToast('Audiência atualizada!'); }
  else { state.audiencias.push({ ...data, id: uid('a') }); showToast('Audiência adicionada à pauta!'); }
  state.editing.audiencia = null;
  renderAdminTabContent(); renderAudiencias();
}
function editAudiencia(id) { state.editing.audiencia = id; renderAdminTabContent(); }
function removeAudiencia(id) { state.audiencias = state.audiencias.filter(x=>x.id!==id); renderAdminTabContent(); renderAudiencias(); }

/* --- AVISOS --- */
function renderAdminAvisos(c) {
  const ed = state.editing.aviso;
  const a = ed ? state.avisos.find(x=>x.id===ed) : null;
  c.innerHTML = `
    <div class="form-grid">
      <div class="form-field" style="grid-column:span 2;"><label>Título</label><input id="av-titulo" value="${esc(a?a.titulo:'')}" placeholder="Título do aviso"></div>
      <div class="form-field" style="grid-column:span 2;"><label>Descrição</label><input id="av-desc" value="${esc(a?a.desc:'')}" placeholder="Descrição do aviso"></div>
      <div class="form-field"><label>Prioridade</label><select id="av-prior">
        <option value="alta" ${a&&a.prioridade==='alta'?'selected':''}>Alta</option>
        <option value="media" ${a&&a.prioridade==='media'?'selected':''}>Média</option>
        <option value="baixa" ${a&&a.prioridade==='baixa'?'selected':''}>Baixa</option>
      </select></div>
      <div class="form-field"><label>Data</label><input id="av-data" value="${esc(a?a.data:'')}" placeholder="DD/MM"></div>
      <div class="form-field"><label>Fixar no topo</label><select id="av-fix">
        <option value="nao" ${!(a&&a.fixado)?'selected':''}>Não</option>
        <option value="sim" ${a&&a.fixado?'selected':''}>Sim</option>
      </select></div>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="admin-add-btn" onclick="submitAviso()"><i class="fa-solid fa-plus"></i> ${ed?'Salvar alterações':'Publicar aviso'}</button>
      ${ed ? `<button class="admin-cancel-btn" onclick="cancelEdit('aviso')">Cancelar</button>` : ''}
    </div>
    <div class="admin-section-label">Avisos publicados (${state.avisos.length})</div>
    ${state.avisos.map(x => `
      <div class="admin-list-item">
        <div><div style="font-size:13px; font-weight:700;">${x.fixado?'📌 ':''}${esc(x.titulo)}</div><div class="admin-list-meta">${esc(x.desc)} · prioridade ${x.prioridade} · ${esc(x.data)}</div></div>
        <div style="display:flex; gap:6px;">
          <button class="admin-edit-btn" onclick="editAviso('${x.id}')"><i class="fa-solid fa-pen" style="font-size:12px;"></i></button>
          <button class="admin-del-btn" onclick="removeAviso('${x.id}')"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>
        </div>
      </div>
    `).join('')}
  `;
}
function submitAviso() {
  const data = { titulo: val('av-titulo'), desc: val('av-desc'), prioridade: val('av-prior'), data: val('av-data'), fixado: val('av-fix')==='sim' };
  if (!data.titulo.trim()) return;
  const ed = state.editing.aviso;
  if (ed) { const i = state.avisos.findIndex(x=>x.id===ed); state.avisos[i] = { ...data, id: ed }; showToast('Aviso atualizado!'); }
  else { state.avisos.push({ ...data, id: uid('v') }); showToast('Aviso publicado!'); }
  state.editing.aviso = null;
  renderAdminTabContent(); renderAvisos();
}
function editAviso(id) { state.editing.aviso = id; renderAdminTabContent(); }
function removeAviso(id) { state.avisos = state.avisos.filter(x=>x.id!==id); renderAdminTabContent(); renderAvisos(); }

/* --- METAS --- */
/* --- GESTÃO DE METAS (Geral / Setor / Carteira) --- */
function renderAdminMetas(c) {
  const ed = state.editing.meta;
  const m = ed ? state.metas.find(x => x.id === ed) : null;
  const tipoAtual = m ? m.tipo : 'Geral';
  c.innerHTML = `
    <div class="admin-list-meta" style="margin-bottom:14px;">Cadastre metas Gerais (escritório todo), por Setor ou por Carteira. Cada meta acompanha valor-alvo, progresso, período, responsável e status — e alimenta automaticamente o painel de acompanhamento e o card "Metas do mês" da Home.</div>
    <div class="form-grid" style="grid-template-columns:1fr 1fr;">
      <div class="form-field" style="grid-column:span 2;"><label>Nome da meta</label><input id="mt-nome" value="${esc(m?m.nome:'')}" placeholder="Ex: Meta Acordos — Agosto/2026"></div>
      <div class="form-field" style="grid-column:span 2;"><label>Descrição</label><input id="mt-descricao" value="${esc(m?m.descricao:'')}" placeholder="O que essa meta representa"></div>
      <div class="form-field"><label>Tipo da meta</label>
        <select id="mt-tipo" onchange="onMetaTipoChange(this.value)">
          ${METAS_TIPOS.map(t => `<option value="${t}" ${tipoAtual===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-field"><label>Status</label>
        <select id="mt-status">${METAS_STATUS.map(s => `<option ${m&&m.status===s?'selected':''}>${s}</option>`).join('')}</select>
      </div>
      <div class="form-field" id="mt-setor-field" style="display:${tipoAtual!=='Geral'?'flex':'none'};"><label>Setor</label>
        <select id="mt-setor">${SETORES.map(s => `<option value="${s}" ${m&&m.setor===s?'selected':''}>${s}</option>`).join('')}</select>
      </div>
      <div class="form-field" id="mt-carteira-field" style="display:${tipoAtual==='Carteira'?'flex':'none'};"><label>Carteira</label>
        <div style="display:flex; gap:6px;">
          <select id="mt-carteira" style="flex:1;">${state.carteiras.map(cw => `<option value="${cw.id}" ${m&&m.carteira===cw.id?'selected':''}>${esc(cw.nome)}</option>`).join('')}</select>
          <button type="button" class="admin-edit-btn" title="Nova carteira" onclick="promptNovaCarteira()"><i class="fa-solid fa-plus" style="font-size:12px;"></i></button>
        </div>
      </div>
      <div class="form-field"><label>Valor da meta (R$)</label><input id="mt-valor-meta" type="number" min="0" value="${m?m.valorMeta:0}"></div>
      <div class="form-field"><label>Valor atingido (R$)</label><input id="mt-valor-atingido" type="number" min="0" value="${m?m.valorAtingido:0}"></div>
      <div class="form-field"><label>Data inicial</label><input id="mt-data-inicial" type="date" value="${m?m.dataInicial:''}"></div>
      <div class="form-field"><label>Data final</label><input id="mt-data-final" type="date" value="${m?m.dataFinal:''}"></div>
      <div class="form-field" style="grid-column:span 2;"><label>Responsável</label>
        <select id="mt-responsavel">${state.employees.map(e => `<option value="${e.id}" ${m&&m.responsavelId===e.id?'selected':''}>${esc(e.nome)} — ${esc(e.cargo)}</option>`).join('')}</select>
      </div>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="admin-add-btn" onclick="submitMeta()"><i class="fa-solid fa-plus"></i> ${ed?'Salvar alterações':'Criar meta'}</button>
      ${ed ? `<button class="admin-cancel-btn" onclick="cancelEdit('meta')">Cancelar</button>` : ''}
    </div>
    <div class="admin-section-label">Metas cadastradas (${state.metas.length})</div>
    ${state.metas.length === 0 ? `<div style="font-size:12.5px; color:var(--text-3);">Nenhuma meta cadastrada ainda.</div>` : state.metas.map(x => { const p = metaProgressoPct(x); return `
      <div class="admin-list-item" style="align-items:flex-start;">
        <div style="flex:1;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span style="font-size:13px; font-weight:700;">${esc(x.nome)}</span>
            <span class="status-pill">${esc(x.tipo)}</span>
            <span class="status-pill" style="background:${metaStatusCor(x.status)}22; color:${metaStatusCor(x.status)};">${esc(x.status)}</span>
          </div>
          <div class="admin-list-meta">
            ${x.setor ? `Setor: ${esc(x.setor)} · ` : ''}${x.carteira ? `${esc(carteiraNome(x.carteira))} · ` : ''}Responsável: ${esc(responsavelNome(x.responsavelId))} · ${formatarDataBR(x.dataInicial)} a ${formatarDataBR(x.dataFinal)}
          </div>
          <div style="font-size:10.5px; color:var(--text-3); margin-top:2px;"><i class="fa-solid fa-eye" style="font-size:9px;"></i> Quem vê: ${esc(metaQuemPodeVer(x))}</div>
          <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
            <div style="flex:1; max-width:220px; height:6px; background:var(--surface-2); border-radius:8px; overflow:hidden;">
              <div style="height:100%; width:${Math.min(p,100)}%; background:${metaStatusCor(x.status)}; border-radius:8px;"></div>
            </div>
            <span class="mono" style="font-size:11px; font-weight:700;">${p}% · ${currency(x.valorAtingido)} / ${currency(x.valorMeta)}</span>
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="admin-edit-btn" onclick="editMeta('${x.id}')"><i class="fa-solid fa-pen" style="font-size:12px;"></i></button>
          <button class="admin-del-btn" onclick="removeMeta('${x.id}')"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>
        </div>
      </div>
    `;}).join('')}
  `;
}
function onMetaTipoChange(tipo) {
  const setorField = document.getElementById('mt-setor-field');
  const carteiraField = document.getElementById('mt-carteira-field');
  if (setorField) setorField.style.display = tipo === 'Geral' ? 'none' : 'flex';
  if (carteiraField) carteiraField.style.display = tipo === 'Carteira' ? 'flex' : 'none';
}
function promptNovaCarteira() {
  const nome = window.prompt('Nome da nova carteira:');
  if (!nome || !nome.trim()) return;
  const nova = { id: uid('cw'), nome: nome.trim() };
  state.carteiras.push(nova);
  renderAdminTabContent();
  showToast('Carteira criada! Selecione-a no campo Carteira.');
}
function submitMeta() {
  const tipo = val('mt-tipo');
  const data = {
    nome: val('mt-nome'),
    descricao: val('mt-descricao'),
    tipo,
    setor: tipo === 'Geral' ? '' : val('mt-setor'),
    carteira: tipo === 'Carteira' ? val('mt-carteira') : '',
    valorMeta: Number(val('mt-valor-meta')) || 0,
    valorAtingido: Number(val('mt-valor-atingido')) || 0,
    dataInicial: val('mt-data-inicial'),
    dataFinal: val('mt-data-final'),
    responsavelId: val('mt-responsavel'),
    status: val('mt-status'),
  };
  if (!data.nome.trim()) { showToast('Informe um nome para a meta.'); return; }
  if (data.dataInicial && data.dataFinal && data.dataInicial > data.dataFinal) {
    showToast('A data final não pode ser anterior à data inicial.'); return;
  }
  const ed = state.editing.meta;
  if (ed) { const i = state.metas.findIndex(x=>x.id===ed); state.metas[i] = { ...data, id: ed }; showToast('Meta atualizada!'); }
  else { state.metas.push({ ...data, id: uid('mt') }); showToast('Meta criada!'); }
  state.editing.meta = null;
  renderAdminTabContent();
  renderMetas();
  if (state.currentView === 'metas') renderMetasDashboardView();
}
function editMeta(id) { state.editing.meta = id; renderAdminTabContent(); }
function removeMeta(id) {
  state.metas = state.metas.filter(x=>x.id!==id);
  renderAdminTabContent();
  renderMetas();
  if (state.currentView === 'metas') renderMetasDashboardView();
}

/* --- FUNCIONÁRIO DO MÊS --- */
function renderAdminFuncionarioMes(c) {
  const f = state.funcionarioMes;
  c.innerHTML = `
    <div class="form-grid">
      <div class="form-field"><label>Nome</label><input id="fm-nome" value="${esc(f.nome)}"></div>
      <div class="form-field"><label>Cargo</label><input id="fm-cargo" value="${esc(f.cargo)}"></div>
      <div class="form-field" style="grid-column:span 2;"><label>Motivo</label><input id="fm-motivo" value="${esc(f.motivo)}"></div>
      <div class="form-field" style="grid-column:span 2;"><label>Mensagem da diretoria</label><input id="fm-msg" value="${esc(f.mensagem)}"></div>
    </div>
    <button class="admin-add-btn" onclick="submitFuncionarioMes()"><i class="fa-solid fa-plus"></i> Salvar</button>
  `;
}
function submitFuncionarioMes() {
  state.funcionarioMes = { nome: val('fm-nome'), cargo: val('fm-cargo'), motivo: val('fm-motivo'), mensagem: val('fm-msg') };
  renderFuncionarioMes();
  showToast('Funcionário do mês atualizado!');
}

/* --- ANIVERSARIANTES --- */
function renderAdminAniversariantes(c) {
  const ed = state.editing.aniversariante;
  const p = ed ? state.aniversariantes.find(x=>x.id===ed) : null;
  c.innerHTML = `
    <div class="admin-list-meta" style="margin-bottom:10px;">Vincule o aniversariante a um funcionário cadastrado para que ele possa receber parabéns e notificações.</div>
    <div class="form-grid">
      <div class="form-field"><label>Funcionário vinculado</label>
        <select id="an-funcionario">
          <option value="">— Nenhum (apenas exibição) —</option>
          ${state.employees.map(e => `<option value="${e.id}" ${p&&p.funcionarioId===e.id?'selected':''}>${esc(e.nome)} — ${esc(e.cargo)}</option>`).join('')}
        </select>
      </div>
      <div class="form-field"><label>Nome</label><input id="an-nome" value="${esc(p?p.nome:'')}" placeholder="Nome completo"></div>
      <div class="form-field"><label>Cargo</label><input id="an-cargo" value="${esc(p?p.cargo:'')}" placeholder="Cargo"></div>
      <div class="form-field"><label>Data de aniversário</label><input id="an-data" value="${esc(p?p.data:'')}" placeholder="DD/MM"></div>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="admin-add-btn" onclick="submitAniversariante()"><i class="fa-solid fa-plus"></i> ${ed?'Salvar alterações':'Adicionar'}</button>
      ${ed ? `<button class="admin-cancel-btn" onclick="cancelEdit('aniversariante')">Cancelar</button>` : ''}
    </div>
    <div class="admin-section-label">Aniversariantes do mês (${state.aniversariantes.length})</div>
    ${state.aniversariantes.map(x => `
      <div class="admin-list-item">
        <div style="font-size:13px; font-weight:700;">${esc(x.nome)} <span style="color:var(--text-3); font-weight:600;">· ${esc(x.cargo)} · ${esc(x.data)}</span> ${!x.funcionarioId?'<span class="status-pill" style="background:var(--danger-soft); color:var(--danger);">sem vínculo</span>':''}</div>
        <div style="display:flex; gap:6px;">
          <button class="admin-edit-btn" onclick="editAniversariante('${x.id}')"><i class="fa-solid fa-pen" style="font-size:12px;"></i></button>
          <button class="admin-del-btn" onclick="removeAniversariante('${x.id}')"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>
        </div>
      </div>
    `).join('')}
  `;
}
function submitAniversariante() {
  const data = { nome: val('an-nome'), cargo: val('an-cargo'), data: val('an-data'), funcionarioId: val('an-funcionario') || null };
  if (!data.nome.trim()) return;
  const ed = state.editing.aniversariante;
  if (ed) { const i = state.aniversariantes.findIndex(x=>x.id===ed); state.aniversariantes[i] = { ...data, id: ed }; showToast('Aniversariante atualizado!'); }
  else { state.aniversariantes.push({ ...data, id: uid('n') }); showToast('Aniversariante adicionado!'); }
  state.editing.aniversariante = null;
  renderAdminTabContent(); renderAniversariantes();
}
function editAniversariante(id) { state.editing.aniversariante = id; renderAdminTabContent(); }
function removeAniversariante(id) { state.aniversariantes = state.aniversariantes.filter(x=>x.id!==id); renderAdminTabContent(); renderAniversariantes(); }

/* --- LINKS --- */
function renderAdminLinks(c) {
  const ed = state.editing.link;
  const l = ed ? state.links.find(x=>x.id===ed) : null;
  c.innerHTML = `
    <div class="form-grid">
      <div class="form-field"><label>Nome do sistema</label><input id="lk-nome" value="${esc(l?l.nome:'')}" placeholder="Ex: PJe"></div>
      <div class="form-field"><label>URL de acesso</label><input id="lk-url" value="${esc(l?l.url:'')}" placeholder="https://..."></div>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="admin-add-btn" onclick="submitLink()"><i class="fa-solid fa-plus"></i> ${ed?'Salvar alterações':'Adicionar link'}</button>
      ${ed ? `<button class="admin-cancel-btn" onclick="cancelEdit('link')">Cancelar</button>` : ''}
    </div>
    <div class="admin-section-label">Links cadastrados (${state.links.length})</div>
    ${state.links.map(x => `
      <div class="admin-list-item">
        <div><div style="font-size:13px; font-weight:700;">${esc(x.nome)}</div><div class="admin-list-meta"><i class="fa-solid fa-arrow-up-right-from-square" style="font-size:10px;"></i> ${esc(x.url)}</div></div>
        <div style="display:flex; gap:6px;">
          <button class="admin-edit-btn" onclick="editLink('${x.id}')"><i class="fa-solid fa-pen" style="font-size:12px;"></i></button>
          <button class="admin-del-btn" onclick="removeLink('${x.id}')"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>
        </div>
      </div>
    `).join('')}
  `;
}
function submitLink() {
  const data = { nome: val('lk-nome'), url: normalizeUrl(val('lk-url')) };
  if (!data.nome.trim() || !data.url.trim()) return;
  const ed = state.editing.link;
  if (ed) { const i = state.links.findIndex(x=>x.id===ed); state.links[i] = { ...data, id: ed }; showToast('Link atualizado!'); }
  else { state.links.push({ ...data, id: uid('l') }); showToast('Link adicionado!'); }
  state.editing.link = null;
  renderAdminTabContent(); renderLinks();
}
function editLink(id) { state.editing.link = id; renderAdminTabContent(); }
function removeLink(id) { state.links = state.links.filter(x=>x.id!==id); renderAdminTabContent(); renderLinks(); }

/* --- FERRAMENTAS --- */
function renderAdminFerramentas(c) {
  const ed = state.editing.tool;
  const t = ed ? state.tools.find(x=>x.id===ed) : null;
  c.innerHTML = `
    <div class="form-grid">
      <div class="form-field"><label>Nome da ferramenta</label><input id="tl-nome" value="${esc(t?t.nome:'')}" placeholder="Ex: AdvBox"></div>
      <div class="form-field"><label>Descrição</label><input id="tl-desc" value="${esc(t?t.desc:'')}" placeholder="Ex: Gestão de processos"></div>
      <div class="form-field" style="grid-column:span 2;"><label>URL de acesso</label><input id="tl-url" value="${esc(t?t.url:'')}" placeholder="https://..."></div>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="admin-add-btn" onclick="submitTool()"><i class="fa-solid fa-plus"></i> ${ed?'Salvar alterações':'Adicionar ferramenta'}</button>
      ${ed ? `<button class="admin-cancel-btn" onclick="cancelEdit('tool')">Cancelar</button>` : ''}
    </div>
    <div class="admin-section-label">Ferramentas cadastradas (${state.tools.length})</div>
    ${state.tools.map(x => `
      <div class="admin-list-item">
        <div><div style="font-size:13px; font-weight:700;">${esc(x.nome)}</div><div class="admin-list-meta">${esc(x.desc)}${x.url?` · <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:10px;"></i> ${esc(x.url)}`:''}</div></div>
        <div style="display:flex; gap:6px;">
          <button class="admin-edit-btn" onclick="editTool('${x.id}')"><i class="fa-solid fa-pen" style="font-size:12px;"></i></button>
          <button class="admin-del-btn" onclick="removeTool('${x.id}')"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>
        </div>
      </div>
    `).join('')}
  `;
}
function submitTool() {
  const data = { nome: val('tl-nome'), desc: val('tl-desc'), url: normalizeUrl(val('tl-url')) };
  if (!data.nome.trim()) return;
  const ed = state.editing.tool;
  if (ed) { const i = state.tools.findIndex(x=>x.id===ed); state.tools[i] = { ...data, id: ed }; showToast('Ferramenta atualizada!'); }
  else { state.tools.push({ ...data, id: uid('f') }); showToast('Ferramenta adicionada!'); }
  state.editing.tool = null;
  renderAdminTabContent(); renderTools();
}
function editTool(id) { state.editing.tool = id; renderAdminTabContent(); }
function removeTool(id) { state.tools = state.tools.filter(x=>x.id!==id); renderAdminTabContent(); renderTools(); }

/* --- CLASSIFICAÇÕES DE SINALIZAÇÃO --- */
function renderAdminClassificacoes(c) {
  const ed = state.editing.classificacao;
  const cl = ed ? state.classificacoes.find(x=>x.id===ed) : null;
  c.innerHTML = `
    <div class="admin-list-meta" style="margin-bottom:14px;">Defina os níveis de gravidade usados ao registrar uma sinalização de colaborador (ex: Leve, Média, Grave, Crítica) e a cor de cada um.</div>
    <div class="form-grid" style="grid-template-columns:2fr 1fr;">
      <div class="form-field"><label>Nome da classificação</label><input id="cl-nome" value="${esc(cl?cl.nome:'')}" placeholder="Ex: Grave"></div>
      <div class="form-field"><label>Cor</label><input id="cl-cor" type="color" value="${cl?cl.cor:'#B4881F'}" style="height:36px; padding:2px;"></div>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="admin-add-btn" onclick="submitClassificacao()"><i class="fa-solid fa-plus"></i> ${ed?'Salvar alterações':'Adicionar classificação'}</button>
      ${ed ? `<button class="admin-cancel-btn" onclick="cancelEdit('classificacao')">Cancelar</button>` : ''}
    </div>
    <div class="admin-section-label">Classificações cadastradas (${state.classificacoes.length})</div>
    ${state.classificacoes.map(x => `
      <div class="admin-list-item">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="width:16px; height:16px; border-radius:5px; background:${x.cor}; display:inline-block; flex-shrink:0;"></span>
          <div style="font-size:13px; font-weight:700;">${esc(x.nome)}</div>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="admin-edit-btn" onclick="editClassificacao('${x.id}')"><i class="fa-solid fa-pen" style="font-size:12px;"></i></button>
          <button class="admin-del-btn" onclick="removeClassificacao('${x.id}')"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>
        </div>
      </div>
    `).join('')}
  `;
}
function submitClassificacao() {
  const data = { nome: val('cl-nome'), cor: val('cl-cor') };
  if (!data.nome.trim()) return;
  const ed = state.editing.classificacao;
  if (ed) { const i = state.classificacoes.findIndex(x=>x.id===ed); state.classificacoes[i] = { ...data, id: ed }; showToast('Classificação atualizada!'); }
  else { state.classificacoes.push({ ...data, id: uid('cl') }); showToast('Classificação adicionada!'); }
  state.editing.classificacao = null;
  renderAdminTabContent();
}
function editClassificacao(id) { state.editing.classificacao = id; renderAdminTabContent(); }
function removeClassificacao(id) {
  state.classificacoes = state.classificacoes.filter(x=>x.id!==id);
  renderAdminTabContent();
}

/* --- PERMISSÕES DE ACESSO --- */
function renderAdminPermissoes(c) {
  c.innerHTML = `
    <div class="admin-list-meta" style="margin-bottom:6px;">Defina o que cada <strong>setor</strong> pode visualizar. Colaboradores só acessam o painel do próprio setor por padrão — marque as caixas abaixo para liberar acesso cruzado a outro setor. Administradores sempre têm acesso total e não dependem desta tabela.</div>
    <div style="font-size:11px; color:var(--text-3); margin-bottom:14px;"><i class="fa-solid fa-flask" style="font-size:10px;"></i> Use o seletor "Visualizando..." no cabeçalho (visível só para administradores) para simular um colaborador de cada setor e conferir o efeito das permissões abaixo.</div>
    <div style="overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px 10px; border-bottom:1px solid var(--border); color:var(--text-3); font-size:11px; text-transform:uppercase;">Setor</th>
            ${PERMISSOES_SETOR_KEYS.map(p => `<th style="text-align:center; padding:8px 10px; border-bottom:1px solid var(--border); color:var(--text-3); font-size:11px; font-weight:700;" title="${esc(p.desc)}">${esc(p.label)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${SETORES.map(setor => {
            const qtdFuncionarios = state.employees.filter(e => e.setor === setor).length;
            return `
            <tr>
              <td style="padding:8px 10px; border-bottom:1px solid var(--border); font-weight:700;">
                ${esc(setor)}
                ${qtdFuncionarios === 0 ? `<div style="font-size:10px; font-weight:600; color:var(--text-3);">Nenhum colaborador neste setor</div>` : ''}
              </td>
              ${PERMISSOES_SETOR_KEYS.map(p => `
                <td style="text-align:center; padding:8px 10px; border-bottom:1px solid var(--border);">
                  <input type="checkbox" ${state.permissoesSetor[setor] && state.permissoesSetor[setor][p.key] ? 'checked' : ''} onchange="togglePermissaoSetor('${setor}','${p.key}', this.checked)" style="width:16px; height:16px; cursor:pointer;">
                </td>
              `).join('')}
            </tr>
          `;}).join('')}
        </tbody>
      </table>
    </div>

    <div class="admin-section-label">Gestores por setor (metas)</div>
    <div class="admin-list-meta" style="margin-bottom:14px;">Um gestor enxerga <strong>todas</strong> as metas do setor que administra — inclusive metas de Carteira/individuais de colegas. Colaboradores comuns só veem metas Gerais, as próprias e a meta coletiva do próprio setor (nunca a carteira individual de um colega). Marque abaixo quem administra cada setor.</div>
    ${SETORES.map(setor => `
      <div class="card" style="padding:14px 16px; margin-bottom:10px;">
        <div style="font-size:12.5px; font-weight:800; margin-bottom:8px;">${esc(setor)}</div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px,1fr)); gap:6px;">
          ${state.employees.map(e => `
            <label style="display:flex; align-items:center; gap:8px; font-size:12px; padding:5px 8px; border:1px solid var(--border); border-radius:8px; cursor:pointer;">
              <input type="checkbox" ${(state.gestoresSetor[setor]||[]).includes(e.id) ? 'checked' : ''} onchange="toggleGestorSetor('${setor}','${e.id}', this.checked)" style="width:14px; height:14px;">
              ${esc(e.nome)} <span style="color:var(--text-3);">— ${esc(e.setor)}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('')}
  `;
}
function togglePermissaoSetor(setor, key, checked) {
  if (!state.permissoesSetor[setor]) state.permissoesSetor[setor] = {};
  state.permissoesSetor[setor][key] = checked;
  showToast('Permissões atualizadas!');
}
function toggleGestorSetor(setor, employeeId, checked) {
  if (!state.gestoresSetor[setor]) state.gestoresSetor[setor] = [];
  const lista = state.gestoresSetor[setor];
  const i = lista.indexOf(employeeId);
  if (checked && i === -1) lista.push(employeeId);
  if (!checked && i !== -1) lista.splice(i, 1);
  showToast('Gestores do setor atualizados!');
  renderMetas();
  if (state.currentView === 'metas') renderMetasDashboardView();
}



/* --- GRUPOS DE CHAT --- */
function renderAdminGruposChat(c) {
  const ed = state.editing.grupo;
  const g = ed ? state.chatConversas.find(x=>x.id===ed) : null;
  const grupos = state.chatConversas.filter(x => x.tipo === 'grupo');
  c.innerHTML = `
    <div class="admin-list-meta" style="margin-bottom:14px;">Crie grupos de chat internos (ex: por equipe ou setor) e escolha exatamente quais colaboradores pertencem a cada grupo. Apenas os membros selecionados conseguem visualizar as mensagens do grupo (use o seletor "Visualizando..." no cabeçalho para conferir).</div>
    <div class="form-grid" style="grid-template-columns:1fr 1fr;">
      <div class="form-field" style="grid-column:span 2;"><label>Nome do grupo</label><input id="gc-nome" value="${esc(g?g.nome:'')}" placeholder="Ex: Equipe Jurídico"></div>
      <div class="form-field" style="grid-column:span 2;"><label>Preencher membros automaticamente por setor (opcional)</label>
        <select id="gc-setor" onchange="autoSelecionarSetor(this.value)">
          <option value="">— Selecionar manualmente —</option>
          ${SETORES.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="admin-section-label" style="margin-top:6px;">Membros do grupo</div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:14px;">
      ${state.employees.map(e => `
        <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; padding:6px 8px; border:1px solid var(--border); border-radius:8px; cursor:pointer;">
          <input type="checkbox" class="gc-membro" value="${e.id}" ${g && (g.membros||[]).includes(e.id) ? 'checked' : ''} style="width:15px; height:15px;">
          ${esc(e.nome)} <span style="color:var(--text-3);">— ${esc(e.setor)}</span>
        </label>
      `).join('')}
    </div>
    <div style="display:flex; gap:8px;">
      <button class="admin-add-btn" onclick="submitGrupoChat()"><i class="fa-solid fa-plus"></i> ${ed?'Salvar alterações':'Criar grupo'}</button>
      ${ed ? `<button class="admin-cancel-btn" onclick="cancelEdit('grupo')">Cancelar</button>` : ''}
    </div>
    <div class="admin-section-label">Grupos cadastrados (${grupos.length})</div>
    ${grupos.length === 0 ? `<div style="font-size:12.5px; color:var(--text-3);">Nenhum grupo criado ainda.</div>` : grupos.map(x => `
      <div class="admin-list-item" style="align-items:flex-start;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="avatar" style="width:30px; height:30px; font-size:12px; background:linear-gradient(135deg, var(--brass), var(--brass-light)); color:var(--navy);"><i class="fa-solid fa-users"></i></div>
          <div>
            <div style="font-size:13px; font-weight:700;">${esc(x.nome)}</div>
            <div class="admin-list-meta">${(x.membros||[]).length} membro(s): ${(x.membros||[]).map(id => { const e = state.employees.find(y=>y.id===id); return e ? esc(e.nome) : ''; }).filter(Boolean).join(', ') || '—'}</div>
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="admin-edit-btn" onclick="editGrupoChat('${x.id}')"><i class="fa-solid fa-pen" style="font-size:12px;"></i></button>
          <button class="admin-del-btn" onclick="removeGrupoChat('${x.id}')"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>
        </div>
      </div>
    `).join('')}
  `;
}
function autoSelecionarSetor(setor) {
  document.querySelectorAll('.gc-membro').forEach(cb => {
    const emp = state.employees.find(e => e.id === cb.value);
    cb.checked = !!(setor && emp && emp.setor === setor);
  });
}
async function submitGrupoChat() {
  if (!supabaseClient) { showToast('Portal ainda não conectado ao Supabase.'); return; }
  const nome = val('gc-nome');
  if (!nome.trim()) { showToast('Informe um nome para o grupo.'); return; }
  const membros = Array.from(document.querySelectorAll('.gc-membro:checked')).map(cb => cb.value);
  if (!membros.length) { showToast('Selecione ao menos um membro para o grupo.'); return; }
  const ed = state.editing.grupo;
  const descricao = `Grupo · ${membros.length} membro(s)`;
  if (ed) {
    const { error: e1 } = await supabaseClient.from('chat_conversas').update({ nome, descricao }).eq('id', ed);
    if (e1) { showToast('Erro ao atualizar grupo: ' + e1.message); return; }
    const { error: eDel } = await supabaseClient.from('chat_membros').delete().eq('conversa_id', ed);
    if (eDel) { showToast('Erro ao atualizar membros: ' + eDel.message); return; }
    const { error: e2 } = await supabaseClient.from('chat_membros').insert(membros.map(fid => ({ conversa_id: ed, funcionario_id: fid })));
    if (e2) { showToast('Erro ao atualizar membros: ' + e2.message); return; }
    showToast('Grupo atualizado!');
  } else {
    const { data: novaConversa, error: e1 } = await supabaseClient
      .from('chat_conversas').insert({ nome, tipo: 'grupo', descricao }).select().single();
    if (e1) { showToast('Erro ao criar grupo: ' + e1.message); return; }
    const { error: e2 } = await supabaseClient
      .from('chat_membros').insert(membros.map(fid => ({ conversa_id: novaConversa.id, funcionario_id: fid })));
    if (e2) { showToast('Erro ao adicionar membros: ' + e2.message); return; }
    showToast('Grupo criado!');
  }
  state.editing.grupo = null;
  await carregarConversas();
  renderAdminTabContent();
}
function editGrupoChat(id) { state.editing.grupo = id; renderAdminTabContent(); }
async function removeGrupoChat(id) {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.from('chat_conversas').delete().eq('id', id);
  if (error) { showToast('Erro ao excluir grupo: ' + error.message); return; }
  if (state.activeChatId === id) state.activeChatId = null;
  await carregarConversas();
  renderAdminTabContent();
}

/* --- CURSOS E OFICINAS (admin) ---
   Dois níveis: lista/CRUD de cursos, e — ao clicar em "Aulas" — uma tela
   de gerenciamento das aulas e materiais extras daquele curso específico
   (adicionar, editar, excluir, reordenar). */
function renderAdminCursos(c) {
  if (state.adminCursoGerenciandoId) { renderAdminCursoAulas(c); return; }
  const ed = state.editing.curso;
  const curso = ed ? state.cursos.find(x => x.id === ed) : null;
  const p = curso ? curso.palestrante : {};
  c.innerHTML = `
    <div class="admin-list-meta" style="margin-bottom:14px;">Cadastre cursos e oficinas de treinamento interno. Depois de criar o curso, use o botão "Aulas" na lista para adicionar vídeos, PDFs, apresentações e materiais extras.</div>
    <div class="form-grid" style="grid-template-columns:1fr 1fr;">
      <div class="form-field" style="grid-column:span 2;"><label>Nome do curso</label><input id="crs-nome" value="${esc(curso?curso.nome:'')}" placeholder="Ex: Fundamentos de LGPD"></div>
      <div class="form-field"><label>Tema</label><input id="crs-tema" value="${esc(curso?curso.tema:'')}" placeholder="Ex: Compliance"></div>
      <div class="form-field"><label>Status</label>
        <select id="crs-status"><option ${curso&&curso.status==='Publicado'?'selected':''}>Publicado</option><option ${curso&&curso.status==='Rascunho'?'selected':''}>Rascunho</option></select>
      </div>
      <div class="form-field" style="grid-column:span 2;"><label>Descrição</label><input id="crs-descricao" value="${esc(curso?curso.descricao:'')}" placeholder="Do que se trata o curso"></div>
    </div>
    <div class="admin-section-label" style="margin-top:6px;">Palestrante</div>
    <div class="form-grid" style="grid-template-columns:1fr 1fr;">
      <div class="form-field"><label>Nome do palestrante</label><input id="crs-p-nome" value="${esc(p.nome||'')}" placeholder="Nome completo"></div>
      <div class="form-field"><label>Cargo</label><input id="crs-p-cargo" value="${esc(p.cargo||'')}" placeholder="Ex: Consultora"></div>
      <div class="form-field"><label>Empresa</label><input id="crs-p-empresa" value="${esc(p.empresa||'')}" placeholder="Empresa/organização"></div>
      <div class="form-field"><label>Contato</label><input id="crs-p-contato" value="${esc(p.contato||'')}" placeholder="E-mail de contato"></div>
      <div class="form-field"><label>LinkedIn</label><input id="crs-p-linkedin" value="${esc(p.linkedin||'')}" placeholder="https://linkedin.com/in/..."></div>
      <div class="form-field"><label>Instagram</label><input id="crs-p-instagram" value="${esc(p.instagram||'')}" placeholder="https://instagram.com/..."></div>
      <div class="form-field" style="grid-column:span 2;"><label>Website</label><input id="crs-p-website" value="${esc(p.website||'')}" placeholder="https://..."></div>
      <div class="form-field" style="grid-column:span 2;">
        <label>Foto do palestrante</label>
        <div style="display:flex; align-items:center; gap:12px;">
          <img id="crs-foto-preview" src="${p.foto||''}" style="width:52px; height:52px; border-radius:12px; object-fit:cover; background:var(--surface-2); ${p.foto?'':'display:none;'}">
          <button type="button" class="admin-edit-btn" onclick="triggerCursoUpload('foto')"><i class="fa-solid fa-upload"></i> Enviar foto</button>
        </div>
      </div>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="admin-add-btn" onclick="submitCurso()"><i class="fa-solid fa-plus"></i> ${ed?'Salvar alterações':'Criar curso'}</button>
      ${ed ? `<button class="admin-cancel-btn" onclick="cancelEditCurso()">Cancelar</button>` : ''}
    </div>
    <div class="admin-section-label">Cursos cadastrados (${state.cursos.length})</div>
    ${[...state.cursos].sort((a,b)=>a.ordem-b.ordem).map((x,i,arr) => `
      <div class="admin-list-item" style="align-items:center;">
        <div style="display:flex; align-items:center; gap:10px; flex:1;">
          <div style="display:flex; flex-direction:column;">
            <button class="admin-edit-btn" style="padding:2px 6px;" ${i===0?'disabled':''} onclick="moverCursoOrdem('${x.id}',-1)" title="Mover para cima"><i class="fa-solid fa-chevron-up" style="font-size:10px;"></i></button>
            <button class="admin-edit-btn" style="padding:2px 6px; margin-top:2px;" ${i===arr.length-1?'disabled':''} onclick="moverCursoOrdem('${x.id}',1)" title="Mover para baixo"><i class="fa-solid fa-chevron-down" style="font-size:10px;"></i></button>
          </div>
          <div>
            <div style="font-size:13px; font-weight:700;">${esc(x.nome)} <span class="status-pill" style="margin-left:4px;">${esc(x.tema)}</span> ${x.status==='Rascunho'?'<span class="status-pill" style="background:var(--surface-2);">Rascunho</span>':''}</div>
            <div class="admin-list-meta">${esc(x.palestrante.nome)} · ${totalAulas(x)} aula(s) · ${x.materiaisExtras.length} material(is) extra(s)</div>
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="admin-edit-btn" onclick="gerenciarAulasCurso('${x.id}')" title="Gerenciar aulas"><i class="fa-solid fa-list-check" style="font-size:12px;"></i> Aulas</button>
          <button class="admin-edit-btn" onclick="editCurso('${x.id}')" title="Editar"><i class="fa-solid fa-pen" style="font-size:12px;"></i></button>
          <button class="admin-del-btn" onclick="removeCurso('${x.id}')" title="Excluir"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>
        </div>
      </div>
    `).join('')}
  `;
}
function submitCurso() {
  const ed = state.editing.curso;
  const fotoTemp = state.editing.speakerFotoTemp;
  const data = {
    nome: val('crs-nome'), tema: val('crs-tema'), status: val('crs-status'), descricao: val('crs-descricao'),
    palestrante: {
      nome: val('crs-p-nome'), cargo: val('crs-p-cargo'), empresa: val('crs-p-empresa'), contato: val('crs-p-contato'),
      linkedin: val('crs-p-linkedin'), instagram: val('crs-p-instagram'), website: val('crs-p-website'),
      foto: fotoTemp !== undefined ? fotoTemp : (ed ? (state.cursos.find(x=>x.id===ed).palestrante.foto) : ''),
    },
  };
  if (!data.nome.trim()) { showToast('Informe um nome para o curso.'); return; }
  if (ed) {
    const i = state.cursos.findIndex(x=>x.id===ed);
    state.cursos[i] = { ...state.cursos[i], ...data };
    showToast('Curso atualizado!');
  } else {
    const maiorOrdem = state.cursos.reduce((m,x)=>Math.max(m,x.ordem||0),0);
    state.cursos.push({ id: uid('crs'), ordem: maiorOrdem+1, aulas: [], materiaisExtras: [], ...data });
    showToast('Curso criado!');
  }
  state.editing.curso = null;
  state.editing.speakerFotoTemp = undefined;
  renderAdminTabContent();
}
function editCurso(id) { state.editing.curso = id; state.editing.speakerFotoTemp = undefined; renderAdminTabContent(); }
function cancelEditCurso() { state.editing.curso = null; state.editing.speakerFotoTemp = undefined; renderAdminTabContent(); }
function removeCurso(id) {
  state.cursos = state.cursos.filter(x=>x.id!==id);
  Object.values(state.progressoCursos).forEach(porCurso => { delete porCurso[id]; });
  renderAdminTabContent();
}
function moverCursoOrdem(id, dir) {
  const ordenados = [...state.cursos].sort((a,b)=>a.ordem-b.ordem);
  const i = ordenados.findIndex(x=>x.id===id);
  const j = i + dir;
  if (j < 0 || j >= ordenados.length) return;
  [ordenados[i].ordem, ordenados[j].ordem] = [ordenados[j].ordem, ordenados[i].ordem];
  renderAdminTabContent();
}
function gerenciarAulasCurso(id) { state.adminCursoGerenciandoId = id; state.editing.aula = null; renderAdminTabContent(); }
function voltarListaCursosAdmin() { state.adminCursoGerenciandoId = null; renderAdminTabContent(); }

function renderAdminCursoAulas(c) {
  const curso = state.cursos.find(x => x.id === state.adminCursoGerenciandoId);
  if (!curso) { state.adminCursoGerenciandoId = null; renderAdminTabContent(); return; }
  const ed = state.editing.aula;
  const aula = ed ? curso.aulas.find(a => a.id === ed) : null;
  const tipoAtual = aula ? aula.tipo : 'video';
  const arquivoTemp = state.editing.aulaArquivoTemp;
  c.innerHTML = `
    <button class="open-btn" style="margin-bottom:12px;" onclick="voltarListaCursosAdmin()"><i class="fa-solid fa-arrow-left"></i> Voltar aos cursos</button>
    <div class="admin-list-meta" style="margin-bottom:14px;"><strong>${esc(curso.nome)}</strong> — adicione, edite, exclua e reordene as aulas deste curso.</div>

    <div class="form-grid" style="grid-template-columns:1fr 1fr;">
      <div class="form-field" style="grid-column:span 2;"><label>Título da aula</label><input id="aula-titulo" value="${esc(aula?aula.titulo:'')}" placeholder="Ex: Introdução ao tema"></div>
      <div class="form-field"><label>Tipo de conteúdo</label>
        <select id="aula-tipo" onchange="onAulaTipoChange(this.value)">
          ${AULA_TIPOS.map(t => `<option value="${t.value}" ${tipoAtual===t.value?'selected':''}>${t.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-field" id="aula-duracao-field" style="display:${tipoAtual==='video'?'flex':'none'};"><label>Duração (min)</label><input id="aula-duracao" type="number" min="0" value="${aula&&aula.duracaoMin?aula.duracaoMin:''}"></div>
      <div class="form-field" style="grid-column:span 2;">
        <label>Conteúdo (link ou upload de arquivo)</label>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <input id="aula-url" style="flex:1; min-width:220px;" value="${aula&&!arquivoTemp?esc(aula.url):''}" placeholder="Cole um link (YouTube, Vimeo, PDF, etc.)">
          <button type="button" class="admin-edit-btn" onclick="triggerCursoUpload('aula')"><i class="fa-solid fa-upload"></i> Enviar arquivo</button>
        </div>
        <div id="aula-arquivo-status" style="font-size:11px; color:var(--text-3); margin-top:4px;">${arquivoTemp ? 'Arquivo carregado: '+esc(arquivoTemp.nome) : ''}</div>
      </div>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="admin-add-btn" onclick="submitAula()"><i class="fa-solid fa-plus"></i> ${ed?'Salvar alterações':'Adicionar aula'}</button>
      ${ed ? `<button class="admin-cancel-btn" onclick="cancelEditAula()">Cancelar</button>` : ''}
    </div>

    <div class="admin-section-label">Aulas do curso (${curso.aulas.length})</div>
    ${curso.aulas.length===0 ? `<div style="font-size:12.5px; color:var(--text-3);">Nenhuma aula cadastrada ainda.</div>` : [...curso.aulas].sort((a,b)=>a.ordem-b.ordem).map((a,i,arr) => `
      <div class="admin-list-item" style="align-items:center;">
        <div style="display:flex; align-items:center; gap:10px; flex:1;">
          <div style="display:flex; flex-direction:column;">
            <button class="admin-edit-btn" style="padding:2px 6px;" ${i===0?'disabled':''} onclick="moverAulaOrdem('${a.id}',-1)"><i class="fa-solid fa-chevron-up" style="font-size:10px;"></i></button>
            <button class="admin-edit-btn" style="padding:2px 6px; margin-top:2px;" ${i===arr.length-1?'disabled':''} onclick="moverAulaOrdem('${a.id}',1)"><i class="fa-solid fa-chevron-down" style="font-size:10px;"></i></button>
          </div>
          <i class="fa-solid ${aulaTipoInfo(a.tipo).icon}" style="color:var(--brass); width:16px;"></i>
          <div style="font-size:13px; font-weight:700;">${esc(a.titulo)} ${!a.url?'<span class="status-pill" style="background:var(--danger-soft); color:var(--danger);">sem conteúdo</span>':''}</div>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="admin-edit-btn" onclick="editAula('${a.id}')"><i class="fa-solid fa-pen" style="font-size:12px;"></i></button>
          <button class="admin-del-btn" onclick="removeAula('${a.id}')"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>
        </div>
      </div>
    `).join('')}

    <div class="admin-section-label">Materiais extras (${curso.materiaisExtras.length})</div>
    <div class="form-grid" style="grid-template-columns:2fr 1fr;">
      <div class="form-field"><label>Nome do material</label><input id="material-nome" placeholder="Ex: Checklist.pdf"></div>
      <div class="form-field">
        <label>Arquivo</label>
        <button type="button" class="admin-edit-btn" style="width:100%;" onclick="triggerCursoUpload('material')"><i class="fa-solid fa-upload"></i> Enviar arquivo</button>
      </div>
    </div>
    <div id="material-arquivo-status" style="font-size:11px; color:var(--text-3); margin:-8px 0 10px;">${state.editing.materialArquivoTemp ? 'Arquivo carregado: '+esc(state.editing.materialArquivoTemp.nome) : ''}</div>
    <button class="admin-add-btn" onclick="submitMaterial()"><i class="fa-solid fa-plus"></i> Adicionar material</button>
    ${curso.materiaisExtras.map(m => `
      <div class="admin-list-item">
        <div style="font-size:13px; font-weight:700;"><i class="fa-solid fa-paperclip" style="color:var(--text-3); margin-right:6px;"></i>${esc(m.nome)}</div>
        <button class="admin-del-btn" onclick="removeMaterial('${m.id}')"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>
      </div>
    `).join('')}
  `;
}
function onAulaTipoChange(tipo) {
  const df = document.getElementById('aula-duracao-field');
  if (df) df.style.display = tipo === 'video' ? 'flex' : 'none';
}
function submitAula() {
  const curso = state.cursos.find(x => x.id === state.adminCursoGerenciandoId);
  if (!curso) return;
  const titulo = val('aula-titulo');
  if (!titulo.trim()) { showToast('Informe um título para a aula.'); return; }
  const tipo = val('aula-tipo');
  const arquivoTemp = state.editing.aulaArquivoTemp;
  const url = arquivoTemp ? arquivoTemp.url : val('aula-url');
  const duracaoMin = tipo === 'video' ? (Number(val('aula-duracao')) || undefined) : undefined;
  const ed = state.editing.aula;
  if (ed) {
    const i = curso.aulas.findIndex(a=>a.id===ed);
    curso.aulas[i] = { ...curso.aulas[i], titulo, tipo, url, duracaoMin };
    showToast('Aula atualizada!');
  } else {
    const maiorOrdem = curso.aulas.reduce((m,a)=>Math.max(m,a.ordem||0),0);
    curso.aulas.push({ id: uid('aula'), ordem: maiorOrdem+1, titulo, tipo, url, duracaoMin });
    showToast('Aula adicionada!');
  }
  state.editing.aula = null;
  state.editing.aulaArquivoTemp = undefined;
  renderAdminTabContent();
}
function editAula(id) {
  const curso = state.cursos.find(x => x.id === state.adminCursoGerenciandoId);
  const aula = curso && curso.aulas.find(a=>a.id===id);
  state.editing.aula = id;
  state.editing.aulaArquivoTemp = aula && aula.url && aula.url.startsWith('data:') ? { nome: aula.titulo, url: aula.url } : undefined;
  renderAdminTabContent();
}
function cancelEditAula() { state.editing.aula = null; state.editing.aulaArquivoTemp = undefined; renderAdminTabContent(); }
function removeAula(id) {
  const curso = state.cursos.find(x => x.id === state.adminCursoGerenciandoId);
  if (!curso) return;
  curso.aulas = curso.aulas.filter(a=>a.id!==id);
  renderAdminTabContent();
}
function moverAulaOrdem(id, dir) {
  const curso = state.cursos.find(x => x.id === state.adminCursoGerenciandoId);
  if (!curso) return;
  const ordenados = [...curso.aulas].sort((a,b)=>a.ordem-b.ordem);
  const i = ordenados.findIndex(a=>a.id===id);
  const j = i + dir;
  if (j < 0 || j >= ordenados.length) return;
  [ordenados[i].ordem, ordenados[j].ordem] = [ordenados[j].ordem, ordenados[i].ordem];
  renderAdminTabContent();
}
function submitMaterial() {
  const curso = state.cursos.find(x => x.id === state.adminCursoGerenciandoId);
  if (!curso) return;
  const nome = val('material-nome');
  const arquivoTemp = state.editing.materialArquivoTemp;
  if (!nome.trim()) { showToast('Informe um nome para o material.'); return; }
  if (!arquivoTemp) { showToast('Envie um arquivo para o material.'); return; }
  curso.materiaisExtras.push({ id: uid('mat'), nome, tipo: 'arquivo', url: arquivoTemp.url });
  state.editing.materialArquivoTemp = undefined;
  renderAdminTabContent();
  showToast('Material adicionado!');
}
function removeMaterial(id) {
  const curso = state.cursos.find(x => x.id === state.adminCursoGerenciandoId);
  if (!curso) return;
  curso.materiaisExtras = curso.materiaisExtras.filter(m=>m.id!==id);
  renderAdminTabContent();
}
function triggerCursoUpload(target) {
  const input = document.getElementById('cursoUploadInput');
  input.dataset.target = target;
  input.click();
}

/* --- RELATÓRIO DE PARABÉNS (admin, somente leitura) --- */
function renderAdminParabens(c) {
  const porDestinatario = {};
  state.parabens.forEach(p => { porDestinatario[p.aniversarianteId] = (porDestinatario[p.aniversarianteId]||0) + 1; });
  const ranking = Object.entries(porDestinatario)
    .map(([id, qtd]) => ({ funcionario: funcionarioPorId(id), qtd }))
    .filter(r => r.funcionario)
    .sort((a,b) => b.qtd - a.qtd);
  const registros = [...state.parabens].sort((a,b) => new Date(b.data) - new Date(a.data));
  c.innerHTML = `
    <div class="admin-list-meta" style="margin-bottom:14px;">Relatório somente leitura: quantos parabéns cada colaborador recebeu, quem enviou e quando. Gerado automaticamente a partir dos envios feitos pelos colaboradores.</div>
    <div class="admin-section-label" style="margin-top:0;">Quantidade recebida por colaborador (${ranking.length})</div>
    ${ranking.length === 0 ? `<div style="font-size:12.5px; color:var(--text-3); margin-bottom:16px;">Nenhum parabéns enviado ainda.</div>` : `
      <div style="margin-bottom:20px;">
        ${ranking.map(r => `
          <div class="admin-list-item">
            <div style="display:flex; align-items:center; gap:10px;">
              <div class="avatar" style="width:30px; height:30px; font-size:11px;">${esc(initials(r.funcionario.nome))}</div>
              <div style="font-size:13px; font-weight:700;">${esc(r.funcionario.nome)} <span style="color:var(--text-3); font-weight:600;">— ${esc(r.funcionario.cargo)}</span></div>
            </div>
            <span class="status-pill" style="background:var(--brass); color:var(--navy); font-weight:800;">${r.qtd} parabéns</span>
          </div>
        `).join('')}
      </div>
    `}
    <div class="admin-section-label">Todos os envios (${registros.length})</div>
    <div style="overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px 10px; border-bottom:1px solid var(--border); color:var(--text-3); font-size:11px; text-transform:uppercase;">Quem enviou</th>
            <th style="text-align:left; padding:8px 10px; border-bottom:1px solid var(--border); color:var(--text-3); font-size:11px; text-transform:uppercase;">Quem recebeu</th>
            <th style="text-align:left; padding:8px 10px; border-bottom:1px solid var(--border); color:var(--text-3); font-size:11px; text-transform:uppercase;">Data</th>
            <th style="text-align:left; padding:8px 10px; border-bottom:1px solid var(--border); color:var(--text-3); font-size:11px; text-transform:uppercase;">Hora</th>
          </tr>
        </thead>
        <tbody>
          ${registros.length === 0 ? `<tr><td colspan="4" style="padding:16px; text-align:center; color:var(--text-3);">Nenhum registro ainda.</td></tr>` : registros.map(p => {
            const rem = funcionarioPorId(p.remetenteId), dest = funcionarioPorId(p.aniversarianteId);
            const d = new Date(p.data);
            return `
            <tr>
              <td style="padding:8px 10px; border-bottom:1px solid var(--border); font-weight:600;">${esc(rem?rem.nome:'—')}</td>
              <td style="padding:8px 10px; border-bottom:1px solid var(--border); font-weight:600;">${esc(dest?dest.nome:'—')}</td>
              <td style="padding:8px 10px; border-bottom:1px solid var(--border);" class="mono">${d.toLocaleDateString('pt-BR')}</td>
              <td style="padding:8px 10px; border-bottom:1px solid var(--border);" class="mono">${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</td>
            </tr>
          `;}).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* --- CENTRAL DE MANUTENÇÃO INTELIGENTE (IA) — somente administradores ---
   Consulta o histórico completo de diagnósticos no BACKEND (nunca chama a
   API da Anthropic diretamente do navegador). O acesso ao diagnóstico
   técnico completo exige o token de administrador configurado no backend
   (ADMIN_API_TOKEN) — a mesma proteção existe no servidor, não só aqui. */
function renderAdminManutencaoIA(c) {
  c.innerHTML = `
    <div class="admin-list-meta" style="margin-bottom:14px;">
      Todo relato enviado em "Reportar Erro" é encaminhado automaticamente para um backend próprio, que repassa o contexto completo (usuário, setor, módulo, URL, logs do console, erros de JS, anexos) para a API da Anthropic (Claude) analisar — a chave de API fica só no servidor, nunca no navegador. Aqui você consulta o histórico completo dessas análises.
    </div>
    <div class="card" style="padding:16px 18px; margin-bottom:18px;">
      <div style="display:grid; grid-template-columns:2fr 2fr auto; gap:10px; align-items:end;">
        <div class="form-field" style="margin-bottom:0;"><label>URL do backend de manutenção</label><input id="ia-backend-url" value="${esc(state.iaBackendUrl)}" placeholder="http://localhost:3001"></div>
        <div class="form-field" style="margin-bottom:0;"><label>Token de administrador</label><input id="ia-admin-token" type="password" value="${esc(state.iaAdminToken)}" placeholder="mesmo valor de ADMIN_API_TOKEN no .env"></div>
        <button class="admin-add-btn" onclick="carregarHistoricoIA()"><i class="fa-solid fa-arrows-rotate"></i> Consultar histórico</button>
      </div>
      <div style="font-size:10.5px; color:var(--text-3); margin-top:10px;"><i class="fa-solid fa-circle-info"></i> O token é o mesmo definido em <span class="mono">ADMIN_API_TOKEN</span> no arquivo <span class="mono">.env</span> do backend (ver README do projeto <span class="mono">ia-manutencao-backend</span>). Sem ele, o servidor recusa o pedido — a validação acontece no back-end, não só nesta tela.</div>
    </div>
    <div id="iaHistoricoContainer">${renderIaHistoricoConteudo()}</div>
  `;
}
function renderIaHistoricoConteudo() {
  const status = state.iaHistoricoStatus;
  if (status === 'carregando') {
    return `<div class="card" style="padding:24px; text-align:center; color:var(--text-3);"><i class="fa-solid fa-spinner"></i> Consultando o backend...</div>`;
  }
  if (status === 'offline') {
    return `<div class="login-error"><i class="fa-solid fa-plug-circle-xmark"></i> Não foi possível conectar ao backend em <span class="mono">${esc(state.iaBackendUrl)}</span>. Verifique se o servidor está rodando (<span class="mono">npm start</span> na pasta <span class="mono">ia-manutencao-backend</span>).</div>`;
  }
  if (status === 'erro_auth') {
    return `<div class="login-error"><i class="fa-solid fa-lock"></i> Token de administrador inválido ou não informado. Confira o valor de <span class="mono">ADMIN_API_TOKEN</span> no <span class="mono">.env</span> do backend.</div>`;
  }
  if (!state.iaHistorico) {
    return `<div class="card" style="padding:24px; text-align:center; color:var(--text-3); font-size:13px;">Informe a URL do backend e o token, depois clique em "Consultar histórico".</div>`;
  }
  const lista = state.iaHistorico;
  if (!lista.length) {
    return `<div class="card" style="padding:24px; text-align:center; color:var(--text-3); font-size:13px;">Nenhum relato analisado ainda.</div>`;
  }
  return lista.map(item => {
    const r = item.relato, a = item.analise;
    let arquivos = [];
    try { arquivos = JSON.parse(r.anexos || '[]'); } catch(e) {}
    let arquivosAfetados = [];
    try { arquivosAfetados = a ? JSON.parse(a.arquivos_afetados || '[]') : []; } catch(e) {}
    return `
    <div class="card" style="padding:18px 20px; margin-bottom:14px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
        <div>
          <div style="font-size:14px; font-weight:800;">${esc(r.titulo)}</div>
          <div class="admin-list-meta">${esc(r.nome_usuario||'—')} · ${esc(r.setor||'—')} · ${esc(r.sistema_modulo||'—')} · ${new Date(r.data_hora).toLocaleString('pt-BR')}</div>
        </div>
        ${a && typeof a.grau_confianca === 'number' ? `<span class="status-pill" style="background:var(--brass); color:var(--navy); white-space:nowrap;">Confiança: ${a.grau_confianca}%</span>` : `<span class="status-pill" style="background:var(--danger-soft); color:var(--danger);">${esc(r.status)}</span>`}
      </div>
      ${a ? `
        <div style="margin-top:12px; display:grid; grid-template-columns:1fr 1fr; gap:14px;">
          <div>
            <div style="font-size:11px; font-weight:800; color:var(--brass); text-transform:uppercase; margin-bottom:4px;">Diagnóstico</div>
            <div style="font-size:12.5px; color:var(--text-2); line-height:1.5;">${esc(a.diagnostico||'—')}</div>
          </div>
          <div>
            <div style="font-size:11px; font-weight:800; color:var(--brass); text-transform:uppercase; margin-bottom:4px;">Causa provável</div>
            <div style="font-size:12.5px; color:var(--text-2); line-height:1.5;">${esc(a.causa_provavel||'—')}</div>
          </div>
          <div style="grid-column:span 2;">
            <div style="font-size:11px; font-weight:800; color:var(--brass); text-transform:uppercase; margin-bottom:4px;">Solução sugerida</div>
            <div style="font-size:12.5px; color:var(--text-2); line-height:1.5;">${esc(a.solucao_sugerida||'—')}</div>
          </div>
          <div style="grid-column:span 2;">
            <div style="font-size:11px; font-weight:800; color:var(--brass); text-transform:uppercase; margin-bottom:4px;">Arquivos afetados</div>
            <div style="font-size:12px; color:var(--text-2);">${arquivosAfetados.length ? arquivosAfetados.map(f=>`<span class="status-pill mono" style="margin:2px;">${esc(f)}</span>`).join('') : '—'}</div>
          </div>
          ${a.codigo_proposto ? `
            <div style="grid-column:span 2;">
              <div style="font-size:11px; font-weight:800; color:var(--brass); text-transform:uppercase; margin-bottom:4px;">Código proposto</div>
              <pre style="background:var(--navy); color:#e8e8e8; padding:12px 14px; border-radius:8px; font-size:11.5px; overflow-x:auto; white-space:pre-wrap;">${esc(a.codigo_proposto)}</pre>
            </div>
          ` : ''}
          <div style="grid-column:span 2;">
            <button class="open-btn" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">Ver relatório técnico completo</button>
            <div style="display:none; font-size:11.5px; color:var(--text-3); white-space:pre-wrap; background:var(--surface-2); padding:10px; border-radius:8px; margin-top:6px;">${esc(a.relatorio_tecnico||'')}</div>
          </div>
        </div>
      ` : `<div style="font-size:12px; color:var(--text-3); margin-top:10px;">Este relato ainda não possui uma análise (status: ${esc(r.status)}).</div>`}
      ${arquivos.length ? `<div style="font-size:11px; color:var(--text-3); margin-top:10px;"><i class="fa-solid fa-paperclip"></i> Anexos informados: ${arquivos.map(f=>esc(f.nome)).join(', ')}</div>` : ''}
    </div>
  `;}).join('');
}
async function carregarHistoricoIA() {
  state.iaBackendUrl = val('ia-backend-url').trim() || state.iaBackendUrl;
  state.iaAdminToken = val('ia-admin-token').trim();
  state.iaHistoricoStatus = 'carregando';
  document.getElementById('iaHistoricoContainer').innerHTML = renderIaHistoricoConteudo();
  try {
    const resp = await fetch(`${state.iaBackendUrl}/api/manutencao/relatos`, {
      headers: { 'Authorization': `Bearer ${state.iaAdminToken}` },
    });
    if (resp.status === 401) { state.iaHistoricoStatus = 'erro_auth'; }
    else if (!resp.ok) { throw new Error('status ' + resp.status); }
    else {
      state.iaHistorico = await resp.json();
      state.iaHistoricoStatus = 'ok';
    }
  } catch (err) {
    state.iaHistoricoStatus = 'offline';
  }
  const container = document.getElementById('iaHistoricoContainer');
  if (container) container.innerHTML = renderIaHistoricoConteudo();
}

/* --- CONEXÃO COM O SUPABASE (admin) --- */
function mascaraUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.hostname;
  } catch (e) { return url.slice(0, 30) + '…'; }
}
function renderAdminConexaoSupabase(c) {
  c.innerHTML = `
    <div class="admin-list-meta" style="margin-bottom:14px;">
      As chaves de conexão ficam no arquivo <span class="mono">supabase-config.js</span>, na mesma pasta deste HTML — abra-o no Bloco de Notas para colar a URL e a anon key do seu projeto (veja as instruções escritas no próprio arquivo). Esta tela só confirma se a conexão está funcionando; ela não substitui a migração de cada tela para usar os dados do Supabase (ver <span class="mono">docs/GUIA_MIGRACAO_FRONTEND.md</span> no projeto Supabase).
    </div>
    <div class="card" style="padding:16px 18px; margin-bottom:14px;">
      <div style="font-size:11px; font-weight:800; color:var(--text-3); text-transform:uppercase; margin-bottom:4px;">Arquivo de configuração</div>
      <div class="mono" style="font-size:12.5px;">supabase-config.js</div>
      <div style="font-size:11px; color:var(--text-3); margin-top:8px;">URL configurada: <span class="mono">${chavesSupabasePreenchidas() ? esc(mascaraUrl(window.SUPABASE_URL)) : 'não configurada ainda'}</span></div>
    </div>
    <div id="conexaoSupabaseContainer">${renderConexaoSupabaseConteudo()}</div>
  `;
}
function renderConexaoSupabaseConteudo() {
  const status = state.supabaseStatus;
  const badges = {
    nao_configurado: { cor: 'var(--text-3)', texto: 'Não configurado', icone: 'fa-circle' },
    configurado: { cor: 'var(--brass)', texto: 'Chaves preenchidas — ainda não testado', icone: 'fa-circle-question' },
    conectando: { cor: 'var(--brass)', texto: 'Conectando...', icone: 'fa-spinner' },
    conectado: { cor: 'var(--success)', texto: 'Conectado com sucesso', icone: 'fa-circle-check' },
    erro: { cor: 'var(--danger)', texto: 'Erro ao conectar', icone: 'fa-circle-exclamation' },
  };
  const b = badges[status] || badges.nao_configurado;
  const conteudo = `
    <div class="card" style="padding:18px 20px;">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
        <i class="fa-solid ${b.icone}" style="color:${b.cor}; font-size:16px;"></i>
        <span style="font-weight:800; color:${b.cor};">${b.texto}</span>
      </div>
      ${status === 'erro' && state.supabaseErro ? `<div class="login-error" style="margin-bottom:12px;"><i class="fa-solid fa-circle-exclamation"></i> ${esc(state.supabaseErro)}</div>` : ''}
      ${status === 'nao_configurado' ? `
        <div style="font-size:12.5px; color:var(--text-2); line-height:1.6; margin-bottom:12px;">
          Abra <span class="mono">supabase-config.js</span> no Bloco de Notas, cole a URL do projeto e a chave <span class="mono">anon public</span> (em Project Settings → API no painel do Supabase), salve o arquivo e recarregue esta página.
        </div>
      ` : ''}
      <button class="admin-add-btn" onclick="testarConexaoSupabase()" ${status==='conectando'?'disabled':''}><i class="fa-solid fa-plug"></i> Testar conexão</button>
    </div>
  `;
  const container = document.getElementById('conexaoSupabaseContainer');
  if (container) container.innerHTML = conteudo;
  return conteudo;
}

