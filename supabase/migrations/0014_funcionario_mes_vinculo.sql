-- ============================================================================
-- 0014_funcionario_mes_vinculo.sql
-- Guarda qual funcionário é o destaque do mês (além do nome/cargo/foto já
-- copiados como "retrato daquele mês"), para o botão "Parabenizar" do
-- card Funcionário do Mês poder enviar uma notificação de verdade para
-- essa pessoa — antes ele só mostrava uma mensagem de sucesso falsa,
-- sem vínculo nenhum com quem deveria receber o parabéns.
-- ============================================================================

alter table funcionario_mes add column if not exists funcionario_id uuid references funcionarios(id) on delete set null;

select '✅ Migração 0014 concluída com sucesso.' as status;
