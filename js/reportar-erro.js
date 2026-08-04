/* ================= REPORTAR ERRO =================
   Por que o e-mail não chegava: este protótipo roda 100% no navegador,
   sem servidor, então o único jeito de "enviar" um e-mail é abrir o
   mailto: do sistema operacional — e isso só funciona se a pessoa tiver
   um aplicativo de e-mail padrão configurado no computador/navegador.
   Em muitas máquinas (principalmente de trabalho) não há nenhum app
   associado a mailto:, então o clique não abria nada e a mensagem nunca
   saía do rascunho. Por isso agora, além do mailto, o relato oferece
   Gmail/Outlook na web (que sempre abrem, mesmo sem app instalado) e um
   botão para copiar a mensagem pronta, garantindo que o relato sempre
   chegue a algum lugar utilizável. */
function montarBugReportTexto(registro) {
  const assunto = `[Portal Oliveira & Camilo] Erro reportado: ${registro.titulo}`;
  const corpo =
`Área/seção afetada: ${registro.area}
Prioridade: ${registro.prioridade}
Reportado por: ${registro.nome || 'Não informado'} (${registro.email || 'e-mail não informado'})
Data: ${registro.data}

Descrição:
${registro.descricao}`;
  return { assunto, corpo };
}
function submitBugReport(ev) {
  ev.preventDefault();
  const titulo = val('bg-titulo'), area = val('bg-area'), prioridade = val('bg-prioridade'),
        descricao = val('bg-descricao'), nome = val('bg-nome'), email = val('bg-email');
  if (!titulo.trim() || !descricao.trim()) { showToast('Preencha ao menos o título e a descrição.'); return; }

  const emp = getEffectiveEmployee();
  const registro = {
    id: uid('bug'), titulo, area, prioridade, descricao, nome, email,
    data: new Date().toLocaleString('pt-BR'),
    dataIso: new Date().toISOString(),
    setor: emp ? emp.setor : null,
    urlPagina: window.location.href,
    anexos: state.editing.bugAnexos ? [...state.editing.bugAnexos] : [],
    iaStatus: 'enviando', // enviando | analisado | erro_analise | offline
    iaRelatoId: null,
    iaResumo: null,
  };
  state.bugReports.unshift(registro);
  state.ultimoBugReportId = registro.id;
  state.editing.bugAnexos = [];
  showToast('Relato registrado! Enviando para análise automática da IA de manutenção...');
  renderReportarErroView();
  enviarRelatoParaIA(registro);
}

/* ================= INTEGRAÇÃO COM O SISTEMA DE MANUTENÇÃO INTELIGENTE (IA) =================
   Sempre que um relato é registrado, o front-end envia automaticamente todo
   o contexto técnico disponível (usuário, setor, módulo, URL, logs do
   console, erros de JS/stack trace, anexos) para o BACKEND — nunca para a
   API da Anthropic diretamente. A chave de API do Claude só existe no
   servidor (ver /ia-manutencao-backend), então o front-end jamais a
   manipula. Se o backend não estiver acessível, isso é comunicado com
   clareza — o app nunca finge uma resposta de IA no próprio navegador. */
