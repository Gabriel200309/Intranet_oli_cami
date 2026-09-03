-- ============================================================================
-- 0020_atendimentos_historico_avaliacao.sql
-- Ajustes no Registro de Atendimentos (0017): vincula alerta enviado,
-- resposta, resolução e avaliação ao MESMO atendimento — em vez de tratados
-- como informações soltas — e cria uma linha do tempo (histórico
-- append-only) para cada atendimento, no mesmo padrão já usado em
-- historico_computador (0019).
--
-- Reaproveita 100% o que já existe: atendimentos_chat (0017) continua
-- sendo o registro principal — só ganha colunas novas; avaliacoes_qualidade
-- e atendimentos_referencia (0016) continuam existindo exatamente como
-- estão, só ganham um vínculo OPCIONAL de volta para o atendimento que as
-- originou. Nenhuma tabela, coluna, view ou política existente é removida.
--
-- REGRA PRINCIPAL de tempo: "tempo de resposta" é sempre
-- primeira_resposta_em - iniciado_em (mensagem do cliente até a resposta do
-- colaborador), INDEPENDENTE do horário do alerta — o alerta é registrado
-- à parte (alerta_enviado_em), só para acompanhamento do processo. A
-- resolução da demanda ("A demanda foi resolvida? Sim/Não/Pendente") é uma
-- pergunta própria, na coluna "resolucao" — nunca inferida de "respondido".
--
-- Migração 100% incremental e não destrutiva:
--   - "aguardando"/"respondido"/"finalizado" (enum atendimento_status já
--     existente) continuam válidos e são apenas reapresentados na
--     interface como "Pendente"/"Respondido"/"Encerrado" — nenhum registro
--     antigo precisa ser reescrito;
--   - as colunas novas são todas opcionais (NULL por padrão), então todo
--     atendimento já cadastrado continua funcionando normalmente;
--   - os vínculos novos de avaliacoes_qualidade/atendimentos_referencia
--     para atendimentos_chat são NULLABLE — registros antigos (avaliação
--     geral do colaborador, sem um atendimento específico) continuam
--     válidos, só não apontam para nenhum atendimento.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Novos estados do atendimento — "Respondido" não é mais o mesmo que
-- "Resolvido". Só ADICIONA valores ao enum já existente (nunca remove/
-- renomeia), para não invalidar nenhuma linha já gravada.
-- Importante: por restrição do Postgres, um valor de enum recém-adicionado
-- não pode ser USADO (em DML) na mesma transação em que foi criado — por
-- isso nada mais neste arquivo referencia estes literais fora de definições
-- de função (que só são executadas depois, em outra transação).
-- ---------------------------------------------------------------------------
alter type atendimento_status add value if not exists 'alerta_enviado' after 'aguardando';
alter type atendimento_status add value if not exists 'em_atendimento' after 'alerta_enviado';

-- "A demanda foi resolvida?" é uma pergunta INDEPENDENTE do andamento do
-- atendimento (status) — por isso vira sua própria coluna/enum, não mais um
-- valor de status. Isso também deixa "Pendente"/"Resolvida"/"Não resolvida"
-- livres para serem alteradas a qualquer momento (inclusive revertidas) sem
-- interferir no status do fluxo (aguardando/alerta_enviado/.../finalizado).
create type atendimento_resolucao as enum ('pendente', 'resolvida', 'nao_resolvida');

-- ---------------------------------------------------------------------------
-- 2) Colunas novas em atendimentos_chat — nenhuma equivalente já existia:
--   alerta_enviado_em -> quando o alerta foi enviado ao grupo
--   resolvido_em       -> quando o problema foi REALMENTE solucionado
--                         (diferente de finalizado_em, que é só o
--                         encerramento/arquivamento do registro)
-- "assignedTo" do prompt já existe (colaborador_id/colaborador_nome) — não
-- duplicado.
-- ---------------------------------------------------------------------------
alter table atendimentos_chat add column if not exists alerta_enviado_em timestamptz;
alter table atendimentos_chat add column if not exists resolvido_em timestamptz;
alter table atendimentos_chat add column if not exists resolucao atendimento_resolucao not null default 'pendente';
comment on column atendimentos_chat.alerta_enviado_em is 'Data/hora em que o alerta foi enviado ao grupo — registrada separadamente, apenas para acompanhamento do processo. NÃO entra no cálculo do tempo de resposta (regra explícita: tempo de resposta = primeira_resposta_em - iniciado_em, independentemente do horário do alerta).';
comment on column atendimentos_chat.resolucao is 'Resposta explícita à pergunta "A demanda foi resolvida?" — pendente/resolvida/nao_resolvida. Independente do status do fluxo: "respondido" não implica "resolvida".';
comment on column atendimentos_chat.resolvido_em is 'Data/hora em que resolucao passou a "resolvida" (mantida automaticamente pelo trigger trg_atendimento_chat_resolucao_auto — nula sempre que resolucao não é "resolvida"). Diferente de primeira_resposta_em (só indica que alguém respondeu) e de finalizado_em (encerramento/arquivamento do registro).';
comment on column atendimentos_chat.status is 'aguardando="Pendente", alerta_enviado="Alerta enviado", em_atendimento="Em atendimento", respondido="Respondido", finalizado="Encerrado" (rótulos aplicados na interface — ver js/eficiencia-dashboard.js). A resolução da demanda é controlada separadamente pela coluna "resolucao".';

