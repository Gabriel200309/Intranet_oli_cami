-- ============================================================================
-- 0011_storage_buckets.sql
-- Cria os buckets de Storage usados pelo front-end (upload de mídia de
-- cursos e foto de colaboradores) e as políticas de RLS de storage.objects:
-- qualquer pessoa lê (buckets públicos, usados com getPublicUrl), só
-- administrador envia/atualiza/exclui arquivo.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('cursos', 'cursos', true), ('avatares', 'avatares', true)
on conflict (id) do nothing;

create policy "cursos_select" on storage.objects for select
  using (bucket_id = 'cursos');
create policy "cursos_admin_insert" on storage.objects for insert
  with check (bucket_id = 'cursos' and fn_is_admin());
create policy "cursos_admin_update" on storage.objects for update
  using (bucket_id = 'cursos' and fn_is_admin());
create policy "cursos_admin_delete" on storage.objects for delete
  using (bucket_id = 'cursos' and fn_is_admin());

create policy "avatares_select" on storage.objects for select
  using (bucket_id = 'avatares');
create policy "avatares_admin_insert" on storage.objects for insert
  with check (bucket_id = 'avatares' and fn_is_admin());
create policy "avatares_admin_update" on storage.objects for update
  using (bucket_id = 'avatares' and fn_is_admin());
create policy "avatares_admin_delete" on storage.objects for delete
  using (bucket_id = 'avatares' and fn_is_admin());

select '✅ Migração 0011 concluída com sucesso.' as status;
