-- ============================================================================
-- 0018_equipes.sql
-- Distingue EQUIPE (unidade de trabalho) de SETOR (departamento, usado para
-- permissões e acesso a módulos — continua funcionando exatamente como
-- está). Um setor pode conter várias equipes; cada colaborador pertence, no
-- máximo, a uma equipe.
--
-- Exemplo do escritório: setor "Acordos" contém as equipes Êxitos, Celeste,
-- Delta e Negociações; setor "Jurídico" contém a equipe Auditoria. Os nomes
-- das equipes NÃO são criados por este script — são cadastrados pelo
-- administrador na interface (Administração > Equipes).
--
-- Migração 100% incremental e não destrutiva:
--   - nenhuma tabela/coluna existente é alterada, renomeada ou removida;
--   - "setores" não é tocada de forma nenhuma;
--   - a única coluna nova em tabela existente ("funcionarios.equipe_id") é
--     opcional (NULL por padrão, sem DEFAULT), então todo colaborador já
--     cadastrado continua exatamente como estava (sem equipe atribuída) e
--     continua aparecendo normalmente em todas as telas;
--   - excluir uma equipe nunca exclui colaborador: a FK usa
--     ON DELETE SET NULL, o colaborador só fica "sem equipe".
-- ============================================================================

create table equipes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  setor text references setores(nome) on update cascade on delete restrict,
  ordem smallint check (ordem is null or ordem >= 1),
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);
comment on table equipes is 'Equipes (unidades de trabalho) dentro de um setor — ex.: setor Acordos contém as equipes Êxitos, Celeste, Delta e Negociações. Cadastradas pelo administrador; nenhuma equipe é criada por esta migração.';
comment on column equipes.setor is 'Setor ao qual a equipe pertence. Anulável: uma equipe pode existir sem setor definido ainda.';
comment on column equipes.ordem is 'Ordem de exibição/desempate no ranking "Alertas por equipe" (menor número primeiro). Equipe sem ordem definida vai para o fim, em ordem alfabética.';

create index idx_equipes_setor on equipes(setor);

alter table equipes enable row level security;
create policy equipes_select on equipes for select using (auth.uid() is not null);
create policy equipes_admin_insert on equipes for insert with check (fn_is_admin());
create policy equipes_admin_update on equipes for update using (fn_is_admin()) with check (fn_is_admin());
create policy equipes_admin_delete on equipes for delete using (fn_is_admin());

-- ---------------------------------------------------------------------------
-- funcionarios ganha uma coluna nova, opcional, para o vínculo com a equipe.
-- Sem DEFAULT e anulável: nenhum colaborador já cadastrado tem valor
-- alterado por esta migração (todos continuam "sem equipe" até o
-- administrador atribuir uma pelo cadastro de funcionários).
-- ---------------------------------------------------------------------------
alter table funcionarios add column if not exists equipe_id uuid references equipes(id) on delete set null;
create index if not exists idx_funcionarios_equipe_id on funcionarios(equipe_id);

select '✅ Migração 0018 concluída com sucesso.' as status;