-- ---------------------------------------------------------------------------
-- 3) Linha do tempo do atendimento — histórico append-only, mesmo padrão de
-- historico_computador (0019): cada evento relevante do ciclo de vida do
-- atendimento vira uma linha, nunca apagada nem sobrescrita. Também serve
-- para "manter o histórico caso outro colaborador assuma o atendimento"
-- (um mesmo construto resolve as duas necessidades do pedido, sem duplicar
-- estrutura).
-- ---------------------------------------------------------------------------
create table atendimento_chat_eventos (
  id uuid primary key default gen_random_uuid(),
  atendimento_id uuid not null references atendimentos_chat(id) on delete cascade,
  evento text not null,
  ocorrido_em timestamptz not null default now(),
  autor_id uuid references funcionarios(id) on delete set null,
  criado_em timestamptz not null default now()
);
comment on table atendimento_chat_eventos is 'Linha do tempo (histórico append-only) de cada atendimento: registro, alerta enviado, resposta, reatribuição, resolução e encerramento. Nunca é editado nem apagado no uso normal do sistema.';
create index idx_atendimento_chat_eventos_atendimento on atendimento_chat_eventos(atendimento_id, ocorrido_em);

-- ---------------------------------------------------------------------------
-- 4) Vínculo opcional avaliação <-> atendimento e referência/bônus <->
-- atendimento. NULLABLE de propósito: registros antigos (avaliação geral do
-- colaborador, sem atendimento específico) continuam exatamente como estão.
-- ---------------------------------------------------------------------------
alter table avaliacoes_qualidade add column if not exists atendimento_chat_id uuid references atendimentos_chat(id) on delete set null;
create index if not exists idx_avaliacoes_qualidade_atendimento on avaliacoes_qualidade(atendimento_chat_id);
comment on column avaliacoes_qualidade.atendimento_chat_id is 'Atendimento (Registro de Atendimentos) ao qual esta avaliação se refere. Nulo = avaliação geral do colaborador, sem vínculo a um atendimento específico (comportamento original, preservado).';

alter table atendimentos_referencia add column if not exists atendimento_chat_id uuid references atendimentos_chat(id) on delete set null;
create index if not exists idx_atendimentos_referencia_atendimento on atendimentos_referencia(atendimento_chat_id);
comment on column atendimentos_referencia.atendimento_chat_id is 'Atendimento (Registro de Atendimentos) do qual este reconhecimento/bônus se originou. Nulo = registro de referência avulso, sem atendimento vinculado (comportamento original, preservado).';

-- ---------------------------------------------------------------------------
-- 5) Trigger: gera a linha do tempo automaticamente a partir das colunas de
-- data/hora e da troca de responsável — o colaborador/administrador só
-- preenche a coluna (via UPDATE), o evento textual é sempre gerado pelo
-- banco, nunca digitado à mão.
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

create trigger trg_atendimentos_chat_eventos
after insert or update on atendimentos_chat
for each row execute function trg_atendimento_chat_eventos();

-- ---------------------------------------------------------------------------
-- 6) status automático do FLUXO do atendimento — não confundir com a
-- resolução (ver item 6-b): alerta enviado avança de "aguardando" para
-- "alerta_enviado"; primeira resposta avança para "respondido"; fim marca
-- "finalizado". Substitui a função de 0017 (mesmo nome/trigger), então
-- nenhum gatilho duplicado passa a existir.
-- ---------------------------------------------------------------------------
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
-- (o trigger "trg_atendimentos_chat_status_auto" criado em 0017 já aponta
-- para esta função por nome — create or replace acima é suficiente, não é
-- preciso recriar o trigger.)

