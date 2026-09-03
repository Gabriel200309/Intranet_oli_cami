-- ============================================================================
-- 0021_atendimento_link_chatguru.sql
-- Guarda o link da conversa com o cliente no ChatGuru, vinculado ao próprio
-- atendimento (Registro de Atendimentos) — mesmo padrão de campo opcional já
-- usado no restante da tabela atendimentos_chat (0017/0020).
--
-- Migração 100% incremental e não destrutiva: só adiciona uma coluna
-- opcional (NULL por padrão); nenhum atendimento já cadastrado é afetado.
-- ============================================================================

alter table atendimentos_chat add column if not exists link_chatguru text;
comment on column atendimentos_chat.link_chatguru is 'Link da conversa com o cliente no ChatGuru (opcional) — pode ser preenchido no cadastro ou adicionado/editado depois, a qualquer momento.';

select '✅ Migração 0021 concluída com sucesso.' as status;
