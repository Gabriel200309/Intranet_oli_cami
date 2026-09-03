-- ============================================================================
-- 0019_computadores_manutencoes.sql
-- Controle de Computadores e Equipamentos: cadastro dos equipamentos de
-- informática do escritório, histórico de manutenções e controle de
-- computadores reserva.
--
-- Reaproveita 100% o que já existe: colaborador (funcionarios), setor
-- (setor_tipo/setores) e o padrão de RLS via fn_is_admin()/fn_is_gestor()
-- já usado em sinalizacoes/avaliacoes_qualidade/equipes. Nenhuma tabela ou
-- coluna existente é alterada, renomeada ou removida.
--
-- Migração 100% incremental e não destrutiva.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'computador_status') then
    create type computador_status as enum (
      'em_uso','disponivel','reserva','com_problema','em_manutencao','inativo','descartado'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'manutencao_status') then
    create type manutencao_status as enum (
      'aguardando_envio','enviado','em_diagnostico','aguardando_peca','em_reparo',
      'aguardando_retirada','concluida','sem_conserto'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Função auxiliar de permissão deste módulo — equivalente a
-- podeGerenciarComputadores() no front-end (ver js/computadores.js):
-- administradores e o setor de TI podem cadastrar/editar/registrar
-- manutenção; os demais colaboradores só têm leitura.
-- ---------------------------------------------------------------------------
create or replace function fn_pode_gerenciar_computadores()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select fn_is_admin() or fn_meu_setor() = 'TI';
$$;

-- ---------------------------------------------------------------------------
-- COMPUTADORES
-- ---------------------------------------------------------------------------
create table computadores (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,             -- "ID da máquina" (ex.: PC-023) — único, informado pelo cadastrante
  nome text not null,
  patrimonio text,
  marca text,
  modelo text,
  numero_serie text,
  sistema_operacional text,
  data_aquisicao date,

  colaborador_id uuid references funcionarios(id) on delete set null,
  colaborador_nome text,                   -- histórico (mesmo padrão de sinalizacoes.colaborador_nome)
  setor setor_tipo,                        -- preenchido automaticamente a partir do colaborador selecionado

  status computador_status not null default 'disponivel',
  eh_reserva boolean not null default false,  -- pertence ao "pool" de computadores reserva (independe do status operacional atual: um reserva emprestado fica com status em_uso, mas continua eh_reserva = true)
  localizacao text,
  observacoes text,

  criado_por uuid references funcionarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_por uuid references funcionarios(id) on delete set null,
  atualizado_em timestamptz not null default now()
);
comment on table computadores is 'Cadastro dos computadores/equipamentos de informática do escritório (Controle de Computadores e Manutenções).';
comment on column computadores.codigo is 'ID único da máquina (ex.: PC-023) — não pode se repetir.';
comment on column computadores.setor is 'Snapshot do setor do colaborador responsável no momento do vínculo; preservado mesmo que o colaborador troque de setor depois, para não reescrever histórico.';
create index idx_computadores_colaborador on computadores(colaborador_id);
create index idx_computadores_setor on computadores(setor);
create index idx_computadores_status on computadores(status);
create index idx_computadores_eh_reserva on computadores(eh_reserva);

-- ---------------------------------------------------------------------------
-- MANUTENCOES_COMPUTADOR — cada ocorrência de manutenção de um computador.
-- ---------------------------------------------------------------------------
create table manutencoes_computador (
  id uuid primary key default gen_random_uuid(),
  computador_id uuid not null references computadores(id) on delete cascade,

  -- Problema
  problema_data date not null default current_date,
  problema_relatado text not null,
  problema_descricao text,
  identificado_por text,
  colaborador_usava_id uuid references funcionarios(id) on delete set null,
  colaborador_usava_nome text,

  -- Encaminhamento
  envio_data date,
  tecnico_responsavel text,
  motivo_encaminhamento text,
  status manutencao_status not null default 'aguardando_envio',

  -- Serviço realizado
  diagnostico text,
  servico_executado text,
  pecas_substituidas text,
  componentes_instalados text,
  observacoes_tecnicas text,
  responsavel_manutencao text,

  -- Datas
  data_entrada date,
  data_inicio_reparo date,
  data_conclusao date,
  data_retorno date,
  previsao_retorno date,

  -- Custos (opcionais)
  valor_manutencao numeric(12,2),
  valor_pecas numeric(12,2),
  valor_mao_obra numeric(12,2),
  custo_total numeric(12,2) generated always as
    (coalesce(valor_manutencao,0) + coalesce(valor_pecas,0) + coalesce(valor_mao_obra,0)) stored,

  criado_por uuid references funcionarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_por uuid references funcionarios(id) on delete set null,
  atualizado_em timestamptz not null default now()
);
comment on table manutencoes_computador is 'Histórico de manutenções de cada computador — nunca é apagado quando uma nova manutenção é registrada.';
create index idx_manutencoes_computador_computador on manutencoes_computador(computador_id);
create index idx_manutencoes_computador_status on manutencoes_computador(status);

-- ---------------------------------------------------------------------------
-- HISTORICO_COMPUTADOR — linha do tempo (append-only) de cada computador:
-- cadastro, trocas de status, aberturas/atualizações/conclusões de
-- manutenção. Nunca é apagado nem sobrescrito pelo uso normal do sistema.
-- ---------------------------------------------------------------------------
create table historico_computador (
  id uuid primary key default gen_random_uuid(),
  computador_id uuid not null references computadores(id) on delete cascade,
  manutencao_id uuid references manutencoes_computador(id) on delete set null,
  data date not null default current_date,
  evento text not null,
  autor_id uuid references funcionarios(id) on delete set null,
  criado_em timestamptz not null default now()
);
comment on table historico_computador is 'Linha do tempo completa do computador (histórico de manutenções e trocas de status). Registro append-only — não é editado nem apagado no uso normal do sistema.';
create index idx_historico_computador_computador on historico_computador(computador_id, criado_em);

-- ---------------------------------------------------------------------------
-- COMPUTADOR_RESERVA_ATRIBUICOES — controle de uso temporário de
-- computador reserva enquanto o principal está em manutenção.
-- ---------------------------------------------------------------------------
create table computador_reserva_atribuicoes (
  id uuid primary key default gen_random_uuid(),
  computador_reserva_id uuid not null references computadores(id) on delete cascade,
  computador_principal_id uuid references computadores(id) on delete set null,
  colaborador_id uuid references funcionarios(id) on delete set null,
  colaborador_nome text,
  entregue_em date not null default current_date,
  devolvido_em date,
  devolvido_por uuid references funcionarios(id) on delete set null,
  observacoes text,
  criado_por uuid references funcionarios(id) on delete set null,
  criado_em timestamptz not null default now()
);
comment on table computador_reserva_atribuicoes is 'Quem está usando um computador reserva, enquanto seu computador principal está em manutenção. devolvido_em nulo = atribuição ativa.';
create index idx_reserva_atrib_reserva on computador_reserva_atribuicoes(computador_reserva_id);
create index idx_reserva_atrib_principal on computador_reserva_atribuicoes(computador_principal_id);
create index idx_reserva_atrib_colaborador on computador_reserva_atribuicoes(colaborador_id);

-- ---------------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------------

-- Mantém atualizado_em coerente em updates (mesmo padrão de auditoria usado
-- em outras tabelas do sistema).
create or replace function trg_computadores_atualizado_em()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;
create trigger trg_computadores_upd
before update on computadores
for each row execute function trg_computadores_atualizado_em();

create trigger trg_manutencoes_computador_upd
before update on manutencoes_computador
for each row execute function trg_computadores_atualizado_em();

-- Registra automaticamente no histórico do computador toda vez que o
-- STATUS do computador muda — garante que a linha do tempo (seção 6/7 do
-- escopo) nunca dependa de alguém lembrar de registrar manualmente.
create or replace function trg_historico_status_computador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into historico_computador (computador_id, evento, autor_id)
    values (new.id, 'Computador cadastrado — status inicial: ' || new.status, new.criado_por);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into historico_computador (computador_id, evento, autor_id)
    values (new.id, 'Status alterado de "' || old.status || '" para "' || new.status || '"', new.atualizado_por);
  end if;
  return new;
end;
$$;
create trigger trg_computadores_historico
after insert or update on computadores
for each row execute function trg_historico_status_computador();

-- Registra no histórico a abertura e a conclusão de cada manutenção.
create or replace function trg_historico_manutencao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into historico_computador (computador_id, manutencao_id, data, evento, autor_id)
    values (new.computador_id, new.id, new.problema_data, 'Problema registrado: ' || new.problema_relatado, new.criado_por);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into historico_computador (computador_id, manutencao_id, evento, autor_id)
    values (new.computador_id, new.id, 'Manutenção — status alterado de "' || old.status || '" para "' || new.status || '"', new.atualizado_por);
  end if;
  return new;
end;
$$;
create trigger trg_manutencoes_historico
after insert or update on manutencoes_computador
for each row execute function trg_historico_manutencao();

-- Registra entrega/devolução de computador reserva no histórico dos dois
-- computadores envolvidos (reserva e principal).
create or replace function trg_historico_reserva_atribuicao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into historico_computador (computador_id, data, evento, autor_id)
    values (new.computador_reserva_id, new.entregue_em, 'Entregue como reserva para ' || coalesce(new.colaborador_nome, 'colaborador'), new.criado_por);
    if new.computador_principal_id is not null then
      insert into historico_computador (computador_id, data, evento, autor_id)
      values (new.computador_principal_id, new.entregue_em, 'Colaborador passou a usar computador reserva enquanto este está em manutenção', new.criado_por);
    end if;
  elsif tg_op = 'UPDATE' and new.devolvido_em is distinct from old.devolvido_em and new.devolvido_em is not null then
    insert into historico_computador (computador_id, data, evento, autor_id)
    values (new.computador_reserva_id, new.devolvido_em, 'Computador reserva devolvido', new.devolvido_por);
  end if;
  return new;
end;
$$;
create trigger trg_reserva_atribuicoes_historico
after insert or update on computador_reserva_atribuicoes
for each row execute function trg_historico_reserva_atribuicao();

-- ---------------------------------------------------------------------------
-- RLS — leitura liberada a qualquer colaborador autenticado (é um cadastro
-- interno de equipamentos, não um dado sensível por colaborador); escrita
-- restrita a administradores e ao setor de TI (fn_pode_gerenciar_computadores).
-- O histórico é append-only: ninguém tem policy de update/delete — só o
-- administrador pode apagar uma linha em caso de erro grave de digitação.
-- ---------------------------------------------------------------------------
alter table computadores enable row level security;
alter table manutencoes_computador enable row level security;
alter table historico_computador enable row level security;
alter table computador_reserva_atribuicoes enable row level security;

create policy computadores_select on computadores for select using (auth.uid() is not null);
create policy computadores_insert on computadores for insert with check (fn_pode_gerenciar_computadores());
create policy computadores_update on computadores for update
  using (fn_pode_gerenciar_computadores()) with check (fn_pode_gerenciar_computadores());
create policy computadores_delete on computadores for delete using (fn_is_admin());

create policy manutencoes_computador_select on manutencoes_computador for select using (auth.uid() is not null);
create policy manutencoes_computador_insert on manutencoes_computador for insert with check (fn_pode_gerenciar_computadores());
create policy manutencoes_computador_update on manutencoes_computador for update
  using (fn_pode_gerenciar_computadores()) with check (fn_pode_gerenciar_computadores());
create policy manutencoes_computador_delete on manutencoes_computador for delete using (fn_is_admin());

create policy historico_computador_select on historico_computador for select using (auth.uid() is not null);
create policy historico_computador_insert on historico_computador for insert with check (fn_pode_gerenciar_computadores());
create policy historico_computador_delete on historico_computador for delete using (fn_is_admin());

create policy reserva_atribuicoes_select on computador_reserva_atribuicoes for select using (auth.uid() is not null);
create policy reserva_atribuicoes_insert on computador_reserva_atribuicoes for insert with check (fn_pode_gerenciar_computadores());
create policy reserva_atribuicoes_update on computador_reserva_atribuicoes for update
  using (fn_pode_gerenciar_computadores()) with check (fn_pode_gerenciar_computadores());
create policy reserva_atribuicoes_delete on computador_reserva_atribuicoes for delete using (fn_is_admin());

select '✅ Migração 0019 concluída com sucesso.' as status;
