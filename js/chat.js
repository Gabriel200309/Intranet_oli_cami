/* ================= CHAT ================= */

/* ================= CHAT — agora ligado de verdade ao Supabase =================
   Conversas e mensagens vêm do banco (chat_conversas/chat_membros/
   chat_mensagens). O RLS já filtra sozinho o que cada um pode ver — o
   client só reflete o que a consulta devolveu. Novas mensagens chegam em
   tempo real via Supabase Realtime (sem precisar recarregar a página). */
let chatRealtimeChannel = null;
async function carregarConversas() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient
    .from('chat_conversas')
    .select('*, chat_membros(funcionario_id)')
    .order('criado_em', { ascending: true });
  if (error) { console.error('Erro ao carregar conversas:', error.message); return; }
  const antigas = state.chatConversas || [];
  state.chatConversas = (data || []).map(c => {
    const antiga = antigas.find(a => a.id === c.id);
    return {
      id: c.id, nome: c.nome, tipo: c.tipo, cargo: c.descricao, online: true,
      membros: (c.chat_membros || []).map(m => m.funcionario_id),
      mensagens: antiga ? antiga.mensagens : [],
    };
  });
}
async function carregarMensagens(conversaId) {
  if (!supabaseClient) return [];
  const { data, error } = await supabaseClient
    .from('chat_mensagens').select('*').eq('conversa_id', conversaId).order('enviado_em', { ascending: true });
  if (error) { console.error('Erro ao carregar mensagens:', error.message); return []; }
  return data || [];
}
async function assinarMensagensRealtime(conversaId) {
  if (chatRealtimeChannel) { await supabaseClient.removeChannel(chatRealtimeChannel); chatRealtimeChannel = null; }
  if (!supabaseClient || !conversaId) return;
  chatRealtimeChannel = supabaseClient
    .channel('chat-' + conversaId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensagens', filter: `conversa_id=eq.${conversaId}` }, (payload) => {
      const conv = state.chatConversas.find(c => c.id === conversaId);
      if (conv && !conv.mensagens.some(m => m.id === payload.new.id)) {
        conv.mensagens.push(payload.new);
        if (state.currentView === 'chat' && state.activeChatId === conversaId) renderChatView();
      }
    })
    .subscribe();
}
async function abrirChatView() {
  await carregarConversas();
  const lista = visibleChatConversas();
  if (!state.activeChatId || !lista.find(c => c.id === state.activeChatId)) {
    state.activeChatId = lista[0] ? lista[0].id : null;
  }
  if (state.activeChatId) await setActiveChat(state.activeChatId);
  else renderChatView();
}
async function setActiveChat(id) {
  state.activeChatId = id;
  const conv = state.chatConversas.find(c => c.id === id);
  if (conv && conv.mensagens.length === 0) conv.mensagens = await carregarMensagens(id);
  await assinarMensagensRealtime(id);
  renderChatView();
}
async function sendChatMessage() {
  const input = document.getElementById('chatInputBox');
  if (!input) return;
  const texto = input.value.trim();
  if (!texto || !supabaseClient) return;
  const emp = getEffectiveEmployee();
  if (!emp || !state.activeChatId) return;
  input.value = '';
  const { data, error } = await supabaseClient
    .from('chat_mensagens').insert({ conversa_id: state.activeChatId, remetente_id: emp.id, texto }).select().single();
  if (error) { showToast('Não foi possível enviar: ' + error.message); return; }
  const conv = state.chatConversas.find(c => c.id === state.activeChatId);
  if (conv && !conv.mensagens.some(m => m.id === data.id)) conv.mensagens.push(data);
  renderChatView();
}
function chatKeydown(ev) { if (ev.key === 'Enter') sendChatMessage(); }
function visibleChatConversas() {
  // Administrador enxerga todas as conversas (gestão). A simulação
  // "Visualizando como" (só para admin) filtra a lista já carregada,
  // pois o RLS de verdade sempre traz tudo para quem está autenticado
  // como administrador.
  if (isAdmin() && !state.viewingAsId) return state.chatConversas;
  const emp = getEffectiveEmployee();
  if (!emp) return [];
  return state.chatConversas.filter(c => c.tipo !== 'grupo' || (c.membros || []).includes(emp.id));
}
function renderChatView() {
  const lista = visibleChatConversas();
  let conv = lista.find(c => c.id === state.activeChatId) || lista[0];
  if (conv && conv.id !== state.activeChatId) state.activeChatId = conv.id;
  const emp = getEffectiveEmployee();
  document.getElementById('content').innerHTML = `
    <div class="section-title">Chat interno</div>
    <div class="card" style="display:flex; height:600px; overflow:hidden;">
      <div style="width:260px; border-right:1px solid var(--border); overflow-y:auto; flex-shrink:0;">
        ${lista.length === 0 ? `<div style="padding:20px; font-size:12px; color:var(--text-3);">Nenhuma conversa disponível para este perfil.</div>` : lista.map(c => `
          <div class="row-hover" onclick="setActiveChat('${c.id}')" style="display:flex; gap:10px; align-items:center; padding:12px 14px; cursor:pointer; background:${conv&&c.id===conv.id?'var(--surface-2)':'transparent'}; border-bottom:1px solid var(--border);">
            <div class="avatar" style="width:36px; height:36px; font-size:12px; ${c.tipo==='grupo'?'background:linear-gradient(135deg, var(--brass), var(--brass-light)); color:var(--navy);':''}">${c.tipo==='grupo' ? '<i class="fa-solid fa-users"></i>' : esc(initials(c.nome))}</div>
            <div style="flex:1; min-width:0;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:13px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(c.nome)}</span>
                ${c.online ? `<span style="width:7px; height:7px; border-radius:50%; background:var(--success); flex-shrink:0;"></span>` : ''}
              </div>
              <div style="font-size:11px; color:var(--text-3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(c.mensagens[c.mensagens.length-1]?.texto || '')}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="flex:1; display:flex; flex-direction:column; min-width:0;">
        ${conv ? `
        <div style="padding:14px 18px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:10px;">
          <div class="avatar" style="width:34px; height:34px; font-size:12px; ${conv.tipo==='grupo'?'background:linear-gradient(135deg, var(--brass), var(--brass-light)); color:var(--navy);':''}">${conv.tipo==='grupo' ? '<i class="fa-solid fa-users"></i>' : esc(initials(conv.nome))}</div>
          <div>
            <div style="font-size:13.5px; font-weight:700;">${esc(conv.nome)}</div>
            <div style="font-size:11px; color:var(--text-3);">${conv.tipo==='grupo' ? `Grupo · ${(conv.membros||[]).length} membro(s)` : (conv.online ? 'Online' : 'Offline') + ' · ' + esc(conv.cargo||'')}</div>
          </div>
        </div>
        <div style="flex:1; overflow-y:auto; padding:18px; display:flex; flex-direction:column; gap:10px;">
          ${conv.mensagens.map(m => { const minha = m.remetente_id === (emp&&emp.id); const hora = m.enviado_em ? new Date(m.enviado_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : ''; return `
            <div style="align-self:${minha?'flex-end':'flex-start'}; max-width:70%;">
              <div style="padding:10px 14px; border-radius:12px; font-size:13px; background:${minha?'var(--navy)':'var(--surface-2)'}; color:${minha?'#fff':'var(--text)'}; border:${minha?'none':'1px solid var(--border)'};">${esc(m.texto)}</div>
              <div class="mono" style="font-size:10px; color:var(--text-3); margin-top:3px; text-align:${minha?'right':'left'};">${esc(hora)}</div>
            </div>
          `;}).join('')}
        </div>
        <div style="padding:14px; border-top:1px solid var(--border); display:flex; gap:10px;">
          <input id="chatInputBox" placeholder="Escreva uma mensagem..." onkeydown="chatKeydown(event)" style="flex:1; border:1px solid var(--border); background:var(--surface-2); border-radius:10px; padding:10px 14px; font-size:13px; color:var(--text); outline:none; font-family:inherit;">
          <button class="btn-brass" onclick="sendChatMessage()">${icon('send')} Enviar</button>
        </div>
        ` : `<div style="flex:1; display:flex; align-items:center; justify-content:center; color:var(--text-3); font-size:13px;">${supabaseClient ? 'Nenhuma conversa disponível ainda' : 'Conecte o portal ao Supabase para usar o chat (Administração > Conexão Supabase)'}</div>`}
      </div>
    </div>
    <div style="font-size:11px; color:var(--text-3); margin-top:10px;"><i class="fa-solid fa-circle-info"></i> Chat conectado ao Supabase — mensagens são salvas de verdade e chegam em tempo real. Grupos são criados pelo administrador em Administração > Grupos de chat.</div>
  `;
}