-- ---------------------------------------------------------------------------
-- 6-b) resolvido_em sempre coerente com resolucao — REGRA PRINCIPAL: quem
-- decide "resolvido_em" é exclusivamente a resposta à pergunta "A demanda
-- foi resolvida?" (coluna resolucao), nunca o status do fluxo. Ao marcar
-- "resolvida", grava a data/hora (se ainda não tiver uma); ao sair de
-- "resolvida" (revertido para pendente/não resolvida), limpa a data —
-- mesmo padrão de trg_sinalizacao_resolvido_em (0016).
-- ---------------------------------------------------------------------------
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

create trigger trg_atendimentos_chat_resolucao_auto
before update on atendimentos_chat
for each row execute function trg_atendimento_chat_resolucao_auto();

-- ---------------------------------------------------------------------------
-- 7) RLS
-- ---------------------------------------------------------------------------
alter table atendimento_chat_eventos enable row level security;

-- Reaproveita exatamente a mesma regra de visibilidade/gestão já usada em
-- atendimentos_chat (0017), encapsulada em funções para não duplicar a
-- condição em cada policy nova.
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

create policy atendimento_chat_eventos_select on atendimento_chat_eventos for select
  using (exists (
    select 1 from atendimentos_chat a where a.id = atendimento_chat_eventos.atendimento_id and fn_pode_ver_atendimento_chat(a)
  ));
create policy atendimento_chat_eventos_insert on atendimento_chat_eventos for insert
  with check (exists (
    select 1 from atendimentos_chat a where a.id = atendimento_chat_eventos.atendimento_id and fn_pode_gerenciar_atendimento_chat(a)
  ));

-- O colaborador atribuído (colaborador_id = auth.uid()) agora também pode
-- ATUALIZAR o próprio atendimento (registrar resposta/resolução, reatribuir)
-- — antes (0017) só admin/gestor/quem registrou podiam. Substitui a policy
-- de update de 0017 (mesmo nome), mantendo tudo que já era permitido.
drop policy if exists atendimentos_chat_update on atendimentos_chat;
create policy atendimentos_chat_update on atendimentos_chat for update
  using (fn_is_admin() or registrado_por = auth.uid() or colaborador_id = auth.uid() or fn_is_gestor(setor))
  with check (fn_is_admin() or registrado_por = auth.uid() or colaborador_id = auth.uid() or fn_is_gestor(setor));

-- ---------------------------------------------------------------------------
-- 8) Backfill: sintetiza a linha do tempo dos atendimentos já existentes a
-- partir das colunas que já tinham (iniciado_em sempre; primeira_resposta_em
-- e finalizado_em quando preenchidos) — assim, atendimentos antigos também
-- mostram uma linha do tempo coerente, sem precisar de tratamento especial
-- no front-end. Não usa nenhum valor novo do enum (só grava texto), então é
-- seguro executar na mesma transação da migração.
-- ---------------------------------------------------------------------------
insert into atendimento_chat_eventos (atendimento_id, evento, ocorrido_em, autor_id)
select id, 'Atendimento registrado — cliente enviou mensagem/solicitação' || case when cliente is not null then ' (' || cliente || ')' else '' end, iniciado_em, registrado_por
from atendimentos_chat
where not exists (select 1 from atendimento_chat_eventos e where e.atendimento_id = atendimentos_chat.id);

insert into atendimento_chat_eventos (atendimento_id, evento, ocorrido_em)
select id, 'Cliente respondido' || case when colaborador_nome is not null then ' por ' || colaborador_nome else '' end, primeira_resposta_em
from atendimentos_chat
where primeira_resposta_em is not null;

insert into atendimento_chat_eventos (atendimento_id, evento, ocorrido_em)
select id, 'Atendimento encerrado', finalizado_em
from atendimentos_chat
where finalizado_em is not null;

-- Segurança extra (não deveria haver nenhuma linha nesta situação, já que
-- esta é a própria migração que cria "resolucao" com padrão "pendente"):
-- se por algum motivo já existir resolvido_em preenchido, mantém a coluna
-- nova coerente com o dado antigo em vez de deixá-las contraditórias.
update atendimentos_chat set resolucao = 'resolvida' where resolvido_em is not null and resolucao = 'pendente';

select '✅ Migração 0020 concluída com sucesso.' as status;
