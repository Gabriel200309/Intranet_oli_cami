-- ============================================================================
-- 0007_rls_policies.sql
-- Row Level Security: aqui a segurança deixa de ser "só de fachada" (como
-- era no protótipo, onde qualquer pessoa podia abrir o DevTools e ver tudo)
-- e passa a ser aplicada de verdade pelo banco de dados, em toda consulta.
-- ============================================================================

-- Habilita RLS em todas as tabelas (por padrão, sem nenhuma política = nada
-- é visível para ninguém além do dono/serviço — modelo fail-closed).
alter table funcionarios enable row level security;
alter table permissoes_setor enable row level security;
alter table gestores_setor enable row level security;
alter table modulos enable row level security;
alter table classificacoes_sinalizacao enable row level security;
alter table sinalizacoes enable row level security;
alter table carteiras enable row level security;
alter table metas enable row level security;
alter table cursos enable row level security;
alter table aulas enable row level security;
alter table materiais_extras enable row level security;
alter table aula_conclusoes enable row level security;
alter table progresso_cursos enable row level security;
alter table chat_conversas enable row level security;
alter table chat_membros enable row level security;
alter table chat_mensagens enable row level security;
alter table aniversariantes enable row level security;
alter table parabens enable row level security;
alter table notificacoes enable row level security;
alter table avisos enable row level security;
alter table audiencias enable row level security;
alter table funcionario_mes enable row level security;
alter table links_uteis enable row level security;
alter table ferramentas enable row level security;
alter table bug_reports enable row level security;
alter table analises_ia enable row level security;

-- ---------------------------------------------------------------------------
-- FUNCIONARIOS
-- ---------------------------------------------------------------------------
create policy funcionarios_select on funcionarios for select
  using (
    fn_is_admin()
    or id = auth.uid()
    or setor = fn_meu_setor()
    or fn_permissao_setor(fn_meu_setor(), 'ver_funcionarios_todos')
  );
create policy funcionarios_admin_write on funcionarios for all
  using (fn_is_admin()) with check (fn_is_admin());

-- ---------------------------------------------------------------------------
-- PERMISSOES_SETOR / GESTORES_SETOR (configuração — só admin)
-- ---------------------------------------------------------------------------
create policy permissoes_setor_admin on permissoes_setor for all
  using (fn_is_admin()) with check (fn_is_admin());
create policy gestores_setor_admin on gestores_setor for all
  using (fn_is_admin()) with check (fn_is_admin());

-- ---------------------------------------------------------------------------
-- MODULOS
-- ---------------------------------------------------------------------------
create policy modulos_select on modulos for select
  using (fn_pode_ver_modulo(modulos));
create policy modulos_admin_write on modulos for insert with check (fn_is_admin());
create policy modulos_admin_update on modulos for update using (fn_is_admin()) with check (fn_is_admin());
create policy modulos_admin_delete on modulos for delete using (fn_is_admin());

-- ---------------------------------------------------------------------------
-- CLASSIFICACOES_SINALIZACAO
-- ---------------------------------------------------------------------------
create policy classificacoes_select on classificacoes_sinalizacao for select
  using (auth.uid() is not null);
create policy classificacoes_admin_write on classificacoes_sinalizacao for insert with check (fn_is_admin());
create policy classificacoes_admin_update on classificacoes_sinalizacao for update using (fn_is_admin()) with check (fn_is_admin());
create policy classificacoes_admin_delete on classificacoes_sinalizacao for delete using (fn_is_admin());

-- ---------------------------------------------------------------------------
-- SINALIZACOES
-- ---------------------------------------------------------------------------
create policy sinalizacoes_select on sinalizacoes for select
  using (
    fn_is_admin()
    or fn_permissao_setor(fn_meu_setor(), 'ver_sinalizacoes_todas')
    or setor = fn_meu_setor()
  );
create policy sinalizacoes_insert on sinalizacoes for insert
  with check (auth.uid() is not null and autor_id = auth.uid());
-- Só quem registrou, o gestor do setor ou o admin podem alterar/excluir
-- (mais restrito que o protótipo original, que não tinha essa checagem).
create policy sinalizacoes_update on sinalizacoes for update
  using (fn_is_admin() or autor_id = auth.uid() or fn_is_gestor(setor))
  with check (fn_is_admin() or autor_id = auth.uid() or fn_is_gestor(setor));
