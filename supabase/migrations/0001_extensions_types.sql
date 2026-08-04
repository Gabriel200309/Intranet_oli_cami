-- ============================================================================
-- 0001_extensions_types.sql
-- Extensões necessárias e tipos enumerados usados em todo o schema.
--
-- Esta migração é "à prova de reexecução": se você rodar este arquivo mais
-- de uma vez (por engano, ou porque uma execução anterior travou no meio),
-- ele não vai dar erro de "already exists" — cada tipo só é criado se ainda
-- não existir.
-- ============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;    -- acelera buscas de texto (ILIKE) usadas na busca do portal

do $$
begin
  if not exists (select 1 from pg_type where typname = 'setor_tipo') then
    create type setor_tipo as enum ('Acordos','Jurídico','RH','Financeiro','TI','Diretoria');
  end if;

  if not exists (select 1 from pg_type where typname = 'nivel_tipo') then
    create type nivel_tipo as enum (
      'Administrador','Diretor','Líder','Supervisor','Negociador','Cobrador','RH','Jurídico','Financeiro','TI'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'meta_tipo') then
    create type meta_tipo as enum ('Geral','Setor','Carteira');
  end if;

  if not exists (select 1 from pg_type where typname = 'meta_status') then
    create type meta_status as enum ('Em andamento','Atingida','Não atingida','Pausada');
  end if;

  if not exists (select 1 from pg_type where typname = 'sinalizacao_status') then
    create type sinalizacao_status as enum ('aberta','resolvida');
  end if;

  if not exists (select 1 from pg_type where typname = 'curso_status') then
    create type curso_status as enum ('Publicado','Rascunho');
  end if;

  if not exists (select 1 from pg_type where typname = 'aula_tipo') then
    create type aula_tipo as enum ('video','pdf','apresentacao','arquivo');
  end if;

  if not exists (select 1 from pg_type where typname = 'chat_tipo') then
    create type chat_tipo as enum ('individual','grupo');
  end if;

  if not exists (select 1 from pg_type where typname = 'notificacao_tipo') then
    create type notificacao_tipo as enum ('parabens','sistema');
  end if;

  if not exists (select 1 from pg_type where typname = 'bug_status') then
    create type bug_status as enum ('pendente','analisado','erro_analise');
  end if;

  if not exists (select 1 from pg_type where typname = 'aviso_prioridade') then
    create type aviso_prioridade as enum ('baixa','media','alta','critica');
  end if;

  if not exists (select 1 from pg_type where typname = 'audiencia_status') then
    create type audiencia_status as enum ('Confirmada','Cancelada','Remarcada');
  end if;
end $$;


select '✅ Migração 0001 concluída com sucesso.' as status;
