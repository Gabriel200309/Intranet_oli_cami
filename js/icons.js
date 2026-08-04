const ICONS = {
  scale: 'fa-scale-balanced', users: 'fa-users', gavel: 'fa-gavel', file: 'fa-file-lines',
  grad: 'fa-graduation-cap', folder: 'fa-folder-open', key: 'fa-key', wrench: 'fa-screwdriver-wrench',
  book: 'fa-book-open', link: 'fa-link', sparkles: 'fa-wand-magic-sparkles', layers: 'fa-layer-group',
  wallet: 'fa-wallet', home: 'fa-house', building: 'fa-building', lock: 'fa-lock',
  calc: 'fa-calculator', chat: 'fa-comments', flag: 'fa-flag', bug: 'fa-bug',
  send: 'fa-paper-plane', check: 'fa-circle-check', clock: 'fa-clock', trash: 'fa-trash',
  target: 'fa-bullseye', chart: 'fa-chart-column', bell: 'fa-bell', cake: 'fa-cake-candles',
};
function icon(name, extra) { return `<i class="fa-solid ${ICONS[name] || 'fa-circle'} ${extra||''}"></i>`; }
