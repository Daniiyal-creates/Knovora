-- Private storage bucket for uploaded source documents.
-- Objects are laid out as: <workspace_id>/<chatbot_id>/<source_id>/<filename>
-- so the first path segment can be checked against workspace ownership.
--
-- NOTE: inside the EXISTS subquery the object's name column MUST be qualified
-- as storage.objects.name. An unqualified `name` would bind to workspaces.name
-- (both tables have a `name` column), which never matches a folder id.

insert into storage.buckets (id, name, public)
values ('knowledge', 'knowledge', false)
on conflict (id) do nothing;

-- Owners may read objects whose first path segment is one of their workspaces.
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

-- Owners may upload into their own workspace folder.
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

-- Owners may delete their own objects.
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
