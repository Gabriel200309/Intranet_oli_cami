-- ============================================================================
-- 0029_permissoes_leitura_propria.sql
-- Corrige: colaboradores que não são administradores não conseguiam LER as
-- tabelas permissoes_setor e gestores_setor (a única policy, de 0007, era
-- "for all ... using (fn_is_admin())"). O banco continuava aplicando as
-- regras certas (as funções fn_permissao_setor/fn_is_gestor são security
-- definer), mas o navegador de um colaborador comum nunca recebia as
-- permissões do próprio setor nem sabia que ele é gestor — então a tela
-- negava acessos que a pessoa tinha: painéis de outros setores liberados
-- ao setor dela, o painel de Eficiência para gestores e para quem "vê
-- sinalizações de todos os setores", o quadro completo de funcionários etc.
--
-- Libera só o mínimo que a tela usa fora do painel de Administração:
--   - permissoes_setor: a linha do PRÓPRIO setor;
--   - gestores_setor: as linhas em que a própria pessoa é gestora.
-- Escrita continua exclusiva do administrador (policy de 0007 intacta).
--
-- Também garante que todo setor tenha sua linha em permissoes_setor (ver
-- trigger no fim do arquivo).
--
-- Migração 100% incremental e idempotente.
-- ============================================================================

drop policy if exists permissoes_setor_select_proprio on permissoes_setor;
create policy permissoes_setor_select_proprio on permissoes_setor for select
  using (setor = fn_meu_setor());

drop policy if exists gestores_setor_select_proprio on gestores_setor;
create policy gestores_setor_select_proprio on gestores_setor for select
  using (funcionario_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Todo setor precisa da sua linha em permissoes_setor. Setores criados pela
-- tela (Administração > Setores, desde 0012) nasciam sem ela, e marcar uma
-- permissão para eles não gravava nada (o update afetava 0 linhas). Cria a
-- linha automaticamente (tudo desmarcado) e completa as que faltam.
-- ---------------------------------------------------------------------------
create or replace function trg_setor_cria_permissoes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into permissoes_setor (setor) values (new.nome) on conflict (setor) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_setores_cria_permissoes on setores;
create trigger trg_setores_cria_permissoes
after insert on setores
for each row execute function trg_setor_cria_permissoes();

insert into permissoes_setor (setor)
select s.nome from setores s
where not exists (select 1 from permissoes_setor p where p.setor = s.nome);

select '✅ Migração 0029 concluída com sucesso.' as status;
