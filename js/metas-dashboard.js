/* ================= PAINEL DE ACOMPANHAMENTO DE METAS =================
   Dashboard de metas: resumo geral, gráfico de progresso e cartões
   agrupados por tipo (Geral / Setor / Carteira). Respeita o mesmo
   controle de acesso por setor do restante do sistema — cada pessoa só
   acompanha as metas que tem permissão de ver (metaVisivelPara). */
function metasBarChartSvg(metas) {
  if (!metas.length) return '';
  const barH = 20, gap = 12, leftLabelW = 150, chartW = 320;
  const totalW = leftLabelW + chartW + 60;
  const height = metas.length * (barH + gap) + gap;
  const rows = metas.map((m, i) => {
    const p = Math.min(metaProgressoPct(m), 100);
    const y = gap + i * (barH + gap);
    const w = (p / 100) * chartW;
    const nomeCurto = m.nome.length > 22 ? m.nome.slice(0, 21) + '…' : m.nome;
    return `
      <text x="0" y="${y + barH / 2 + 4}" font-size="11" style="fill:var(--text-2); font-family:'Manrope',sans-serif;">${esc(nomeCurto)}</text>
      <rect x="${leftLabelW}" y="${y}" width="${chartW}" height="${barH}" rx="6" style="fill:var(--surface-2);"></rect>
      <rect x="${leftLabelW}" y="${y}" width="${Math.max(w,2)}" height="${barH}" rx="6" style="fill:${metaStatusCor(m.status)};"></rect>
      <text x="${leftLabelW + chartW + 10}" y="${y + barH / 2 + 4}" font-size="11" font-weight="700" style="fill:var(--text); font-family:'JetBrains Mono',monospace;">${metaProgressoPct(m)}%</text>
    `;
  }).join('');
  return `<svg viewBox="0 0 ${totalW} ${height}" style="width:100%; height:auto; max-width:560px; display:block;">${rows}</svg>`;
}
function renderMetasDashboardView() {
  const visiveis = metasVisiveis();
  const gerais = visiveis.filter(m => m.tipo === 'Geral');
  const setores = visiveis.filter(m => m.tipo === 'Setor');
  const carteiras = visiveis.filter(m => m.tipo === 'Carteira');
  const atingidas = visiveis.filter(m => m.status === 'Atingida').length;
  const naoAtingidas = visiveis.filter(m => m.status === 'Não atingida').length;

  function cardMeta(m) {
    const p = metaProgressoPct(m);
    return `
      <div class="card" style="padding:18px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:6px;">
          <div style="font-size:14px; font-weight:700;">${esc(m.nome)}</div>
          <span class="status-pill" style="background:${metaStatusCor(m.status)}22; color:${metaStatusCor(m.status)}; white-space:nowrap;">${esc(m.status)}</span>
        </div>
        <div style="font-size:12px; color:var(--text-2); margin-bottom:12px; line-height:1.5;">${esc(m.descricao || 'Sem descrição.')}</div>
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
          <div style="flex:1; height:8px; background:var(--surface-2); border-radius:8px; overflow:hidden;">
            <div style="height:100%; width:${Math.min(p,100)}%; background:${metaStatusCor(m.status)}; border-radius:8px;"></div>
          </div>
          <span class="mono" style="font-size:12px; font-weight:800;">${p}%</span>
        </div>
        <div style="font-size:12px; color:var(--text-2); margin-bottom:8px;"><strong>${currency(m.valorAtingido)}</strong> de ${currency(m.valorMeta)}</div>
        <div style="font-size:11px; color:var(--text-3); line-height:1.6;">
          ${m.setor ? `Setor: ${esc(m.setor)}<br>` : ''}${m.carteira ? `${esc(carteiraNome(m.carteira))}<br>` : ''}Responsável: ${esc(responsavelNome(m.responsavelId))}<br>
          <i class="fa-solid fa-calendar-days" style="font-size:9px;"></i> ${formatarDataBR(m.dataInicial)} a ${formatarDataBR(m.dataFinal)}
        </div>
      </div>
    `;
  }
  function secao(titulo, lista) {
    if (!lista.length) return '';
    return `
      <div class="section-title" style="margin-top:26px;">${esc(titulo)}</div>
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:14px;">
        ${lista.map(cardMeta).join('')}
      </div>
    `;
  }

  document.getElementById('content').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:10px;">
      <div class="section-title" style="margin-bottom:0;">Metas</div>
      ${isAdmin() ? `<button class="btn-brass" onclick="openAdmin(); setAdminTab('metas');"><i class="fa-solid fa-gear"></i> Gerenciar metas</button>` : ''}
    </div>
    <div style="font-size:12px; color:var(--text-2); max-width:760px; margin-bottom:20px; line-height:1.5;">
      Acompanhe o progresso das metas Gerais, por Setor e por Carteira. Cada pessoa só acompanha aqui as metas que seu setor tem permissão de ver.
    </div>
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:14px; margin-bottom:6px;">
      <div class="card" style="padding:16px;">
        <div style="font-size:22px; font-weight:800;">${visiveis.length}</div>
        <div style="font-size:11.5px; color:var(--text-3);">Metas acompanhadas</div>
      </div>
      <div class="card" style="padding:16px;">
        <div style="font-size:22px; font-weight:800; color:var(--success);">${atingidas}</div>
        <div style="font-size:11.5px; color:var(--text-3);">Atingidas</div>
      </div>
      <div class="card" style="padding:16px;">
        <div style="font-size:22px; font-weight:800; color:var(--danger);">${naoAtingidas}</div>
        <div style="font-size:11.5px; color:var(--text-3);">Não atingidas</div>
      </div>
    </div>
    ${visiveis.length ? `
      <div class="card" style="padding:20px; margin-top:16px; overflow-x:auto;">
        <div class="section-title" style="margin-bottom:14px;">Gráfico de progresso (% da meta atingido)</div>
        ${metasBarChartSvg(visiveis)}
      </div>
    ` : `<div class="card" style="padding:24px; text-align:center; color:var(--text-3); font-size:13px; margin-top:16px;">Nenhuma meta disponível para o seu perfil no momento.</div>`}
    ${secao('Metas Gerais', gerais)}
    ${secao('Metas por Setor', setores)}
    ${secao('Metas por Carteira', carteiras)}
  `;
}

