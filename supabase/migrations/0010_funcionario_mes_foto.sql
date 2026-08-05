-- ============================================================================
-- 0010_funcionario_mes_foto.sql
-- Guarda a foto do "Funcionário do mês" (copiada da foto do cadastro do
-- colaborador escolhido no momento em que o admin salva — é um retrato do
-- destaque daquele mês, igual a nome/cargo/motivo/mensagem já eram, não um
-- vínculo vivo que muda sozinho se o colaborador trocar de foto depois).
-- ============================================================================

alter table funcionario_mes add column if not exists foto_url text;

select '✅ Migração 0010 concluída com sucesso.' as status;
