-- ============================================================================
-- 0008_triggers.sql
-- Automatiza o que no protótipo era feito manualmente em JavaScript:
-- recalcular o progresso do curso e criar a notificação de parabéns.
-- ============================================================================

-- Sempre que uma aula é marcada/desmarcada como concluída, recalcula o
-- progresso (%) e mantém data_inicio/data_conclusao coerentes.
create or replace function trg_atualizar_progresso_curso()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_funcionario_id uuid;
  v_curso_id uuid;
  v_total int;
  v_concluidas int;
  v_percentual int;
begin
  if tg_op = 'DELETE' then
    v_funcionario_id := old.funcionario_id;
    select curso_id into v_curso_id from aulas where id = old.aula_id;
  else
    v_funcionario_id := new.funcionario_id;
    select curso_id into v_curso_id from aulas where id = new.aula_id;
  end if;

  select count(*) into v_total from aulas where curso_id = v_curso_id;
  select count(*) into v_concluidas
    from aula_conclusoes ac
    join aulas a on a.id = ac.aula_id
    where a.curso_id = v_curso_id and ac.funcionario_id = v_funcionario_id;

  v_percentual := case when v_total = 0 then 0 else round((v_concluidas::numeric / v_total) * 100) end;

  insert into progresso_cursos (funcionario_id, curso_id, data_inicio, data_conclusao, percentual)
  values (v_funcionario_id, v_curso_id, now(), case when v_percentual >= 100 then now() else null end, v_percentual)
  on conflict (funcionario_id, curso_id) do update
    set percentual = excluded.percentual,
        data_conclusao = case when excluded.percentual >= 100 then coalesce(progresso_cursos.data_conclusao, now()) else null end;

  return coalesce(new, old);
end;
$$;

create trigger trg_aula_conclusoes_upd
after insert or delete on aula_conclusoes
for each row execute function trg_atualizar_progresso_curso();

-- Sempre que alguém envia parabéns, cria automaticamente a notificação
-- correspondente para o aniversariante (equivalente ao que o front-end
-- fazia manualmente em enviarParabens()).
create or replace function trg_criar_notificacao_parabens()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notificacoes (destinatario_id, remetente_id, tipo, lida)
  values (new.aniversariante_id, new.remetente_id, 'parabens', false);
  return new;
end;
$$;

create trigger trg_parabens_notifica
after insert on parabens
for each row execute function trg_criar_notificacao_parabens();

select '✅ Migração 0008 concluída com sucesso.' as status;
