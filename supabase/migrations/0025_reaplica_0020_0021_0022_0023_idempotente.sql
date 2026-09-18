-- ============================================================================
-- 0025_reaplica_0020_0021_0022_0023_idempotente.sql
-- O painel de Eficiência está mostrando "a coluna 'resolucao' ainda não
-- existe no banco" (e outros avisos parecidos) porque as migrações 0020 a
-- 0023 ficaram parcialmente aplicadas no banco real: algumas peças existem
-- (ex.: alerta_enviado_em), outras não (ex.: resolucao). Rodar os arquivos
-- 0020/0021/0022/0023 originais de novo, do jeito que estão, iria falhar
-- em "já existe" na primeira peça já aplicada (ex.: "create table
-- atendimento_chat_eventos" ou "create policy ...") e parar aí, sem chegar
-- nas peças que realmente faltam.
--
-- Esta migração reescreve o CONTEÚDO de 0020+0021+0022+0023 de forma
-- 100% idempotente (com "if not exists"/"drop ... if exists" em cada
-- create), então pode ser rodada com segurança nesse banco não importa
-- quais dessas peças já existiam — só cria/adiciona o que ainda falta,
-- nunca duplica nem apaga nada.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0020 — tipo atendimento_resolucao + colunas novas em atendimentos_chat
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'atendimento_resolucao') then
    create type atendimento_resolucao as enum ('pendente', 'resolvida', 'nao_resolvida');
  end if;
end $$;

alter type atendimento_status add value if not exists 'alerta_enviado' after 'aguardando';
alter type atendimento_status add value if not exists 'em_atendimento' after 'alerta_enviado';

alter table atendimentos_chat add column if not exists alerta_enviado_em timestamptz;
alter table atendimentos_chat add column if not exists resolvido_em timestamptz;
alter table atendimentos_chat add column if not exists resolucao atendimento_resolucao not null default 'pendente';
comment on column atendimentos_chat.alerta_enviado_em is 'Data/hora em que o alerta foi enviado ao grupo — registrada separadamente, apenas para acompanhamento do processo. NÃO entra no cálculo do tempo de resposta.';
comment on column atendimentos_chat.resolucao is 'Resposta explícita à pergunta "A demanda foi resolvida?" — pendente/resolvida/nao_resolvida. Independente do status do fluxo.';
comment on column atendimentos_chat.resolvido_em is 'Data/hora em que resolucao passou a "resolvida" (mantida automaticamente por trigger).';

-- ---------------------------------------------------------------------------
-- 0020 — linha do tempo (histórico append-only)
-- ---------------------------------------------------------------------------
create table if not exists atendimento_chat_eventos (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references atendimentos_chat(id) on delete cascade,
  evento text not null,
  ocorrido_em timestamptz not null default now(),
  autor_id uuid references funcionarios(id) on delete set null,
  criado_em timestamptz not null default now()
);
comment on table atendimento_chat_eventos is 'Linha do tempo (histórico append-only) de cada atendimento. Nunca é editado nem apagado no uso normal do sistema.';
create index if not exists idx_atendimento_chat_eventos_atendimento on atendimento_chat_eventos(atendimento_id, ocorrido_em);

-- ---------------------------------------------------------------------------
-- 0020 — vínculo opcional avaliação/referência <-> atendimento
-- ---------------------------------------------------------------------------
alter table avaliacoes_qualidade add column if not exists atendimento_chat_id uuid references atendimentos_chat(id) on delete set null;
create index if not exists idx_avaliacoes_qualidade_atendimento on avaliacoes_qualidade(atendimento_chat_id);

alter table atendimentos_referencia add column if not exists atendimento_chat_id uuid references atendimentos_chat(id) on delete set null;
create index if not exists idx_atendimentos_referencia_atendimento on atendimentos_referencia(atendimento_chat_id);

