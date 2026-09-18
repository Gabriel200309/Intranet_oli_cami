-- ============================================================================
-- 0026_status_aguardando_terceiro.sql
-- Pedido da reunião de correções do painel de Eficiência/Alertas: um
-- atendimento pode ficar "Aguardando" quando a solução não depende
-- imediatamente do responsável (ex.: aguardando retorno do cliente ou de
-- outro setor) — um estado PRÓPRIO, diferente do "aguardando" que já
-- existia (rotulado "Pendente" na interface, usado só para o estágio
-- inicial antes do alerta ser enviado — ver migração 0017/0020).
--
-- Reaproveita 100% a estrutura já existente (o enum atendimento_status,
-- criado em 0017): só ADICIONA o valor novo 'aguardando_terceiro', não cria
-- nenhuma tabela/coluna paralela. Migração 100% incremental e não
-- destrutiva: nenhum atendimento já cadastrado é afetado (nenhum registro
-- existente usa esse valor até alguém marcá-lo manualmente na interface).
-- ============================================================================

alter type atendimento_status add value if not exists 'aguardando_terceiro' after 'em_atendimento';
comment on type atendimento_status is 'aguardando="Pendente" (estágio inicial, antes do alerta), alerta_enviado, em_atendimento, aguardando_terceiro="Aguardando" (solução não depende do responsável agora — ex.: aguardando retorno do cliente/outro setor; definido manualmente, nunca pelo trigger automático), respondido, finalizado="Encerrado".';

-- ---------------------------------------------------------------------------
-- O trigger que avança o status automaticamente (baseado nas colunas de
-- data/hora) precisa reconhecer 'aguardando_terceiro' como um estágio de
-- ORIGEM válido também — senão, registrar uma resposta (ou enviar o alerta)
-- enquanto o atendimento está pausado em "Aguardando" deixaria de avançar o
-- status automaticamente. "aguardando_terceiro" só é definido/removido
-- manualmente (nunca pelo trigger) — ver marcarAguardandoAtendimento() /
-- retomarAtendimentoChat() em js/eficiencia-dashboard.js.
-- ---------------------------------------------------------------------------
create or replace function trg_atendimento_chat_status_auto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.alerta_enviado_em is not null and old.alerta_enviado_em is null and new.status in ('aguardando', 'aguardando_terceiro') then
    new.status := 'alerta_enviado';
  end if;
  if new.primeira_resposta_em is not null and old.primeira_resposta_em is null
     and new.status in ('aguardando', 'alerta_enviado', 'em_atendimento', 'aguardando_terceiro') then
    new.status := 'respondido';
  end if;
  if new.finalizado_em is not null and old.finalizado_em is null then
    new.status := 'finalizado';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Linha do tempo: registra quando o atendimento entra/sai de "Aguardando"
-- (mudança feita só na coluna "status", sem tocar nas colunas de data/hora
-- — por isso precisa de uma condição própria, separada das demais).
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

  if new.status is distinct from old.status and new.status = 'aguardando_terceiro' then
    insert into atendimento_chat_eventos (atendimento_id, evento, ocorrido_em)
    values (new.id, 'Atendimento marcado como Aguardando (solução não depende do responsável agora)', now());
  elsif new.status is distinct from old.status and old.status = 'aguardando_terceiro' then
    insert into atendimento_chat_eventos (atendimento_id, evento, ocorrido_em)
    values (new.id, 'Atendimento retomado (saiu de Aguardando)', now());
  end if;

  if new.finalizado_em is distinct from old.finalizado_em and new.finalizado_em is not null then
    insert into atendimento_chat_eventos (atendimento_id, evento, ocorrido_em)
    values (new.id, 'Atendimento encerrado', new.finalizado_em);
  end if;

  return new;
end;
$$;
-- (os triggers "trg_atendimentos_chat_status_auto"/"trg_atendimentos_chat_eventos",
-- criados em 0017/0020, já apontam para estas funções por nome — create or
-- replace acima é suficiente, não é preciso recriar os triggers.)

select '✅ Migração 0026 concluída com sucesso.' as status;
