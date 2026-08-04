-- ============================================================================
-- 0000_reset_total.sql
-- Use este script SÓ se precisar recomeçar do zero (ex.: ficou em dúvida se
-- alguma migration rodou pela metade). Ele remove TODAS as tabelas, funções
-- e tipos deste projeto — apagar tabelas pelo Table Editor não é suficiente,
-- porque os tipos enumerados (ex.: setor_tipo) e as funções continuam
-- existindo mesmo depois de apagar as tabelas, e isso causa o erro
-- "already exists" ao tentar rodar o 0001 de novo.
--
-- Depois de rodar este script, comece de novo a partir do 0001, na ordem
-- normal (0001 → 0002 → ... → 0009 → seed.sql).
--
-- ATENÇÃO: isso apaga todos os dados deste projeto (funcionários, metas,
-- cursos, etc.). Não roda em produção com dados reais sem ter certeza.
-- ============================================================================

drop table if exists analises_ia cascade;
drop table if exists bug_reports cascade;
drop table if exists ferramentas cascade;
drop table if exists links_uteis cascade;
drop table if exists funcionario_mes cascade;
drop table if exists audiencias cascade;
drop table if exists avisos cascade;
drop table if exists notificacoes cascade;
drop table if exists parabens cascade;
drop table if exists aniversariantes cascade;
drop table if exists chat_mensagens cascade;
drop table if exists chat_membros cascade;
drop table if exists chat_conversas cascade;
drop table if exists progresso_cursos cascade;
drop table if exists aula_conclusoes cascade;
drop table if exists materiais_extras cascade;
drop table if exists aulas cascade;
drop table if exists cursos cascade;
drop table if exists metas cascade;
drop table if exists carteiras cascade;
drop table if exists sinalizacoes cascade;
drop table if exists classificacoes_sinalizacao cascade;
drop table if exists modulos cascade;
drop table if exists gestores_setor cascade;
drop table if exists permissoes_setor cascade;
drop table if exists funcionarios cascade;

drop function if exists fn_pode_ver_meta cascade;
drop function if exists fn_sou_membro_da_conversa cascade;
drop function if exists fn_pode_ver_modulo cascade;
drop function if exists fn_permissao_setor cascade;
drop function if exists fn_is_gestor cascade;
drop function if exists fn_is_admin cascade;
drop function if exists fn_meu_setor cascade;
drop function if exists fn_meu_funcionario cascade;
drop function if exists trg_criar_notificacao_parabens cascade;
drop function if exists trg_atualizar_progresso_curso cascade;

drop type if exists audiencia_status cascade;
drop type if exists aviso_prioridade cascade;
drop type if exists bug_status cascade;
drop type if exists notificacao_tipo cascade;
drop type if exists chat_tipo cascade;
drop type if exists aula_tipo cascade;
drop type if exists curso_status cascade;
drop type if exists sinalizacao_status cascade;
drop type if exists meta_status cascade;
drop type if exists meta_tipo cascade;
drop type if exists nivel_tipo cascade;
drop type if exists setor_tipo cascade;

-- Confirmação: depois de rodar isto, a query abaixo deve retornar 0.
select count(*) as tabelas_restantes from information_schema.tables
  where table_schema = 'public'
  and table_name in ('funcionarios','metas','cursos','sinalizacoes','modulos');