-- ---------------------------------------------------------------------------
-- 0020 — triggers (funções são "create or replace", já idempotentes; os
-- triggers em si precisam de "drop if exists" antes de recriar)
-- ---------------------------------------------------------------------------
create or replace function trg_atendimento_chat_eventos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into atendimento_chat_eventos (atendimento_id, evento, ocorrido_em, autor_id)
    values (new.id, 'Atendimento registrado — cliente enviou mensagem/solicitação' || case when new.cliente is not null then ' (' || new.cliente || ')' else '' end, new.iniciado_em, new.registrado_por);
    return new;
  end if;

  if new.alerta_enviado_em is distinct from old.alerta_enviado_em and new.alerta_enviado_em is not null then
    insert into atendimento_chat_eventos (atendimento_id, evento, ocorrido_em)
    values (new.id, 'Alerta enviado ao grupo', new.alerta_enviado_em);
  end if;

  if new.colaborador_id is distinct from old.colaborador_id then
    insert into atendimento_chat_eventos (atendimento_id, evento, ocorrido_em)
    values (new.id, 'Atendimento assumido por ' || coalesce(new.colaborador_nome, 'colaborador removido')
      || case when old.colaborador_id is not null then ' (antes: ' || coalesce(old.colaborador_nome, 'colaborador removido') || ')' else '' end,
      now());
  end if;

  if new.primeira_resposta_em is distinct from old.primeira_resposta_em and new.primeira_resposta_em is not null then
    insert into atendimento_chat_eventos (atendimento_id, evento, ocorrido_em)
    values (new.id, 'Cliente respondido' || case when new.colaborador_nome is not null then ' por ' || new.colaborador_nome else '' end, new.primeira_resposta_em);
  end if;

  if new.resolucao is distinct from old.resolucao then
    if new.resolucao = 'resolvida' then
      insert into atendimento_chat_eventos (atendimento_id, evento, ocorrido_em)
      values (new.id, 'Demanda resolvida', coalesce(new.resolvido_em, now()));
    elsif new.resolucao = 'nao_resolvida' then
      insert into atendimento_chat_eventos (atendimento_id, evento, ocorrido_em)
      values (new.id, 'Demanda marcada como NÃO resolvida', now());
    else
      insert into atendimento_chat_eventos (atendimento_id, evento, ocorrido_em)
      values (new.id, 'Resolução revertida para pendente', now());
    end if;
  end if;

  if new.finalizado_em is distinct from old.finalizado_em and new.finalizado_em is not null then
    insert into atendimento_chat_eventos (atendimento_id, evento, ocorrido_em)
    values (new.id, 'Atendimento encerrado', new.finalizado_em);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_atendimentos_chat_eventos on atendimentos_chat;
create trigger trg_atendimentos_chat_eventos
after insert or update on atendimentos_chat
for each row execute function trg_atendimento_chat_eventos();

create or replace function trg_atendimento_chat_status_auto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.alerta_enviado_em is not null and old.alerta_enviado_em is null and new.status = 'aguardando' then
    new.status := 'alerta_enviado';
  end if;
  if new.primeira_resposta_em is not null and old.primeira_resposta_em is null
     and new.status in ('aguardando', 'alerta_enviado', 'em_atendimento') then
    new.status := 'respondido';
  end if;
  if new.finalizado_em is not null and old.finalizado_em is null then
    new.status := 'finalizado';
  end if;
  return new;
end;
$$;
-- (o trigger "trg_atendimentos_chat_status_auto" de 0017 já aponta para
-- esta função por nome — create or replace acima é suficiente.)

create or replace function trg_atendimento_chat_resolucao_auto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.resolucao = 'resolvida' and old.resolucao is distinct from 'resolvida' and new.resolvido_em is null then
    new.resolvido_em := now();
  elsif new.resolucao <> 'resolvida' and old.resolucao = 'resolvida' then
    new.resolvido_em := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_atendimentos_chat_resolucao_auto on atendimentos_chat;
create trigger trg_atendimentos_chat_resolucao_auto
before update on atendimentos_chat
for each row execute function trg_atendimento_chat_resolucao_auto();

-- ---------------------------------------------------------------------------
-- 0020 — RLS
-- ---------------------------------------------------------------------------
alter table atendimento_chat_eventos enable row level security;

create or replace function fn_pode_ver_atendimento_chat(p_atendimento atendimentos_chat)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select fn_is_admin()
    or fn_permissao_setor(fn_meu_setor(), 'ver_sinalizacoes_todas')
    or fn_is_gestor(p_atendimento.setor)
    or p_atendimento.registrado_por = auth.uid()
    or p_atendimento.colaborador_id = auth.uid();
$$;
create or replace function fn_pode_gerenciar_atendimento_chat(p_atendimento atendimentos_chat)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select fn_is_admin()
    or p_atendimento.registrado_por = auth.uid()
    or p_atendimento.colaborador_id = auth.uid()
    or fn_is_gestor(p_atendimento.setor);
$$;

drop policy if exists atendimento_chat_eventos_select on atendimento_chat_eventos;
create policy atendimento_chat_eventos_select on atendimento_chat_eventos for select
  using (exists (
    select 1 from atendimentos_chat a where a.id = atendimento_chat_eventos.atendimento_id and fn_pode_ver_atendimento_chat(a)
  ));
drop policy if exists atendimento_chat_eventos_insert on atendimento_chat_eventos;
create policy atendimento_chat_eventos_insert on atendimento_chat_eventos for insert
  with check (exists (
    select 1 from atendimentos_chat a where a.id = atendimento_chat_eventos.atendimento_id and fn_pode_gerenciar_atendimento_chat(a)
  ));

