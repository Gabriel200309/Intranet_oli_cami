-- ============================================================================
-- 0005_schema_avisos_manutencao.sql
-- Avisos, audiências, funcionário do mês, links/ferramentas úteis, e o
-- sistema de manutenção inteligente (relatos de erro + análises da IA).
-- ============================================================================

create table avisos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  prioridade aviso_prioridade not null default 'media',
  data_exibicao text,     -- formato livre "DD/MM", igual ao protótipo original
  fixado boolean not null default false,
  criado_em timestamptz not null default now()
);

create table audiencias (
  id uuid primary key default gen_random_uuid(),
  hora time not null,
  cliente text not null,
  advogado text,
  status audiencia_status not null default 'Confirmada',
  data date not null default current_date
);

-- Singleton (uma linha "atual" por vez) — o admin sempre faz update na
-- mesma linha em vez de inserir várias.
create table funcionario_mes (
  id boolean primary key default true,
  nome text,
  cargo text,
  motivo text,
  mensagem text,
  atualizado_em timestamptz not null default now(),
  constraint chk_singleton check (id)
);
insert into funcionario_mes (id, nome, cargo, motivo, mensagem) values (true, null, null, null, null);

create table links_uteis (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  url text not null
);

create table ferramentas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  url text
);

-- ---------------------------------------------------------------------------
-- Manutenção Inteligente (Claude / Anthropic) — chamado sempre pelo backend
-- (Edge Function), nunca diretamente do navegador. Ver
-- supabase/functions/analisar-erro-ia/index.ts
-- ---------------------------------------------------------------------------
create table bug_reports (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid references funcionarios(id) on delete set null,
  nome_usuario text,
  setor setor_tipo,
  sistema_modulo text,
  titulo text not null,
  descricao text not null,
  prioridade text,
  data_hora timestamptz not null default now(),
  url_pagina text,
  console_logs jsonb default '[]'::jsonb,
  js_errors jsonb default '[]'::jsonb,
  stack_trace text,
  request_info jsonb,
  anexos jsonb default '[]'::jsonb,   -- metadados; os arquivos ficam no Storage (bucket "relatos-erro")
  status bug_status not null default 'pendente'
);
create index idx_bugreports_funcionario on bug_reports(funcionario_id);

create table analises_ia (
  id uuid primary key default gen_random_uuid(),
  relato_id uuid not null references bug_reports(id) on delete cascade,
  provider text not null,
  modelo text,
  diagnostico text,
  causa_provavel text,
  solucao_sugerida text,
  arquivos_afetados text[] default '{}',
  codigo_proposto text,
  grau_confianca int,
  relatorio_tecnico text,
  criado_em timestamptz not null default now()
);
create index idx_analises_relato on analises_ia(relato_id);

select '✅ Migração 0005 concluída com sucesso.' as status;
