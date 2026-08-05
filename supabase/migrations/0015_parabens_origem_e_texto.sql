-- ============================================================================
-- 0015_parabens_origem_e_texto.sql
-- Corrige dois problemas do sistema de parabéns:
--
-- 1) Toda notificação de parabéns dizia "desejou feliz aniversário", mesmo
--    quando era parabéns por ser o Funcionário do Mês (o botão do card
--    Funcionário do Mês reaproveita a mesma tabela "parabens", mas não
--    havia como distinguir o motivo depois). Agora "parabens" ganha uma
--    coluna "origem" ('aniversario' ou 'funcionario_mes').
--
-- 2) O nome de quem enviou dependia do navegador de quem RECEBE já ter
--    carregado a lista de funcionários — se não tivesse, caía no genérico
--    "Alguém". Agora o texto da notificação é montado no próprio banco,
--    no momento da inserção (o gatilho já sabe o nome de quem enviou,
--    direto da tabela funcionarios, sem depender de nada no cliente).
-- ============================================================================

alter table parabens add column if not exists origem text not null default 'aniversario'
  check (origem in ('aniversario', 'funcionario_mes'));

create or replace function trg_criar_notificacao_parabens()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome_remetente text;
  v_texto text;
begin
  select nome into v_nome_remetente from funcionarios where id = new.remetente_id;
  v_nome_remetente := coalesce(v_nome_remetente, 'Alguém');

  if new.origem = 'funcionario_mes' then
    v_texto := v_nome_remetente || ' parabenizou você por ser o Funcionário do Mês! 🏆';
  else
    v_texto := v_nome_remetente || ' desejou feliz aniversário para você! 🎉';
  end if;

  insert into notificacoes (destinatario_id, remetente_id, tipo, texto, lida)
  values (new.aniversariante_id, new.remetente_id, 'parabens', v_texto, false);
  return new;
end;
$$;

select '✅ Migração 0015 concluída com sucesso.' as status;
