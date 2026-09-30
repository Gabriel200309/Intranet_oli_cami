-- ============================================================================
-- 0028_clientes.sql
-- Cadastro de Clientes e Prospects + ficha única do cliente.
--
-- Até aqui "cliente" era só um texto livre digitado no atendimento
-- (atendimentos_chat.cliente) e na audiência (audiencias.cliente) — não
-- havia um cadastro que ligasse essas informações. Esta migração cria:
--
--   - clientes              → prospects e clientes (formulários distintos no
--                             front-end), com responsável, carteira, origem,
--                             contatos e links para os sistemas externos
--                             (AdvBox, ChatGuru, CRM comercial, pasta de
--                             documentos);
--   - etiquetas_cliente     → etiquetas coloridas usadas como filtro;
--   - cliente_etiquetas     → etiquetas de cada cliente (N:N);
--   - cliente_eventos       → linha do tempo append-only do cliente, gerada
--                             só pelos triggers abaixo (mesmo padrão de
--                             atendimento_chat_eventos / historico_computador);
--   - atendimentos_chat.cliente_id e audiencias.cliente_id → vínculo
--     opcional com o cadastro (o texto "cliente" continua existindo e
--     funcionando como antes);
--   - permissoes_setor.ver_clientes → nova permissão por setor, editável em
--     Administração > Permissões de acesso.
--
-- Quem vê e edita clientes: administrador, setores com a permissão
-- "ver_clientes" (liberada por padrão para Acordos, Jurídico, Financeiro e
-- Diretoria) e o próprio responsável pelo cliente. Só o administrador exclui.
--
-- Migração 100% incremental, não destrutiva e idempotente (pode ser rodada
-- mais de uma vez): nenhuma tabela ou coluna existente é alterada,
-- renomeada ou removida.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Permissão por setor. A coluna nasce com os valores padrão só na primeira
-- execução — rodar de novo nunca sobrescreve o que o administrador mudou
-- depois em Administração > Permissões de acesso.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'permissoes_setor' and column_name = 'ver_clientes'
  ) then
    alter table permissoes_setor add column ver_clientes boolean not null default false;
    update permissoes_setor set ver_clientes = true
      where setor in ('Acordos', 'Jurídico', 'Financeiro', 'Diretoria');
  end if;
end $$;

-- Equivalente a podeVerClientes() no front-end (ver js/clientes.js).
create or replace function fn_pode_ver_clientes()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select fn_is_admin() or fn_permissao_setor(fn_meu_setor(), 'ver_clientes');
$$;

-- ---------------------------------------------------------------------------
-- CLIENTES
-- ---------------------------------------------------------------------------
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'prospect' check (tipo in ('prospect', 'cliente')),
  nome text not null check (btrim(nome) <> ''),
  pessoa text not null default 'fisica' check (pessoa in ('fisica', 'juridica')),
  documento text check (documento is null or documento ~ '^([0-9]{11}|[0-9]{14})$'), -- CPF (11) ou CNPJ (14), só dígitos
  email text,
  telefone text,
  endereco text,

  origem text,              -- como chegou ao escritório (indicação, CRM comercial, site...)
  interesse text,           -- prospect: demanda/assunto de interesse
  proximo_contato date,     -- prospect: data combinada para o próximo contato

  carteira_id uuid references carteiras(id) on delete set null,
  responsavel_id uuid references funcionarios(id) on delete set null,

  link_advbox text,
  link_chatguru text,
  link_crm text,
  link_pasta text,          -- pasta de documentos do cliente (Drive/OneDrive/servidor)
  observacoes text,

  convertido_em timestamptz, -- quando deixou de ser prospect e virou cliente (preenchido por trigger)
  criado_por uuid references funcionarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_por uuid references funcionarios(id) on delete set null,
  atualizado_em timestamptz not null default now()
);
comment on table clientes is 'Cadastro de clientes e prospects (ficha única do cliente). tipo = prospect | cliente.';
comment on column clientes.documento is 'CPF (11 dígitos) ou CNPJ (14 dígitos), só números. Único quando preenchido.';
comment on column clientes.convertido_em is 'Preenchido automaticamente (trigger) quando o prospect é convertido em cliente.';

create unique index if not exists idx_clientes_documento_unico on clientes(documento) where documento is not null;
create index if not exists idx_clientes_tipo on clientes(tipo);
create index if not exists idx_clientes_responsavel on clientes(responsavel_id);
create index if not exists idx_clientes_carteira on clientes(carteira_id);
create index if not exists idx_clientes_nome on clientes(lower(nome));

