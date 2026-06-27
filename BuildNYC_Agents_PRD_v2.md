# PRD v2: BuildNYC Agents → **Event Networking Platform**
### AI-Powered Live Networking + Event Concierge — now multi-event & two-sided

**Supersedes:** `BuildNYC_Agents_PRD.md` (v1). v1 shipped a working single-event demo hardcoded to `buildnyc26`. v2 generalizes it into a platform: **anyone can create an event, get a shareable URL, and run the whole experience** — with a clean split between an **admin/organizer side** and a **participant side**.

---

## 1. What changes from v1 (and why)

| v1 (shipped) | v2 (this PRD) | Why |
|---|---|---|
| Hardcoded `EVENT = buildnyc26` | First-class **Event** entity, slug-routed | The product is "every event, every conference" (v1 close line). Make it real. |
| Single global Mission Control / concierge / KB | Everything **scoped to an event** | Multiple events coexist; each has its own room, KB, matches. |
| `/mission-control`, `/onboarding` | `/{eventSlug}`, `/{eventSlug}/mission-control`, `/{eventSlug}/admin` | Each event has its **own URL** (`/buildnyc26`). Shareable, brandable. |
| Profile = global | Profile **scoped to event** (`event_id`) | You join *an event*. Same person can join many. |
| Matching always on | **Opt-in matching** + concierge-only path | "Even if they don't want matching, they can still use the concierge." |
| Plain initials avatar | **Avatar picker** (generated, fun, no upload) | "Make the profile journey a bit cool." |
| Mutual match → email | Mutual match → email **+ shared match code** | "Matched teammates both get a matching code so I can identify my match." |
| Organizer = hardcoded email | **Admin dashboard** (create event, manage KB, handle escalations via chat + email) | "Two sides: admin and participant." |

**Design north star:** the whole thing should feel *fast and frictionless*. A participant scans a QR / opens `/{slug}`, signs in, picks an avatar, and is either networking or asking the concierge within ~30 seconds. An organizer creates an event and pastes their Notion content in under 2 minutes.

---

## 2. The two sides

### Side A — Participant (`/{eventSlug}`)
The person at the event. Wants to (a) find collaborators fast and/or (b) get answers about the event.

### Side B — Admin / Organizer (`/{eventSlug}/admin`)
The person running the event. Wants to (a) stand up the event + knowledge base, (b) field questions the AI couldn't answer, (c) watch the room come alive.

Both authenticate via Auth0. **The Auth0 user who creates an event is its admin.** (For demo access, each event also has an optional `admin_passcode` so a judge/teammate can open the admin view without being the creator.)

---

## 3. Core concept: the Event

```
Event {
  slug          // 'buildnyc26' → URL /buildnyc26  (unique, lowercase, url-safe)
  name          // 'Built in NYC'
  tagline       // hero subtext
  description   // short blurb
  starts_at / ends_at
  organizer_auth0_id   // creator = admin
  organizer_email      // escalation + match-intro reply-to
  admin_passcode       // optional, demo access to admin view
  theme_color          // optional accent for light branding
  matching_enabled     // org can disable matching entirely (concierge-only event)
}
```

Creating an event provisions everything downstream: its own Mission Control, its own concierge KB, its own match pool. **Once the event exists, all of v1's magic happens — scoped to it.**

---

## 4. Participant journey (the "cool, smooth" flow)

**Route:** `/{slug}` → event hero → sign in → onboarding → event home.

1. **Event hero** (`/{slug}`) — event-branded landing: name, tagline, live count ("12 builders networking right now"), one CTA: **Join**. (If not signed in → Auth0; returnTo back to `/{slug}/join`.)
2. **Onboarding — Step 1 (Identity, required, fun):**
   - **Name** (prefilled from Auth0)
   - **Avatar picker** — a grid of generated geometric/gradient avatars (boring-avatars style, rendered locally as inline SVG — no upload, no network). Pick a style + shuffle for infinite variety. Optionally an emoji accent. *This is the "cool" moment.*
3. **Onboarding — Step 2 (The fork):** big friendly choice:
   - **"Find me teammates 🤝"** → continue to Step 3 (agent matching path)
   - **"Just exploring 👀"** → skip straight to event home; concierge available, no agent spawned. (Can opt into matching later from event home.)
4. **Onboarding — Step 3 (only if matching, made painless):** Role (pill select), Skills (chips), Looking for (1 line), Bio (optional). On submit: *"Spinning up your agent…"* → agent persona (Sonnet) → embedding → matching → redirect to Mission Control.
5. **Event home / Mission Control (`/{slug}/mission-control`):**
   - Matching participants: their agent's live conversations, match cards, **Smash ❤️**, match-score badges.
   - Everyone: **Ask the Concierge** panel.
   - Optional (P1): **People** tab — browse participants, filter by role/skill, see who's "open to connect."
6. **Mutual match:** toast + email to both, each carrying the **same match code** (memorable word-pair, e.g. `AMBER-FALCON`). "Find each other and say your code to confirm." Code also shown on the match card in-app.

**Concierge-without-matching:** a participant who chose "Just exploring" (or any visitor with a profile) can use the concierge fully. Matching is purely additive.

---

## 5. Admin journey

**Route:** `/admin` (list/create my events) → `/{slug}/admin` (manage one event).

1. **Create event:** name → auto-suggested slug (editable, uniqueness-checked), tagline, dates, organizer email, toggle `matching_enabled`, optional admin passcode. One click → event live at `/{slug}`.
2. **Knowledge base:** paste raw content (Notion dump, agenda, FAQ) → server chunks (~500 tokens) + embeds (AI Gateway) → stored with `event_id`. List/add/delete chunks. *Fixes "if something isn't there, update the KB."*
3. **Handoff inbox (escalations):** when the concierge can't answer (low similarity), it (a) emails the organizer and (b) drops the question into the admin **inbox as a chat thread**. Admin replies in the dashboard *or* by replying to the email → answer **posts back** to the participant's concierge thread, and admin can **one-click "save to KB"** so it self-improves.
4. **Live dashboard:** counts (online, conversations, matches, open escalations), recent matches, activity feed.

