-- ============================================================================
-- 0022_tipos_erro_sinalizacao.sql
-- Ponto 10 do pedido de correção do Painel de Eficiência, Qualidade e
-- Alertas: até aqui, "tipo de erro" (usado para classificar alertas e
-- calcular "tipos de erros mais frequentes"/recorrência) era uma lista fixa
-- só no front-end (TIPOS_ERRO_SINALIZACAO, em js/data.js), sem nenhuma tela
-- de administração para cadastrar/editar/desativar tipos.
--
-- Esta migração cria só o catálogo administrável — não mexe na coluna
-- "sinalizacoes.tipo_erro" (criada em 0016), que continua sendo um texto
-- livre por linha (não uma FK): cada sinalização já registrada mantém
-- exatamente o texto que tinha, mesmo que o nome do tipo seja depois
-- editado ou removido do catálogo.
--
-- Migração 100% incremental e não destrutiva:
--   - nenhuma tabela/coluna existente é alterada, renomeada ou removida;
--   - nenhuma sinalização já cadastrada é tocada;
--   - o catálogo nasce populado com a lista fixa que já existia no
--     front-end + os exemplos pedidos no escopo, então nenhuma opção que já
--     estava disponível para o usuário desaparece.
-- ============================================================================

create table tipos_erro_sinalizacao (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  ordem smallint,
  criado_em timestamptz not null default now()
);
comment on table tipos_erro_sinalizacao is 'Catálogo administrável de tipos de erro usados para classificar alertas/sinalizações (Administração > Tipos de Erro). sinalizacoes.tipo_erro continua sendo texto livre — não há FK aqui de propósito, para nunca invalidar uma sinalização já registrada se um tipo for renomeado/desativado/excluído depois.';
comment on column tipos_erro_sinalizacao.ativo is 'Tipos inativos somem do seletor ao registrar uma nova sinalização, mas continuam existindo (e aparecendo) nos alertas antigos que já usam esse texto.';
comment on column tipos_erro_sinalizacao.ordem is 'Ordem de exibição no seletor (menor primeiro). Nulo = vai para o fim, em ordem alfabética.';

create index idx_tipos_erro_sinalizacao_ativo on tipos_erro_sinalizacao(ativo);

alter table tipos_erro_sinalizacao enable row level security;
create policy tipos_erro_sinalizacao_select on tipos_erro_sinalizacao for select using (auth.uid() is not null);
create policy tipos_erro_sinalizacao_admin_insert on tipos_erro_sinalizacao for insert with check (fn_is_admin());
create policy tipos_erro_sinalizacao_admin_update on tipos_erro_sinalizacao for update using (fn_is_admin()) with check (fn_is_admin());
create policy tipos_erro_sinalizacao_admin_delete on tipos_erro_sinalizacao for delete using (fn_is_admin());

-- Backfill: lista fixa que já existia em js/data.js (TIPOS_ERRO_SINALIZACAO)
-- + os exemplos citados no pedido de correção do painel, para nenhuma opção
-- que a equipe já usava sumir do seletor.
insert into tipos_erro_sinalizacao (nome, ordem) values
  ('Atraso no prazo', 1),
  ('Erro de comunicação', 2),
  ('Erro de procedimento', 3),
  ('Erro de cálculo/financeiro', 4),
  ('Descumprimento de instrução', 5),
  ('Erro de sistema/lançamento', 6),
  ('Falha operacional', 7),
  ('Erro de cadastro', 8),
  ('Atraso no atendimento', 9),
  ('Falha de comunicação', 10),
  ('Problema processual', 11),
  ('Informação incorreta', 12),
  ('Sistema', 13),
  ('Outro', 14)
on conflict (nome) do nothing;

select '✅ Migração 0022 concluída com sucesso.' as status;