drop policy if exists atendimentos_chat_update on atendimentos_chat;
create policy atendimentos_chat_update on atendimentos_chat for update
  using (fn_is_admin() or registrado_por = auth.uid() or colaborador_id = auth.uid() or fn_is_gestor(setor))
  with check (fn_is_admin() or registrado_por = auth.uid() or colaborador_id = auth.uid() or fn_is_gestor(setor));

-- ---------------------------------------------------------------------------
-- 0020 — backfill da linha do tempo (guardado com "not exists" para nunca
-- duplicar uma linha, mesmo que parte disto já tenha sido inserida antes)
-- ---------------------------------------------------------------------------
insert into atendimento_chat_eventos (atendimento_id, evento, ocorrido_em, autor_id)
select id, 'Atendimento registrado — cliente enviou mensagem/solicitação' || case when cliente is not null then ' (' || cliente || ')' else '' end, iniciado_em, registrado_por
from atendimentos_chat
where not exists (select 1 from atendimento_chat_eventos e where e.atendimento_id = atendimentos_chat.id);

insert into atendimento_chat_eventos (atendimento_id, evento, ocorrido_em)
select ac.id, 'Cliente respondido' || case when ac.colaborador_nome is not null then ' por ' || ac.colaborador_nome else '' end, ac.primeira_resposta_em
from atendimentos_chat ac
where ac.primeira_resposta_em is not null
  and not exists (
    select 1 from atendimento_chat_eventos e
    where e.atendimento_id = ac.id and e.ocorrido_em = ac.primeira_resposta_em and e.evento like 'Cliente respondido%'
  );

insert into atendimento_chat_eventos (atendimento_id, evento, ocorrido_em)
select ac.id, 'Atendimento encerrado', ac.finalizado_em
from atendimentos_chat ac
where ac.finalizado_em is not null
  and not exists (
    select 1 from atendimento_chat_eventos e
    where e.atendimento_id = ac.id and e.ocorrido_em = ac.finalizado_em and e.evento = 'Atendimento encerrado'
  );

update atendimentos_chat set resolucao = 'resolvida' where resolvido_em is not null and resolucao = 'pendente';

-- ---------------------------------------------------------------------------
-- 0021 — link do ChatGuru (já era idempotente, mantido igual)
-- ---------------------------------------------------------------------------
alter table atendimentos_chat add column if not exists link_chatguru text;
comment on column atendimentos_chat.link_chatguru is 'Link da conversa com o cliente no ChatGuru (opcional).';

-- ---------------------------------------------------------------------------
-- 0022 — catálogo de tipos de erro
-- ---------------------------------------------------------------------------
create table if not exists tipos_erro_sinalizacao (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  ordem smallint,
  criado_em timestamptz not null default now()
);
create index if not exists idx_tipos_erro_sinalizacao_ativo on tipos_erro_sinalizacao(ativo);

alter table tipos_erro_sinalizacao enable row level security;
drop policy if exists tipos_erro_sinalizacao_select on tipos_erro_sinalizacao;
create policy tipos_erro_sinalizacao_select on tipos_erro_sinalizacao for select using (auth.uid() is not null);
drop policy if exists tipos_erro_sinalizacao_admin_insert on tipos_erro_sinalizacao;
create policy tipos_erro_sinalizacao_admin_insert on tipos_erro_sinalizacao for insert with check (fn_is_admin());
drop policy if exists tipos_erro_sinalizacao_admin_update on tipos_erro_sinalizacao;
create policy tipos_erro_sinalizacao_admin_update on tipos_erro_sinalizacao for update using (fn_is_admin()) with check (fn_is_admin());
drop policy if exists tipos_erro_sinalizacao_admin_delete on tipos_erro_sinalizacao;
create policy tipos_erro_sinalizacao_admin_delete on tipos_erro_sinalizacao for delete using (fn_is_admin());

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

-- ---------------------------------------------------------------------------
-- 0023 — equipe do atendimento (já era idempotente, mantido igual). Só
-- adiciona o vínculo com "equipes" se essa tabela já existir (migração
-- 0018) — evita quebrar esta migração inteira num banco onde 0018 ainda
-- não foi aplicada; equipe_nome (sem FK) é sempre adicionada.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'equipes') then
    alter table atendimentos_chat add column if not exists equipe_id uuid references equipes(id) on delete set null;
    create index if not exists idx_atendimentos_chat_equipe_id on atendimentos_chat(equipe_id);
  end if;
end $$;
alter table atendimentos_chat add column if not exists equipe_nome text;

select '✅ Migração 0025 concluída com sucesso.' as status;
