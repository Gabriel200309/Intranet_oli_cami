/* ================= SINALIZAÇÕES DE COLABORADORES =================
   Usadas pela liderança/RH para registrar e sinalizar colaboradores a
   respeito de erros ou pontos de atenção no trabalho. A classificação
   de gravidade (Leve, Média, Grave etc.) é definida pelo administrador
   na seção de Administração > Classificações de Sinalização. */
function toggleNovaSinalizacao() { state.novaSinalizacao = !state.novaSinalizacao; renderSinalizacoesView(); }
async function submitSinalizacao() {
  if (!isAdmin()) { showToast('Só administradores podem registrar sinalizações.'); return; }
  const colaboradorId = val('sn-colaborador'), titulo = val('sn-titulo'), setor = val('sn-setor'), classificacaoId = val('sn-classificacao'), descricao = val('sn-descricao');
  const colaboradorEmp = state.employees.find(e => e.id === colaboradorId);
  if (!titulo.trim() || !colaboradorEmp) { showToast('Informe ao menos o título e o colaborador sinalizado.'); return; }
  if (!supabaseClient) {
    state.sinalizacoes.unshift({
      id: uid('s'), titulo, colaborador: colaboradorEmp.nome, setor: setor || 'Geral', classificacaoId: classificacaoId || (state.classificacoes[0] && state.classificacoes[0].id),
      status: 'aberta', descricao, autor: 'Você',
      data: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    });
    state.novaSinalizacao = false;
    showToast('Sinalização registrada!');
    renderSinalizacoesView();
    renderSidebar();
    return;
  }
  const payload = {
    titulo, colaborador_id: colaboradorId, colaborador_nome: colaboradorEmp.nome,
    setor: setor || colaboradorEmp.setor, classificacao_id: classificacaoId || (state.classificacoes[0] && state.classificacoes[0].id) || null,
    descricao, autor_id: state.currentUser.id,
  };
  const { error } = await supabaseClient.from('sinalizacoes').insert(payload);
  if (error) { showToast('Não foi possível registrar: ' + error.message); return; }
  state.novaSinalizacao = false;
  showToast('Sinalização registrada!');
  await carregarSinalizacoes();
  renderSinalizacoesView();
  renderSidebar();
}
async function resolverSinalizacao(id) {
  const s = state.sinalizacoes.find(x => x.id === id);
  if (!s) return;
  const novoStatus = s.status === 'resolvida' ? 'aberta' : 'resolvida';
  s.status = novoStatus;
  renderSinalizacoesView();
  renderSidebar();
  if (supabaseClient) {
    const { error } = await supabaseClient.from('sinalizacoes').update({ status: novoStatus }).eq('id', id);
    if (error) showToast('Não foi possível salvar no banco: ' + error.message);
  }
}
async function removerSinalizacao(id) {
  if (supabaseClient) {
    const { error } = await supabaseClient.from('sinalizacoes').delete().eq('id', id);
    if (error) { showToast('Não foi possível excluir: ' + error.message); return; }
  }
  state.sinalizacoes = state.sinalizacoes.filter(x => x.id !== id);
  renderSinalizacoesView();
  renderSidebar();
}
function renderSinalizacoesView() {
  const emp = getEffectiveEmployee();
  const podeVerTodas = isAdmin() || hasPermission('verSinalizacoesTodas');
  // O filtro de verdade é feito pelo banco (RLS): cada pessoa só recebe do
  // servidor as sinalizações que tem permissão de ver (as que registrou, as
  // que são sobre ela mesma, do setor que administra, ou tudo — se for
  // administrador ou tiver a permissão "ver sinalizações de todos os
  // setores"). Aqui só exibimos o que já veio filtrado.
  const listaBase = state.sinalizacoes;
  const abertas = listaBase.filter(s => s.status === 'aberta').length;
  document.getElementById('content').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:10px;">
      <div class="section-title" style="margin-bottom:0;">Sinalizações de Colaboradores <span style="color:var(--text-3); text-transform:none; font-weight:600;">(${abertas} aberta${abertas===1?'':'s'})</span></div>
      ${isAdmin() ? `<button class="btn-brass" onclick="toggleNovaSinalizacao()"><i class="fa-solid fa-plus"></i> Nova sinalização</button>` : ''}
    </div>
    <div style="font-size:12px; color:var(--text-2); max-width:760px; margin-bottom:16px; line-height:1.5;">
      Registro, feito pela administração, de erros, falhas ou pontos de atenção no trabalho de um colaborador — não é para assuntos de clientes. Cada sinalização recebe uma classificação de gravidade definida pelo administrador.
    </div>
    ${!podeVerTodas ? `
      <div style="font-size:11.5px; color:var(--text-3); background:var(--surface-2); border:1px solid var(--border); border-radius:8px; padding:8px 10px; margin-bottom:14px; max-width:900px;">
        <i class="fa-solid fa-lock" style="font-size:10px;"></i> Exibindo só as sinalizações que você tem permissão de ver: as que registrou e as que são sobre você mesmo.
      </div>
    ` : ''}
    ${state.novaSinalizacao && isAdmin() ? `
      <div class="card" style="padding:18px; margin-bottom:20px; max-width:760px;">
        <div class="form-grid" style="grid-template-columns:1fr 1fr;">
          <div class="form-field" style="grid-column:span 2;"><label>Título</label><input id="sn-titulo" placeholder="Ex: Atraso recorrente na entrega de tarefas"></div>
          <div class="form-field"><label>Colaborador sinalizado</label>
            <select id="sn-colaborador">${state.employees.map(e => `<option value="${e.id}">${esc(e.nome)} — ${esc(e.cargo)}</option>`).join('')}</select>
          </div>
          <div class="form-field"><label>Setor</label>
            <select id="sn-setor">${state.setores.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}</select>
          </div>
          <div class="form-field"><label>Classificação</label>
            <select id="sn-classificacao">
              ${state.classificacoes.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('')}
            </select>
          </div>
          <div class="form-field" style="grid-column:span 2;"><label>Descrição</label><input id="sn-descricao" placeholder="Detalhe o ocorrido"></div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="admin-add-btn" onclick="submitSinalizacao()"><i class="fa-solid fa-plus"></i> Registrar</button>
          <button class="admin-cancel-btn" onclick="toggleNovaSinalizacao()">Cancelar</button>
        </div>
      </div>
    ` : ''}
    <div class="card" style="overflow:hidden; max-width:900px;">
      ${listaBase.length === 0 ? `<div style="padding:24px; text-align:center; color:var(--text-3); font-size:13px;">Nenhuma sinalização registrada.</div>` : listaBase.map(s => {
        const cls = classificacaoById(s.classificacaoId);
        const podeGerenciar = isAdmin() || (emp && s.autorId === emp.id) || (emp && (state.gestoresSetor[s.setor]||[]).includes(emp.id));
        return `
        <div class="aviso-row" style="opacity:${s.status==='resolvida'?0.6:1};">
          <div class="priority-bar" style="background:${cls?cls.cor:'var(--text-3)'};"></div>
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <div style="font-size:13.5px; font-weight:700; ${s.status==='resolvida'?'text-decoration:line-through;':''}">${esc(s.titulo)}</div>
              <span class="status-pill" style="background:${cls?cls.cor+'22':'var(--surface-2)'}; color:${cls?cls.cor:'var(--text-2)'};">${cls?esc(cls.nome):'Sem classificação'}</span>
              <span class="status-pill" style="background:var(--surface-2); color:var(--text-2);">${s.status==='resolvida'?'Resolvida':'Aberta'}</span>
            </div>
            <div style="font-size:12px; color:var(--text-2); margin:5px 0;">${esc(s.descricao)}</div>
            <div class="mono" style="font-size:10.5px; color:var(--text-3);"><i class="fa-solid fa-user" style="font-size:9px;"></i> ${esc(s.colaborador || '')} · ${esc(s.setor)} · ${esc(s.data)} · sinalizado por ${esc(s.autor)}</div>
          </div>
          ${podeGerenciar ? `
          <div style="display:flex; gap:6px; align-items:flex-start;">
            <button class="admin-edit-btn" title="${s.status==='resolvida'?'Reabrir':'Marcar como resolvida'}" onclick="resolverSinalizacao('${s.id}')"><i class="fa-solid ${s.status==='resolvida'?'fa-rotate-left':'fa-check'}" style="font-size:12px;"></i></button>
            <button class="admin-del-btn" title="Remover" onclick="removerSinalizacao('${s.id}')"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>
          </div>` : ''}
        </div>
      `;}).join('')}
    </div>
  `;
}

