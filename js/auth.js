/* ================= LOGIN =================
   Tela de acesso ao portal. Como este protótipo roda sem servidor, a
   "autenticação" é simulada: qualquer senha é aceita para um e-mail que
   exista no cadastro de Funcionários (Administração > Funcionários).
   Isso já é suficiente para demonstrar o fluxo completo de entrar/sair
   e para o portal reconhecer quem está logado (nome, cargo e avatar). */
function loginBrandPanel() {
  return `
    <div class="login-brand">
      <div class="login-brand-logo">${state.logo ? `<img src="${state.logo}">` : icon('building')}</div>
      <div>
        <div class="login-brand-eyebrow">PORTAL CORPORATIVO</div>
        <div class="serif login-brand-title">Oliveira <span class="amp">&amp;</span> Camilo</div>
        <div class="login-brand-desc">Acesso restrito à equipe do escritório. Entre com seu e-mail corporativo e senha para consultar processos, acordos, avisos e demais módulos internos.</div>
      </div>
      <div class="login-brand-foot"><i class="fa-solid fa-scale-balanced" style="color:var(--brass); font-size:14px;"></i> Ambiente interno · uso exclusivo dos colaboradores</div>
    </div>
  `;
}
function renderLogin() {
  const root = document.getElementById('loginRoot');
  if (!root) return;
  if (state.loggedIn) { root.innerHTML = ''; return; }
  let miolo;
  if (state.loginTela === 'recuperarEmail') miolo = loginBoxRecuperarEmail();
  else if (state.loginTela === 'recuperarCodigo') miolo = loginBoxRecuperarCodigo();
  else miolo = loginBoxFormPrincipal();
  root.innerHTML = `
    <div class="login-overlay">
      ${loginBrandPanel()}
      <div class="login-form-side">${miolo}</div>
    </div>
  `;
}
function loginBoxFormPrincipal() {
  const modo = state.loginModo || 'colaborador';
  return `
    <div class="login-form-box">
      <div style="font-size:20px; font-weight:800; margin-bottom:4px;">Entrar</div>
      <div style="font-size:12.5px; color:var(--text-3); margin-bottom:18px;">Selecione o tipo de acesso e informe seu e-mail corporativo e senha. Não é possível entrar sem autenticação.</div>
      <div class="login-mode-row">
        <button type="button" class="login-mode-btn ${modo==='admin'?'active':''}" onclick="setLoginModo('admin')"><i class="fa-solid fa-shield-halved"></i> Sou administrador</button>
        <button type="button" class="login-mode-btn ${modo==='colaborador'?'active':''}" onclick="setLoginModo('colaborador')"><i class="fa-solid fa-user"></i> Sou usuário</button>
      </div>
      ${state.loginError ? `<div class="login-error"><i class="fa-solid fa-circle-exclamation"></i> ${esc(state.loginError)}</div>` : ''}
      <form onsubmit="handleLogin(event)">
        <div class="login-field"><label>E-mail corporativo</label><input id="login-email" type="email" placeholder="nome@oliveiracamilo.com.br" value="${esc(state.loginEmailDraft||'')}" required></div>
        <div class="login-field"><label>Senha</label><input id="login-senha" type="password" placeholder="••••••••" required></div>
        <div class="login-remember-row">
          <label style="display:flex; align-items:center; gap:6px; color:var(--text-2); cursor:pointer;"><input type="checkbox" id="login-manter" style="width:14px; height:14px;"> Manter conectado</label>
          <button type="button" class="login-link" onclick="irParaRecuperarSenha()">Esqueci minha senha</button>
        </div>
        <button type="submit" class="login-submit"><i class="fa-solid fa-arrow-right-to-bracket"></i> ${modo==='admin'?'Entrar como administrador':'Entrar como usuário'}</button>
      </form>
      <div style="font-size:10.5px; color:var(--text-3); margin-top:16px; line-height:1.5;">
        <i class="fa-solid fa-circle-info"></i> ${modo==='admin'
          ? 'O acesso de administrador exige um e-mail cadastrado com nível "Administrador" — só ele tem acesso total ao sistema.'
          : 'O acesso de usuário é limitado automaticamente ao seu setor, carteira e permissões, conforme o cadastro em Funcionários.'}
        Protótipo sem servidor: qualquer senha é aceita para um e-mail já cadastrado, mas o e-mail e o tipo de acesso selecionado são sempre validados.
      </div>
    </div>
  `;
}
function loginBoxRecuperarEmail() {
  return `
    <div class="login-form-box">
      <button type="button" class="login-link" onclick="voltarParaLogin()"><i class="fa-solid fa-arrow-left"></i> Voltar para o login</button>
      <div style="font-size:20px; font-weight:800; margin:14px 0 4px;">Recuperar acesso</div>
      <div style="font-size:12.5px; color:var(--text-3); margin-bottom:18px; line-height:1.5;">Informe seu e-mail corporativo cadastrado. Enviaremos um código de acesso de 6 dígitos, válido por 10 minutos, para você entrar sem precisar da senha.</div>
      ${state.loginRecErro ? `<div class="login-error"><i class="fa-solid fa-circle-exclamation"></i> ${esc(state.loginRecErro)}</div>` : ''}
      <form onsubmit="solicitarCodigoAcesso(event)">
        <div class="login-field"><label>E-mail corporativo</label><input id="rec-email" type="email" value="${esc(state.loginRecEmail)}" placeholder="nome@oliveiracamilo.com.br" required></div>
        <button type="submit" class="login-submit" ${state.loginRecEnviando ? 'disabled' : ''}>
          <i class="fa-solid ${state.loginRecEnviando ? 'fa-spinner' : 'fa-paper-plane'}"></i> ${state.loginRecEnviando ? 'Enviando código...' : 'Enviar código por e-mail'}
        </button>
      </form>
      <div style="font-size:10.5px; color:var(--text-3); margin-top:16px; line-height:1.5;"><i class="fa-solid fa-circle-info"></i> O código é gerado e enviado pelo backend do portal (nunca pelo navegador). Se o backend não estiver rodando, isso será informado claramente aqui.</div>
    </div>
  `;
}
function loginBoxRecuperarCodigo() {
  return `
    <div class="login-form-box">
      <button type="button" class="login-link" onclick="state.loginTela='recuperarEmail'; renderLogin();"><i class="fa-solid fa-arrow-left"></i> Usar outro e-mail</button>
      <div style="font-size:20px; font-weight:800; margin:14px 0 4px;">Digite o código</div>
      <div style="font-size:12.5px; color:var(--text-3); margin-bottom:14px; line-height:1.5;">Enviamos um código de 6 dígitos para <strong>${esc(state.loginRecEmail)}</strong>. Ele expira em 10 minutos.</div>
      ${state.loginRecCodigoDemo ? `
        <div style="background:var(--surface-2); border:1px dashed var(--brass); border-radius:8px; padding:10px 12px; margin-bottom:14px; font-size:12px; color:var(--text-2);">
          <i class="fa-solid fa-flask"></i> <strong>Modo demonstração:</strong> nenhum e-mail real foi enviado (backend sem SMTP configurado). Seu código de teste é <span class="mono" style="font-weight:800; font-size:14px;">${esc(state.loginRecCodigoDemo)}</span>.
        </div>
      ` : ''}
      ${state.loginRecErro ? `<div class="login-error"><i class="fa-solid fa-circle-exclamation"></i> ${esc(state.loginRecErro)}</div>` : ''}
      <form onsubmit="verificarCodigoAcesso(event)">
        <div class="login-field"><label>Código de acesso</label><input id="rec-codigo" maxlength="6" inputmode="numeric" placeholder="000000" style="letter-spacing:6px; font-size:18px; font-weight:800; text-align:center;" required></div>
        <button type="submit" class="login-submit"><i class="fa-solid fa-key"></i> Confirmar código e entrar</button>
      </form>
      <button type="button" class="login-link" style="margin-top:14px;" onclick="reenviarCodigoAcesso()" ${state.loginRecEnviando ? 'disabled' : ''}>${state.loginRecEnviando ? 'Reenviando...' : 'Reenviar código'}</button>
    </div>
  `;
}
function setLoginModo(modo) {
  state.loginModo = modo;
  state.loginError = null;
  renderLogin();
}
async function handleLogin(ev) {
  ev.preventDefault();
  const modo = state.loginModo || 'colaborador';
  const email = val('login-email').trim();
  const senha = val('login-senha');
  if (!email || !senha) { state.loginError = 'Informe e-mail e senha.'; renderLogin(); return; }
  if (!supabaseClient) {
    state.loginError = 'O portal ainda não está conectado ao Supabase. Peça ao administrador para configurar o supabase-config.js (veja Administração > Conexão Supabase).';
    renderLogin();
    return;
  }
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
  if (error) {
    state.loginEmailDraft = email;
    state.loginError = error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message;
    renderLogin();
    return;
  }
  const emp = await buscarFuncionarioAutenticado(data.user.id);
  if (!emp) {
    await supabaseClient.auth.signOut();
    state.loginError = 'Sua conta existe, mas ainda não tem um cadastro de funcionário vinculado. Peça ao administrador para completar seu cadastro em Administração > Funcionários.';
    renderLogin();
    return;
  }
  if (modo === 'admin' && emp.nivel !== 'Administrador') {
    await supabaseClient.auth.signOut();
    state.loginEmailDraft = email;
    state.loginError = 'Este e-mail não pertence a uma conta de administrador. Selecione "Sou usuário" para entrar com seu acesso normal.';
    renderLogin();
    return;
  }
  await completeLogin(emp);
}
async function buscarFuncionarioAutenticado(userId) {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.from('funcionarios').select('*').eq('id', userId).single();
  if (error) return null;
  return data;
}
async function carregarFuncionarios() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.from('funcionarios').select('*').order('nome');
  if (error) { console.error('Erro ao carregar funcionários:', error.message); return; }
  state.employees = data || [];
}
async function completeLogin(emp) {
  state.currentUser = emp;
  state.viewingAsId = null;
  state.loggedIn = true;
  state.loginError = null;
  state.loginEmailDraft = '';
  state.loginTela = 'form';
  state.loginRecErro = null;
  state.loginRecMensagem = null;
  state.loginRecCodigoDemo = null;
  renderLogin();
  renderAll();
  showToast(`Bem-vindo(a), ${emp.nome.split(' ')[0]}!`);
  if (supabaseClient) {
    await carregarFuncionarios();
    await carregarConversas();
    if (state.currentView === 'chat') renderChatView();
  }
}

