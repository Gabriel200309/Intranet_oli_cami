-- ============================================================================
-- 0006_helper_functions.sql
-- Funções auxiliares usadas pelas políticas de RLS. Cada uma corresponde
-- diretamente a uma função que já existia em JavaScript no protótipo
-- (isAdmin, hasPermission, isGestorDoSetor, metaVisivelPara...) — a
-- diferença crucial é que agora rodam DENTRO do banco, então não podem
-- ser burladas alterando o código do navegador.
-- ============================================================================

-- Funcionário (linha completa) da pessoa autenticada na requisição atual.
create or replace function fn_meu_funcionario()
returns funcionarios
language sql stable
security definer
set search_path = public
as $$
  select * from funcionarios where id = auth.uid();
$$;

create or replace function fn_meu_setor()
returns setor_tipo
language sql stable
security definer
set search_path = public
as $$
  select setor from funcionarios where id = auth.uid();
$$;

-- Equivalente a isAdmin() no front-end — só que agora é a verdade do banco.
create or replace function fn_is_admin()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from funcionarios where id = auth.uid() and nivel = 'Administrador'
  );
$$;

-- Equivalente a isGestorDoSetor(setor).
create or replace function fn_is_gestor(p_setor setor_tipo)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from gestores_setor where setor = p_setor and funcionario_id = auth.uid()
  );
$$;

-- Equivalente a hasPermission(key) — recebe o nome da coluna de
-- permissoes_setor como texto (ex.: 'ver_metas_geral').
create or replace function fn_permissao_setor(p_setor setor_tipo, p_coluna text)
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

-- Equivalente a moduleAccessCheck(mod) — true se o usuário autenticado
-- pode ver/abrir o módulo informado.
create or replace function fn_pode_ver_modulo(p_modulo modulos)
returns boolean
language plpgsql stable
security definer
set search_path = public
as $$
declare
  v_nivel nivel_tipo;
  v_setor setor_tipo;
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
      return false;
    end if;
    return fn_permissao_setor(v_setor, v_coluna);
  end if;
  return true; -- módulo geral, sem setor
end;
$$;

-- Equivalente a metaVisivelPara(meta).
create or replace function fn_pode_ver_meta(p_meta metas)
returns boolean
language plpgsql stable
security definer
set search_path = public
as $$
declare
  v_setor setor_tipo;
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

-- Checa se o usuário autenticado é membro de uma conversa de chat.
-- IMPORTANTE: precisa ser SECURITY DEFINER para não causar recursão infinita
-- — se a política de RLS de chat_membros chamasse um EXISTS direto sobre a
-- própria chat_membros, o Postgres reaplicaria a política de novo dentro da
-- subquery, e de novo, indefinidamente. Encapsulando a checagem numa função
-- de propriedade de um papel que ignora RLS na própria tabela (o dono da
-- tabela, por padrão), a política só enxerga um boolean, sem recursão.
create or replace function fn_sou_membro_da_conversa(p_conversa_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from chat_membros where conversa_id = p_conversa_id and funcionario_id = auth.uid()
  );
$$;

select '✅ Migração 0006 concluída com sucesso.' as status;
