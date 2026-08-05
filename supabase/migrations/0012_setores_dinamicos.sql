-- ============================================================================
-- 0012_setores_dinamicos.sql
-- Setores deixam de ser um enum fixo (setor_tipo) e passam a ser uma
-- tabela normal, com CRUD pelo administrador (criar, renomear, excluir) —
-- igual ao padrão já usado em "carteiras" e "classificacoes_sinalizacao".
--
-- Renomear um setor propaga automaticamente para tudo que o referencia
-- (ON UPDATE CASCADE). Excluir um setor que ainda está em uso (algum
-- funcionário, módulo, meta etc.) é bloqueado pelo banco (ON DELETE
-- RESTRICT) — o admin precisa reatribuir/excluir o que depende dele
-- primeiro; evita apagar um setor e deixar dados "órfãos" silenciosamente.
--
-- Postgres não permite alterar o tipo de uma coluna usada dentro de uma
-- política de RLS (nem, na prática, de uma função chamada por ela), então
-- este script derruba temporariamente as políticas/funções afetadas,
-- faz as alterações de tipo, e recria tudo em seguida — o comportamento
-- de segurança final é idêntico ao de antes, só que operando sobre texto
-- em vez de um enum fixo.
-- ============================================================================

create table setores (
  nome text primary key
);
comment on table setores is 'Lista de setores do escritório, editável pelo administrador (antes era o enum fixo setor_tipo).';

insert into setores (nome) values ('Acordos'), ('Jurídico'), ('RH'), ('Financeiro'), ('TI'), ('Diretoria');

alter table setores enable row level security;
create policy setores_select on setores for select using (auth.uid() is not null);
create policy setores_admin_insert on setores for insert with check (fn_is_admin());
create policy setores_admin_update on setores for update using (fn_is_admin()) with check (fn_is_admin());
create policy setores_admin_delete on setores for delete using (fn_is_admin());

-- ---------------------------------------------------------------------------
-- 1) Derruba as políticas que referenciam a coluna "setor" (diretamente ou
-- via função que recebe a linha inteira), para poder alterar o tipo dela.
-- ---------------------------------------------------------------------------
drop policy funcionarios_select on funcionarios;
drop policy modulos_select on modulos;
drop policy sinalizacoes_select on sinalizacoes;
drop policy sinalizacoes_update on sinalizacoes;
drop policy sinalizacoes_delete on sinalizacoes;
drop policy metas_select on metas;

-- ---------------------------------------------------------------------------
-- 2) Derruba as 3 funções cuja assinatura muda (tipo de parâmetro/retorno).
-- fn_pode_ver_modulo/fn_pode_ver_meta NÃO mudam de assinatura (recebem a
-- linha inteira) — essas só serão substituídas (CREATE OR REPLACE) mais
-- abaixo, sem precisar de DROP.
-- ---------------------------------------------------------------------------
drop function if exists fn_meu_setor();
drop function if exists fn_is_gestor(setor_tipo);
drop function if exists fn_permissao_setor(setor_tipo, text);

-- ---------------------------------------------------------------------------
-- 3) Converte cada coluna "setor" de setor_tipo (enum) para text + chave
-- estrangeira para setores(nome).
-- ---------------------------------------------------------------------------
alter table funcionarios alter column setor type text using setor::text;
alter table funcionarios add constraint funcionarios_setor_fkey
  foreign key (setor) references setores(nome) on update cascade on delete restrict;

alter table permissoes_setor alter column setor type text using setor::text;
alter table permissoes_setor add constraint permissoes_setor_setor_fkey
  foreign key (setor) references setores(nome) on update cascade on delete restrict;

alter table gestores_setor alter column setor type text using setor::text;
alter table gestores_setor add constraint gestores_setor_setor_fkey
  foreign key (setor) references setores(nome) on update cascade on delete restrict;

alter table modulos alter column setor type text using setor::text;
alter table modulos add constraint modulos_setor_fkey
  foreign key (setor) references setores(nome) on update cascade on delete restrict;

alter table sinalizacoes alter column setor type text using setor::text;
alter table sinalizacoes add constraint sinalizacoes_setor_fkey
  foreign key (setor) references setores(nome) on update cascade on delete restrict;

alter table metas alter column setor type text using setor::text;
alter table metas add constraint metas_setor_fkey
  foreign key (setor) references setores(nome) on update cascade on delete restrict;

alter table bug_reports alter column setor type text using setor::text;
alter table bug_reports add constraint bug_reports_setor_fkey
  foreign key (setor) references setores(nome) on update cascade on delete restrict;