-- ---------------------------------------------------------------------------
-- ETIQUETAS
-- ---------------------------------------------------------------------------
create table if not exists etiquetas_cliente (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (btrim(nome) <> ''),
  cor text not null default '#B4881F' check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  criado_em timestamptz not null default now()
);
comment on table etiquetas_cliente is 'Etiquetas coloridas dos clientes, usadas como filtro na tela de Clientes.';

create table if not exists cliente_etiquetas (
  cliente_id uuid not null references clientes(id) on delete cascade,
  etiqueta_id uuid not null references etiquetas_cliente(id) on delete cascade,
  primary key (cliente_id, etiqueta_id)
);
create index if not exists idx_cliente_etiquetas_etiqueta on cliente_etiquetas(etiqueta_id);

-- ---------------------------------------------------------------------------
-- LINHA DO TEMPO (append-only, gerada pelos triggers)
-- ---------------------------------------------------------------------------
create table if not exists cliente_eventos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  evento text not null,
  ocorrido_em timestamptz not null default now(),
  autor_id uuid references funcionarios(id) on delete set null
);
comment on table cliente_eventos is 'Linha do tempo do cliente (cadastro, conversão, troca de responsável/carteira, etiquetas). Gerada só por triggers.';
create index if not exists idx_cliente_eventos_cliente on cliente_eventos(cliente_id, ocorrido_em);

-- ---------------------------------------------------------------------------
-- VÍNCULO OPCIONAL de atendimentos e audiências com o cadastro. O campo de
-- texto "cliente" continua existindo — registros antigos, sem vínculo,
-- seguem funcionando e aparecem na ficha por correspondência de nome.
-- ---------------------------------------------------------------------------
alter table atendimentos_chat add column if not exists cliente_id uuid references clientes(id) on delete set null;
alter table audiencias add column if not exists cliente_id uuid references clientes(id) on delete set null;
create index if not exists idx_atendimentos_chat_cliente on atendimentos_chat(cliente_id);
create index if not exists idx_audiencias_cliente on audiencias(cliente_id);
comment on column atendimentos_chat.cliente_id is 'Cliente cadastrado (tabela clientes) — opcional; o texto em "cliente" continua sendo gravado.';
comment on column audiencias.cliente_id is 'Cliente cadastrado (tabela clientes) — opcional; o texto em "cliente" continua sendo gravado.';

-- ---------------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------------
-- Auditoria: quem criou/alterou vem sempre do usuário autenticado (nunca do
-- que o navegador mandou), atualizado_em é mantido e convertido_em é
-- preenchido na conversão prospect → cliente.
create or replace function trg_clientes_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.criado_por := auth.uid();
      new.atualizado_por := auth.uid();
    end if;
    new.criado_em := now();
    new.atualizado_em := now();
    new.convertido_em := null;
  else
    if auth.uid() is not null then
      new.atualizado_por := auth.uid();
    end if;
    new.criado_por := old.criado_por;
    new.criado_em := old.criado_em;
    new.atualizado_em := now();
    if old.tipo = 'prospect' and new.tipo = 'cliente' then
      new.convertido_em := now();
    elsif new.tipo = 'prospect' then
      new.convertido_em := null;
    else
      new.convertido_em := old.convertido_em;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clientes_auditoria on clientes;
create trigger trg_clientes_auditoria
before insert or update on clientes
for each row execute function trg_clientes_auditoria();

-- Linha do tempo: cadastro, conversão, troca de responsável e de carteira.
create or replace function trg_clientes_eventos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_autor uuid := coalesce(auth.uid(), new.atualizado_por);
  v_nome text;
begin
  if tg_op = 'INSERT' then
    insert into cliente_eventos (cliente_id, evento, autor_id)
    values (new.id, case when new.tipo = 'cliente' then 'Cadastrado como cliente' else 'Cadastrado como prospect' end, coalesce(auth.uid(), new.criado_por));
    return new;
  end if;

  if new.tipo is distinct from old.tipo then
    insert into cliente_eventos (cliente_id, evento, autor_id)
    values (new.id, case when new.tipo = 'cliente' then 'Convertido de prospect em cliente' else 'Voltou a ser prospect' end, v_autor);
  end if;

  if new.responsavel_id is distinct from old.responsavel_id then
    select nome into v_nome from funcionarios where id = new.responsavel_id;
    insert into cliente_eventos (cliente_id, evento, autor_id)
    values (new.id, case when new.responsavel_id is null then 'Responsável removido' else 'Responsável alterado para ' || coalesce(v_nome, 'colaborador removido') end, v_autor);
  end if;

  if new.carteira_id is distinct from old.carteira_id then
    select nome into v_nome from carteiras where id = new.carteira_id;
    insert into cliente_eventos (cliente_id, evento, autor_id)
    values (new.id, case when new.carteira_id is null then 'Removido da carteira' else 'Carteira alterada para ' || coalesce(v_nome, 'carteira removida') end, v_autor);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_clientes_eventos on clientes;
