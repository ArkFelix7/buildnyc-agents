-- BuildNYC Agents — v2 migration: multi-event platform. Idempotent; safe to re-run.
-- Run after db/schema.sql. Applies events table, event scoping, avatars, match codes.

-- ─────────────────────────────────────────── events
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tagline text,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  organizer_auth0_id text not null,
  organizer_email text not null,
  admin_passcode text,
  theme_color text default '#6d5efc',
  matching_enabled boolean default true,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────── scope + new columns
alter table profiles add column if not exists event_id uuid references events(id);
alter table profiles add column if not exists avatar_style text;
alter table profiles add column if not exists avatar_seed text;
alter table profiles add column if not exists wants_matching boolean default true;
alter table profiles add column if not exists open_to_connect boolean default true;

alter table conversations  add column if not exists event_id uuid references events(id);
alter table knowledge_base add column if not exists event_id uuid references events(id);
alter table escalations    add column if not exists event_id uuid references events(id);
alter table matches        add column if not exists event_id uuid references events(id);
alter table matches        add column if not exists match_code text;

-- profiles uniqueness: per (event, auth0_id) instead of global auth0_id
alter table profiles drop constraint if exists profiles_auth0_id_key;
create unique index if not exists profiles_event_auth0_idx on profiles(event_id, auth0_id);

-- ─────────────────────────────────────────── backfill buildnyc26 (keeps v1 demo data working)
insert into events (id, slug, name, tagline, description, organizer_auth0_id, organizer_email, admin_passcode)
values (
  'e0000000-0000-4000-a000-000000000001',
  'buildnyc26',
  'Built in NYC',
  'Your AI agent networks the room. You just show up.',
  'A one-day AI hackathon in NYC.',
  'seed|organizer',
  'organizer@buildnyc.dev',
  'shipnyc'
) on conflict (slug) do nothing;

update profiles      set event_id = 'e0000000-0000-4000-a000-000000000001' where event_id is null;
update conversations set event_id = 'e0000000-0000-4000-a000-000000000001' where event_id is null;
update knowledge_base set event_id = 'e0000000-0000-4000-a000-000000000001' where event_id is null;
update escalations   set event_id = 'e0000000-0000-4000-a000-000000000001' where event_id is null;
update matches       set event_id = 'e0000000-0000-4000-a000-000000000001' where event_id is null;

-- ─────────────────────────────────────────── event-scoped RPCs (replace v1 signatures)
drop function if exists match_profiles(vector, uuid, int);
create or replace function match_profiles(
  query_embedding vector(1536),
  exclude_id uuid,
  p_event_id uuid,
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
    and p.event_id = p_event_id and coalesce(p.wants_matching, true)
  order by p.embedding <=> query_embedding
  limit match_count;
$$;

drop function if exists match_knowledge(vector, int);
create or replace function match_knowledge(
  query_embedding vector(1536),
  p_event_id uuid,
  match_count int default 3
)
returns table (id uuid, content text, source text, similarity float)
language sql stable as $$
  select k.id, k.content, k.source,
         1 - (k.embedding <=> query_embedding) as similarity
  from knowledge_base k
  where k.embedding is not null and k.event_id = p_event_id
  order by k.embedding <=> query_embedding
  limit match_count;
$$;

-- ─────────────────────────────────────────── RLS for events (public read; writes via service role)
alter table events enable row level security;
drop policy if exists "public read events" on events;
create policy "public read events" on events for select using (true);

alter table conversations add column if not exists summary_dummy boolean; -- no-op guard for re-run safety
alter table conversations drop column if exists summary_dummy;