create policy sinalizacoes_delete on sinalizacoes for delete
  using (fn_is_admin() or autor_id = auth.uid() or fn_is_gestor(setor));

-- ---------------------------------------------------------------------------
-- CARTEIRAS
-- ---------------------------------------------------------------------------
create policy carteiras_select on carteiras for select using (auth.uid() is not null);
create policy carteiras_admin_write on carteiras for insert with check (fn_is_admin());
create policy carteiras_admin_update on carteiras for update using (fn_is_admin()) with check (fn_is_admin());
create policy carteiras_admin_delete on carteiras for delete using (fn_is_admin());

-- ---------------------------------------------------------------------------
-- METAS — apenas administradores criam/editam/excluem (requisito explícito)
-- ---------------------------------------------------------------------------
create policy metas_select on metas for select using (fn_pode_ver_meta(metas));
create policy metas_admin_write on metas for insert with check (fn_is_admin());
create policy metas_admin_update on metas for update using (fn_is_admin()) with check (fn_is_admin());
create policy metas_admin_delete on metas for delete using (fn_is_admin());

-- ---------------------------------------------------------------------------
-- CURSOS / AULAS / MATERIAIS — apenas administradores gerenciam
-- ---------------------------------------------------------------------------
create policy cursos_select on cursos for select using (fn_is_admin() or status = 'Publicado');
create policy cursos_admin_write on cursos for insert with check (fn_is_admin());
create policy cursos_admin_update on cursos for update using (fn_is_admin()) with check (fn_is_admin());
create policy cursos_admin_delete on cursos for delete using (fn_is_admin());

create policy aulas_select on aulas for select
  using (exists (select 1 from cursos c where c.id = aulas.curso_id and (fn_is_admin() or c.status = 'Publicado')));
create policy aulas_admin_write on aulas for insert with check (fn_is_admin());
create policy aulas_admin_update on aulas for update using (fn_is_admin()) with check (fn_is_admin());
create policy aulas_admin_delete on aulas for delete using (fn_is_admin());

create policy materiais_select on materiais_extras for select
  using (exists (select 1 from cursos c where c.id = materiais_extras.curso_id and (fn_is_admin() or c.status = 'Publicado')));
create policy materiais_admin_write on materiais_extras for insert with check (fn_is_admin());
create policy materiais_admin_update on materiais_extras for update using (fn_is_admin()) with check (fn_is_admin());
create policy materiais_admin_delete on materiais_extras for delete using (fn_is_admin());

-- Progresso: cada um só mexe no próprio (marcar aula concluída etc.)
create policy aula_conclusoes_select on aula_conclusoes for select
  using (fn_is_admin() or funcionario_id = auth.uid());
create policy aula_conclusoes_write on aula_conclusoes for insert
  with check (funcionario_id = auth.uid());
create policy aula_conclusoes_delete on aula_conclusoes for delete
  using (funcionario_id = auth.uid());

create policy progresso_cursos_select on progresso_cursos for select
  using (fn_is_admin() or funcionario_id = auth.uid());
-- INSERT/UPDATE de progresso_cursos são feitos pelo trigger (security definer),
-- então não é preciso liberar escrita direta para o cliente aqui.

-- ---------------------------------------------------------------------------
-- CHAT — grupos são criados só pelo admin; mensagens só entre membros
-- ---------------------------------------------------------------------------
create policy chat_conversas_select on chat_conversas for select
  using (fn_is_admin() or fn_sou_membro_da_conversa(id));
create policy chat_conversas_admin_write on chat_conversas for insert with check (fn_is_admin());
create policy chat_conversas_admin_update on chat_conversas for update using (fn_is_admin()) with check (fn_is_admin());
create policy chat_conversas_admin_delete on chat_conversas for delete using (fn_is_admin());

create policy chat_membros_select on chat_membros for select
  using (fn_is_admin() or funcionario_id = auth.uid() or fn_sou_membro_da_conversa(conversa_id));
create policy chat_membros_admin_write on chat_membros for insert with check (fn_is_admin());
create policy chat_membros_admin_delete on chat_membros for delete using (fn_is_admin());

