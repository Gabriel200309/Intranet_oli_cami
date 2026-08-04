/* ================= CALCULADORA =================
   Importante sobre os inputs: os campos de digitação (valor, %, etc.) NUNCA
   disparam um re-render da área que os contém — isso é o que fazia o campo
   "fechar" a cada tecla digitada. Cada aba tem uma área de resultado
   separada (com id próprio) que é atualizada sozinha, sem tocar nos campos
   que o usuário está digitando.
*/
function setCalcTab(tab) { state.calc.tab = tab; renderCalculadoraView(); }

/* --- Aba 1: Gestão de Passivo --- */
function addDivida() { state.calc.dividas.push({ id: uid('div'), tipo: 'bancaria', valor: 0, pct: 0 }); renderCalculadoraView(); }
function removeDivida(id) {
  state.calc.dividas = state.calc.dividas.filter(d => d.id !== id);
  if (!state.calc.dividas.length) state.calc.dividas.push({ id: uid('div'), tipo: 'bancaria', valor: 0, pct: 0 });
  renderCalculadoraView();
}
function updateDivida(id, field, value) {
  const d = state.calc.dividas.find(x => x.id === id);
  if (!d) return;
  d[field] = value;
  if (field === 'tipo') renderCalculadoraView(); // select (onchange) — troca discreta, pode redesenhar tudo
  else refreshPassivoResumo(); // input de texto/número — só atualiza o resumo, sem tocar nos campos
}
function updateEntradaPassivo(value) { state.calc.entradaPctPassivo = value; refreshPassivoResumo(); }
function calcPassivo() {
  const c = state.calc;
  const rows = c.dividas.map(d => ({ ...d, honorario: (Number(d.valor) || 0) * (Number(d.pct) || 0) / 100 }));
  const totalDividas = rows.reduce((s, d) => s + (Number(d.valor) || 0), 0);
  const honorarioTotal = rows.reduce((s, d) => s + d.honorario, 0);
  const entrada = honorarioTotal * (Number(c.entradaPctPassivo) || 0) / 100;
  const parcela12x = (honorarioTotal - entrada) / 12;
  return { rows, totalDividas, honorarioTotal, entrada, parcela12x };
}
function passivoResumoHTML() {
  const p = calcPassivo();
  return `
    <div class="admin-section-label" style="margin-top:0;">Resumo por dívida</div>
    <table style="width:100%; border-collapse:collapse; font-size:12.5px; margin-bottom:18px;">
      <thead><tr style="text-align:left; color:var(--text-3); font-size:10.5px; text-transform:uppercase;">
        <th style="padding:6px 8px;">Tipo</th><th style="padding:6px 8px;">Valor da dívida</th><th style="padding:6px 8px;">% Honorário</th><th style="padding:6px 8px;">Honorário</th>
      </tr></thead>
      <tbody>
        ${p.rows.map(d => `
          <tr style="border-top:1px solid var(--border);">
            <td style="padding:8px;">${esc((TIPOS_DIVIDA.find(t=>t.valor===d.tipo)||{}).label || '')}</td>
            <td style="padding:8px;" class="mono">${currency(Number(d.valor)||0)}</td>
            <td style="padding:8px;" class="mono">${Number(d.pct)||0}%</td>
            <td style="padding:8px;" class="mono">${currency(d.honorario)}</td>
          </tr>`).join('')}
        <tr style="border-top:2px solid var(--border); font-weight:800;">
          <td style="padding:8px;">Total</td>
          <td style="padding:8px;" class="mono">${currency(p.totalDividas)}</td>
          <td></td>
          <td style="padding:8px; color:var(--brass);" class="mono">${currency(p.honorarioTotal)}</td>
        </tr>
      </tbody>
    </table>
    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px;">
      <div style="padding:14px; background:var(--surface-2); border-radius:10px; border:1px solid var(--border);"><div style="font-size:10.5px; font-weight:800; color:var(--text-3); text-transform:uppercase; margin-bottom:6px;">Total das dívidas</div><div class="mono" style="font-size:17px; font-weight:800;">${currency(p.totalDividas)}</div></div>
      <div style="padding:14px; background:var(--surface-2); border-radius:10px; border:1px solid var(--border);"><div style="font-size:10.5px; font-weight:800; color:var(--text-3); text-transform:uppercase; margin-bottom:6px;">Entrada (${state.calc.entradaPctPassivo}%)</div><div class="mono" style="font-size:17px; font-weight:800;">${currency(p.entrada)}</div></div>
      <div style="padding:14px; background:var(--surface-2); border-radius:10px; border:1px solid var(--border);"><div style="font-size:10.5px; font-weight:800; color:var(--text-3); text-transform:uppercase; margin-bottom:6px;">12x de</div><div class="mono" style="font-size:17px; font-weight:800;">${currency(p.parcela12x)}</div></div>
      <div style="padding:14px; background:var(--brass-soft); border-radius:10px; border:1px solid var(--brass);"><div style="font-size:10.5px; font-weight:800; color:var(--brass); text-transform:uppercase; margin-bottom:6px;">Honorário total</div><div class="mono" style="font-size:17px; font-weight:800; color:var(--brass);">${currency(p.honorarioTotal)}</div></div>
    </div>
    <div style="font-size:11px; color:var(--text-3); margin-top:14px;"><i class="fa-solid fa-circle-info"></i> Fórmula: Honorário = % × valor da dívida · Entrada = % de entrada sobre o honorário total · Restante ÷ 12 parcelas.</div>
  `;
}
function refreshPassivoResumo() {
  const el = document.getElementById('passivoResumo');
  if (el) el.innerHTML = passivoResumoHTML();
}
function renderPassivoTab() {
  return `
    <div class="admin-section-label" style="margin-top:0;">Dívidas do cliente</div>
    <div style="overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse; font-size:12.5px; margin-bottom:6px;">
        <thead><tr style="text-align:left; color:var(--text-3); font-size:10.5px; text-transform:uppercase; letter-spacing:.04em;">
          <th style="padding:6px 8px; font-weight:800;">Tipo</th>
          <th style="padding:6px 8px; font-weight:800;">Valor (R$)</th>
          <th style="padding:6px 8px; font-weight:800;">% Honorário</th>
          <th style="padding:6px 8px; font-weight:800;">Faixa recomendada</th>
          <th style="padding:6px 8px;"></th>
        </tr></thead>
        <tbody>
          ${state.calc.dividas.map(d => {
            const tipoInfo = TIPOS_DIVIDA.find(t => t.valor === d.tipo) || TIPOS_DIVIDA[0];
            return `
            <tr style="border-top:1px solid var(--border);">
              <td style="padding:8px;">
                <select onchange="updateDivida('${d.id}','tipo',this.value)" style="border:1px solid var(--border); background:var(--surface-2); border-radius:8px; padding:7px 8px; font-size:12.5px; color:var(--text); font-family:inherit;">
                  ${TIPOS_DIVIDA.map(t => `<option value="${t.valor}" ${t.valor===d.tipo?'selected':''}>${esc(t.label)}</option>`).join('')}
                </select>
              </td>
              <td style="padding:8px;"><input type="number" step="0.01" value="${d.valor}" oninput="updateDivida('${d.id}','valor',this.value)" style="width:120px; border:1px solid var(--border); background:var(--surface-2); border-radius:8px; padding:7px 8px; font-size:12.5px; color:var(--text); font-family:inherit;"></td>
              <td style="padding:8px;"><input type="number" step="0.1" value="${d.pct}" oninput="updateDivida('${d.id}','pct',this.value)" style="width:80px; border:1px solid var(--border); background:var(--surface-2); border-radius:8px; padding:7px 8px; font-size:12.5px; color:var(--text); font-family:inherit;"> %</td>
              <td style="padding:8px; color:var(--text-3);" class="mono">${esc(tipoInfo.faixa)}</td>
              <td style="padding:8px;">${state.calc.dividas.length>1 ? `<button class="admin-del-btn" onclick="removeDivida('${d.id}')" title="Remover"><i class="fa-solid fa-xmark" style="font-size:11px;"></i></button>` : ''}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <button class="admin-cancel-btn" style="margin-bottom:18px;" onclick="addDivida()"><i class="fa-solid fa-plus"></i> Adicionar dívida</button>

    <div style="padding:14px 16px; background:var(--brass-soft); border-radius:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:20px;">
      <span style="font-size:12.5px; font-weight:700;">% de entrada sobre o honorário total</span>
      <div><input type="number" step="1" value="${state.calc.entradaPctPassivo}" oninput="updateEntradaPassivo(this.value)" style="width:70px; border:1px solid var(--border); background:var(--surface); border-radius:8px; padding:7px 8px; font-size:12.5px; text-align:center; font-family:inherit;"> %</div>
    </div>

    <div id="passivoResumo">${passivoResumoHTML()}</div>
  `;
}

/* --- Aba 2: Aditivo Contratual --- */
function updateAditivo(field, value) {
  state.calc.aditivo[field] = value;
  if (field === 'perfil') renderCalculadoraView(); // select (onchange) — troca discreta
  else refreshAditivoResumo(); // input de texto/número — só atualiza o resumo
}
function calcAditivo() {
  const a = state.calc.aditivo;
  const honorarioBruto = (Number(a.novasDividas) || 0) * (Number(a.pctNovasDividas) || 0) / 100;
  const perfil = PERFIS_CLIENTE.find(p => p.valor === a.perfil) || PERFIS_CLIENTE[1];
  const descontoPerfilValor = honorarioBruto * perfil.desconto / 100;
  const descontoAdicionalPctValor = honorarioBruto * (Number(a.descontoPct) || 0) / 100;
  const descontoAdicionalFixoValor = Number(a.descontoFixo) || 0;
  const valorAditivo = Math.max(0, honorarioBruto - descontoPerfilValor - descontoAdicionalPctValor - descontoAdicionalFixoValor);
  const entrada = valorAditivo * (Number(a.entradaPct) || 0) / 100;
  const parcelaAditivo12x = (valorAditivo - entrada) / 12;
  const novaParcelaTotal = (Number(a.parcelaAtual) || 0) + parcelaAditivo12x;
  return { honorarioBruto, perfil, descontoPerfilValor, descontoAdicionalPctValor, descontoAdicionalFixoValor, valorAditivo, entrada, parcelaAditivo12x, novaParcelaTotal };
}
function aditivoResultadoTopHTML() {
  const a = state.calc.aditivo;
  const r = calcAditivo();
  return `
    <div class="admin-section-label" style="margin-top:0;">Resultado do aditivo</div>
    <div style="border:1px solid var(--border); border-radius:10px; padding:14px 16px;">
      <div style="display:flex; justify-content:space-between; font-size:12.5px; padding:6px 0; border-bottom:1px solid var(--border);"><span>Honorário bruto (${(Number(a.pctNovasDividas)||0).toFixed(2)}% × ${currency(Number(a.novasDividas)||0)})</span><span class="mono" style="font-weight:700;">${currency(r.honorarioBruto)}</span></div>
      <div style="display:flex; justify-content:space-between; font-size:12.5px; padding:6px 0; border-bottom:1px solid var(--border);"><span>Desconto por perfil (${esc(r.perfil.label.split('—')[0].trim())})</span><span class="mono" style="font-weight:700; color:var(--success);">− ${currency(r.descontoPerfilValor)}</span></div>
      ${(Number(a.descontoPct)||0) > 0 ? `<div style="display:flex; justify-content:space-between; font-size:12.5px; padding:6px 0; border-bottom:1px solid var(--border);"><span>Desconto adicional (${a.descontoPct}%)</span><span class="mono" style="font-weight:700; color:var(--success);">− ${currency(r.descontoAdicionalPctValor)}</span></div>` : ''}
      ${(Number(a.descontoFixo)||0) > 0 ? `<div style="display:flex; justify-content:space-between; font-size:12.5px; padding:6px 0; border-bottom:1px solid var(--border);"><span>Desconto adicional (fixo)</span><span class="mono" style="font-weight:700; color:var(--success);">− ${currency(r.descontoAdicionalFixoValor)}</span></div>` : ''}
      <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:800; padding-top:8px;"><span>Valor do aditivo</span><span class="mono" style="color:var(--brass);">${currency(r.valorAditivo)}</span></div>
    </div>
  `;
}
function aditivoResultadoCardsHTML() {
  const a = state.calc.aditivo;
  const r = calcAditivo();
  return `
    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px;">
      <div style="padding:14px; background:var(--surface-2); border-radius:10px; border:1px solid var(--border);"><div style="font-size:10.5px; font-weight:800; color:var(--text-3); text-transform:uppercase; margin-bottom:6px;">Valor do aditivo</div><div class="mono" style="font-size:17px; font-weight:800;">${currency(r.valorAditivo)}</div></div>
      <div style="padding:14px; background:var(--surface-2); border-radius:10px; border:1px solid var(--border);"><div style="font-size:10.5px; font-weight:800; color:var(--text-3); text-transform:uppercase; margin-bottom:6px;">Entrada (${a.entradaPct}%)</div><div class="mono" style="font-size:17px; font-weight:800;">${currency(r.entrada)}</div></div>
      <div style="padding:14px; background:var(--surface-2); border-radius:10px; border:1px solid var(--border);"><div style="font-size:10.5px; font-weight:800; color:var(--text-3); text-transform:uppercase; margin-bottom:6px;">Parcela do aditivo (12x)</div><div class="mono" style="font-size:17px; font-weight:800;">${currency(r.parcelaAditivo12x)}</div></div>
      <div style="padding:14px; background:rgba(47,158,110,.12); border-radius:10px; border:1px solid var(--success);"><div style="font-size:10.5px; font-weight:800; color:var(--success); text-transform:uppercase; margin-bottom:6px;">Nova parcela total</div><div class="mono" style="font-size:17px; font-weight:800; color:var(--success);">${currency(r.novaParcelaTotal)}</div></div>
    </div>
  `;
}
function refreshAditivoResumo() {
  const top = document.getElementById('aditivoResultadoTop');
  const cards = document.getElementById('aditivoResultadoCards');
  if (top) top.innerHTML = aditivoResultadoTopHTML();
  if (cards) cards.innerHTML = aditivoResultadoCardsHTML();
}
function renderAditivoTab() {
  const a = state.calc.aditivo;
  return `
    <div class="admin-section-label" style="margin-top:0;">Contrato atual (já contratado)</div>
    <div class="form-grid" style="grid-template-columns:1fr 1fr;">
      <div class="form-field"><label>Total das dívidas já contratadas (R$)</label><input type="number" step="0.01" value="${a.totalContratado}" oninput="updateAditivo('totalContratado', this.value)" placeholder="Ex: 1.000.000"></div>
      <div class="form-field"><label>Parcela mensal atual (R$)</label><input type="number" step="0.01" value="${a.parcelaAtual}" oninput="updateAditivo('parcelaAtual', this.value)" placeholder="Ex: 2.000"></div>
    </div>

    <div class="admin-section-label">Novas dívidas (aditivo)</div>
    <div class="form-grid" style="grid-template-columns:1fr 1fr;">
      <div class="form-field"><label>Valor das novas dívidas (R$)</label><input type="number" step="0.01" value="${a.novasDividas}" oninput="updateAditivo('novasDividas', this.value)" placeholder="Ex: 500.000"></div>
      <div class="form-field"><label>% honorário sobre as novas dívidas</label><input type="number" step="0.1" value="${a.pctNovasDividas}" oninput="updateAditivo('pctNovasDividas', this.value)"></div>
    </div>

    <div class="admin-section-label">Perfil do cliente</div>
    <div class="form-grid" style="grid-template-columns:1fr 1fr;">
      <div class="form-field" style="grid-column:span 2;"><label>Relacionamento</label>
        <select onchange="updateAditivo('perfil', this.value)">
          ${PERFIS_CLIENTE.map(p => `<option value="${p.valor}" ${p.valor===a.perfil?'selected':''}>${esc(p.label)}</option>`).join('')}
        </select>
      </div>
      <div class="form-field"><label>Desconto adicional (%)</label><input type="number" step="0.1" value="${a.descontoPct}" oninput="updateAditivo('descontoPct', this.value)"></div>
      <div class="form-field"><label>Desconto adicional (R$ fixo)</label><input type="number" step="0.01" value="${a.descontoFixo}" oninput="updateAditivo('descontoFixo', this.value)"></div>
    </div>

    <div id="aditivoResultadoTop" style="margin-bottom:16px;">${aditivoResultadoTopHTML()}</div>

    <div style="padding:14px 16px; background:var(--brass-soft); border-radius:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:20px;">
      <span style="font-size:12.5px; font-weight:700;">% de entrada sobre o honorário do aditivo</span>
      <div><input type="number" step="1" value="${a.entradaPct}" oninput="updateAditivo('entradaPct', this.value)" style="width:70px; border:1px solid var(--border); background:var(--surface); border-radius:8px; padding:7px 8px; font-size:12.5px; text-align:center; font-family:inherit;"> %</div>
    </div>

    <div id="aditivoResultadoCards">${aditivoResultadoCardsHTML()}</div>
  `;
}

/* --- Aba 3: Assessoria Global --- */
function selectPlano(id) { state.calc.assessoria.plano = id; renderCalculadoraView(); }
function updateAssessoria(field, value) { state.calc.assessoria[field] = value; refreshAssessoriaResumo(); }
function toggleComoCalculado() { state.calc.assessoria.mostrarComo = !state.calc.assessoria.mostrarComo; refreshAssessoriaResumo(); }

/* edição do valor base de cada plano (somente administradores) */
function editPlano(id, ev) { if (ev) ev.stopPropagation(); state.editing.plano = id; renderCalculadoraView(); }
function cancelEditPlano(ev) { if (ev) ev.stopPropagation(); state.editing.plano = null; renderCalculadoraView(); }
function savePlano(id, ev) {
  if (ev) ev.stopPropagation();
  const novoBase = Number(val('plano-base-' + id));
  const p = state.calc.planos.find(x => x.id === id);
  if (p && !isNaN(novoBase)) p.base = novoBase;
  state.editing.plano = null;
  showToast('Valor do plano atualizado!');
  renderCalculadoraView();
}

function calcAssessoria() {
  const as = state.calc.assessoria;
  const plano = as.plano ? (state.calc.planos.find(p => p.id === as.plano) || null) : null;
  const ff = fatorFaturamento(Number(as.faturamento) || 0);
  const fe = fatorEstrutura(Number(as.funcionarios) || 0);
  const media = (ff + fe) / 2;
  const honorarioFinal = plano ? plano.base * media : null;
  const pagariaPassivo = Number(as.pagariaPassivo) || 0;
  const diff = (honorarioFinal !== null && pagariaPassivo > 0) ? honorarioFinal - pagariaPassivo : null;
  return { plano, ff, fe, media, honorarioFinal, diff };
}
function assessoriaResumoHTML() {
  const as = state.calc.assessoria;
  const r = calcAssessoria();
  return `
    <div class="admin-section-label" style="margin-top:0;">Resultado</div>
    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:14px;">
      <div style="padding:14px; background:var(--surface-2); border-radius:10px; border:1px solid var(--border);"><div style="font-size:10.5px; font-weight:800; color:var(--text-3); text-transform:uppercase; margin-bottom:6px;">Valor base</div><div class="mono" style="font-size:17px; font-weight:800;">${r.plano ? currency(r.plano.base) : '—'}</div></div>
      <div style="padding:14px; background:var(--surface-2); border-radius:10px; border:1px solid var(--border);"><div style="font-size:10.5px; font-weight:800; color:var(--text-3); text-transform:uppercase; margin-bottom:6px;">Fator faturamento (FF)</div><div class="mono" style="font-size:17px; font-weight:800;">${r.ff.toFixed(2)}</div></div>
      <div style="padding:14px; background:var(--surface-2); border-radius:10px; border:1px solid var(--border);"><div style="font-size:10.5px; font-weight:800; color:var(--text-3); text-transform:uppercase; margin-bottom:6px;">Fator estrutura (FE)</div><div class="mono" style="font-size:17px; font-weight:800;">${r.fe.toFixed(2)}</div></div>
      <div style="padding:14px; background:var(--surface-2); border-radius:10px; border:1px solid var(--border);"><div style="font-size:10.5px; font-weight:800; color:var(--text-3); text-transform:uppercase; margin-bottom:6px;">(FF + FE) / 2</div><div class="mono" style="font-size:17px; font-weight:800;">${r.media.toFixed(2)}</div></div>
    </div>
    <div style="padding:16px; background:${r.plano ? 'var(--brass-soft)' : 'var(--surface-2)'}; border-radius:10px; border:1px solid ${r.plano ? 'var(--brass)' : 'var(--border)'}; display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
      <span style="font-size:12.5px; font-weight:800; color:${r.plano ? 'var(--brass)' : 'var(--text-3)'}; text-transform:uppercase;">Honorário final</span>
      <span class="mono" style="font-size:22px; font-weight:800; color:${r.plano ? 'var(--brass)' : 'var(--text-3)'};">${r.honorarioFinal !== null ? currency(r.honorarioFinal) : '—'}</span>
    </div>
    ${!r.plano ? `<div style="font-size:12px; color:var(--text-3); margin-bottom:10px;"><i class="fa-solid fa-circle-info"></i> Nenhum plano selecionado — escolha um plano acima para calcular o honorário final.</div>` : ''}
    ${r.diff !== null ? `<div style="font-size:12px; color:var(--text-2); margin-bottom:10px;">${r.diff >= 0 ? currency(r.diff)+' a mais' : currency(Math.abs(r.diff))+' a menos'} do que o valor informado na Gestão de Passivo.</div>` : ''}

    <button onclick="toggleComoCalculado()" style="background:none; border:none; padding:0; font-size:12px; font-weight:700; color:var(--brass); cursor:pointer; display:flex; align-items:center; gap:5px;">
      <i class="fa-solid fa-chevron-${as.mostrarComo?'down':'right'}" style="font-size:10px;"></i> Como é calculado?
    </button>
    ${as.mostrarComo ? `
      <div style="font-size:11.5px; color:var(--text-2); margin-top:10px; line-height:1.6; background:var(--surface-2); border:1px solid var(--border); border-radius:10px; padding:14px;">
        <strong>Honorário final = Valor base do plano × (FF + FE) ÷ 2</strong><br><br>
        <strong>FF</strong> (faturamento mensal): até R$200 mil → 1,00 · até R$500 mil → 1,15 · até R$1 mi → 1,30 · até R$2 mi → 1,50 · até R$5 mi → 1,75 · até R$10 mi → 2,00 · acima de R$10 mi → 2,25.<br>
        <strong>FE</strong> (nº de funcionários): até 4 → 1,00 · até 9 → 1,50 · até 19 → 2,00 · até 39 → 2,50 · acima de 39 → 3,00.
      </div>
    ` : ''}
  `;
}
function refreshAssessoriaResumo() {
  const el = document.getElementById('assessoriaResumo');
  if (el) el.innerHTML = assessoriaResumoHTML();
}
function renderAssessoriaTab() {
  const as = state.calc.assessoria;
  return `
    <div class="admin-section-label" style="margin-top:0;">Selecione o plano</div>
    ${isAdmin() ? `<div style="font-size:11px; color:var(--text-3); margin-bottom:10px;"><i class="fa-solid fa-lock"></i> Como administrador, use o ícone de lápis em cada plano para editar o valor base.</div>` : ''}
    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px;">
      ${state.calc.planos.map(p => `
        <div onclick="selectPlano('${p.id}')" style="position:relative; text-align:left; cursor:pointer; padding:14px; border-radius:10px; border:1px solid ${as.plano===p.id?'var(--brass)':'var(--border)'}; background:${as.plano===p.id?'var(--brass-soft)':'var(--surface)'};">
          ${isAdmin() && state.editing.plano !== p.id ? `<button onclick="editPlano('${p.id}', event)" title="Editar valor base" style="position:absolute; top:8px; right:8px; width:22px; height:22px; border-radius:6px; border:1px solid var(--border); background:var(--surface-2); display:flex; align-items:center; justify-content:center; color:var(--text-2);"><i class="fa-solid fa-pen" style="font-size:10px;"></i></button>` : ''}
          <div style="font-size:13.5px; font-weight:800; color:${as.plano===p.id?'var(--brass)':'var(--text)'};">${esc(p.nome)}</div>
          ${state.editing.plano === p.id ? `
            <div onclick="event.stopPropagation()" style="display:flex; gap:6px; align-items:center; margin-top:8px; flex-wrap:wrap;">
              <span style="font-size:11px; color:var(--text-3);">R$</span>
              <input id="plano-base-${p.id}" type="number" step="100" value="${p.base}" style="width:90px; border:1px solid var(--border); background:var(--surface-2); border-radius:6px; padding:5px 7px; font-size:12px; font-family:inherit;">
              <button onclick="savePlano('${p.id}', event)" class="admin-edit-btn" style="width:26px; height:26px;" title="Salvar"><i class="fa-solid fa-check" style="font-size:11px;"></i></button>
              <button onclick="cancelEditPlano(event)" class="admin-cancel-btn" style="padding:5px 9px; font-size:11px; margin-top:0;">Cancelar</button>
            </div>
          ` : `<div style="font-size:11.5px; color:var(--text-3); margin-top:2px;">Base: ${currency(p.base)}</div>`}
        </div>
      `).join('')}
      <div onclick="selectPlano(null)" style="cursor:pointer; padding:14px; border-radius:10px; border:1px dashed ${as.plano===null?'var(--brass)':'var(--border)'}; background:${as.plano===null?'var(--brass-soft)':'var(--surface)'}; display:flex; align-items:center; justify-content:center; text-align:center;">
        <div style="font-size:12.5px; font-weight:700; color:${as.plano===null?'var(--brass)':'var(--text-3)'};"><i class="fa-solid fa-ban"></i><br>Nenhum plano</div>
      </div>
    </div>

    <div class="admin-section-label">Parâmetros do cliente</div>
    <div class="form-grid" style="grid-template-columns:1fr 1fr;">
      <div class="form-field"><label>Faturamento mensal (R$)</label><input type="number" step="1000" value="${as.faturamento}" oninput="updateAssessoria('faturamento', this.value)"></div>
      <div class="form-field"><label>Número de funcionários</label><input type="number" step="1" value="${as.funcionarios}" oninput="updateAssessoria('funcionarios', this.value)"></div>
      <div class="form-field" style="grid-column:span 2;"><label>Quanto pagaria na Gestão de Passivo (R$) — opcional</label><input type="number" step="0.01" value="${as.pagariaPassivo}" oninput="updateAssessoria('pagariaPassivo', this.value)"></div>
    </div>

    <div id="assessoriaResumo">${assessoriaResumoHTML()}</div>
  `;
}

function renderCalculadoraView() {
  const c = state.calc;
  document.getElementById('content').innerHTML = `
    <div style="margin-bottom:14px;">
      <div class="section-title" style="margin-bottom:2px;"><i class="fa-solid fa-calculator"></i> Calculadora de Honorários</div>
      <div style="font-size:11.5px; color:var(--text-3);">Gestão de Passivo · Aditivo Contratual · Assessoria Global</div>
    </div>
    <div class="card" style="padding:0; overflow:hidden; max-width:920px;">
      <div style="display:flex; border-bottom:1px solid var(--border);">
        ${[['passivo','Gestão de Passivo'],['aditivo','Aditivo Contratual'],['assessoria','Assessoria Global']].map(([key,label]) => `
          <button onclick="setCalcTab('${key}')" style="flex:1; padding:16px 10px; border:none; background:transparent; cursor:pointer; font-weight:700; font-size:13px; color:${c.tab===key?'var(--brass)':'var(--text-2)'}; border-bottom:2px solid ${c.tab===key?'var(--brass)':'transparent'};">${label}</button>
        `).join('')}
      </div>
      <div style="padding:22px;">
        ${c.tab==='passivo' ? renderPassivoTab() : c.tab==='aditivo' ? renderAditivoTab() : renderAssessoriaTab()}
      </div>
    </div>
  `;
}

