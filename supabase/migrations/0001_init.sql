-- Knovora initial schema
-- Postgres + pgvector. Vector dimension must match GEMINI_EMBEDDING_DIM (default 768).

create extension if not exists vector;
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- profiles: 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- workspaces: owned by a single user (team roles deferred)
-- ---------------------------------------------------------------------------
create table if not exists public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  name        text not null default 'My workspace',
  created_at  timestamptz not null default now()
);
create index if not exists workspaces_owner_idx on public.workspaces (owner_id);

-- ---------------------------------------------------------------------------
-- chatbots
-- ---------------------------------------------------------------------------
create table if not exists public.chatbots (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces (id) on delete cascade,
  name                text not null,
  purpose             text,
  language            text not null default 'en',
  tone                text,
  system_instructions text,
  status              text not null default 'draft' check (status in ('draft', 'published')),
  public_id           text not null unique,
  appearance          jsonb not null default '{}'::jsonb,
  allowed_domains     text[] not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists chatbots_workspace_idx on public.chatbots (workspace_id);
create index if not exists chatbots_public_id_idx on public.chatbots (public_id);

-- ---------------------------------------------------------------------------
-- sources (file or url). workspace_id denormalized to simplify RLS.
-- ---------------------------------------------------------------------------
create table if not exists public.sources (
  id            uuid primary key default gen_random_uuid(),
  chatbot_id    uuid not null references public.chatbots (id) on delete cascade,
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  type          text not null check (type in ('file', 'url')),
  title         text,
  filename      text,
  storage_path  text,
  url           text,
  byte_size     bigint,
  status        text not null default 'pending'
                  check (status in ('pending', 'processing', 'ready', 'failed')),
  error         text,
  chunk_count   int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists sources_chatbot_idx on public.sources (chatbot_id);

-- ---------------------------------------------------------------------------
-- source_chunks: embedded passages. Dimension MUST equal GEMINI_EMBEDDING_DIM.
-- ---------------------------------------------------------------------------
create table if not exists public.source_chunks (
  id           uuid primary key default gen_random_uuid(),
  source_id    uuid not null references public.sources (id) on delete cascade,
  chatbot_id   uuid not null references public.chatbots (id) on delete cascade,
  content      text not null,
  embedding    vector(768),
  chunk_index  int not null,
  token_count  int,
  created_at   timestamptz not null default now()
);
create index if not exists source_chunks_chatbot_idx on public.source_chunks (chatbot_id);
-- Approximate nearest-neighbour index for cosine similarity.
create index if not exists source_chunks_embedding_idx
  on public.source_chunks using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- ingestion_jobs: restartable job status rows (Inngest replaces this later)
-- ---------------------------------------------------------------------------
create table if not exists public.ingestion_jobs (
  id            uuid primary key default gen_random_uuid(),
  source_id     uuid not null references public.sources (id) on delete cascade,
  chatbot_id    uuid not null references public.chatbots (id) on delete cascade,
  status        text not null default 'pending'
                  check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts      int not null default 0,
  max_attempts  int not null default 3,
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists ingestion_jobs_source_idx on public.ingestion_jobs (source_id);
create index if not exists ingestion_jobs_status_idx on public.ingestion_jobs (status);

-- ---------------------------------------------------------------------------
-- conversations + messages (visitor chat history)
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id               uuid primary key default gen_random_uuid(),
  chatbot_id       uuid not null references public.chatbots (id) on delete cascade,
  session_id       text not null,
  visitor_ip_hash  text,
  created_at       timestamptz not null default now()
);
create index if not exists conversations_chatbot_idx on public.conversations (chatbot_id);
create unique index if not exists conversations_bot_session_idx
  on public.conversations (chatbot_id, session_id);

create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  role             text not null check (role in ('user', 'assistant')),
  content          text not null,
  citations        jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages (conversation_id);

-- ---------------------------------------------------------------------------
-- usage_events: latency / token / cost signals per workspace + bot
-- ---------------------------------------------------------------------------
create table if not exists public.usage_events (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces (id) on delete cascade,
  chatbot_id         uuid references public.chatbots (id) on delete set null,
  conversation_id    uuid references public.conversations (id) on delete set null,
  type               text not null,
  model              text,
  prompt_tokens      int,
  completion_tokens  int,
  latency_ms         int,
  created_at         timestamptz not null default now()
);
create index if not exists usage_events_workspace_idx on public.usage_events (workspace_id);
create index if not exists usage_events_chatbot_idx on public.usage_events (chatbot_id);
