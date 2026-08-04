-- ============================================================================
-- 0004_schema_chat_notificacoes.sql
-- Chat interno (individual e grupos), aniversariantes, parabéns e a central
-- de notificações (usa o Realtime do Supabase — ver 0009_realtime.sql).
-- ============================================================================

create table chat_conversas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo chat_tipo not null default 'individual',
  descricao text,          -- ex.: cargo (individual) ou "Grupo · setor Financeiro"
  criado_em timestamptz not null default now()
);

-- Quem pertence a cada conversa. Para conversas individuais, os dois
-- participantes também entram aqui — assim a regra de visibilidade fica
-- igual para os dois tipos: "só vejo conversas das quais sou membro".
create table chat_membros (
  conversa_id uuid not null references chat_conversas(id) on delete cascade,
  funcionario_id uuid not null references funcionarios(id) on delete cascade,
  primary key (conversa_id, funcionario_id)
);

create table chat_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references chat_conversas(id) on delete cascade,
  remetente_id uuid references funcionarios(id) on delete set null,
  texto text not null,
  enviado_em timestamptz not null default now()
);
create index idx_mensagens_conversa on chat_mensagens(conversa_id, enviado_em);

-- ---------------------------------------------------------------------------
-- Aniversariantes e felicitações
-- ---------------------------------------------------------------------------
create table aniversariantes (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid references funcionarios(id) on delete set null,
  nome text not null,
  cargo text,
  data_aniversario text -- formato livre "DD/MM", igual ao protótipo original
);

create table parabens (
  id uuid primary key default gen_random_uuid(),
  aniversariante_id uuid not null references funcionarios(id) on delete cascade,
  remetente_id uuid not null references funcionarios(id) on delete cascade,
  enviado_em timestamptz not null default now(),
  -- Evita duplicidade do mesmo remetente para o mesmo aniversariante.
  -- Observação: isso é "uma vez para sempre"; um sistema real de produção
  -- talvez queira escopar por ano (ex.: unique(remetente_id, aniversariante_id, extract(year from enviado_em))).
  unique (remetente_id, aniversariante_id),
  check (aniversariante_id <> remetente_id)
);

create table notificacoes (
  id uuid primary key default gen_random_uuid(),
  destinatario_id uuid not null references funcionarios(id) on delete cascade,
  remetente_id uuid references funcionarios(id) on delete set null,
  tipo notificacao_tipo not null,
  texto text,                     -- usado só quando tipo = 'sistema'
  lida boolean not null default false,
  criado_em timestamptz not null default now()
);
create index idx_notificacoes_destinatario on notificacoes(destinatario_id, lida);

select '✅ Migração 0004 concluída com sucesso.' as status;
