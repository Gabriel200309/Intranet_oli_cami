/* ================= CLIENTES E PROSPECTS =================
   Cadastro único de clientes e prospects (formulários distintos para cada
   tipo) e a "ficha do cliente": uma tela só com dados, contatos, links para
   os sistemas externos (AdvBox, ChatGuru, CRM comercial, pasta de
   documentos), atendimentos, audiências e a linha do tempo do cliente.

   Até aqui "cliente" era só um texto digitado no atendimento e na
   audiência. Esses registros antigos continuam funcionando: a ficha mostra
   também os atendimentos/audiências com o MESMO nome ainda não vinculados,
   com um botão para vinculá-los ao cadastro.

   Acesso (espelha fn_pode_ver_clientes() e as policies da migração 0028):
   administrador, setores com a permissão "verClientes" (Administração >
   Permissões de acesso) e o próprio responsável pelo cliente. Só o
   administrador exclui um cliente ou uma etiqueta. */

const CLIENTE_TIPO_INFO = {
  prospect: { label: 'Prospect', cor: '#2E6DB4', icone: 'fa-seedling' },
  cliente: { label: 'Cliente', cor: '#2A8A61', icone: 'fa-handshake' },
};
const ORIGENS_CLIENTE = ['Indicação', 'CRM comercial', 'Site', 'Redes sociais', 'WhatsApp', 'Evento', 'Cliente antigo', 'Outro'];
const COR_ETIQUETA_PADRAO = '#B4881F';

/* ================= PERMISSÕES ================= */
/* Com o banco conectado, a resposta vem de fn_pode_ver_clientes() (a mesma
   regra da RLS): um colaborador comum não consegue ler a tabela
   permissoes_setor, então hasPermission() sozinho negaria o acesso a quem
   tem direito. Na simulação "Visualizando como" do administrador (e no
   modo local) vale a tabela de permissões carregada. */
function podeVerClientes() {
  if (isFullBypassAdmin()) return true;
  if (supabaseClient && !getViewingEmployee() && state.permissaoClientesBanco !== null) return state.permissaoClientesBanco;
  return hasPermission('verClientes');
}
function souResponsavelDoCliente(c) {
  const emp = getEffectiveEmployee();
  return !!(emp && c && c.responsavelId === emp.id);
}
/* Mesmo filtro que a RLS aplica no banco. Aplicado também no front-end para
   o modo local e para a simulação "Visualizando como" do administrador (o
   banco devolve tudo ao admin real, mas a tela precisa mostrar só o que o
   colaborador simulado veria). */
function clientesVisiveis() {
  if (podeVerClientes()) return state.clientes;
  return state.clientes.filter(souResponsavelDoCliente);
}
function podeAcessarTelaClientes() { return podeVerClientes() || clientesVisiveis().length > 0; }
function podeEditarCliente(c) { return podeVerClientes() || souResponsavelDoCliente(c); }
function podeExcluirCliente() { return isFullBypassAdmin(); }
/* Banco conectado, mas sem as tabelas da migração 0028: a tela mostra o
   aviso e nenhuma ação de gravação é oferecida. */
function cadastroClientesDesativado() { return !!supabaseClient && state.migracoesPendentes.some(m => m.indexOf('clientes') === 0); }
const MSG_CLIENTES_DESATIVADO = 'O cadastro de clientes ainda não foi ativado no banco — peça ao administrador para aplicar a migração 0028.';