async function enviarRelatoParaIA(registro) {
  const emp = getEffectiveEmployee();
  const payload = {
    nomeUsuario: registro.nome || (emp ? emp.nome : 'Não informado'),
    setor: registro.setor,
    sistemaModulo: registro.area,
    titulo: registro.titulo,
    descricao: registro.descricao,
    dataHora: registro.dataIso,
    urlPagina: registro.urlPagina,
    consoleLogs: state.consoleLogBuffer.slice(-30),
    jsErrors: state.jsErrorBuffer.slice(-10),
    stackTrace: state.jsErrorBuffer.length ? state.jsErrorBuffer[state.jsErrorBuffer.length - 1].stack : '',
    requestInfo: null, // este protótipo não faz chamadas de API própria para inspecionar
    anexos: registro.anexos.map(a => ({ nome: a.nome, tipo: a.tipo, tamanhoBytes: a.tamanhoBytes })),
  };
  try {
    const resp = await fetch(`${state.iaBackendUrl}/api/manutencao/relatos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data) throw new Error('Resposta inválida do backend (status ' + resp.status + ')');
    registro.iaStatus = data.status || 'erro_analise';
    registro.iaRelatoId = data.relatoId || null;
    registro.iaResumo = data.resumo || null;
    showToast(registro.iaStatus === 'analisado'
      ? '🤖 A IA de manutenção analisou o relato!'
      : (data.aviso || 'Relato salvo, mas a análise automática falhou.'));
  } catch (err) {
    registro.iaStatus = 'offline';
    showToast('Não foi possível conectar ao serviço de manutenção com IA. O relato foi salvo, mas ainda não foi analisado.');
  }
  if (state.currentView === 'reportarErro') renderReportarErroView();
}
function reenviarRelatoParaIA(id) {
  const registro = state.bugReports.find(b => b.id === id);
  if (!registro) return;
  registro.iaStatus = 'enviando';
  renderReportarErroView();
  enviarRelatoParaIA(registro);
}

function abrirEnvioBugReport(id, canal) {
  const registro = state.bugReports.find(b => b.id === id);
  if (!registro) return;
  const { assunto, corpo } = montarBugReportTexto(registro);
  const dest = state.bugReportEmail;
  if (canal === 'mailto') {
    window.location.href = `mailto:${encodeURIComponent(dest)}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
  } else if (canal === 'gmail') {
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(dest)}&su=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`, '_blank');
  } else if (canal === 'outlook') {
    window.open(`https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(dest)}&subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`, '_blank');
  }
}
function copiarBugReport(id) {
  const registro = state.bugReports.find(b => b.id === id);
  if (!registro) return;
  const { assunto, corpo } = montarBugReportTexto(registro);
  const textoCompleto = `Para: ${state.bugReportEmail}\nAssunto: ${assunto}\n\n${corpo}`;
  const fallbackCopy = () => {
    const ta = document.createElement('textarea');
    ta.value = textoCompleto;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textoCompleto).catch(fallbackCopy);
  } else {
    fallbackCopy();
  }
  showToast('Mensagem copiada! Agora é só colar no seu e-mail ou chat.');
}
function saveBugReportEmail() {
  const v = val('bg-destEmail').trim();
  if (!v) { showToast('Informe um e-mail válido.'); return; }
  state.bugReportEmail = v;
  showToast('E-mail de destino atualizado!');
  renderReportarErroView();
}
function renderReportarErroView() {
  const ultimo = state.bugReports.find(b => b.id === state.ultimoBugReportId);
  const anexosTemp = state.editing.bugAnexos || [];
  document.getElementById('content').innerHTML = `
    <div class="section-title">Reportar erro</div>
    ${isAdmin() ? `
      <div class="card" style="padding:16px 18px; margin-bottom:16px; max-width:760px; border-color:var(--brass);">
        <div style="font-size:11px; font-weight:800; color:var(--brass); text-transform:uppercase; letter-spacing:.04em; margin-bottom:10px;"><i class="fa-solid fa-lock"></i> Configuração (somente administradores)</div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <input id="bg-destEmail" type="email" value="${esc(state.bugReportEmail)}" placeholder="email@empresa.com.br" style="flex:1; min-width:220px; border:1px solid var(--border); background:var(--surface-2); border-radius:8px; padding:9px 12px; font-size:12.5px; color:var(--text); font-family:inherit; outline:none;">
          <button class="admin-add-btn" onclick="saveBugReportEmail()"><i class="fa-solid fa-floppy-disk"></i> Salvar e-mail de destino</button>
        </div>
      </div>
    ` : ''}
    ${ultimo ? `
      <div class="card" style="padding:18px 20px; margin-bottom:20px; max-width:760px; border-color:var(--brass);">
        <div style="font-size:13px; font-weight:800; margin-bottom:4px;"><i class="fa-solid fa-circle-check" style="color:var(--success);"></i> Relato "${esc(ultimo.titulo)}" registrado</div>
        ${renderStatusIA(ultimo)}
        <div style="font-size:12px; color:var(--text-2); margin:12px 0; line-height:1.5;">
          Você também pode encaminhar este relato por e-mail para <strong>${esc(state.bugReportEmail)}</strong>:
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="admin-add-btn" onclick="abrirEnvioBugReport('${ultimo.id}','gmail')"><i class="fa-brands fa-google"></i> Enviar pelo Gmail</button>
          <button class="admin-add-btn" onclick="abrirEnvioBugReport('${ultimo.id}','outlook')"><i class="fa-brands fa-microsoft"></i> Enviar pelo Outlook</button>
          <button class="admin-cancel-btn" onclick="abrirEnvioBugReport('${ultimo.id}','mailto')"><i class="fa-solid fa-envelope"></i> Abrir app de e-mail padrão</button>
          <button class="admin-cancel-btn" onclick="copiarBugReport('${ultimo.id}')"><i class="fa-solid fa-copy"></i> Copiar mensagem</button>
        </div>
      </div>
    ` : ''}
    <div class="card" style="padding:22px; max-width:760px;">
      <div style="font-size:12.5px; color:var(--text-2); margin-bottom:16px; line-height:1.5;">
        Encontrou algo que não está funcionando? Descreva abaixo. O relato é enviado automaticamente para o
        <strong>sistema de manutenção com IA</strong>, que analisa o problema (incluindo os logs técnicos capturados
        automaticamente desta sessão) e sugere um diagnóstico. Você também pode encaminhar por e-mail depois, se quiser.
      </div>
      <form onsubmit="submitBugReport(event)">
        <div class="form-grid" style="grid-template-columns:1fr 1fr;">
          <div class="form-field" style="grid-column:span 2;"><label>Título do problema</label><input id="bg-titulo" placeholder="Ex: Botão de salvar não responde na tela de Avisos" required></div>
          <div class="form-field"><label>Área / seção afetada</label>
            <select id="bg-area">
              <option>Painel inicial</option><option>Calculadora</option><option>Chat</option><option>Sinalizações de Colaboradores</option>
              <option>Módulo Jurídico</option><option>Módulo RH</option><option>Financeiro</option><option>Arquivos</option>
              <option>Cursos</option><option>Metas</option><option>Login / Acesso</option><option>Outro</option>
            </select>
          </div>
          <div class="form-field"><label>Prioridade</label>
            <select id="bg-prioridade"><option>Baixa</option><option selected>Média</option><option>Alta</option><option>Crítica</option></select>
          </div>
          <div class="form-field" style="grid-column:span 2;"><label>Descrição detalhada</label><input id="bg-descricao" placeholder="O que aconteceu, o que você esperava e como reproduzir o erro" required></div>
          <div class="form-field"><label>Seu nome</label><input id="bg-nome" placeholder="Opcional"></div>
          <div class="form-field"><label>Seu e-mail para retorno</label><input id="bg-email" type="email" placeholder="Opcional"></div>
          <div class="form-field" style="grid-column:span 2;">
            <label>Prints ou vídeos (opcional)</label>
            <button type="button" class="admin-edit-btn" onclick="document.getElementById('bugAnexoInput').click()"><i class="fa-solid fa-upload"></i> Anexar arquivos</button>
            ${anexosTemp.length ? `
              <div style="margin-top:8px; display:flex; flex-direction:column; gap:4px;">
                ${anexosTemp.map((a,i) => `
                  <div style="display:flex; align-items:center; gap:8px; font-size:11.5px; color:var(--text-2);">
                    <i class="fa-solid ${a.tipo.startsWith('video')?'fa-file-video':'fa-file-image'}"></i> ${esc(a.nome)}
                    <button type="button" class="admin-del-btn" style="padding:2px 6px;" onclick="removerBugAnexo(${i})"><i class="fa-solid fa-xmark" style="font-size:10px;"></i></button>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
        <div style="font-size:10.5px; color:var(--text-3); margin-bottom:14px;">
          <i class="fa-solid fa-circle-info"></i> Também são enviados automaticamente: URL desta página, data/hora, e os últimos logs/erros de JavaScript capturados nesta sessão do navegador.
        </div>
        <button type="submit" class="admin-add-btn"><i class="fa-solid fa-paper-plane"></i> Registrar e enviar para análise da IA</button>
      </form>
    </div>
    ${state.bugReports.length ? `
      <div class="admin-section-label">Relatos registrados nesta sessão (${state.bugReports.length})</div>
      <div class="card" style="max-width:760px; overflow:hidden;">
        ${state.bugReports.map(b => `
          <div class="admin-list-item" style="align-items:flex-start;">
            <div style="flex:1;">
              <div style="font-size:13px; font-weight:700;">${esc(b.titulo)}</div>
              <div class="admin-list-meta">${esc(b.area)} · Prioridade ${esc(b.prioridade)} · ${esc(b.data)}</div>
              ${badgeStatusIA(b)}
            </div>
            <div style="display:flex; gap:6px;">
              ${b.iaStatus === 'offline' || b.iaStatus === 'erro_analise' ? `<button class="admin-edit-btn" title="Tentar analisar novamente" onclick="reenviarRelatoParaIA('${b.id}')"><i class="fa-solid fa-rotate" style="font-size:12px;"></i></button>` : ''}
              <button class="admin-edit-btn" title="Copiar mensagem" onclick="copiarBugReport('${b.id}')"><i class="fa-solid fa-copy" style="font-size:12px;"></i></button>
              <button class="admin-edit-btn" title="Abrir no Gmail" onclick="abrirEnvioBugReport('${b.id}','gmail')"><i class="fa-brands fa-google" style="font-size:12px;"></i></button>
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
}
function badgeStatusIA(b) {
  if (b.iaStatus === 'enviando') return `<span class="status-pill" style="background:var(--surface-2); color:var(--text-3);"><i class="fa-solid fa-spinner"></i> Analisando...</span>`;
  if (b.iaStatus === 'analisado') return `<span class="status-pill" style="background:var(--brass); color:var(--navy);"><i class="fa-solid fa-robot"></i> Analisado pela IA${b.iaResumo && typeof b.iaResumo.grauConfianca === 'number' ? ` · confiança ${b.iaResumo.grauConfianca}%` : ''}</span>`;
  if (b.iaStatus === 'offline') return `<span class="status-pill" style="background:var(--danger-soft); color:var(--danger);"><i class="fa-solid fa-plug-circle-xmark"></i> Backend de IA offline</span>`;
  if (b.iaStatus === 'erro_analise') return `<span class="status-pill" style="background:var(--danger-soft); color:var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> Falha na análise</span>`;
  return '';
}
function renderStatusIA(b) {
  if (b.iaStatus === 'enviando') {
    return `<div style="font-size:12px; color:var(--text-3); margin-top:8px;"><i class="fa-solid fa-spinner"></i> Enviando para o sistema de manutenção com IA...</div>`;
  }
  if (b.iaStatus === 'offline') {
    return `<div class="login-error" style="margin-top:10px;"><i class="fa-solid fa-plug-circle-xmark"></i> Não foi possível conectar ao backend de IA em <span class="mono">${esc(state.iaBackendUrl)}</span>. O relato foi salvo, mas ainda não foi analisado. Verifique se o backend está rodando (veja o README do projeto) e tente novamente. <button class="login-link" style="display:inline;" onclick="reenviarRelatoParaIA('${b.id}')">Tentar de novo</button></div>`;
  }
  if (b.iaStatus === 'erro_analise') {
    return `<div class="login-error" style="margin-top:10px;"><i class="fa-solid fa-triangle-exclamation"></i> O backend recebeu o relato, mas a análise pela IA falhou (verifique a configuração da chave da Anthropic no servidor). <button class="login-link" style="display:inline;" onclick="reenviarRelatoParaIA('${b.id}')">Tentar de novo</button></div>`;
  }
  if (b.iaStatus === 'analisado' && b.iaResumo) {
    return `
      <div style="background:var(--surface-2); border-radius:10px; padding:12px 14px; margin-top:10px;">
        <div style="font-size:11px; font-weight:800; color:var(--brass); text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px;"><i class="fa-solid fa-robot"></i> Resumo da análise automática</div>
        <div style="font-size:12.5px; color:var(--text-2); line-height:1.5;">${esc(b.iaResumo.diagnostico || '')}</div>
        ${typeof b.iaResumo.grauConfianca === 'number' ? `<div style="font-size:11px; color:var(--text-3); margin-top:6px;">Grau de confiança: <strong>${b.iaResumo.grauConfianca}%</strong></div>` : ''}
        ${isAdmin() ? `<div style="font-size:11px; color:var(--text-3); margin-top:6px;"><i class="fa-solid fa-lock"></i> O diagnóstico técnico completo (causa, arquivos afetados, código proposto) está disponível em Administração → Central de Manutenção IA.</div>` : `<div style="font-size:11px; color:var(--text-3); margin-top:6px;"><i class="fa-solid fa-lock"></i> O diagnóstico técnico completo é visível apenas para administradores.</div>`}
      </div>
    `;
  }
  return '';
}