/* ================= RECUPERAÇÃO DE ACESSO POR CÓDIGO (Supabase Auth OTP) =================
   Agora usa o login por código nativo do Supabase (signInWithOtp/verifyOtp)
   em vez do backend próprio — o Supabase já cuida de gerar, expirar,
   enviar e validar o código. shouldCreateUser:false garante que só um
   e-mail JÁ CADASTRADO pelo administrador recebe o código (ninguém cria
   conta nova sozinho digitando um e-mail qualquer). */
function irParaRecuperarSenha() {
  state.loginRecEmail = val('login-email') || state.loginRecEmail;
  state.loginRecErro = null;
  state.loginTela = 'recuperarEmail';
  renderLogin();
}
function voltarParaLogin() {
  state.loginTela = 'form';
  state.loginRecErro = null;
  renderLogin();
}
async function solicitarCodigoAcesso(ev) {
  ev.preventDefault();
  const email = val('rec-email').trim();
  if (!email) return;
  if (!supabaseClient) { state.loginRecErro = 'O portal ainda não está conectado ao Supabase.'; renderLogin(); return; }
  state.loginRecEmail = email;
  state.loginRecEnviando = true;
  state.loginRecErro = null;
  renderLogin();
  const { error } = await supabaseClient.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error) {
    state.loginRecErro = error.message.includes('Signups not allowed') || error.message.includes('not found')
      ? 'E-mail não encontrado no cadastro de funcionários.'
      : error.message;
  } else {
    state.loginRecMensagem = 'Código enviado! Confira sua caixa de entrada (e o spam).';
    state.loginRecCodigoDemo = null; // o Supabase não devolve o código ao front — ele só chega por e-mail de verdade
    state.loginTela = 'recuperarCodigo';
  }
  state.loginRecEnviando = false;
  renderLogin();
}
async function reenviarCodigoAcesso() {
  if (!state.loginRecEmail || !supabaseClient) { voltarParaLogin(); return; }
  state.loginRecEnviando = true;
  renderLogin();
  const { error } = await supabaseClient.auth.signInWithOtp({ email: state.loginRecEmail, options: { shouldCreateUser: false } });
  if (error) showToast(error.message);
  else { state.loginRecMensagem = 'Novo código enviado!'; state.loginRecErro = null; showToast('Novo código enviado!'); }
  state.loginRecEnviando = false;
  renderLogin();
}
async function verificarCodigoAcesso(ev) {
  ev.preventDefault();
  const codigo = val('rec-codigo').trim();
  if (!codigo || !supabaseClient) return;
  const { data, error } = await supabaseClient.auth.verifyOtp({ email: state.loginRecEmail, token: codigo, type: 'email' });
  if (error) { state.loginRecErro = error.message; renderLogin(); return; }
  const emp = await buscarFuncionarioAutenticado(data.user.id);
  if (!emp) {
    await supabaseClient.auth.signOut();
    state.loginRecErro = 'Sua conta existe, mas ainda não tem um cadastro de funcionário. Peça ao administrador.';
    renderLogin();
    return;
  }
  await completeLogin(emp);
}
async function logout() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  if (chatRealtimeChannel) { supabaseClient.removeChannel(chatRealtimeChannel); chatRealtimeChannel = null; }
  state.loggedIn = false;
  state.currentUser = null;
  state.adminOpen = false;
  state.viewingAsId = null;
  state.loginModo = "colaborador";
  state.loginError = null;
  state.loginEmailDraft = "";
  state.loginTela = "form";
  state.loginRecEmail = "";
  state.loginRecErro = null;
  state.loginRecMensagem = null;
  state.loginRecCodigoDemo = null;
  renderLogin();
}
function uid(prefix) { return prefix + Date.now() + Math.floor(Math.random()*1000); }
function currency(v) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }); }
function esc(s) { return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function normalizeUrl(u) {
  if (!u) return '';
  u = u.trim();
  if (!u) return '';
  // se a pessoa esqueceu o "https://", o navegador tratava o link como
  // um caminho relativo à própria página do portal em vez de um site externo.
  if (!/^https?:\/\//i.test(u) && !/^\/\//.test(u)) u = 'https://' + u;
  return u;
}
function initials(name) { return name.split(' ').map(w=>w[0]).slice(0,2).join(''); }

let toastTimer = null;
function showToast(msg) {
  state.toast = msg;
  renderToast();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { state.toast = null; renderToast(); }, 2600);
}