/* ================= HELPERS ================= */
function clientePorId(id) { return state.clientes.find(c => c.id === id) || null; }
function etiquetaClientePorId(id) { return state.etiquetasCliente.find(e => e.id === id) || null; }
function somenteDigitos(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
/* Nome comparável: sem acento, sem diferença de maiúsculas e sem espaços
   repetidos — "José  da Silva" e "jose da silva" são o mesmo cliente. */
function normalizarNomeCliente(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function validarCPF(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (base, pesoInicial) => {
    const soma = base.split('').reduce((acc, n, i) => acc + Number(n) * (pesoInicial - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return dv(cpf.slice(0, 9), 10) === Number(cpf[9]) && dv(cpf.slice(0, 10), 11) === Number(cpf[10]);
}
function validarCNPJ(cnpj) {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const dv = (base) => {
    const pesos = base.length === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    const soma = base.split('').reduce((acc, n, i) => acc + Number(n) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return dv(cnpj.slice(0, 12)) === Number(cnpj[12]) && dv(cnpj.slice(0, 13)) === Number(cnpj[13]);
}
function formatarDocumento(doc) {
  const d = somenteDigitos(doc);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return doc || '';
}
/* Link "Abrir no WhatsApp" a partir do telefone cadastrado (número com DDD;
   o código do Brasil é acrescentado quando falta). */
function linkWhatsappCliente(telefone) {
  let d = somenteDigitos(telefone);
  if (d.length < 10) return '';
  if (d.length <= 11) d = '55' + d;
  return 'https://wa.me/' + d;
}
function tipoPillCliente(tipo) {
  const info = CLIENTE_TIPO_INFO[tipo] || CLIENTE_TIPO_INFO.prospect;
  return `<span class="status-pill" style="background:${info.cor}22; color:${info.cor};"><i class="fa-solid ${info.icone}" style="font-size:9px;"></i> ${info.label}</span>`;
}
function etiquetasChipsHTML(ids) {
  return (ids || []).map(etiquetaClientePorId).filter(Boolean).map(e =>
    `<span class="status-pill" style="background:${esc(e.cor)}22; color:${esc(e.cor)}; border:1px solid ${esc(e.cor)}55;">${esc(e.nome)}</span>`
  ).join(' ');
}
/* O cadastro de funcionários só mostra os colegas que a pessoa pode ver
   (RLS de funcionarios): o responsável pode ser de outro setor. */
function nomeResponsavelCliente(id) {
  if (!id) return '';
  const e = state.employees.find(x => x.id === id);
  return e ? e.nome : 'Colaborador de outro setor';
}
function nomeCarteiraCliente(id) { const c = state.carteiras.find(x => x.id === id); return c ? c.nome : ''; }
function prospectComContatoVencido(c) { return c.tipo === 'prospect' && c.proximoContato && c.proximoContato <= hojeLocalISO(); }

/* Atendimentos do cliente: os vinculados ao cadastro e, à parte, os antigos
   com o mesmo nome digitado e ainda sem vínculo (candidatos a vincular). */
function atendimentosDoCliente(c) {
  const alvo = normalizarNomeCliente(c.nome);
  const vinculados = state.atendimentosChat.filter(a => a.clienteId === c.id);
  const porNome = state.atendimentosChat.filter(a => !a.clienteId && a.cliente && normalizarNomeCliente(a.cliente) === alvo);
  return { vinculados, porNome };
}
/* Cliente de um atendimento: o vinculado ou, sem vínculo, o único cadastro
   visível com o mesmo nome. */
function clienteDoAtendimento(a) {
  if (!a) return null;
  if (a.clienteId) return clientesVisiveis().find(c => c.id === a.clienteId) || null;
  return clienteIdPorNome(a.cliente) ? clientePorId(clienteIdPorNome(a.cliente)) : null;
}
/* Usado pelos formulários de atendimento e audiência: se o nome digitado
   bate com exatamente UM cliente cadastrado, devolve o id dele para gravar o
   vínculo; homônimos ou nenhum cadastro = sem vínculo (fica só o texto). */
function clienteIdPorNome(nome) {
  const alvo = normalizarNomeCliente(nome);
  if (!alvo) return null;
  const achados = clientesVisiveis().filter(c => normalizarNomeCliente(c.nome) === alvo);
  return achados.length === 1 ? achados[0].id : null;
}
function datalistClientesHTML(id) {
  return `<datalist id="${id}">${clientesVisiveis().map(c => `<option value="${esc(c.nome)}"></option>`).join('')}</datalist>`;
}
function eventosDoCliente(clienteId) {
  return state.clienteEventos.filter(e => e.clienteId === clienteId).sort((a, b) => new Date(b.ocorridoEm) - new Date(a.ocorridoEm));
}
function registrarEventoClienteLocal(clienteId, evento) {
  const emp = getEffectiveEmployee();
  state.clienteEventos.push({ id: uid('ce'), clienteId, evento, ocorridoEm: new Date().toISOString(), autorId: emp ? emp.id : null });
}

/* ================= FILTROS ================= */
function setFiltroClientes(campo, valor) {
  state.filtroClientes[campo] = valor;
  if (campo === 'busca') { atualizarListaClientes(); return; } // não redesenha o campo em que a pessoa está digitando
  renderClientesView();
}
function limparFiltroClientes() {
  state.filtroClientes = { busca: '', tipo: '', carteiraId: '', responsavelId: '', etiquetaId: '' };
  renderClientesView();
}
function clientesFiltrados() {
  const f = state.filtroClientes;
  const q = normalizarNomeCliente(f.busca);
  const qDigitos = somenteDigitos(f.busca);
  return clientesVisiveis().filter(c => {
    if (f.tipo && c.tipo !== f.tipo) return false;
    if (f.carteiraId && c.carteiraId !== f.carteiraId) return false;
    if (f.responsavelId === '__nenhum__' ? !!c.responsavelId : (f.responsavelId && c.responsavelId !== f.responsavelId)) return false;
    if (f.etiquetaId && !(c.etiquetaIds || []).includes(f.etiquetaId)) return false;
    if (q) {
      const texto = normalizarNomeCliente([c.nome, c.email, c.origem, c.interesse].join(' '));
      const bateDigitos = qDigitos.length >= 3 && (somenteDigitos(c.documento).includes(qDigitos) || somenteDigitos(c.telefone).includes(qDigitos));
      if (!texto.includes(q) && !bateDigitos) return false;
    }
    return true;
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
function exportarClientesCSV() {
  const linhas = [['Tipo', 'Nome', 'Pessoa', 'CPF/CNPJ', 'E-mail', 'Telefone', 'Responsável', 'Carteira', 'Origem', 'Etiquetas', 'Próximo contato', 'Cadastrado em']];
  clientesFiltrados().forEach(c => linhas.push([
    CLIENTE_TIPO_INFO[c.tipo].label, c.nome, c.pessoa === 'juridica' ? 'Jurídica' : 'Física', formatarDocumento(c.documento),
    c.email, c.telefone, nomeResponsavelCliente(c.responsavelId), nomeCarteiraCliente(c.carteiraId), c.origem,
    (c.etiquetaIds || []).map(etiquetaClientePorId).filter(Boolean).map(e => e.nome).join(', '),
    c.proximoContato ? formatarDataBR(c.proximoContato) : '', c.criadoEm ? formatarDataBR(isoParaDiaLocal(c.criadoEm)) : '',
  ]));
  baixarCSV('clientes.csv', linhas);
}

/* ================= NAVEGAÇÃO ================= */
function abrirCliente(id) {
  state.clienteAtivoId = id;
  state.formCliente = null;
  state.audienciasCliente = { clienteId: null, lista: [], carregando: false };
  if (state.currentView !== 'clientes') {
    const item = NAV_EXTRA.find(n => n.view === 'clientes');
    state.activeNav = item ? item.label : state.activeNav;
    state.currentView = 'clientes';
    renderSidebar();
  }
  renderContentView();
  carregarAudienciasDoCliente(id);
}
function voltarListaClientes() { state.clienteAtivoId = null; state.formCliente = null; renderClientesView(); }
/* Do atendimento para a ficha e da ficha para o atendimento (painel de
   Eficiência), sem a pessoa precisar procurar de novo. */
function abrirAtendimentoDoCliente(atendimentoId) {
  const item = NAV_EXTRA.find(n => n.view === 'eficiencia');
  state.activeNav = item ? item.label : state.activeNav;
  state.currentView = 'eficiencia';
  state.atendimentoChatAtivoId = atendimentoId;
  renderSidebar();
  renderContentView();
}

/* ================= FORMULÁRIO (novo prospect / novo cliente / editar) ================= */
function abrirNovoCliente(tipo) {
  if (cadastroClientesDesativado()) { showToast(MSG_CLIENTES_DESATIVADO); return; }
  if (!podeVerClientes()) { showToast('Seu setor não tem permissão para cadastrar clientes.'); return; }
  state.formCliente = { modo: 'novo', tipo };
  state.clienteAtivoId = null;
  renderClientesView();
}
function editarCliente(id) {
  const c = clientePorId(id);
  if (!c || !podeEditarCliente(c)) { showToast('Você não tem permissão para editar este cliente.'); return; }
  state.formCliente = { modo: 'editar', id, tipo: c.tipo };
  renderClientesView();
}
function cancelarFormCliente() { state.formCliente = null; renderClientesView(); }
/* Trocar o tipo no formulário de edição muda os campos exibidos (prospect
   tem interesse/próximo contato; cliente tem endereço) sem perder o que já
   foi digitado nos campos comuns. */
function onTipoFormClienteChange(tipo) {
  const f = state.formCliente;
  if (!f) return;
  const rascunho = lerFormCliente();
  f.tipo = tipo;
  f.rascunho = rascunho;
  renderClientesView();
}
function formClienteHTML() {
  const f = state.formCliente;
  if (!f) return '';
  const editando = f.modo === 'editar';
  const base = f.rascunho || (editando ? clientePorId(f.id) : null) || {};
  const emp = getEffectiveEmployee();
  const responsavelPadrao = editando || f.rascunho ? base.responsavelId : (emp ? emp.id : '');
  const tipo = f.tipo;
  const etiquetasMarcadas = new Set(base.etiquetaIds || []);
  const campo = (id, label, valor, extra) => `<div class="form-field"${extra && extra.span ? ' style="grid-column:span 2;"' : ''}><label>${label}</label><input id="${id}" value="${esc(valor || '')}"${extra && extra.placeholder ? ` placeholder="${esc(extra.placeholder)}"` : ''}${extra && extra.type ? ` type="${extra.type}"` : ''}${extra && extra.list ? ` list="${extra.list}"` : ''}></div>`;
  return `
    <div class="card" style="padding:18px; margin-bottom:18px; max-width:860px;">
      <div style="font-weight:800; font-size:14px; margin-bottom:12px;">
        ${editando ? `Editar ${tipo === 'cliente' ? 'cliente' : 'prospect'}` : (tipo === 'cliente' ? 'Novo cliente' : 'Novo prospect')}
        <span style="font-size:11.5px; font-weight:600; color:var(--text-3); margin-left:6px;">${tipo === 'cliente' ? 'contrato fechado — cadastro completo' : 'contato em negociação — ainda não é cliente'}</span>
      </div>
      <div class="form-grid" style="grid-template-columns:1fr 1fr;">
        ${campo('cl-nome', 'Nome completo / Razão social *', base.nome, { span: true })}
        ${editando ? `
          <div class="form-field"><label>Tipo</label>
            <select id="cl-tipo" onchange="onTipoFormClienteChange(this.value)">
              <option value="prospect" ${tipo === 'prospect' ? 'selected' : ''}>Prospect</option>
              <option value="cliente" ${tipo === 'cliente' ? 'selected' : ''}>Cliente</option>
            </select>
          </div>` : ''}
        <div class="form-field"><label>Pessoa</label>
          <select id="cl-pessoa">
            <option value="fisica" ${base.pessoa !== 'juridica' ? 'selected' : ''}>Física (CPF)</option>
            <option value="juridica" ${base.pessoa === 'juridica' ? 'selected' : ''}>Jurídica (CNPJ)</option>
          </select>
        </div>
        ${campo('cl-documento', tipo === 'cliente' ? 'CPF / CNPJ' : 'CPF / CNPJ (opcional)', formatarDocumento(base.documento), { placeholder: 'Só números ou com pontuação' })}
        ${campo('cl-telefone', 'Telefone / WhatsApp', base.telefone, { placeholder: '(31) 99999-0000' })}
        ${campo('cl-email', 'E-mail', base.email, { type: 'email' })}
        ${tipo === 'cliente'
          ? campo('cl-endereco', 'Endereço', base.endereco, { span: true, placeholder: 'Rua, número, bairro, cidade/UF' })
          : `${campo('cl-interesse', 'Interesse / demanda', base.interesse, { span: true, placeholder: 'Ex.: renegociação de dívidas bancárias' })}
             ${campo('cl-proximo-contato', 'Próximo contato', base.proximoContato, { type: 'date' })}`}
        ${campo('cl-origem', 'Origem (como chegou)', base.origem, { list: 'dl-origens-cliente', placeholder: 'Indicação, CRM comercial...' })}
        <datalist id="dl-origens-cliente">${ORIGENS_CLIENTE.map(o => `<option value="${esc(o)}"></option>`).join('')}</datalist>
        <div class="form-field"><label>Responsável</label>
          <select id="cl-responsavel">
            <option value="">— Sem responsável —</option>
            ${responsavelPadrao && !state.employees.some(e => e.id === responsavelPadrao) ? `<option value="${esc(responsavelPadrao)}" selected>Responsável atual (colaborador de outro setor)</option>` : ''}
            ${state.employees.map(e => `<option value="${e.id}" ${responsavelPadrao === e.id ? 'selected' : ''}>${esc(e.nome)} — ${esc(e.setor)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field"><label>Carteira</label>
          <div style="display:flex; gap:6px;">
            <select id="cl-carteira" style="flex:1;">
              <option value="">— Sem carteira —</option>
              ${state.carteiras.map(cw => `<option value="${cw.id}" ${base.carteiraId === cw.id ? 'selected' : ''}>${esc(cw.nome)}</option>`).join('')}
            </select>
            ${isFullBypassAdmin() ? `<button type="button" class="admin-edit-btn" title="Nova carteira" onclick="novaCarteiraPeloCliente()"><i class="fa-solid fa-plus" style="font-size:12px;"></i></button>` : ''}
          </div>
        </div>
        <div class="form-field" style="grid-column:span 2;"><label>Etiquetas</label>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${state.etiquetasCliente.length ? state.etiquetasCliente.map(e => `
              <label style="display:inline-flex; align-items:center; gap:6px; font-size:12px; padding:4px 10px; border-radius:100px; border:1px solid ${esc(e.cor)}66; cursor:pointer;">
                <input type="checkbox" class="cl-etiqueta" value="${e.id}" ${etiquetasMarcadas.has(e.id) ? 'checked' : ''} style="width:13px; height:13px;">
                <span style="width:9px; height:9px; border-radius:50%; background:${esc(e.cor)};"></span> ${esc(e.nome)}
              </label>`).join('') : `<span style="font-size:11.5px; color:var(--text-3);">Nenhuma etiqueta criada ainda — use "Etiquetas" na tela de Clientes.</span>`}
          </div>
        </div>
      </div>
      <div style="font-size:11px; font-weight:800; letter-spacing:.05em; color:var(--text-3); margin:6px 0 8px;">LINKS PARA OS SISTEMAS DO CLIENTE <span style="font-weight:600; letter-spacing:0;">(opcional — viram botões na ficha)</span></div>
      <div class="form-grid" style="grid-template-columns:1fr 1fr;">
        ${campo('cl-link-advbox', 'AdvBox (processos)', base.linkAdvbox, { placeholder: 'https://app.advbox.com.br/...' })}
        ${campo('cl-link-chatguru', 'ChatGuru (conversa)', base.linkChatguru, { placeholder: 'https://app.chatguru.app/...' })}
        ${campo('cl-link-crm', 'CRM comercial', base.linkCrm)}
        ${campo('cl-link-pasta', 'Pasta de documentos', base.linkPasta, { placeholder: 'Drive, OneDrive ou servidor' })}
        ${campo('cl-observacoes', 'Observações', base.observacoes, { span: true })}
      </div>
      <div style="display:flex; gap:8px;">
        <button class="admin-add-btn" onclick="${editando ? `submitEdicaoCliente(${jsArg(f.id)})` : 'submitNovoCliente()'}"><i class="fa-solid fa-check"></i> ${editando ? 'Salvar alterações' : (tipo === 'cliente' ? 'Cadastrar cliente' : 'Cadastrar prospect')}</button>
        <button class="admin-cancel-btn" onclick="cancelarFormCliente()">Cancelar</button>
      </div>
    </div>
  `;
}
function lerFormCliente() {
  const f = state.formCliente || {};
  const el = id => document.getElementById(id);
  const tipo = el('cl-tipo') ? el('cl-tipo').value : f.tipo;
  return {
    tipo,
    nome: val('cl-nome').trim().replace(/\s+/g, ' '),
    pessoa: val('cl-pessoa') || 'fisica',
    documento: somenteDigitos(val('cl-documento')),
    telefone: val('cl-telefone').trim(),
    email: val('cl-email').trim(),
    // campos que só existem num dos dois formulários: mantém o valor
    // anterior (rascunho/cadastro) quando o campo não está na tela
    endereco: el('cl-endereco') ? val('cl-endereco').trim() : ((f.rascunho || clientePorId(f.id) || {}).endereco || ''),
    interesse: el('cl-interesse') ? val('cl-interesse').trim() : ((f.rascunho || clientePorId(f.id) || {}).interesse || ''),
    proximoContato: el('cl-proximo-contato') ? (val('cl-proximo-contato') || null) : ((f.rascunho || clientePorId(f.id) || {}).proximoContato || null),
    origem: val('cl-origem').trim(),
    responsavelId: val('cl-responsavel') || null,
    carteiraId: val('cl-carteira') || null,
    etiquetaIds: [...document.querySelectorAll('.cl-etiqueta:checked')].map(i => i.value),
    linkAdvbox: normalizeUrl(val('cl-link-advbox')),
    linkChatguru: normalizeUrl(val('cl-link-chatguru')),
    linkCrm: normalizeUrl(val('cl-link-crm')),
    linkPasta: normalizeUrl(val('cl-link-pasta')),
    observacoes: val('cl-observacoes').trim(),
  };
}
/* Validações comuns a cadastro e edição. Devolve a mensagem de erro, ou ''. */
function validarFormCliente(d, idAtual) {
  if (!d.nome) return 'Informe o nome do cliente.';
  if (d.documento) {
    if (d.documento.length === 11 && !validarCPF(d.documento)) return 'CPF inválido — confira os números digitados.';
    if (d.documento.length === 14 && !validarCNPJ(d.documento)) return 'CNPJ inválido — confira os números digitados.';
    if (d.documento.length !== 11 && d.documento.length !== 14) return 'O documento precisa ter 11 dígitos (CPF) ou 14 dígitos (CNPJ).';
    const dono = state.clientes.find(c => c.id !== idAtual && c.documento === d.documento);
    if (dono) return `Este documento já está cadastrado para "${dono.nome}".`;
  }
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return 'E-mail inválido.';
  return '';
}
function payloadCliente(d) {
  return {
    tipo: d.tipo, nome: d.nome, pessoa: d.pessoa, documento: d.documento || null,
    email: d.email || null, telefone: d.telefone || null, endereco: d.endereco || null,
    origem: d.origem || null, interesse: d.interesse || null, proximo_contato: d.proximoContato || null,
    carteira_id: d.carteiraId, responsavel_id: d.responsavelId,
    link_advbox: d.linkAdvbox || null, link_chatguru: d.linkChatguru || null, link_crm: d.linkCrm || null, link_pasta: d.linkPasta || null,
    observacoes: d.observacoes || null,
  };
}
function mensagemErroCliente(error) {
  if (error.code === '23505') return 'já existe um cliente cadastrado com este CPF/CNPJ.';
  if (tabelaAusente(error, 'clientes')) return 'o cadastro de clientes ainda não foi ativado no banco — peça ao administrador para aplicar a migração 0028.';
  return error.message || error.details || ('o servidor recusou a operação' + (error.code ? ' (código ' + error.code + ')' : '') + '.');
}
async function submitNovoCliente() {
  if (cadastroClientesDesativado()) { showToast(MSG_CLIENTES_DESATIVADO); return; }
  if (!podeVerClientes()) { showToast('Seu setor não tem permissão para cadastrar clientes.'); return; }
  const d = lerFormCliente();
  const erro = validarFormCliente(d, null);
  if (erro) { showToast(erro); return; }
  const homonimo = state.clientes.find(c => normalizarNomeCliente(c.nome) === normalizarNomeCliente(d.nome));
  if (homonimo && !window.confirm(`Já existe um cadastro com o nome "${homonimo.nome}". Deseja cadastrar mesmo assim?`)) return;
  const emp = getEffectiveEmployee();
  if (!supabaseClient) {
    const novo = { id: uid('cli'), ...d, convertidoEm: null, criadoPor: emp ? emp.id : null, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
    state.clientes.push(novo);
    registrarEventoClienteLocal(novo.id, d.tipo === 'cliente' ? 'Cadastrado como cliente' : 'Cadastrado como prospect');
    state.formCliente = null;
    showToast(d.tipo === 'cliente' ? 'Cliente cadastrado!' : 'Prospect cadastrado!');
    abrirCliente(novo.id);
    return;
  }
  const { data, error } = await supabaseClient.from('clientes').insert({ ...payloadCliente(d), criado_por: emp ? emp.id : null }).select('id').single();
  if (error) { showToast('Não foi possível cadastrar: ' + mensagemErroCliente(error)); return; }
  let avisoEtiquetas = '';
  if (d.etiquetaIds.length) {
    const { error: errEt } = await supabaseClient.from('cliente_etiquetas').insert(d.etiquetaIds.map(etiqueta_id => ({ cliente_id: data.id, etiqueta_id })));
    if (errEt) avisoEtiquetas = ' As etiquetas não puderam ser salvas: ' + errEt.message;
  }
  state.formCliente = null;
  showToast((d.tipo === 'cliente' ? 'Cliente cadastrado!' : 'Prospect cadastrado!') + avisoEtiquetas);
  await Promise.all([carregarClientes(), carregarClienteEventos()]);
  abrirCliente(data.id);
}
async function submitEdicaoCliente(id) {
  const anterior = clientePorId(id);
  if (!anterior || !podeEditarCliente(anterior)) { showToast('Você não tem permissão para editar este cliente.'); return; }
  const d = lerFormCliente();
  const erro = validarFormCliente(d, id);
  if (erro) { showToast(erro); return; }
  const antes = new Set(anterior.etiquetaIds || []);
  const depois = new Set(d.etiquetaIds);
  const adicionadas = [...depois].filter(x => !antes.has(x));
  const removidas = [...antes].filter(x => !depois.has(x));
  if (!supabaseClient) {
    registrarEventosEdicaoLocal(anterior, d, adicionadas, removidas);
    if (anterior.tipo === 'prospect' && d.tipo === 'cliente') d.convertidoEm = new Date().toISOString();
    else if (d.tipo === 'prospect') d.convertidoEm = null;
    Object.assign(anterior, d, { atualizadoEm: new Date().toISOString() });
    state.formCliente = null;
    showToast('Cadastro atualizado!');
    renderClientesView();
    return;
  }
  const { data, error } = await supabaseClient.from('clientes').update(payloadCliente(d)).eq('id', id).select('id');
  if (error) { showToast('Não foi possível salvar: ' + mensagemErroCliente(error)); return; }
  if (!data || !data.length) { showToast('Você não tem permissão para editar este cliente.'); return; }
  const falhas = [];
  if (adicionadas.length) {
    const { error: e1 } = await supabaseClient.from('cliente_etiquetas').insert(adicionadas.map(etiqueta_id => ({ cliente_id: id, etiqueta_id })));
    if (e1) falhas.push(e1.message);
  }
  if (removidas.length) {
    const { error: e2 } = await supabaseClient.from('cliente_etiquetas').delete().eq('cliente_id', id).in('etiqueta_id', removidas);
    if (e2) falhas.push(e2.message);
  }
  state.formCliente = null;
  showToast(falhas.length ? 'Cadastro salvo, mas as etiquetas não puderam ser atualizadas: ' + falhas.join(' ') : 'Cadastro atualizado!');
  await Promise.all([carregarClientes(), carregarClienteEventos()]);
  renderClientesView();
}
/* Modo local (sem Supabase): reproduz os eventos que os triggers da
   migração 0028 gravam no banco. */
function registrarEventosEdicaoLocal(anterior, d, adicionadas, removidas) {
  if (anterior.tipo !== d.tipo) registrarEventoClienteLocal(anterior.id, d.tipo === 'cliente' ? 'Convertido de prospect em cliente' : 'Voltou a ser prospect');
  if ((anterior.responsavelId || null) !== (d.responsavelId || null)) registrarEventoClienteLocal(anterior.id, d.responsavelId ? 'Responsável alterado para ' + nomeResponsavelCliente(d.responsavelId) : 'Responsável removido');
  if ((anterior.carteiraId || null) !== (d.carteiraId || null)) registrarEventoClienteLocal(anterior.id, d.carteiraId ? 'Carteira alterada para ' + nomeCarteiraCliente(d.carteiraId) : 'Removido da carteira');
  adicionadas.forEach(eid => registrarEventoClienteLocal(anterior.id, 'Etiqueta adicionada: ' + ((etiquetaClientePorId(eid) || {}).nome || '—')));
  removidas.forEach(eid => registrarEventoClienteLocal(anterior.id, 'Etiqueta removida: ' + ((etiquetaClientePorId(eid) || {}).nome || '—')));
}
async function converterEmCliente(id) {
  const c = clientePorId(id);
  if (!c || !podeEditarCliente(c)) { showToast('Você não tem permissão para editar este cliente.'); return; }
  if (!window.confirm(`Converter "${c.nome}" de prospect em cliente?`)) return;
  if (!supabaseClient) {
    c.tipo = 'cliente'; c.convertidoEm = new Date().toISOString();
    registrarEventoClienteLocal(id, 'Convertido de prospect em cliente');
    showToast('Prospect convertido em cliente!');
    renderClientesView();
    return;
  }
  const { data, error } = await supabaseClient.from('clientes').update({ tipo: 'cliente' }).eq('id', id).select('id');
  if (error) { showToast('Não foi possível converter: ' + mensagemErroCliente(error)); return; }
  if (!data || !data.length) { showToast('Você não tem permissão para editar este cliente.'); return; }
  showToast('Prospect convertido em cliente! Complete o cadastro (CPF/CNPJ, endereço) em "Editar".');
  await Promise.all([carregarClientes(), carregarClienteEventos()]);
  renderClientesView();
}
async function removerCliente(id) {
  const c = clientePorId(id);
  if (!c || !podeExcluirCliente()) { showToast('Só o administrador pode excluir um cliente.'); return; }
  if (!window.confirm(`Excluir o cadastro de "${c.nome}"? Os atendimentos e audiências vinculados continuam existindo, só perdem o vínculo com o cadastro. Esta ação não pode ser desfeita.`)) return;
  if (supabaseClient) {
    const { data, error } = await supabaseClient.from('clientes').delete().eq('id', id).select('id');
    if (error) { showToast('Não foi possível excluir: ' + error.message); return; }
    if (!data || !data.length) { showToast('Você não tem permissão para excluir este cliente.'); return; }
    await Promise.all([carregarClientes(), carregarClienteEventos(), carregarAtendimentosChat()]);
  } else {
    state.clientes = state.clientes.filter(x => x.id !== id);
    state.clienteEventos = state.clienteEventos.filter(e => e.clienteId !== id);
    state.atendimentosChat.forEach(a => { if (a.clienteId === id) a.clienteId = null; });
  }
  state.clienteAtivoId = null;
  showToast('Cadastro excluído.');
  renderClientesView();
}
async function novaCarteiraPeloCliente() {
  const rascunho = lerFormCliente();
  const nome = window.prompt('Nome da nova carteira:');
  if (!nome || !nome.trim()) return;
  if (supabaseClient) {
    const { data, error } = await supabaseClient.from('carteiras').insert({ nome: nome.trim() }).select('id').single();
    if (error) { showToast('Não foi possível criar a carteira: ' + error.message); return; }
    await carregarCarteiras();
    rascunho.carteiraId = data.id;
  } else {
    const nova = { id: uid('cw'), nome: nome.trim() };
    state.carteiras.push(nova);
    rascunho.carteiraId = nova.id;
  }
  state.formCliente.rascunho = rascunho;
  showToast('Carteira criada!');
  renderClientesView();
}

/* ================= ETIQUETAS ================= */
function toggleGerenciarEtiquetasCliente() { state.gerenciarEtiquetasClienteAberto = !state.gerenciarEtiquetasClienteAberto; renderClientesView(); }
async function submitEtiquetaCliente() {
  if (cadastroClientesDesativado()) { showToast(MSG_CLIENTES_DESATIVADO); return; }
  if (!podeVerClientes()) { showToast('Seu setor não tem permissão para criar etiquetas.'); return; }
  const nome = val('et-nome').trim();
  const cor = val('et-cor') || COR_ETIQUETA_PADRAO;
  if (!nome) { showToast('Informe o nome da etiqueta.'); return; }
  if (state.etiquetasCliente.some(e => normalizarNomeCliente(e.nome) === normalizarNomeCliente(nome))) { showToast('Já existe uma etiqueta com esse nome.'); return; }
  if (!supabaseClient) {
    state.etiquetasCliente.push({ id: uid('et'), nome, cor });
  } else {
    const { error } = await supabaseClient.from('etiquetas_cliente').insert({ nome, cor });
    if (error) { showToast('Não foi possível criar a etiqueta: ' + (error.code === '23505' ? 'já existe uma etiqueta com esse nome.' : mensagemErroCliente(error))); return; }
    await carregarEtiquetasCliente();
  }
  showToast('Etiqueta criada!');
  renderClientesView();
}
async function removerEtiquetaCliente(id) {
  const e = etiquetaClientePorId(id);
  if (!e || !isFullBypassAdmin()) { showToast('Só o administrador pode excluir etiquetas.'); return; }
  const qtd = state.clientes.filter(c => (c.etiquetaIds || []).includes(id)).length;
  if (!window.confirm(`Excluir a etiqueta "${e.nome}"?${qtd ? ` Ela será removida de ${qtd} cliente(s).` : ''}`)) return;
  if (supabaseClient) {
    const { error } = await supabaseClient.from('etiquetas_cliente').delete().eq('id', id);
    if (error) { showToast('Não foi possível excluir: ' + error.message); return; }
    await Promise.all([carregarEtiquetasCliente(), carregarClientes()]);
  } else {
    state.etiquetasCliente = state.etiquetasCliente.filter(x => x.id !== id);
    state.clientes.forEach(c => { c.etiquetaIds = (c.etiquetaIds || []).filter(x => x !== id); });
  }
  if (state.filtroClientes.etiquetaId === id) state.filtroClientes.etiquetaId = '';
  showToast('Etiqueta excluída.');
  renderClientesView();
}
function painelEtiquetasClienteHTML() {
  return `
    <div class="card" style="padding:16px; margin-bottom:18px; max-width:860px;">
      <div style="font-weight:800; font-size:13px; margin-bottom:10px;">Etiquetas de clientes</div>
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
        ${state.etiquetasCliente.length ? state.etiquetasCliente.map(e => {
          const qtd = state.clientes.filter(c => (c.etiquetaIds || []).includes(e.id)).length;
          return `<span class="status-pill" style="background:${esc(e.cor)}22; color:${esc(e.cor)}; border:1px solid ${esc(e.cor)}55; display:inline-flex; align-items:center; gap:6px;">
            ${esc(e.nome)} <span style="opacity:.7;">(${qtd})</span>
            ${isFullBypassAdmin() ? `<button title="Excluir etiqueta" onclick="removerEtiquetaCliente(${jsArg(e.id)})" style="background:none; border:none; color:inherit; cursor:pointer; padding:0;"><i class="fa-solid fa-xmark" style="font-size:10px;"></i></button>` : ''}
          </span>`;
        }).join('') : `<span style="font-size:12px; color:var(--text-3);">Nenhuma etiqueta criada ainda.</span>`}
      </div>
      ${podeVerClientes() && !cadastroClientesDesativado() ? `
        <div style="display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap;">
          <div class="form-field" style="min-width:200px;"><label>Nova etiqueta</label><input id="et-nome" placeholder="Ex.: VIP, Inadimplente, Trabalhista"></div>
          <div class="form-field" style="width:70px;"><label>Cor</label><input id="et-cor" type="color" value="${COR_ETIQUETA_PADRAO}" style="height:38px; padding:2px;"></div>
          <button class="admin-add-btn" style="margin-top:0;" onclick="submitEtiquetaCliente()"><i class="fa-solid fa-plus"></i> Criar</button>
        </div>
        ${!isFullBypassAdmin() ? `<div style="font-size:10.5px; color:var(--text-3); margin-top:8px;">Só o administrador pode excluir etiquetas.</div>` : ''}
      ` : ''}
    </div>
  `;
}

/* ================= VÍNCULOS (atendimentos e audiências antigos) ================= */
async function vincularAtendimentoAoCliente(atendimentoId, clienteId) {
  const a = state.atendimentosChat.find(x => x.id === atendimentoId);
  if (!a || !podeGerenciarAtendimentoChat(a)) { showToast('Você não tem permissão para alterar este atendimento.'); return; }
  if (!supabaseClient) { a.clienteId = clienteId; renderClientesView(); return; }
  const { data, error } = await supabaseClient.from('atendimentos_chat').update({ cliente_id: clienteId }).eq('id', atendimentoId).select('id');
  if (error) { showToast('Não foi possível vincular: ' + (colunaAusente(error, 'cliente_id') ? 'aplique a migração 0028 no banco.' : error.message)); return; }
  if (!data || !data.length) { showToast('Você não tem permissão para alterar este atendimento.'); return; }
  await carregarAtendimentosChat();
  renderClientesView();
}
async function vincularTodosAtendimentosAoCliente(clienteId) {
  const c = clientePorId(clienteId);
  if (!c) return;
  const ids = atendimentosDoCliente(c).porNome.filter(podeGerenciarAtendimentoChat).map(a => a.id);
  if (!ids.length) return;
  if (!supabaseClient) {
    state.atendimentosChat.forEach(a => { if (ids.includes(a.id)) a.clienteId = clienteId; });
    showToast(`${ids.length} atendimento(s) vinculado(s).`);
    renderClientesView();
    return;
  }
  const { data, error } = await supabaseClient.from('atendimentos_chat').update({ cliente_id: clienteId }).in('id', ids).select('id');
  if (error) { showToast('Não foi possível vincular: ' + (colunaAusente(error, 'cliente_id') ? 'aplique a migração 0028 no banco.' : error.message)); return; }
  showToast(`${(data || []).length} atendimento(s) vinculado(s).`);
  await carregarAtendimentosChat();
  renderClientesView();
}
/* Audiências: a tela inicial só carrega a pauta do dia, então a ficha busca
   à parte todas as audiências do cliente (vinculadas + mesmo nome). */
function escaparLike(s) { return String(s).replace(/[\\%_]/g, '\\$&'); }
async function carregarAudienciasDoCliente(clienteId) {
  const c = clientePorId(clienteId);
  if (!c) return;
  const alvo = normalizarNomeCliente(c.nome);
  if (!supabaseClient) {
    const lista = state.audiencias
      .filter(a => a.clienteId === clienteId || (!a.clienteId && normalizarNomeCliente(a.cliente) === alvo))
      .map(a => ({ ...a, data: a.data || hojeLocalISO() }));
    state.audienciasCliente = { clienteId, lista, carregando: false };
    if (state.clienteAtivoId === clienteId) renderClientesView();
    return;
  }
  state.audienciasCliente = { clienteId, lista: [], carregando: true };
  const [r1, r2] = await Promise.all([
    supabaseClient.from('audiencias').select('*').eq('cliente_id', clienteId),
    supabaseClient.from('audiencias').select('*').is('cliente_id', null).ilike('cliente', escaparLike(c.nome.trim())),
  ]);
  if (r1.error) console.error('Erro ao carregar audiências do cliente:', r1.error.message);
  if (r2.error) console.error('Erro ao carregar audiências do cliente (por nome):', r2.error.message);
  const porId = {};
  [...(r1.data || []), ...(r2.data || []).filter(a => normalizarNomeCliente(a.cliente) === alvo)].forEach(a => { porId[a.id] = a; });
  const lista = Object.values(porId).map(a => ({
    id: a.id, hora: (a.hora || '').slice(0, 5), data: a.data, cliente: a.cliente, advogado: a.advogado || '', status: a.status, clienteId: a.cliente_id || null,
  })).sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
  if (state.clienteAtivoId !== clienteId) return; // a pessoa já saiu desta ficha
  state.audienciasCliente = { clienteId, lista, carregando: false };
  renderClientesView();
}
async function vincularAudienciaAoCliente(audienciaId, clienteId) {
  if (!isFullBypassAdmin()) { showToast('Só o administrador pode alterar audiências.'); return; }
  if (supabaseClient) {
    const { error } = await supabaseClient.from('audiencias').update({ cliente_id: clienteId }).eq('id', audienciaId);
    if (error) { showToast('Não foi possível vincular: ' + (colunaAusente(error, 'cliente_id') ? 'aplique a migração 0028 no banco.' : error.message)); return; }
  } else {
    const a = state.audiencias.find(x => x.id === audienciaId);
    if (a) a.clienteId = clienteId;
  }
  showToast('Audiência vinculada ao cliente.');
  carregarAudienciasDoCliente(clienteId);
}

/* ================= TELA: LISTA ================= */
function avisoMigracaoClientesHTML() {
  if (!state.migracoesPendentes.some(m => m.indexOf('clientes') === 0)) return '';
  return `
    <div class="card" style="padding:14px 16px; margin-bottom:16px; border-left:3px solid var(--danger); max-width:860px;">
      <div style="font-weight:700; font-size:13px;"><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i> O cadastro de clientes ainda não foi ativado no banco de dados.</div>
      <div style="font-size:12px; color:var(--text-2); margin-top:4px;">${isAdmin() ? 'Rode o arquivo <span class="mono">supabase/migrations/0028_clientes.sql</span> no SQL Editor do Supabase e recarregue a página.' : 'Avise o administrador do portal.'}</div>
    </div>`;
}
function filtrosClientesBar() {
  const f = state.filtroClientes;
  return `
    <div class="card" style="padding:14px 16px; margin-bottom:18px;">
      <div class="form-grid" style="grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); margin-bottom:10px;">
        <div class="form-field" style="grid-column:span 2;"><label>Buscar</label><input id="cl-busca" placeholder="Nome, CPF/CNPJ, telefone ou e-mail..." value="${esc(f.busca)}" oninput="setFiltroClientes('busca', this.value)"></div>
        <div class="form-field"><label>Tipo</label>
          <select onchange="setFiltroClientes('tipo', this.value)">
            <option value="" ${!f.tipo ? 'selected' : ''}>Todos</option>
            <option value="cliente" ${f.tipo === 'cliente' ? 'selected' : ''}>Clientes</option>
            <option value="prospect" ${f.tipo === 'prospect' ? 'selected' : ''}>Prospects</option>
          </select>
        </div>
        <div class="form-field"><label>Carteira</label>
          <select onchange="setFiltroClientes('carteiraId', this.value)">
            <option value="" ${!f.carteiraId ? 'selected' : ''}>Todas</option>
            ${state.carteiras.map(cw => `<option value="${cw.id}" ${f.carteiraId === cw.id ? 'selected' : ''}>${esc(cw.nome)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field"><label>Responsável</label>
          <select onchange="setFiltroClientes('responsavelId', this.value)">
            <option value="" ${!f.responsavelId ? 'selected' : ''}>Todos</option>
            <option value="__nenhum__" ${f.responsavelId === '__nenhum__' ? 'selected' : ''}>Sem responsável</option>
            ${state.employees.map(e => `<option value="${e.id}" ${f.responsavelId === e.id ? 'selected' : ''}>${esc(e.nome)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field"><label>Etiqueta</label>
          <select onchange="setFiltroClientes('etiquetaId', this.value)">
            <option value="" ${!f.etiquetaId ? 'selected' : ''}>Todas</option>
            ${state.etiquetasCliente.map(e => `<option value="${e.id}" ${f.etiquetaId === e.id ? 'selected' : ''}>${esc(e.nome)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="admin-cancel-btn" style="margin-top:0;" onclick="limparFiltroClientes()"><i class="fa-solid fa-eraser"></i> Limpar filtros</button>
        <button class="admin-cancel-btn" style="margin-top:0;" onclick="exportarClientesCSV()"><i class="fa-solid fa-file-csv"></i> Exportar (Excel/CSV)</button>
        <button class="admin-cancel-btn" style="margin-top:0;" onclick="toggleGerenciarEtiquetasCliente()"><i class="fa-solid fa-tags"></i> Etiquetas</button>
      </div>
    </div>
  `;
}
function linhaClienteHTML(c) {
  const { vinculados, porNome } = atendimentosDoCliente(c);
  const qtdAtend = vinculados.length + porNome.length;
  const vencido = prospectComContatoVencido(c);
  const detalhes = [
    c.documento ? formatarDocumento(c.documento) : '',
    c.responsavelId ? 'Resp.: ' + nomeResponsavelCliente(c.responsavelId) : 'Sem responsável',
    nomeCarteiraCliente(c.carteiraId) ? 'Carteira: ' + nomeCarteiraCliente(c.carteiraId) : '',
    qtdAtend ? `${qtdAtend} atendimento${qtdAtend === 1 ? '' : 's'}` : '',
  ].filter(Boolean).map(esc).join(' · ');
  return `
    <div class="aviso-row" onclick="abrirCliente(${jsArg(c.id)})" style="cursor:pointer;">
      <div class="priority-bar" style="background:${(CLIENTE_TIPO_INFO[c.tipo] || CLIENTE_TIPO_INFO.prospect).cor};"></div>
      <div style="flex:1; min-width:0;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <div style="font-size:13.5px; font-weight:700;">${esc(c.nome)}</div>
          ${tipoPillCliente(c.tipo)} ${etiquetasChipsHTML(c.etiquetaIds)}
        </div>
        <div class="mono" style="font-size:10.5px; color:var(--text-3); margin-top:3px;">${detalhes}</div>
        ${c.tipo === 'prospect' && (c.interesse || c.proximoContato) ? `
          <div style="font-size:11.5px; color:var(--text-2); margin-top:3px;">
            ${c.interesse ? esc(c.interesse) : ''}${c.interesse && c.proximoContato ? ' · ' : ''}
            ${c.proximoContato ? `<span style="${vencido ? 'color:var(--danger); font-weight:700;' : ''}"><i class="fa-regular fa-calendar" style="font-size:10px;"></i> próximo contato ${esc(formatarDataBR(c.proximoContato))}${vencido ? ' (vencido/hoje)' : ''}</span>` : ''}
          </div>` : ''}
      </div>
      <i class="fa-solid fa-chevron-right" style="color:var(--text-3); font-size:11px; align-self:center;"></i>
    </div>
  `;
}
function listaClientesHTML() {
  const lista = clientesFiltrados();
  const total = clientesVisiveis().length;
  if (!total) return `<div class="card" style="padding:30px; text-align:center; color:var(--text-3); font-size:13px;">Nenhum cliente cadastrado ainda.${podeVerClientes() && !cadastroClientesDesativado() ? ' Use "Novo prospect" ou "Novo cliente" para começar.' : ''}</div>`;
  if (!lista.length) return `<div class="card" style="padding:30px; text-align:center; color:var(--text-3); font-size:13px;">Nenhum cliente encontrado com esses filtros.</div>`;
  return `
    <div style="font-size:11px; color:var(--text-3); margin-bottom:6px;">${lista.length} de ${total} cadastro${total === 1 ? '' : 's'}</div>
    <div class="card" style="overflow:hidden; margin-bottom:24px;">${lista.map(linhaClienteHTML).join('')}</div>
  `;
}
/* A busca redesenha só a lista (o campo de busca não perde o foco nem o
   cursor enquanto a pessoa digita). */
function atualizarListaClientes() {
  const el = document.getElementById('clientesLista');
  if (el) el.innerHTML = listaClientesHTML();
}
function renderClientesView() {
  if (state.currentView !== 'clientes') return;
  const content = document.getElementById('content');
  if (!podeAcessarTelaClientes()) {
    content.innerHTML = `
      <div class="section-title">Clientes e Prospects</div>
      ${avisoMigracaoClientesHTML()}
      <div class="card permission-denied-card">
        <div class="permission-denied-icon"><i class="fa-solid fa-lock"></i></div>
        <div style="font-size:15.5px; font-weight:800; margin-bottom:8px;">Você não possui permissão para acessar o cadastro de clientes.</div>
        <div style="font-size:12.5px; color:var(--text-2); line-height:1.6;">O acesso é liberado por setor em Administração › Permissões de acesso ("Ver e editar clientes"). Clientes pelos quais você é responsável aparecem aqui mesmo sem essa permissão.</div>
      </div>`;
    return;
  }
  if (state.clienteAtivoId) { renderClienteDetalhe(); return; }
  const visiveis = clientesVisiveis();
  const qtdClientes = visiveis.filter(c => c.tipo === 'cliente').length;
  const qtdProspects = visiveis.filter(c => c.tipo === 'prospect').length;
  const qtdContatoVencido = visiveis.filter(prospectComContatoVencido).length;
  const qtdSemResponsavel = visiveis.filter(c => !c.responsavelId).length;
  content.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:10px;">
      <div class="section-title" style="margin-bottom:0;">Clientes e Prospects</div>
      ${podeVerClientes() && !cadastroClientesDesativado() ? `
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="admin-cancel-btn" style="margin-top:0;" onclick="abrirNovoCliente('prospect')"><i class="fa-solid fa-seedling"></i> Novo prospect</button>
          <button class="btn-brass" onclick="abrirNovoCliente('cliente')"><i class="fa-solid fa-plus"></i> Novo cliente</button>
        </div>` : ''}
    </div>
    <div style="font-size:12px; color:var(--text-2); max-width:820px; margin-bottom:16px; line-height:1.5;">
      Cadastro único de clientes e prospects. Abra um nome para ver a <strong>ficha do cliente</strong>: dados, contatos, links para AdvBox, ChatGuru, CRM e pasta de documentos, atendimentos, audiências e o histórico — tudo em uma tela.
      ${!podeVerClientes() ? ' Você está vendo apenas os clientes pelos quais é responsável.' : ''}
    </div>
    ${avisoMigracaoClientesHTML()}
    ${state.formCliente && state.formCliente.modo === 'novo' ? formClienteHTML() : ''}
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:14px; margin-bottom:16px;">
      ${metricCard('Clientes', qtdClientes)}
      ${metricCard('Prospects', qtdProspects)}
      ${metricCard('Prospects com contato vencido/hoje', qtdContatoVencido, 'Data de "próximo contato" já chegou.')}
      ${metricCard('Sem responsável', qtdSemResponsavel)}
    </div>
    ${filtrosClientesBar()}
    ${state.gerenciarEtiquetasClienteAberto ? painelEtiquetasClienteHTML() : ''}
    <div id="clientesLista">${listaClientesHTML()}</div>
  `;
}

/* ================= TELA: FICHA DO CLIENTE ================= */
function linkSistemaClienteHTML(url, rotulo, iconeFa) {
  if (!url) return `<span class="status-pill" style="background:var(--surface-2); color:var(--text-3);" title="Link não informado — adicione em Editar"><i class="fa-solid ${iconeFa}" style="font-size:10px;"></i> ${rotulo}: não informado</span>`;
  return `<a class="btn-brass" href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; font-size:12px; padding:7px 12px;"><i class="fa-solid ${iconeFa}"></i> ${rotulo} <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:10px;"></i></a>`;
}
function linhaAtendimentoClienteHTML(a, c, candidato) {
  const podeAbrir = podeVerPainelEficiencia();
  const tempo = calcMinutosEntre(a.iniciadoEm, a.primeiraRespostaEm);
  return `
    <div class="aviso-row" ${podeAbrir ? `onclick="abrirAtendimentoDoCliente(${jsArg(a.id)})" style="cursor:pointer;"` : ''}>
      <div class="priority-bar" style="background:${statusAtendimentoChatCor(a.status)};"></div>
      <div style="flex:1;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <div style="font-size:13px; font-weight:700;">${esc(formatarDataBR(isoParaDiaLocal(a.iniciadoEm)))} ${esc(isoParaHoraLocal(a.iniciadoEm))} — ${esc(a.colaborador || 'Colaborador')}</div>
          <span class="status-pill" style="background:${statusAtendimentoChatCor(a.status)}22; color:${statusAtendimentoChatCor(a.status)};">${esc(statusAtendimentoChatLabel(a.status))}</span>
          ${a.resolucao && a.resolucao !== 'pendente' && RESOLUCAO_ATENDIMENTO_INFO[a.resolucao] ? `<span class="status-pill" style="background:${RESOLUCAO_ATENDIMENTO_INFO[a.resolucao].cor}22; color:${RESOLUCAO_ATENDIMENTO_INFO[a.resolucao].cor};">${RESOLUCAO_ATENDIMENTO_INFO[a.resolucao].emoji} ${esc(RESOLUCAO_ATENDIMENTO_INFO[a.resolucao].label)}</span>` : ''}
        </div>
        <div class="mono" style="font-size:10.5px; color:var(--text-3); margin-top:3px;">${esc(a.setor || '')}${nomeEquipeDoAtendimento(a) ? ' · ' + esc(nomeEquipeDoAtendimento(a)) : ''}${tempo !== null ? ' · tempo de resposta ' + esc(formatarDuracaoMin(tempo)) : ''}${candidato ? ` · registrado como "${esc(a.cliente)}"` : ''}</div>
      </div>
      ${candidato && podeGerenciarAtendimentoChat(a) ? `<button class="admin-add-btn" style="margin-top:0; align-self:center;" onclick="event.stopPropagation(); vincularAtendimentoAoCliente(${jsArg(a.id)}, ${jsArg(c.id)})"><i class="fa-solid fa-link"></i> Vincular</button>` : ''}
    </div>
  `;
}
function renderClienteDetalhe() {
  const c = clientesVisiveis().find(x => x.id === state.clienteAtivoId);
  if (!c) { state.clienteAtivoId = null; renderClientesView(); return; }
  const podeEditar = podeEditarCliente(c);
  const { vinculados, porNome } = atendimentosDoCliente(c);
  const todos = [...vinculados, ...porNome];
  const emAberto = todos.filter(a => !a.finalizadoEm).length;
  const resolvidos = todos.filter(a => a.resolucao === 'resolvida').length;
  const tempoMedio = calcTempoMedioMin(todos, 'iniciadoEm', 'primeiraRespostaEm');
  const avaliacoes = state.avaliacoesQualidade.filter(av => av.atendimentoChatId && todos.some(a => a.id === av.atendimentoChatId));
  const notaMedia = avaliacoes.length ? Math.round((avaliacoes.reduce((acc, av) => acc + mediaAvaliacaoQualidade(av), 0) / avaliacoes.length) * 10) / 10 : null;
  const eventos = eventosDoCliente(c.id);
  const aud = state.audienciasCliente.clienteId === c.id ? state.audienciasCliente : { lista: [], carregando: true };
  const vencido = prospectComContatoVencido(c);
  const whatsapp = linkWhatsappCliente(c.telefone);
  const editandoAqui = state.formCliente && state.formCliente.modo === 'editar' && state.formCliente.id === c.id;

  document.getElementById('content').innerHTML = `
    <button class="open-btn" style="margin-bottom:10px;" onclick="voltarListaClientes()"><i class="fa-solid fa-arrow-left"></i> Voltar à lista de clientes</button>

    ${editandoAqui ? formClienteHTML() : `
    <div class="card" style="padding:22px; margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
        <div style="min-width:0;">
          <div style="font-size:11px; font-weight:800; letter-spacing:.06em; color:var(--text-3); margin-bottom:4px;">FICHA DO ${c.tipo === 'cliente' ? 'CLIENTE' : 'PROSPECT'}</div>
          <div style="font-size:21px; font-weight:800;">${esc(c.nome)}</div>
          <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">${tipoPillCliente(c.tipo)} ${etiquetasChipsHTML(c.etiquetaIds)}</div>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${podeEditar && c.tipo === 'prospect' ? `<button class="admin-add-btn" style="margin-top:0;" onclick="converterEmCliente(${jsArg(c.id)})"><i class="fa-solid fa-handshake"></i> Converter em cliente</button>` : ''}
          ${podeEditar ? `<button class="admin-edit-btn" title="Editar cadastro" onclick="editarCliente(${jsArg(c.id)})" style="width:36px; height:36px;"><i class="fa-solid fa-pen"></i></button>` : ''}
          ${podeExcluirCliente() ? `<button class="admin-del-btn" title="Excluir cadastro" onclick="removerCliente(${jsArg(c.id)})" style="width:36px; height:36px;"><i class="fa-solid fa-trash"></i></button>` : ''}
        </div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px,1fr)); gap:10px 14px; margin-top:18px; font-size:12.5px; color:var(--text-2); line-height:1.7;">
        <div><strong>${c.pessoa === 'juridica' ? 'CNPJ' : 'CPF'}:</strong> ${esc(c.documento ? formatarDocumento(c.documento) : '—')}</div>
        <div><strong>Telefone:</strong> ${c.telefone ? `<a href="${esc(safeUrl('tel:' + somenteDigitos(c.telefone)))}" style="color:var(--brass); font-weight:600; text-decoration:none;">${esc(c.telefone)}</a>` : '—'}
          ${whatsapp ? `<a href="${esc(whatsapp)}" target="_blank" rel="noopener noreferrer" title="Abrir conversa no WhatsApp" style="margin-left:6px; color:#25A244; font-weight:600; text-decoration:none;"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>` : ''}</div>
        <div><strong>E-mail:</strong> ${c.email ? `<a href="${esc(safeUrl('mailto:' + c.email))}" style="color:var(--brass); font-weight:600; text-decoration:none;">${esc(c.email)}</a>` : '—'}</div>
        <div><strong>Responsável:</strong> ${esc(nomeResponsavelCliente(c.responsavelId) || '—')}</div>
        <div><strong>Carteira:</strong> ${esc(nomeCarteiraCliente(c.carteiraId) || '—')}</div>
        <div><strong>Origem:</strong> ${esc(c.origem || '—')}</div>
        ${c.tipo === 'cliente' ? `<div style="grid-column:1 / -1;"><strong>Endereço:</strong> ${esc(c.endereco || '—')}</div>` : `
          <div style="grid-column:span 2;"><strong>Interesse:</strong> ${esc(c.interesse || '—')}</div>
          <div><strong>Próximo contato:</strong> <span style="${vencido ? 'color:var(--danger); font-weight:700;' : ''}">${esc(c.proximoContato ? formatarDataBR(c.proximoContato) : '—')}${vencido ? ' (vencido/hoje)' : ''}</span></div>`}
        <div><strong>Cadastrado em:</strong> ${esc(c.criadoEm ? formatarDataBR(isoParaDiaLocal(c.criadoEm)) : '—')}</div>
        ${c.convertidoEm ? `<div><strong>Virou cliente em:</strong> ${esc(formatarDataBR(isoParaDiaLocal(c.convertidoEm)))}</div>` : ''}
      </div>
      ${c.observacoes ? `<div style="font-size:12px; color:var(--text-2); margin-top:12px; padding:10px 12px; background:var(--surface-2); border-radius:8px;"><strong>Observações:</strong> ${esc(c.observacoes)}</div>` : ''}
      <div style="font-size:11px; font-weight:800; letter-spacing:.05em; color:var(--text-3); margin:18px 0 8px;">SISTEMAS DO CLIENTE</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        ${linkSistemaClienteHTML(c.linkAdvbox, 'AdvBox', 'fa-gavel')}
        ${linkSistemaClienteHTML(c.linkChatguru, 'ChatGuru', 'fa-comments')}
        ${linkSistemaClienteHTML(c.linkCrm, 'CRM comercial', 'fa-address-card')}
        ${linkSistemaClienteHTML(c.linkPasta, 'Pasta de documentos', 'fa-folder-open')}
      </div>
    </div>`}

    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:14px; margin-bottom:16px;">
      ${metricCard('Atendimentos', todos.length)}
      ${metricCard('Em aberto', emAberto, 'Ainda não encerrados.')}
      ${metricCard('Resolvidos', resolvidos)}
      ${metricCard('Tempo médio de resposta', tempoMedio === null ? 'Sem dados suficientes' : formatarDuracaoMin(tempoMedio))}
      ${metricCard('Avaliação média', notaMedia === null ? 'Sem dados suficientes' : notaMedia.toFixed(1) + ' / 10')}
    </div>

    <div class="card" style="overflow:hidden; margin-bottom:20px;">
      <div style="padding:14px 16px; font-weight:700; font-size:13px; border-bottom:1px solid var(--border);">Atendimentos <span style="font-weight:600; color:var(--text-3);">(${vinculados.length})</span></div>
      ${vinculados.length ? vinculados.map(a => linhaAtendimentoClienteHTML(a, c, false)).join('') : `<div style="padding:16px; font-size:12px; color:var(--text-3);">Nenhum atendimento vinculado a este cadastro ainda.</div>`}
      ${porNome.length ? `
        <div style="padding:12px 16px; font-size:12px; background:var(--surface-2); border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
          <span><i class="fa-solid fa-circle-info" style="color:var(--brass);"></i> <strong>${porNome.length}</strong> atendimento${porNome.length === 1 ? '' : 's'} antigo${porNome.length === 1 ? '' : 's'} com o mesmo nome, ainda sem vínculo com este cadastro.</span>
          ${porNome.some(podeGerenciarAtendimentoChat) ? `<button class="admin-add-btn" style="margin-top:0;" onclick="vincularTodosAtendimentosAoCliente(${jsArg(c.id)})"><i class="fa-solid fa-link"></i> Vincular todos</button>` : ''}
        </div>
        ${porNome.map(a => linhaAtendimentoClienteHTML(a, c, true)).join('')}
      ` : ''}
      ${todos.length && !podeVerPainelEficiencia() ? `<div style="padding:10px 16px; font-size:10.5px; color:var(--text-3); border-top:1px solid var(--border);">O detalhe completo de cada atendimento fica no painel de Eficiência, disponível para gestores e administradores.</div>` : ''}
    </div>

    <div class="card" style="overflow:hidden; margin-bottom:20px;">
      <div style="padding:14px 16px; font-weight:700; font-size:13px; border-bottom:1px solid var(--border);">Audiências</div>
      ${aud.carregando ? `<div style="padding:16px; font-size:12px; color:var(--text-3);"><i class="fa-solid fa-spinner fa-spin"></i> Carregando audiências...</div>`
        : aud.lista.length ? aud.lista.map(a => `
          <div class="aviso-row">
            <div class="priority-bar" style="background:${a.status === 'Confirmada' ? 'var(--success)' : 'var(--danger)'};"></div>
            <div style="flex:1;">
              <div style="font-size:13px; font-weight:700;">${esc(formatarDataBR(a.data))} às ${esc(a.hora)} <span class="status-pill" style="margin-left:6px; ${a.status !== 'Confirmada' ? 'background:var(--danger-soft); color:var(--danger);' : ''}">${esc(a.status)}</span></div>
              <div class="mono" style="font-size:10.5px; color:var(--text-3); margin-top:3px;">${esc(a.advogado || 'Advogado não informado')}${!a.clienteId ? ` · registrada como "${esc(a.cliente)}"` : ''}</div>
            </div>
            ${!a.clienteId && isFullBypassAdmin() ? `<button class="admin-add-btn" style="margin-top:0; align-self:center;" onclick="vincularAudienciaAoCliente(${jsArg(a.id)}, ${jsArg(c.id)})"><i class="fa-solid fa-link"></i> Vincular</button>` : ''}
          </div>`).join('')
        : `<div style="padding:16px; font-size:12px; color:var(--text-3);">Nenhuma audiência encontrada para este cliente.</div>`}
    </div>

    <div class="card" style="padding:18px; margin-bottom:24px;">
      <div style="font-weight:700; font-size:13px; margin-bottom:12px;">Histórico do cadastro</div>
      ${eventos.length ? eventos.map(e => `
        <div style="display:flex; gap:12px; padding:7px 0; border-bottom:1px solid var(--border);">
          <div class="mono" style="font-size:10.5px; color:var(--text-3); width:112px; flex-shrink:0;">${esc(formatarDataBR(isoParaDiaLocal(e.ocorridoEm)))} ${esc(isoParaHoraLocal(e.ocorridoEm))}</div>
          <div style="font-size:12.5px;">${esc(e.evento)}${e.autorId ? ` <span style="color:var(--text-3);">— ${esc(nomeResponsavelCliente(e.autorId))}</span>` : ''}</div>
        </div>`).join('') : `<div style="font-size:12px; color:var(--text-3);">Sem eventos registrados.</div>`}
    </div>
  `;
}
