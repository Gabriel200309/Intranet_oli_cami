/* ================= HELPERS: CURSOS E OFICINAS ================= */
function aulaTipoInfo(tipo) { return AULA_TIPOS.find(t => t.value === tipo) || AULA_TIPOS[0]; }
function totalAulas(curso) { return curso.aulas.length; }
function progressoUsuarioCurso(cursoId) {
  const emp = getEffectiveEmployee();
  if (!emp) return { aulasConcluidas: [], percentual: 0, dataInicio: null, dataConclusao: null };
  const doUsuario = state.progressoCursos[emp.id] || {};
  return doUsuario[cursoId] || { aulasConcluidas: [], percentual: 0, dataInicio: null, dataConclusao: null };
}
function cursoPercentual(curso) {
  const p = progressoUsuarioCurso(curso.id);
  return p.percentual || 0;
}
function garantirProgressoIniciado(cursoId) {
  const emp = getEffectiveEmployee();
  if (!emp) return;
  if (!state.progressoCursos[emp.id]) state.progressoCursos[emp.id] = {};
  if (!state.progressoCursos[emp.id][cursoId]) {
    state.progressoCursos[emp.id][cursoId] = {
      aulasConcluidas: [], percentual: 0,
      dataInicio: new Date().toISOString(),
      dataConclusao: null,
    };
  }
}
async function toggleAulaConcluida(cursoId, aulaId) {
  const emp = getEffectiveEmployee();
  if (!emp) return;
  garantirProgressoIniciado(cursoId);
  const curso = state.cursos.find(c => c.id === cursoId);
  if (!curso) return;
  const progresso = state.progressoCursos[emp.id][cursoId];
  const i = progresso.aulasConcluidas.indexOf(aulaId);
  const marcando = i === -1;
  if (marcando) progresso.aulasConcluidas.push(aulaId);
  else progresso.aulasConcluidas.splice(i, 1);
  const total = totalAulas(curso) || 1;
  progresso.percentual = Math.round((progresso.aulasConcluidas.length / total) * 100);
  progresso.dataConclusao = progresso.percentual >= 100 ? new Date().toISOString() : null;
  renderCursoDetalhe();
  if (supabaseClient) {
    const query = marcando
      ? supabaseClient.from('aula_conclusoes').insert({ funcionario_id: emp.id, aula_id: aulaId })
      : supabaseClient.from('aula_conclusoes').delete().eq('funcionario_id', emp.id).eq('aula_id', aulaId);
    const { error } = await query;
    if (error) { console.error('Erro ao salvar progresso da aula:', error.message); return; }
    await carregarProgressoCursos();
    renderCursoDetalhe();
  }
}
function toYoutubeEmbed(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}
function toVimeoEmbed(url) {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}` : url;
}
function nomeArquivoDeUrl(url) {
  if (!url) return 'arquivo';
  if (url.startsWith('data:')) return 'arquivo';
  try { return decodeURIComponent(url.split('/').pop().split('?')[0]) || 'arquivo'; } catch(e) { return 'arquivo'; }
}

