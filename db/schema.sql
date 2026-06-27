-- BuildNYC Agents — full schema. Run in Supabase SQL editor (or `supabase db push`).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE.

create extension if not exists vector;
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────── profiles
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth0_id text unique not null,
  name text not null,
  email text not null,
  role text,                       -- 'dev' | 'designer' | 'ai_engineer' | 'pm' | 'other'
  skills text[],
  looking_for text,
  bio text,
  agent_instructions text,
  avatar_url text,
  embedding vector(1536),          -- text-embedding-3-small
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────── conversations
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  profile_a uuid references profiles(id),
  profile_b uuid references profiles(id),
  match_score float,
  match_reason text,
  summary text,
  status text default 'active',    -- 'active' | 'completed'
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────── messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id),
  speaker uuid references profiles(id),
  content text not null,
  turn_number int,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────── matches (likes)
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  from_profile uuid references profiles(id),
  to_profile uuid references profiles(id),
  mutual boolean default false,
  email_sent boolean default false,
  created_at timestamptz default now(),
  unique(from_profile, to_profile)
);

-- ─────────────────────────────────────────── knowledge base (RAG)
create table if not exists knowledge_base (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  source text,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────── escalations (concierge → organizer)
create table if not exists escalations (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  asker_profile uuid references profiles(id),
  answer text,
  status text default 'open',      -- 'open' | 'answered'
  created_at timestamptz default now(),
  answered_at timestamptz
);

-- ─────────────────────────────────────────── HNSW vector indexes
create index if not exists profiles_embedding_idx
  on profiles using hnsw (embedding vector_cosine_ops);
create index if not exists knowledge_embedding_idx
  on knowledge_base using hnsw (embedding vector_cosine_ops);

-- ─────────────────────────────────────────── RPC: top-N profile candidates by cosine
create or replace function match_profiles(
  query_embedding vector(1536),
  exclude_id uuid,
  match_count int default 5
)
returns table (
  id uuid, name text, role text, skills text[], looking_for text,
  bio text, agent_instructions text, similarity float
)
language sql stable as $$
  select p.id, p.name, p.role, p.skills, p.looking_for, p.bio, p.agent_instructions,
         1 - (p.embedding <=> query_embedding) as similarity
  from profiles p
  where p.id <> exclude_id and p.embedding is not null
  order by p.embedding <=> query_embedding
  limit match_count;
$$;

-- ─────────────────────────────────────────── RPC: top-N knowledge chunks by cosine
create or replace function match_knowledge(
  query_embedding vector(1536),
  match_count int default 3
)
returns table (id uuid, content text, source text, similarity float)
language sql stable as $$
  select k.id, k.content, k.source,
         1 - (k.embedding <=> query_embedding) as similarity
  from knowledge_base k
  where k.embedding is not null
  order by k.embedding <=> query_embedding
  limit match_count;
$$;

-- ─────────────────────────────────────────── Realtime: stream message inserts
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;

-- ─────────────────────────────────────────── Row-Level Security
alter table profiles enable row level security;
drop policy if exists "view own profile" on profiles;
create policy "view own profile" on profiles for select using (auth.uid()::text = auth0_id);
drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles for update using (auth.uid()::text = auth0_id);
-- Mission Control needs to read all profiles for display; allow public read of safe cols
drop policy if exists "public read profiles" on profiles;
create policy "public read profiles" on profiles for select using (true);

alter table conversations enable row level security;
drop policy if exists "public read conversations" on conversations;
create policy "public read conversations" on conversations for select using (true);

alter table messages enable row level security;
drop policy if exists "public read messages" on messages;
create policy "public read messages" on messages for select using (true);

-- Note: all writes go through the service-role key (server-side), which bypasses RLS.
