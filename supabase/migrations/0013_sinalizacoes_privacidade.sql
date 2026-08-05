-- ============================================================================
-- 0013_sinalizacoes_privacidade.sql
-- Corrige a visibilidade de sinalizações de colaboradores: até aqui,
-- qualquer colega do MESMO SETOR de uma sinalização conseguia vê-la
-- (política antiga: "setor = fn_meu_setor()") — ou seja, um colaborador
-- comum via sinalizações sobre colegas do próprio setor sem ter nenhum
-- envolvimento nelas. Isso deixa de existir.
--
-- Quem passa a ver uma sinalização:
--   - Administrador (sempre viu tudo);
--   - Quem tem a permissão "ver sinalizações de todas os setores"
--     (hoje RH e Diretoria, configurável em Administração > Permissões);
--   - Gestor do setor da sinalização (Administração > Permissões > Gestores);
--   - Quem registrou a sinalização (o autor, sobre o que ele mesmo registrou);
--   - O próprio colaborador sinalizado, sobre sinalizações a respeito dele.
--
-- Um colaborador comum, sem nenhuma dessas condições, não vê mais
-- sinalizações de colegas — nem as do próprio setor.
--
-- Além disso, registrar uma sinalização deixa de ser algo que qualquer
-- colaborador autenticado pode fazer — passa a ser exclusivo de
-- administradores.
-- ============================================================================

drop policy sinalizacoes_select on sinalizacoes;

create policy sinalizacoes_select on sinalizacoes for select
  using (
    fn_is_admin()
    or fn_permissao_setor(fn_meu_setor(), 'ver_sinalizacoes_todas')
    or fn_is_gestor(setor)
    or autor_id = auth.uid()
    or colaborador_id = auth.uid()
  );

drop policy sinalizacoes_insert on sinalizacoes;

create policy sinalizacoes_insert on sinalizacoes for insert
  with check (fn_is_admin() and autor_id = auth.uid());

select '✅ Migração 0013 concluída com sucesso.' as status;
