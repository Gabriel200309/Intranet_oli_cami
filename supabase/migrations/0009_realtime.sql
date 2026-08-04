-- ============================================================================
-- 0009_realtime.sql
-- Habilita o Supabase Realtime nas tabelas onde o front-end precisa saber
-- "na hora" que algo mudou — notificações (parabéns, avisos) e mensagens
-- de chat. O front-end assina essas tabelas com supabase-js:
--
--   supabase
--     .channel('notificacoes-do-usuario')
--     .on('postgres_changes', { event: 'INSERT', schema: 'public',
--         table: 'notificacoes', filter: `destinatario_id=eq.${meuId}` },
--         payload => { /* mostrar notificação na hora */ })
--     .subscribe();
--
-- Isso substitui por completo a necessidade de "simular tempo real" que
-- existia no protótipo (tudo acontecia só na mesma aba do navegador).
-- ============================================================================

alter publication supabase_realtime add table notificacoes;
alter publication supabase_realtime add table chat_mensagens;

select '✅ Migração 0009 concluída com sucesso.' as status;
