-- Row-level security: owners only ever touch rows in their own workspace.
-- Visitor-facing writes (conversations, messages, usage_events) are performed
-- server-side with the service-role key, which bypasses RLS; those paths are
-- manually scoped by chatbot public_id + published status in application code.

alter table public.profiles       enable row level security;
alter table public.workspaces     enable row level security;
alter table public.chatbots       enable row level security;
alter table public.sources        enable row level security;
alter table public.source_chunks  enable row level security;
alter table public.ingestion_jobs enable row level security;
alter table public.conversations  enable row level security;
alter table public.messages       enable row level security;
alter table public.usage_events   enable row level security;

-- profiles --------------------------------------------------------------
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- workspaces ------------------------------------------------------------
create policy "workspaces_all_own" on public.workspaces
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- helper predicate: current user owns the workspace behind this chatbot
--   using an EXISTS against workspaces keeps policies index-friendly.
create policy "chatbots_all_own" on public.chatbots
  for all
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = chatbots.workspace_id and w.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workspaces w
      where w.id = chatbots.workspace_id and w.owner_id = auth.uid()
    )
  );

-- sources ---------------------------------------------------------------
create policy "sources_all_own" on public.sources
  for all
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = sources.workspace_id and w.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workspaces w
      where w.id = sources.workspace_id and w.owner_id = auth.uid()
    )
  );

-- source_chunks ---------------------------------------------------------
create policy "source_chunks_all_own" on public.source_chunks
  for all
  using (
    exists (
      select 1
      from public.chatbots c
      join public.workspaces w on w.id = c.workspace_id
      where c.id = source_chunks.chatbot_id and w.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.chatbots c
      join public.workspaces w on w.id = c.workspace_id
      where c.id = source_chunks.chatbot_id and w.owner_id = auth.uid()
    )
  );

-- ingestion_jobs --------------------------------------------------------
create policy "ingestion_jobs_all_own" on public.ingestion_jobs
  for all
  using (
    exists (
      select 1
      from public.chatbots c
      join public.workspaces w on w.id = c.workspace_id
      where c.id = ingestion_jobs.chatbot_id and w.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.chatbots c
      join public.workspaces w on w.id = c.workspace_id
      where c.id = ingestion_jobs.chatbot_id and w.owner_id = auth.uid()
    )
  );

-- conversations (owners may read their bots' conversations) -------------
create policy "conversations_select_own" on public.conversations
  for select using (
    exists (
      select 1
      from public.chatbots c
      join public.workspaces w on w.id = c.workspace_id
      where c.id = conversations.chatbot_id and w.owner_id = auth.uid()
    )
  );

-- messages (owners may read their bots' messages) -----------------------
create policy "messages_select_own" on public.messages
  for select using (
    exists (
      select 1
      from public.conversations conv
      join public.chatbots c on c.id = conv.chatbot_id
      join public.workspaces w on w.id = c.workspace_id
      where conv.id = messages.conversation_id and w.owner_id = auth.uid()
    )
  );

-- usage_events (owners may read their own usage) ------------------------
create policy "usage_events_select_own" on public.usage_events
  for select using (
    exists (
      select 1 from public.workspaces w
      where w.id = usage_events.workspace_id and w.owner_id = auth.uid()
    )
  );
