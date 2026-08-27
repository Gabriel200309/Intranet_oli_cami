-- ============================================================================
-- 0016_eficiencia_qualidade_alertas.sql
-- Painel de Eficiência Operacional, Qualidade e Alertas.
--
-- Reaproveita a estrutura já existente de "sinalizacoes" como base do
-- Painel de Alertas (em vez de criar um sistema de alertas paralelo) e
-- acrescenta só o que realmente não existia no banco: avaliações de
-- Qualidade e Encantamento (nota 0 a 10) e o registro de atendimentos de
-- referência.
--
-- Migração 100% incremental e não destrutiva:
--   - nenhuma coluna existente é alterada, renomeada ou removida;
--   - nenhuma linha existente é apagada ou sobrescrita;
--   - as 3 colunas novas em "sinalizacoes" são opcionais (NULL por padrão),
--     então todas as sinalizações já cadastradas continuam exatamente como
--     estavam e continuam aparecendo normalmente na tela de Sinalizações.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Sinalizações ganham 3 colunas novas (todas opcionais), para dar suporte
-- aos indicadores de Alertas / Eficiência Operacional pedidos:
--   tipo_erro    -> agrupa "tipos de erros mais frequentes" e a recorrência
--   prazo        -> data-limite combinada para resolver a sinalização
--   resolvido_em -> quando foi de fato resolvida, para medir cumprimento de prazo
-- ---------------------------------------------------------------------------
alter table sinalizacoes add column if not exists tipo_erro text;
alter table sinalizacoes add column if not exists prazo date;
alter table sinalizacoes add column if not exists resolvido_em timestamptz;

create index if not exists idx_sinalizacoes_tipo_erro on sinalizacoes(tipo_erro);

-- Mantém resolvido_em coerente com o status automaticamente (mesmo padrão
-- dos triggers em 0008_triggers.sql): quando uma sinalização passa a
-- "resolvida" e ainda não tinha data de resolução, grava now(); se for
-- reaberta, limpa a data. Sinalizações antigas (resolvidas antes desta
-- migração) não são tocadas por este trigger — ele só age em updates novos.
create or replace function trg_sinalizacao_resolvido_em()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'resolvida' and old.status <> 'resolvida' and new.resolvido_em is null then
    new.resolvido_em := now();
  elsif new.status = 'aberta' and old.status <> 'aberta' then
    new.resolvido_em := null;
  end if;
  return new;
end;
$$;

create trigger trg_sinalizacoes_resolvido_em
before update on sinalizacoes
for each row execute function trg_sinalizacao_resolvido_em();

-- ---------------------------------------------------------------------------
-- 2) Qualidade e Encantamento — não existia estrutura equivalente no banco.
-- Cada linha é uma avaliação (nota de 0 a 10 por critério) de um
-- colaborador, feita pela liderança/RH — mesmo modelo de autoria/setor já
-- usado em "sinalizacoes", para reaproveitar as mesmas regras de acesso.
-- ---------------------------------------------------------------------------
create table avaliacoes_qualidade (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references funcionarios(id) on delete set null,
  colaborador_nome text,          -- histórico, mesmo padrão de sinalizacoes.colaborador_nome
  setor text references setores(nome) on update cascade on delete restrict,
  periodo date not null default current_date,  -- competência da avaliação (mês/ano de referência)
  clareza_comunicacao int not null check (clareza_comunicacao between 0 and 10),
  cordialidade int not null check (cordialidade between 0 and 10),
  personalizacao int not null check (personalizacao between 0 and 10),
  proatividade int not null check (proatividade between 0 and 10),
  cumprimento_promessas int not null check (cumprimento_promessas between 0 and 10),
  qualidade_solucao int not null check (qualidade_solucao between 0 and 10),
  seguranca_cuidado int not null check (seguranca_cuidado between 0 and 10),
  reclamacoes int not null check (reclamacoes between 0 and 10),
  observacoes text,
  avaliador_id uuid references funcionarios(id) on delete set null,
  criado_em timestamptz not null default now()
);
create index idx_avaliacoes_qualidade_colaborador on avaliacoes_qualidade(colaborador_id);
create index idx_avaliacoes_qualidade_setor on avaliacoes_qualidade(setor);
comment on column avaliacoes_qualidade.reclamacoes is
  'Nota de 0 a 10 sobre ocorrência de reclamações (10 = nenhuma reclamação no período), atribuída pelo avaliador com base nos registros existentes (ex.: sinalizações do período) — sem fórmula automática imposta, conforme solicitado no escopo.';

-- ---------------------------------------------------------------------------
-- 3) Atendimentos de referência — também não existia. Registro manual e
-- simples de um atendimento considerado exemplo/referência de qualidade.
-- ---------------------------------------------------------------------------
create table atendimentos_referencia (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references funcionarios(id) on delete set null,
  colaborador_nome text,
  setor text references setores(nome) on update cascade on delete restrict,
  titulo text not null,
  descricao text,
  registrado_por uuid references funcionarios(id) on delete set null,
  criado_em timestamptz not null default now()
);
create index idx_atendimentos_referencia_colaborador on atendimentos_referencia(colaborador_id);

-- ---------------------------------------------------------------------------
-- 4) RLS — mesmo modelo de acesso já usado em sinalizacoes (0013): admin,
-- gestor do setor, quem tem a permissão "ver sinalizações de todas", quem
-- registrou/avaliou, ou o próprio colaborador avaliado/citado. Registrar
-- é exclusivo de administradores, igual à regra atual de sinalizacoes.
-- ---------------------------------------------------------------------------
alter table avaliacoes_qualidade enable row level security;
alter table atendimentos_referencia enable row level security;

create policy avaliacoes_qualidade_select on avaliacoes_qualidade for select
  using (
    fn_is_admin()
    or fn_permissao_setor(fn_meu_setor(), 'ver_sinalizacoes_todas')
    or fn_is_gestor(setor)
    or avaliador_id = auth.uid()
    or colaborador_id = auth.uid()
  );
create policy avaliacoes_qualidade_insert on avaliacoes_qualidade for insert
  with check (fn_is_admin() and avaliador_id = auth.uid());
create policy avaliacoes_qualidade_update on avaliacoes_qualidade for update
  using (fn_is_admin() or avaliador_id = auth.uid() or fn_is_gestor(setor))
  with check (fn_is_admin() or avaliador_id = auth.uid() or fn_is_gestor(setor));
create policy avaliacoes_qualidade_delete on avaliacoes_qualidade for delete
  using (fn_is_admin() or avaliador_id = auth.uid() or fn_is_gestor(setor));

create policy atendimentos_referencia_select on atendimentos_referencia for select
  using (
    fn_is_admin()
    or fn_permissao_setor(fn_meu_setor(), 'ver_sinalizacoes_todas')
    or fn_is_gestor(setor)
    or registrado_por = auth.uid()
    or colaborador_id = auth.uid()
  );
create policy atendimentos_referencia_insert on atendimentos_referencia for insert
  with check (fn_is_admin() and registrado_por = auth.uid());
create policy atendimentos_referencia_update on atendimentos_referencia for update
  using (fn_is_admin() or registrado_por = auth.uid() or fn_is_gestor(setor))
  with check (fn_is_admin() or registrado_por = auth.uid() or fn_is_gestor(setor));
create policy atendimentos_referencia_delete on atendimentos_referencia for delete
  using (fn_is_admin() or registrado_por = auth.uid() or fn_is_gestor(setor));

select '✅ Migração 0016 concluída com sucesso.' as status;
