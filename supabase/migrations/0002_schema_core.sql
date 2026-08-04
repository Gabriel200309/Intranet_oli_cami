-- ============================================================================
-- 0002_schema_core.sql
-- Funcionários (ligados ao auth.users do Supabase), permissões por setor,
-- gestores, módulos do acesso rápido e sinalizações de colaboradores.
-- ============================================================================

-- Um funcionário É um usuário autenticado do Supabase (auth.users). O id é o
-- mesmo do auth.users — sem isso, teríamos duas fontes de identidade.
create table funcionarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  numero text,
  setor setor_tipo not null,
  cargo text not null,
  nivel nivel_tipo not null,
  nascimento date,
  telefone text,
  email text not null unique,
  foto_url text,
  criado_em timestamptz not null default now()
);
comment on table funcionarios is 'Um funcionário por usuário autenticado (auth.users.id = funcionarios.id).';

-- Permissões de acesso cruzado entre setores (1 linha por setor).
create table permissoes_setor (
  setor setor_tipo primary key,
  acesso_acordos boolean not null default false,
  acesso_juridico boolean not null default false,
  acesso_rh boolean not null default false,
  acesso_financeiro boolean not null default false,
  ver_metas_geral boolean not null default false,
  ver_sinalizacoes_todas boolean not null default false,
  ver_funcionarios_todos boolean not null default false
);

-- Quem administra (vê tudo de) cada setor — N:N entre setor e funcionário.
create table gestores_setor (
  setor setor_tipo not null,
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  primary key (setor, funcionario_id)
);

-- Módulos do "Acesso rápido" / itens de menu ligados a um sistema externo.
create table modulos (
  id serial primary key,
  nome text not null,
  descricao text,
  icone text,
  status text default 'Online',
  acesso_restrito_texto text,   -- texto livre tipo "Líderes e administradores"
  link text,
  setor setor_tipo,             -- null = módulo geral, aberto a todos
  locked boolean not null default false,
  ordem int not null default 0
);

-- Classificações de gravidade das sinalizações (Leve/Média/Grave/Crítica...),
-- 100% gerenciáveis pelo administrador — cores e nomes livres.
create table classificacoes_sinalizacao (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor text not null default '#B4881F'
);

-- Sinalizações de colaboradores (não são sobre clientes).
create table sinalizacoes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  colaborador_id uuid references funcionarios(id) on delete set null,
  colaborador_nome text,               -- guardado também em texto (histórico caso o funcionário seja removido)
  setor setor_tipo not null,
  classificacao_id uuid references classificacoes_sinalizacao(id) on delete set null,
  status sinalizacao_status not null default 'aberta',
  descricao text,
  autor_id uuid references funcionarios(id) on delete set null,
  criado_em timestamptz not null default now()
);
create index idx_sinalizacoes_setor on sinalizacoes(setor);
create index idx_sinalizacoes_colaborador on sinalizacoes(colaborador_id);

select '✅ Migração 0002 concluída com sucesso.' as status;
