-- ============================================================================
-- 0003_schema_metas_cursos.sql
-- Gestão de metas (Geral/Setor/Carteira) e módulo de Cursos e Oficinas (EAD).
-- ============================================================================

create table carteiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null
);

create table metas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  valor_meta numeric(14,2) not null default 0,
  valor_atingido numeric(14,2) not null default 0,
  data_inicial date,
  data_final date,
  tipo meta_tipo not null,
  setor setor_tipo,                              -- obrigatório quando tipo <> 'Geral'
  carteira_id uuid references carteiras(id) on delete set null,
  responsavel_id uuid references funcionarios(id) on delete set null,
  status meta_status not null default 'Em andamento',
  criado_em timestamptz not null default now(),
  constraint chk_meta_datas check (data_inicial is null or data_final is null or data_inicial <= data_final),
  constraint chk_meta_setor_coerente check (
    (tipo = 'Geral' and setor is null) or (tipo <> 'Geral' and setor is not null)
  )
);
create index idx_metas_setor on metas(setor);
create index idx_metas_responsavel on metas(responsavel_id);

-- ---------------------------------------------------------------------------
-- Cursos e Oficinas (EAD)
-- ---------------------------------------------------------------------------
create table cursos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tema text,
  descricao text,
  status curso_status not null default 'Rascunho',
  ordem int not null default 0,
  palestrante_nome text,
  palestrante_cargo text,
  palestrante_empresa text,
  palestrante_foto_url text,
  palestrante_linkedin text,
  palestrante_instagram text,
  palestrante_website text,
  palestrante_contato text,
  criado_em timestamptz not null default now()
);

create table aulas (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  titulo text not null,
  tipo aula_tipo not null default 'video',
  ordem int not null default 0,
  url text,               -- link externo OU caminho no Storage (bucket "cursos")
  duracao_min int
);
create index idx_aulas_curso on aulas(curso_id);

create table materiais_extras (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos(id) on delete cascade,
  nome text not null,
  url text not null
);
create index idx_materiais_curso on materiais_extras(curso_id);

-- Uma linha por aula concluída (fonte da verdade do progresso).
create table aula_conclusoes (
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  aula_id uuid not null references aulas(id) on delete cascade,
  concluido_em timestamptz not null default now(),
  primary key (funcionario_id, aula_id)
);

-- Resumo por (funcionário, curso) — mantido automaticamente por trigger
-- (ver 0008_triggers.sql) a partir de aula_conclusoes, para não recalcular
-- tudo toda vez que a tela precisa mostrar o progresso.
create table progresso_cursos (
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  curso_id uuid not null references cursos(id) on delete cascade,
  data_inicio timestamptz not null default now(),
  data_conclusao timestamptz,
  percentual int not null default 0,
  primary key (funcionario_id, curso_id)
);

select '✅ Migração 0003 concluída com sucesso.' as status;