---

## 6. Data model v2 (additions/changes)

```sql
-- NEW
create table events (
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

-- CHANGED: scope to event + avatar + matching opt-in
alter table profiles add column event_id uuid references events(id);
alter table profiles add column avatar_style text;   -- e.g. 'beam' | 'marble' | ...
alter table profiles add column avatar_seed text;     -- deterministic render seed
alter table profiles add column wants_matching boolean default true;
alter table profiles add column open_to_connect boolean default true;  -- P1 networking
-- unique per (event, auth0_id) instead of global auth0_id

-- CHANGED: scope to event
alter table conversations   add column event_id uuid references events(id);
alter table knowledge_base  add column event_id uuid references events(id);
alter table escalations     add column event_id uuid references events(id);
alter table matches         add column event_id uuid references events(id);
alter table matches         add column match_code text;  -- shared 'AMBER-FALCON'

-- RPCs become event-scoped: match_profiles(query, exclude_id, event_id, k),
--                            match_knowledge(query, event_id, k)
```

Backwards-compat: seed a `buildnyc26` event row and backfill existing rows' `event_id` so the current demo data keeps working.

---

## 7. Routes v2

```
/                         → platform landing: "Create an event" / "Enter an event"
/admin                    → my events (create + list)            [auth]
/{slug}/admin             → manage event: KB, escalations, stats [auth + owner/passcode]

/{slug}                   → event hero / join CTA
/{slug}/join              → onboarding (avatar, fork, profile)   [auth]
/{slug}/mission-control   → live agent room + concierge
/{slug}/people            → participant directory + filters      [P1]

API (all event-scoped):
POST /api/events                       create event
GET  /api/events/[slug]                event meta
POST /api/events/[slug]/knowledge      add/seed KB chunks
POST /api/[slug]/profile               save profile (+avatar, +wants_matching)
POST /api/[slug]/match                 pgvector + Sonnet scoring (event pool)
POST /api/[slug]/concierge             RAG over event KB
POST /api/[slug]/smash                 like → mutual → match_code + email
POST /api/[slug]/escalate              concierge handoff
POST /api/[slug]/organizer-reply       admin answer → posts back (+ optional save-to-KB)
```

---

## 8. Avatars (the "cool" bit, no external deps)

Generated, deterministic, rendered **locally as inline SVG** (CSP-safe, offline-safe): a boring-avatars-style set (`beam`, `marble`, `sunset`, `ring`, `bauhaus`) seeded by a string. The picker shows ~12 options across styles + a **Shuffle** button (re-seed) for effectively infinite variety, plus the event's theme palette. No image upload, no Supabase Storage, no network calls. Avatar = `{style, seed}` stored on the profile and rendered everywhere (cards, presence, emails as a fallback initial).

---

## 9. Match codes

On mutual like, generate a **memorable, collision-resistant word-pair** (`ADJECTIVE-ANIMAL`, e.g. `AMBER-FALCON`) unique within the event. Both matched users receive the **same** code:
- **In-app:** on the match card + match toast.
- **Email (Resend):** "You matched with Maya at Built in NYC 🤝 — your match code is **AMBER-FALCON**. Find each other and say the code to confirm." Includes each other's bio + what they're looking for.
The code is the lightweight IRL handshake — no DMs needed (stays within v1's non-goals).

---

## 10. Non-goals (still out of scope)
- In-app human↔human DMs (email + match code suffices).
- Mobile app (web, responsive).
- Avatar **photo** upload (generated avatars only — simpler, faster, on-brand).
- Payments / ticketing / RSVP.
- Full org/team management, roles beyond creator-admin + passcode.

---

## 11. Build phases

- **P0 — Platform core (this build):** Event entity + creation, slug routing `/{slug}`, event-scoped onboarding with **avatar picker** + **matching opt-in**, event-scoped Mission Control, **concierge usable without matching**, event-scoped KB, **match codes** in app + email. Backfill `buildnyc26`.
- **P0 — Admin core (this build):** `/admin` create/list, `/{slug}/admin` KB management + **escalation inbox (chat) with email handoff + post-back + save-to-KB**.
- **P1 — Networking discovery (defer unless wanted):** `/{slug}/people` directory, filter by role/skill/interest, "open to connect" status/presence.
- **P2 — Future:** templates/branding, QR generation, post-event digest, analytics.

---

## 12. Demo script (v2, ~3 min)
1. **Admin (0:00–0:45):** "I'm running a hackathon." → create event `buildnyc26` → paste agenda/prizes → KB embeds → share `/buildnyc26`.
2. **Participant (0:45–2:00):** open `/buildnyc26` → sign in → **pick a slick avatar** → "Find me teammates" → agent spawns → Mission Control: agents chatting live → Smash → **match email + code `AMBER-FALCON`** on phone.
3. **Concierge + handoff (2:00–2:40):** ask "prizes?" → Sonnet answers. Ask something missing → "notified the organizer" → admin inbox lights up → admin replies in dashboard → **answer posts back** → one-click save-to-KB.
4. **Close (2:40–3:00):** "One platform. Any event. Observable AI agents networking the room — and an organizer who never gets spammed." Show stack: AI SDK + Anthropic (Sonnet) + AI Gateway (embeddings) + Supabase + Auth0 + Resend + Sentry.

---

*PRD v2 authored: June 27, 2026 · builds on the shipped v1.*
