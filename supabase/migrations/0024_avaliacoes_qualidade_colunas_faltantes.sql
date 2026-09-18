-- ============================================================================
-- 0024_avaliacoes_qualidade_colunas_faltantes.sql
-- Corrige uma divergência entre o banco real e a migração 0016: a tabela
-- "avaliacoes_qualidade" já existente no banco foi criada sem as colunas
-- colaborador_nome, periodo e observacoes (tem, em vez disso, referencia,
-- data_referencia e observacao) — por isso o front-end (que usa os nomes
-- de 0016) recebia "Could not find the 'colaborador_nome' column ... in
-- the schema cache" ao registrar uma avaliação.
--
-- Migração 100% incremental e não destrutiva: só adiciona as colunas que
-- estão faltando; nenhuma coluna existente (incluindo referencia,
-- data_referencia, observacao e atualizado_em) é alterada, renomeada ou
-- removida, então nenhum dado é perdido.
-- ============================================================================

alter table avaliacoes_qualidade add column if not exists colaborador_nome text;
alter table avaliacoes_qualidade add column if not exists periodo date not null default current_date;
alter table avaliacoes_qualidade add column if not exists observacoes text;

-- Preenche colaborador_nome nas avaliações já existentes, a partir do
-- colaborador vinculado, para não deixar linhas antigas com o nome vazio.
update avaliacoes_qualidade aq
set colaborador_nome = f.nome
from funcionarios f
where f.id = aq.colaborador_id
  and aq.colaborador_nome is null;

select '✅ Migração 0024 concluída com sucesso.' as status;
