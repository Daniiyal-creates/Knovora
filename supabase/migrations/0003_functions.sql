-- Functions and triggers.

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists chatbots_set_updated_at on public.chatbots;
create trigger chatbots_set_updated_at
  before update on public.chatbots
  for each row execute function public.set_updated_at();

drop trigger if exists sources_set_updated_at on public.sources;
create trigger sources_set_updated_at
  before update on public.sources
  for each row execute function public.set_updated_at();

drop trigger if exists ingestion_jobs_set_updated_at on public.ingestion_jobs;
create trigger ingestion_jobs_set_updated_at
  before update on public.ingestion_jobs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New-user bootstrap: create a profile and a default workspace on signup.
-- Runs as the definer so it can insert despite RLS.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.workspaces (owner_id, name)
  values (new.id, 'My workspace');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- match_chunks: bot-scoped cosine similarity search.
-- Always filters by chatbot_id so retrieval can never cross bots/workspaces.
-- Called server-side (service role for public chat, or owner preview).
-- ---------------------------------------------------------------------------
create or replace function public.match_chunks(
  p_chatbot_id uuid,
  p_query_embedding vector(768),
  p_match_count int default 6
)
returns table (
  id          uuid,
  source_id   uuid,
  content     text,
  chunk_index int,
  similarity  float
)
language sql
stable
as $$
  select
    sc.id,
    sc.source_id,
    sc.content,
    sc.chunk_index,
    1 - (sc.embedding <=> p_query_embedding) as similarity
  from public.source_chunks sc
  where sc.chatbot_id = p_chatbot_id
    and sc.embedding is not null
  order by sc.embedding <=> p_query_embedding
  limit greatest(p_match_count, 1);
$$;
