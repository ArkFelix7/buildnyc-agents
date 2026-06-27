# BuildNYC Agents

**AI agents that network a hackathon room for you.** Every builder fills out a quick
profile; we spin up an AI agent that embodies them, embed their profile into pgvector,
and let agents find their best collaborators by semantic match. Pairs of agents then
hold a short, public conversation on a live **Mission Control** screen. When two
builders both hit **Smash**, it's a mutual match and we fire off an intro email so they
can go build together. A RAG **Concierge** answers event questions and can escalate to a
human organizer.

## The problem it solves

Hackathon networking is lossy: you meet a fraction of the room, mostly by luck, and the
best collaborator for your idea is often someone you never talk to. BuildNYC Agents turns
the whole room into a searchable, self-introducing network — your agent works the floor
while you build, surfaces high-signal matches, and only interrupts you when there's a real
mutual fit.

## Architecture & sponsor stack

```
 Builder ──▶ Onboarding ──▶ /api/profile ──┐
   (Auth0)     (Next.js)                    │  embed (AI Gateway)
                                            ▼
                                      Supabase (Postgres + pgvector)
                                            │  cosine match
                                            ▼
                          /api/match ──▶ runMatchesForProfile()
                                            │  Claude scores + writes turns
                                            ▼
              Mission Control  ◀── Supabase Realtime ── conversations / messages
              (live agent chat)
                                            │  mutual Smash
                                            ▼
                                /api/smash ──▶ Resend (intro email)

 Concierge (RAG) ──▶ /api/concierge ──▶ pgvector knowledge search ──▶ Claude
                                            └─▶ /api/escalate ──▶ organizer (Resend)

 Observability: Sentry wraps every server/edge/client runtime + AI Agent Monitoring.
```

| Sponsor | How it's used (load-bearing) |
|---|---|
| **Auth0** (`@auth0/nextjs-auth0` v4) | Sign-in / session for builders before onboarding. |
| **Supabase** | Postgres for profiles/conversations/messages/matches/knowledge; **pgvector** for semantic matching + RAG; **Realtime** streams agent conversation turns to Mission Control. |
| **Vercel AI Gateway** (`@ai-sdk/gateway` + `ai`) | Single key routes all model calls: embeddings, persona generation, match scoring, agent conversation turns, and the concierge — Claude via the Gateway. |
| **Claude (Anthropic)** | Powers personas, match reasons, agent-to-agent conversation, and concierge answers. Model ids are **AI Gateway ids** (e.g. `anthropic/claude-haiku-4.5`, `anthropic/claude-sonnet-4.5`) — confirm exact strings on your Gateway dashboard. |
| **Resend** | Mutual-match intro emails + organizer escalation emails. |
| **Sentry** (`@sentry/nextjs` v10) | Error + performance monitoring across nodejs/edge/client runtimes, with **AI Agent Monitoring** (`vercelAIIntegration`) tracing agent calls and prompts/completions. |

Tech base: **Next.js 16** (App Router, `src/`, TypeScript strict), **Tailwind v4**, React 19.

## Setup

```bash
git clone <repo-url>
cd nychack
pnpm install
cp .env.example .env.local   # fill keys — OR leave blank to run in mock mode
```

The app is built to run in two modes (see `src/lib/env.ts`):

- **LIVE** — service keys present → real Supabase / AI Gateway / Resend / Auth0 / Sentry.
- **MOCK** — any key missing → graceful fallback (seed data, deterministic embeddings,
  canned LLM output, Sentry no-op). **`pnpm dev` works with zero keys.**

### Environment variables (`.env.example`)

