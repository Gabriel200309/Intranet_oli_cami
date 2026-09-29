-- ============================================================================
-- 0027_atendimentos_protecao_colaborador.sql
-- Correções de segurança encontradas na revisão do painel de Eficiência:
--
-- 1. atendimento_chat_eventos é a linha do tempo "append-only" do
--    atendimento, gerada SÓ pelos triggers (security definer) de 0020/0026
--    — o front-end nunca insere nela. Mesmo assim, a policy de INSERT
--    deixava qualquer pessoa que pudesse gerenciar o atendimento (inclusive
--    o próprio colaborador avaliado) gravar eventos arbitrários, ou seja,
--    forjar o histórico ("Cliente respondido às 09:01"). Agora só o
--    administrador pode inserir manualmente; os triggers continuam
--    funcionando normalmente (ignoram RLS).
--
-- 2. A policy atendimentos_chat_update (0020/0025) libera o UPDATE da linha
--    inteira para o colaborador responsável, para que ele possa registrar
--    alerta/resposta/resolução/encerramento do próprio atendimento. Só que
--    isso também deixava o colaborador reescrever depois os horários que
--    medem o PRÓPRIO desempenho (iniciado_em, primeira_resposta_em...), ou
--    trocar quem registrou o atendimento. O trigger abaixo mantém tudo o
--    que a interface faz hoje, mas, para quem é SÓ o colaborador
--    responsável (não é admin, nem quem registrou, nem gestor do setor):
--      - iniciado_em, registrado_por e criado_em não podem mudar;
--      - alerta_enviado_em, primeira_resposta_em e finalizado_em só podem
--        ser preenchidos uma vez (de vazio para um valor) — nunca
--        reescritos nem apagados depois.
--
-- Migração 100% incremental e idempotente.
-- ============================================================================

drop policy if exists atendimento_chat_eventos_insert on atendimento_chat_eventos;
create policy atendimento_chat_eventos_insert on atendimento_chat_eventos for insert
  with check (fn_is_admin());

create or replace function trg_atendimento_chat_protege_colaborador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Sem usuário autenticado (service_role, SQL Editor, outros triggers):
  -- não se aplica.
  if auth.uid() is null then
    return new;
  end if;
  if fn_is_admin() or old.registrado_por = auth.uid() or fn_is_gestor(old.setor) then
    return new;
  end if;

  if new.iniciado_em is distinct from old.iniciado_em
     or new.registrado_por is distinct from old.registrado_por
     or new.criado_em is distinct from old.criado_em then
    raise exception 'Somente quem registrou o atendimento, o gestor do setor ou um administrador pode alterar o início ou o registro do atendimento.'
      using errcode = '42501';
  end if;

  if (old.alerta_enviado_em is not null and new.alerta_enviado_em is distinct from old.alerta_enviado_em)
     or (old.primeira_resposta_em is not null and new.primeira_resposta_em is distinct from old.primeira_resposta_em)
     or (old.finalizado_em is not null and new.finalizado_em is distinct from old.finalizado_em) then
    raise exception 'Horários de alerta, resposta e encerramento já registrados só podem ser corrigidos por quem registrou o atendimento, pelo gestor do setor ou por um administrador.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_atendimentos_chat_protege_colaborador on atendimentos_chat;
create trigger trg_atendimentos_chat_protege_colaborador
before update on atendimentos_chat
for each row execute function trg_atendimento_chat_protege_colaborador();

select '✅ Migração 0027 concluída com sucesso.' as status;
