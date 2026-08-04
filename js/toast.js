/* ================= TOAST ================= */
function renderToast() {
  document.getElementById('toastRoot').innerHTML = state.toast ? `<div class="toast">${esc(state.toast)}</div>` : '';
}

