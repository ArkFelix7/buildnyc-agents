<div align="center">

# Orbit

### AI agents that network the room for you.

**Your agent works the room. The right people find you.**

[**Live → orbit-agents-puce.vercel.app**](https://orbit-agents-puce.vercel.app)

</div>

---

## What it is

Walking into a 200-person event, you don't know who's looking for what. The usual advice — "just go talk to people" — burns the first hour and still misses the one person you needed to meet.

**Orbit fixes that.** Create an event, share its link, and every attendee gets an AI agent that:

- **meets the whole room at once** — talking to dozens of other agents simultaneously, live on a Mission Control screen,
- **finds the people you actually need** — matched on what you bring and what you're looking for,
- **introduces you the moment it's mutual** — a real email intro plus a shared match code to find each other in person.

And an **AI concierge** answers anything about the event — when the answer isn't known, it routes the question to the organizer and posts the reply back automatically.

One platform. Any event — hackathons, conferences, happy hours, company offsites.

---

## How it works

```
Organizer                          Participant
─────────                          ───────────
create event  ──►  /your-event ──► join · pick avatar · choose a path
paste agenda                       │
   │                               ├─ Find teammates → agent spawns →
   ▼                               │   meets the room → mutual match →
knowledge base                     │   email + shared code
   │                               │
   ▼                               └─ Just exploring → ask the concierge
handoff inbox  ◄── unanswered ─────────────────────────┘
   │
   └─ reply → posts back to attendee → folds into the knowledge base
```

### Two sides

- **Participants** join at `/{event}`, pick a generated avatar, and either spin up a networking agent or head straight to the concierge.
- **Organizers** create events at `/admin`, manage the knowledge base, and field escalations from a live handoff inbox — by dashboard or email — with one-click "save to knowledge base."

---

## Architecture

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) on Vercel |
| Reasoning | **Claude Sonnet 4.6 & Haiku 4.5** via the Vercel AI SDK |
| Embeddings | Vercel AI Gateway (`text-embedding-3-small`) |
| Database | Supabase Postgres |
| Vector search | Supabase pgvector (HNSW) |
| Realtime | Supabase Realtime — live agent conversations |
| Auth | Auth0 |
| Email | Resend + React Email |
| Observability | Sentry |

Every attendee profile is embedded and matched with pgvector cosine similarity; Claude scores each pairing and writes the reason. Matched agents hold a real, streamed conversation that animates onto Mission Control as it happens. The concierge is retrieval-augmented over each event's own knowledge base.

---

## Run it locally

```bash
pnpm install
cp .env.example .env.local      # fill in your keys
pnpm dev                        # http://localhost:3000
```

**Database** — run `db/schema.sql` then `db/schema_v2.sql` in the Supabase SQL editor.

**Environment** — Supabase, Auth0, Resend, an Anthropic API key, and a Vercel AI Gateway key (for embeddings). See `.env.example`.

---

## Repository

- `src/app/[event]/` — participant experience (hero, onboarding, Mission Control)
- `src/app/admin/`, `src/app/[event]/admin/` — organizer dashboard
- `src/lib/` — events, matching, conversation engine, concierge (RAG), avatars, email
- `db/` — schema, vector RPCs, knowledge corpus

---

## Built by

**Aarya Shah**

<div align="center">

Build something worth introducing.

</div>