-- ---------------------------------------------------------------------------
-- 4) Recria as 3 funções com assinatura em texto (corpo idêntico ao de antes).
-- ---------------------------------------------------------------------------
create function fn_meu_setor()
returns text
language sql stable
security definer
set search_path = public
as $$
  select setor from funcionarios where id = auth.uid();
$$;

create function fn_is_gestor(p_setor text)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from gestores_setor where setor = p_setor and funcionario_id = auth.uid()
  );
$$;

create function fn_permissao_setor(p_setor text, p_coluna text)
returns boolean
language plpgsql stable
security definer
set search_path = public
as $$
declare
  v_resultado boolean;
begin
  if p_setor is null then
    return false;
  end if;
  execute format('select %I from permissoes_setor where setor = $1', p_coluna)
    into v_resultado using p_setor;
  return coalesce(v_resultado, false);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Substitui fn_pode_ver_modulo / fn_pode_ver_meta (mesma assinatura de
-- antes — só a variável interna v_setor passa de setor_tipo para text).
-- ---------------------------------------------------------------------------
create or replace function fn_pode_ver_modulo(p_modulo modulos)
returns boolean
language plpgsql stable
security definer
set search_path = public
as $$
declare
  v_nivel nivel_tipo;
  v_setor text;
  v_coluna text;
begin
  if fn_is_admin() then
    return true;
  end if;
  select nivel, setor into v_nivel, v_setor from funcionarios where id = auth.uid();
  if v_nivel is null then
    return false; -- não autenticado / não é funcionário
  end if;
  if p_modulo.locked then
    if v_nivel not in ('Administrador','Diretor','Líder') then
      return false;
    end if;
  end if;
  if p_modulo.setor is not null then
    v_coluna := case p_modulo.setor
      when 'Acordos' then 'acesso_acordos'
      when 'Jurídico' then 'acesso_juridico'
      when 'RH' then 'acesso_rh'
      when 'Financeiro' then 'acesso_financeiro'
      else null
    end;
    if v_coluna is null then
      -- Setor sem coluna de acesso cruzado dedicada (ex.: TI, Diretoria, ou
      -- um setor novo criado pelo administrador): só quem é do próprio
      -- setor (ou admin, já tratado acima) enxerga o módulo.
      return v_setor = p_modulo.setor;
    end if;
    return fn_permissao_setor(v_setor, v_coluna);
  end if;
  return true; -- módulo geral, sem setor
end;
$$;

create or replace function fn_pode_ver_meta(p_meta metas)
returns boolean
language plpgsql stable
security definer
set search_path = public
as $$
declare
  v_setor text;
begin
  if fn_is_admin() then
    return true;
  end if;
  if p_meta.tipo = 'Geral' then
    return true; -- meta geral é sempre visível a todos, por regra de negócio
  end if;
  if p_meta.responsavel_id = auth.uid() then
    return true; -- sua própria meta, sempre
  end if;
  if p_meta.setor is not null and fn_is_gestor(p_meta.setor) then
    return true; -- gestor vê tudo do setor que administra
  end if;
  select setor into v_setor from funcionarios where id = auth.uid();
  if p_meta.tipo = 'Setor' and p_meta.setor = v_setor then
    return true; -- meta coletiva do próprio setor
  end if;
  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) Recria as políticas derrubadas no passo 1 (definição idêntica à
-- original em supabase/migrations/0007_rls_policies.sql).
-- ---------------------------------------------------------------------------
create policy funcionarios_select on funcionarios for select
  using (
    fn_is_admin()
    or id = auth.uid()
    or setor = fn_meu_setor()
    or fn_permissao_setor(fn_meu_setor(), 'ver_funcionarios_todos')
  );

create policy modulos_select on modulos for select
  using (fn_pode_ver_modulo(modulos));

create policy sinalizacoes_select on sinalizacoes for select
  using (
    fn_is_admin()
    or fn_permissao_setor(fn_meu_setor(), 'ver_sinalizacoes_todas')
    or setor = fn_meu_setor()
  );
create policy sinalizacoes_update on sinalizacoes for update
  using (fn_is_admin() or autor_id = auth.uid() or fn_is_gestor(setor))
  with check (fn_is_admin() or autor_id = auth.uid() or fn_is_gestor(setor));
create policy sinalizacoes_delete on sinalizacoes for delete
  using (fn_is_admin() or autor_id = auth.uid() or fn_is_gestor(setor));

create policy metas_select on metas for select using (fn_pode_ver_meta(metas));

-- ---------------------------------------------------------------------------
-- 7) O enum não é mais referenciado por nenhuma coluna ou função — remove.
-- ---------------------------------------------------------------------------
drop type if exists setor_tipo;

select '✅ Migração 0012 concluída com sucesso.' as status;
