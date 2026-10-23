-- Repair the storage policies created by 0004.
-- The original used an unqualified `name` inside the EXISTS subquery, which
-- bound to workspaces.name instead of storage.objects.name, so the ownership
-- check never matched. Recreate all three policies with the column qualified.

drop policy if exists "knowledge_read_own" on storage.objects;
drop policy if exists "knowledge_insert_own" on storage.objects;
drop policy if exists "knowledge_delete_own" on storage.objects;

create policy "knowledge_read_own" on storage.objects
  for select
  using (
    bucket_id = 'knowledge'
    and exists (
      select 1 from public.workspaces w
      where w.owner_id = auth.uid()
        and w.id::text = (storage.foldername(storage.objects.name))[1]
    )
  );

create policy "knowledge_insert_own" on storage.objects
  for insert
  with check (
    bucket_id = 'knowledge'
    and exists (
      select 1 from public.workspaces w
      where w.owner_id = auth.uid()
        and w.id::text = (storage.foldername(storage.objects.name))[1]
    )
  );

create policy "knowledge_delete_own" on storage.objects
  for delete
  using (
    bucket_id = 'knowledge'
    and exists (
      select 1 from public.workspaces w
      where w.owner_id = auth.uid()
        and w.id::text = (storage.foldername(storage.objects.name))[1]
    )
  );