- **Supabase** — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **AI Gateway** — `AI_GATEWAY_API_KEY`; model ids `MODEL_FAST`, `MODEL_SMART`, `MODEL_EMBED`
- **Resend** — `RESEND_API_KEY`, `EMAIL_FROM`, `ORGANIZER_EMAIL`
- **Auth0** — `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`, `APP_BASE_URL`
- **Sentry** — `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, and optionally `SENTRY_ORG` / `SENTRY_PROJECT` (for source-map upload at build time; absence is tolerated — no upload, no error)

## Database setup

In the Supabase **SQL editor**, run the full schema:

```
db/schema.sql
```

It's idempotent (`IF NOT EXISTS` / `CREATE OR REPLACE`) and enables the `vector` +
`pgcrypto` extensions, creates `profiles` (with a `vector(1536)` embedding column),
`conversations`, `messages`, `matches`, and `knowledge`, plus the match/RAG functions.

## Seeding

Both seeders are POST API routes (no CLI script — avoids tsx/path-alias issues). Start the
dev server first, then:

```bash
# 8 demo builders → embed → upsert → generate personas → pre-warm a few conversations
curl -X POST http://localhost:3000/api/seed
# → { "ok": true, "seeded": 8, "prewarmed": <n> }   (or { ok:true, mock:true, seeded:0 } in mock mode)

# Event knowledge base for the concierge (from db/knowledge.json)
curl -X POST http://localhost:3000/api/seed-knowledge
# → { "ok": true, "inserted": <n> }
```

In **mock mode** seeding is a no-op — the in-memory `SEED_PROFILES` already power the UI.

## Running

```bash
pnpm dev        # http://localhost:3000
pnpm typecheck  # tsc --noEmit
pnpm build      # production build (Sentry source-map upload only if SENTRY_AUTH_TOKEN set)
pnpm start      # serve the production build
```

## Demo flow

1. **Sign in** (Auth0) from the landing page.
2. **Onboard** — name, role, skills, what you're looking for, bio. This embeds your
   profile and generates your agent persona.
3. **Mission Control** — watch agents pair up by semantic match and hold live
   conversations, streamed via Supabase Realtime.
4. **Smash** a promising match. When the other builder smashes back → **mutual match**.
5. **Email** — Resend fires an intro email to both builders.
6. **Concierge** — ask the RAG concierge an event question; unanswerable / human-needed
   questions escalate to an organizer.

To demo without keys, just `pnpm dev`: pre-baked seed profiles and four scripted
conversations make Mission Control look live immediately.

## Mock / demo mode

`MOCK_MODE` (in `src/lib/env.ts`) is on whenever Supabase keys are absent. In that state:
deterministic pseudo-embeddings keep pgvector math sane, LLM call sites return canned
output, seed profiles + scripted conversations render on Mission Control, and Sentry
init no-ops (a DSN-less `Sentry.init` is a documented safe no-op). This guarantees the app
builds and runs end-to-end with **zero credentials**.

## Deploy to Vercel

1. Push to GitHub, import into Vercel.
2. Add the env vars from `.env.example` in **Project Settings → Environment Variables**
   (set `APP_BASE_URL` to your deployed URL and update Auth0 allowed callback/logout URLs).
3. Add `SENTRY_AUTH_TOKEN` (+ `SENTRY_ORG` / `SENTRY_PROJECT`) to enable source-map upload
   on build; without it the build still succeeds, just no upload.
4. Run the schema in Supabase, deploy, then `POST /api/seed` and `/api/seed-knowledge`
   against the deployed URL.

## Sponsor-tech checklist (PRD §16)

- [x] **Auth0** — login + session gating onboarding
- [x] **Supabase Postgres** — core data model (`db/schema.sql`)
- [x] **pgvector** — semantic matching + RAG retrieval
- [x] **Supabase Realtime** — live conversation streaming to Mission Control
- [x] **Vercel AI Gateway** — all model + embedding calls routed through one key
- [x] **Claude** — personas, match scoring, agent conversations, concierge
- [x] **Resend** — mutual-match intro + organizer escalation emails
- [x] **Sentry** — multi-runtime error/perf monitoring + AI Agent Monitoring; deliberate
      test error at `GET /api/sentry-test`

## Team

- _Add team members here_ — `aaryashah@neemhealth.ai`