create policy chat_mensagens_select on chat_mensagens for select
  using (fn_is_admin() or fn_sou_membro_da_conversa(conversa_id));
create policy chat_mensagens_insert on chat_mensagens for insert
  with check (remetente_id = auth.uid() and fn_sou_membro_da_conversa(conversa_id));

-- ---------------------------------------------------------------------------
-- ANIVERSARIANTES / PARABENS / NOTIFICACOES
-- ---------------------------------------------------------------------------
create policy aniversariantes_select on aniversariantes for select using (auth.uid() is not null);
create policy aniversariantes_admin_write on aniversariantes for insert with check (fn_is_admin());
create policy aniversariantes_admin_update on aniversariantes for update using (fn_is_admin()) with check (fn_is_admin());
create policy aniversariantes_admin_delete on aniversariantes for delete using (fn_is_admin());

create policy parabens_select on parabens for select
  using (fn_is_admin() or aniversariante_id = auth.uid() or remetente_id = auth.uid());
create policy parabens_insert on parabens for insert
  with check (remetente_id = auth.uid());
create policy parabens_admin_delete on parabens for delete using (fn_is_admin());

create policy notificacoes_select on notificacoes for select
  using (fn_is_admin() or destinatario_id = auth.uid());
create policy notificacoes_update on notificacoes for update
  using (destinatario_id = auth.uid()) with check (destinatario_id = auth.uid());
create policy notificacoes_admin_insert on notificacoes for insert with check (fn_is_admin());

-- ---------------------------------------------------------------------------
-- AVISOS / AUDIENCIAS / FUNCIONARIO_MES / LINKS / FERRAMENTAS
-- ---------------------------------------------------------------------------
create policy avisos_select on avisos for select using (auth.uid() is not null);
create policy avisos_admin_write on avisos for insert with check (fn_is_admin());
create policy avisos_admin_update on avisos for update using (fn_is_admin()) with check (fn_is_admin());
create policy avisos_admin_delete on avisos for delete using (fn_is_admin());

create policy audiencias_select on audiencias for select using (auth.uid() is not null);
create policy audiencias_admin_write on audiencias for insert with check (fn_is_admin());
create policy audiencias_admin_update on audiencias for update using (fn_is_admin()) with check (fn_is_admin());
create policy audiencias_admin_delete on audiencias for delete using (fn_is_admin());

create policy funcionario_mes_select on funcionario_mes for select using (auth.uid() is not null);
create policy funcionario_mes_admin_update on funcionario_mes for update using (fn_is_admin()) with check (fn_is_admin());

create policy links_select on links_uteis for select using (auth.uid() is not null);
create policy links_admin_write on links_uteis for insert with check (fn_is_admin());
create policy links_admin_update on links_uteis for update using (fn_is_admin()) with check (fn_is_admin());
create policy links_admin_delete on links_uteis for delete using (fn_is_admin());

create policy ferramentas_select on ferramentas for select using (auth.uid() is not null);
create policy ferramentas_admin_write on ferramentas for insert with check (fn_is_admin());
create policy ferramentas_admin_update on ferramentas for update using (fn_is_admin()) with check (fn_is_admin());
create policy ferramentas_admin_delete on ferramentas for delete using (fn_is_admin());

-- ---------------------------------------------------------------------------
-- BUG_REPORTS / ANALISES_IA
-- Requisito de segurança: só administradores veem o diagnóstico técnico
-- completo. Por isso analises_ia não tem NENHUMA política para usuários
-- comuns (nem select) — só admin. A Edge Function usa a service_role key,
-- que ignora RLS, para poder inserir a análise de qualquer relato.
-- ---------------------------------------------------------------------------
create policy bugreports_select on bug_reports for select
  using (fn_is_admin() or funcionario_id = auth.uid());
create policy bugreports_insert on bug_reports for insert
  with check (funcionario_id = auth.uid());
create policy bugreports_admin_update on bug_reports for update using (fn_is_admin()) with check (fn_is_admin());

create policy analises_ia_admin_select on analises_ia for select using (fn_is_admin());

select '✅ Migração 0007 concluída com sucesso.' as status;