create trigger trg_clientes_eventos
after insert or update on clientes
for each row execute function trg_clientes_eventos();

-- Etiquetas adicionadas/removidas também entram na linha do tempo.
create or replace function trg_cliente_etiquetas_eventos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  if tg_op = 'INSERT' then
    select nome into v_nome from etiquetas_cliente where id = new.etiqueta_id;
    insert into cliente_eventos (cliente_id, evento, autor_id)
    values (new.cliente_id, 'Etiqueta adicionada: ' || coalesce(v_nome, '—'), auth.uid());
    return new;
  end if;
  -- Remoção em cascata (cliente ou etiqueta excluídos): não há o que registrar.
  if exists (select 1 from clientes where id = old.cliente_id)
     and exists (select 1 from etiquetas_cliente where id = old.etiqueta_id) then
    select nome into v_nome from etiquetas_cliente where id = old.etiqueta_id;
    insert into cliente_eventos (cliente_id, evento, autor_id)
    values (old.cliente_id, 'Etiqueta removida: ' || coalesce(v_nome, '—'), auth.uid());
  end if;
  return old;
end;
$$;

drop trigger if exists trg_cliente_etiquetas_eventos on cliente_etiquetas;
create trigger trg_cliente_etiquetas_eventos
after insert or delete on cliente_etiquetas
for each row execute function trg_cliente_etiquetas_eventos();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table clientes enable row level security;
alter table etiquetas_cliente enable row level security;
alter table cliente_etiquetas enable row level security;
alter table cliente_eventos enable row level security;

drop policy if exists clientes_select on clientes;
create policy clientes_select on clientes for select
  using (fn_pode_ver_clientes() or responsavel_id = auth.uid());
drop policy if exists clientes_insert on clientes;
create policy clientes_insert on clientes for insert
  with check (fn_pode_ver_clientes());
drop policy if exists clientes_update on clientes;
create policy clientes_update on clientes for update
  using (fn_pode_ver_clientes() or responsavel_id = auth.uid())
  with check (fn_pode_ver_clientes() or responsavel_id = auth.uid());
drop policy if exists clientes_delete on clientes;
create policy clientes_delete on clientes for delete
  using (fn_is_admin());

drop policy if exists etiquetas_cliente_select on etiquetas_cliente;
create policy etiquetas_cliente_select on etiquetas_cliente for select
  using (auth.uid() is not null);
drop policy if exists etiquetas_cliente_insert on etiquetas_cliente;
create policy etiquetas_cliente_insert on etiquetas_cliente for insert
  with check (fn_pode_ver_clientes());
drop policy if exists etiquetas_cliente_update on etiquetas_cliente;
create policy etiquetas_cliente_update on etiquetas_cliente for update
  using (fn_pode_ver_clientes()) with check (fn_pode_ver_clientes());
drop policy if exists etiquetas_cliente_delete on etiquetas_cliente;
create policy etiquetas_cliente_delete on etiquetas_cliente for delete
  using (fn_is_admin());

-- Etiquetas de um cliente: visíveis/editáveis por quem vê/edita o cliente
-- (o "exists" em clientes já passa pela RLS de clientes).
drop policy if exists cliente_etiquetas_select on cliente_etiquetas;
create policy cliente_etiquetas_select on cliente_etiquetas for select
  using (exists (select 1 from clientes c where c.id = cliente_id));
drop policy if exists cliente_etiquetas_insert on cliente_etiquetas;
create policy cliente_etiquetas_insert on cliente_etiquetas for insert
  with check (exists (select 1 from clientes c where c.id = cliente_id));
drop policy if exists cliente_etiquetas_delete on cliente_etiquetas;
create policy cliente_etiquetas_delete on cliente_etiquetas for delete
  using (exists (select 1 from clientes c where c.id = cliente_id));

-- Linha do tempo: leitura para quem vê o cliente; escrita só pelos
-- triggers (security definer) — nenhuma policy de insert para usuários
-- comuns, para ninguém forjar o histórico.
drop policy if exists cliente_eventos_select on cliente_eventos;
create policy cliente_eventos_select on cliente_eventos for select
  using (exists (select 1 from clientes c where c.id = cliente_id));
drop policy if exists cliente_eventos_insert on cliente_eventos;
create policy cliente_eventos_insert on cliente_eventos for insert
  with check (fn_is_admin());
drop policy if exists cliente_eventos_delete on cliente_eventos;
create policy cliente_eventos_delete on cliente_eventos for delete
  using (fn_is_admin());

select '✅ Migração 0028 concluída com sucesso.' as status;
