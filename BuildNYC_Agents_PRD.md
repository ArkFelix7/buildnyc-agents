# PRD: BuildNYC Agents
### AI-Powered Live Networking + Event Concierge
**Hackathon:** Built in NYC — June 27, 2026
**Submission Deadline:** 4:00 PM EST
**Build Window:** ~4 hours (12:05 PM – 4:00 PM)
**Submission URL:** community.vercel.com/hackathons/built-in-nyc
**Submission Password:** `shipnyc`

---

## 1. Problem Statement

Walking into a hackathon with 100+ attendees is overwhelming. You don't know who's looking for what. The usual solution — "just walk around and talk to people" — wastes time and leads to missed connections. Meanwhile, organizer Notion pages and event sites are dense and unread, so attendees constantly ping organizers with questions already answered somewhere.

**The pain:** Builders lose the first 30–60 minutes of a hackathon trying to find teammates or collaborators. Organizers get spammed with questions. Real connections that could have formed never do.

**Who experiences this:** Every hackathon attendee (devs, designers, AI engineers, founders) and every event organizer.

**Cost of not solving it:** Poor team formation degrades project quality across the whole event. Missed connections = missed collaborations, partnerships, and friendships that hackathons are supposed to create.

---

## 2. One-Sentence Pitch

> "Sign up, and your AI agent networks the room for you in real time — finding the people you actually need to meet, chatting on your behalf with dozens of others simultaneously, and emailing you both the moment it's mutual."

---

## 3. Goals

**User Goals**
- G1: An attendee can find and connect with the best-matched collaborator within 5 minutes of signing up — without talking to a single stranger first.
- G2: Any attendee can ask any question about the hackathon and get an accurate answer instantly; if the answer is missing, the organizer is automatically notified.
- G3: A confirmed "mutual match" results in a real email introduction landing in both parties' inboxes within 30 seconds of the match firing.

**Demo / Hackathon Goals**
- G4: The live Mission Control screen visually shows ≥3 simultaneous agent conversations happening in real time on a single projected screen — the core "wow" moment for judges.
- G5: A judge can sign up live during the 3-minute demo, have their agent spawn, see it chatting with other agents, receive a match email on their phone, and understand the full product within 90 seconds.

**Technical Goals**
- G6: Every sponsor technology (Anthropic, Vercel eve, AI Gateway, AI SDK, Workflows, Supabase, Auth0, Resend, Sentry) is used in a load-bearing, non-cosmetic way.

---

## 4. Non-Goals (explicitly out of scope for this build)

| Non-Goal | Reason |
|---|---|
| Dating / romantic matching use case | Scope creep; hackathon networking is the winning frame for this audience |
| In-app direct messaging between humans | Resend email intro is sufficient for the demo; DMs require significant extra build time |
| Mobile app | Web-first; demo is on a laptop/projector |
| Agent voice / audio conversations | Adds latency and infra complexity; text convos are more projectable |
| Video generation or media pipeline | Not relevant to this idea |
| General-purpose event platform (beyond this hackathon) | v1 is hardcoded to buildnyc26; generalization is post-hackathon |
| Full organizer dashboard | Simple Resend notification is sufficient for demo; a full dashboard is v2 |
| Persistent agent memory across sessions | Agents are stateless within a session for simplicity |

---

## 5. User Personas

### Persona A — The Builder (primary)
A developer, designer, or AI engineer attending buildnyc26 solo or with a partial team. They know what they're good at and what they need. They want to find collaborators fast without awkward small talk.

### Persona B — The Organizer
The Vercel team member running the event. They want attendees to be able to self-serve for information. They don't want to be spammed with questions. They want to be notified when something's missing from their event page.

### Persona C — The Judge (demo target)
A Vercel engineer or PM watching the 3-minute demo. They need to understand what the product does in the first 20 seconds. They are impressed by real agent orchestration, observable AI behavior, and clean use of eve + Supabase Realtime.

---

## 6. User Stories

### Onboarding & Profile
- **US-01:** As a Builder, I want to sign up with Google/GitHub in one click so that I don't waste time on auth setup.
- **US-02:** As a Builder, I want to fill out a simple profile (name, role, skills, what I'm looking for) so that my agent knows how to represent me.
- **US-03:** As a Builder, I want my agent to be automatically generated from my profile so that I don't have to write a prompt myself.

### Live Agent Networking
- **US-04:** As a Builder, I want to see my agent actively chatting with other agents in real time on a "Mission Control" screen so that I can observe who it's talking to and what they're saying.
- **US-05:** As a Builder, I want my agent to be talking to multiple other agents simultaneously so that I'm effectively networking the whole room at once.
- **US-06:** As a Builder, I want to see a match score and one-line reason ("Great fit: both need a designer, Alex has 3 years of Figma experience") so that I can quickly decide whether to connect.
- **US-07:** As a Builder, I want to "smash" (like) another user so that I can signal I want to connect directly.
- **US-08:** As a Builder, when there's a mutual like, I want both of us to receive an email introduction immediately so that we can take the conversation to real life.

### Event Concierge
- **US-09:** As a Builder, I want to ask any question about the hackathon ("What are the prizes?", "When is lunch?") and get an instant, accurate answer so that I don't have to scroll through Notion.
- **US-10:** As a Builder, when the concierge doesn't know something, I want it to tell me it's escalating to the organizer so that I know help is on the way.
- **US-11:** As an Organizer, I want to receive an email notification when an attendee asks a question the system can't answer so that I can fill in the knowledge gap.
- **US-12:** As an Organizer, I want to reply to that notification and have the answer post back to the attendee so that the system self-improves.

### Demo-Specific
- **US-13:** As a Judge, I want to sign up live during the demo and immediately see my agent appear on the Mission Control screen so that the product's core mechanic is instantly clear.
- **US-14:** As a Judge, I want to see the Sentry and Vercel Agent Runs dashboards open in a tab so that I can verify the observability layer is real.

---

## 7. Feature Requirements

### P0 — Must Ship (core demo blockers)

#### Auth & Onboarding
- **P0-01: Auth0 login**
  - Social login (Google + GitHub) via `@auth0/nextjs-auth0` v4
  - Routes auto-mounted at `/auth/*`
  - On first login, redirect to profile onboarding form
  - *Acceptance:* A new user can sign in with Google and reach the profile form in < 10 seconds

- **P0-02: Profile form**
  - Fields: Name, Role (Dev / Designer / AI Engineer / PM / Other), Skills (multi-select or free text), What I'm Looking For (free text, max 200 chars), Short Bio (optional, max 300 chars)
  - On submit: save to Supabase `profiles` table; generate embedding via AI SDK; store vector in pgvector column
  - *Acceptance:* Profile saves to Supabase and embedding is stored within 3 seconds of form submit

#### Persona Agent Generation
- **P0-03: Auto-generate agent persona**
  - On profile save, call Claude via AI Gateway (`claude-haiku-4-5-20251001` for speed)
  - Prompt: generate an `instructions.md` for an eve agent that embodies this person — their skills, goals, personality, and what they're looking for
  - Store generated instructions in Supabase `profiles.agent_instructions`
  - *Acceptance:* Agent instructions are generated and stored within 5 seconds of profile completion

#### Semantic Matching
- **P0-04: Match candidates via pgvector**
  - On profile creation, run cosine similarity search against all other profiles using HNSW index
  - Return top-5 candidates
  - Pass candidates to Claude (`claude-sonnet-4-6`) via AI Gateway with `generateObject` (Zod schema: `{ match_score: number, reason: string }`)
  - Store top-3 scored matches in Supabase `matches` table
  - *Acceptance:* Matches are returned and scored within 10 seconds of profile creation; match reasons are ≤ 15 words each

#### Agent-to-Agent Conversations
- **P0-05: Orchestrate agent conversations**
  - For each top match pair, spawn a Vercel Workflow (`'use workflow'`) that orchestrates a turn-based conversation between two eve agents
  - Each agent uses its stored `agent_instructions` as its system prompt
  - Agents exchange ≤ 12 turns; system prompt instructs them: "You are performing in front of a live audience. Be concise, warm, and direct. Prioritize discovering whether these two people should meet."
  - Use `claude-haiku-4-5-20251001` (fast + cheap) for conversation turns
  - Cap concurrent conversations at 5 pairs to control cost
  - *Acceptance:* A full 12-turn conversation completes in under 90 seconds; agents stay on topic

- **P0-06: Stream conversations to Mission Control via Supabase Realtime**
  - Each conversation turn is inserted into `messages` table and broadcast via Supabase Realtime Broadcast channel
  - Mission Control page subscribes to all active conversation channels
  - Each conversation appears as a live chat card; new messages animate in as they arrive
  - Supabase Presence tracks online users; avatars shown in header
  - *Acceptance:* Message appears on Mission Control screen within 500ms of being generated

#### Mission Control UI
- **P0-07: Mission Control screen**
  - Full-screen page showing 3–5 conversation cards side by side
  - Each card: two participant names/avatars, scrolling live message feed, match score badge
  - Online presence avatars in header (Supabase Presence)
  - "Smash" ❤️ button on each card for the logged-in user to like the other person
  - *Acceptance:* Screen is projectable at 1080p; cards are readable from 5 feet; no layout breaks with 3–5 simultaneous active conversations

#### Mutual Match → Email Intro
- **P0-08: Mutual like detection + Resend email**
  - On "smash" click: write like to `matches` table; check if other user has also liked back
  - On mutual match: trigger Resend `resend.emails.send()` with React Email template to both users
  - Email contains: "You and [Name] both want to connect! Here's what [Name] is working on: [bio]. Reply to this email or find them at the hackathon."
  - *Acceptance:* Email arrives in both inboxes within 30 seconds of mutual like; email renders correctly in Gmail

#### Event Concierge (RAG)
- **P0-09: Hackathon knowledge base**
  - Pre-scrape buildnyc26 Notion page content (agenda, prizes, WiFi, submission rules, sponsor info, ideas)
  - Chunk into ~500-token segments; embed each chunk via AI SDK; store in Supabase `knowledge_base` table with pgvector
  - *Acceptance:* Knowledge base is seeded before hack start; minimum 20 chunks indexed

- **P0-10: Concierge Q&A**
  - Chat input on a "Ask the Concierge" tab
  - On question submit: embed question; retrieve top-3 matching chunks (cosine similarity); pass to Claude (`claude-sonnet-4-6`) via AI Gateway for RAG answer
  - Stream answer back to UI via `streamText`
  - If retrieval similarity score < 0.7 (low confidence): answer with "I'm not sure — I'm notifying the organizer now" and trigger P0-11
  - *Acceptance:* Questions like "When is lunch?" and "What are the prizes?" are answered accurately in < 5 seconds

- **P0-11: Organizer escalation via eve human-in-the-loop**
  - Eve agent tool with `needsApproval: true` — fires a Resend email to the organizer with the unanswered question
  - Workflow parks and waits for organizer reply (eve durable execution)
  - On reply: workflow resumes and posts answer back to the attendee's concierge chat
  - *Acceptance:* Escalation email is sent within 10 seconds of low-confidence trigger; reply flow resumes correctly (can be demoed with organizer replying on-screen)

#### Observability
- **P0-12: Sentry + Vercel Agent Runs**
  - `npx @sentry/wizard@latest -i nextjs` — instruments client, server, edge
  - Sentry AI Agent Monitoring enabled (tracks AI SDK tool calls and model calls)
  - Vercel Agent Runs dashboard open in a tab during demo to show agent traces
  - *Acceptance:* Sentry catches a deliberate test error in staging; Agent Runs shows conversation workflow traces

---

### P1 — Nice to Have (ship if time allows)

- **P1-01: Auto-fire match on high agent fit score** — if Claude scores a match ≥ 0.85, auto-trigger the intro email without requiring a manual "smash" (with a "Your agent found a great match!" notification)
- **P1-02: Match explanation card** — on the Mission Control screen, show a 1-sentence explanation of why these two agents are talking ("Both need a designer, both are building with Supabase")
- **P1-03: Conversation summary** — after a conversation ends, Claude summarizes it in 2 sentences and saves to `conversations.summary`; shown on the match card
- **P1-04: Attendee count + live stats banner** — "12 builders online · 8 conversations happening · 3 matches made" — shown at top of Mission Control
- **P1-05: Profile photo upload** — Supabase Storage; avatar shown on conversation cards
- **P1-06: "Looking for" tag pills on profile** — structured multi-select ("Looking for: Designer, AI Engineer") instead of free text, makes matching more precise

---

### P2 — Future / Post-Hackathon

- **P2-01:** Generalize beyond buildnyc26 — any event organizer can create an event, upload their Notion page URL, and run the platform
- **P2-02:** In-app DM / chat between matched humans after intro email
- **P2-03:** Agent personality sliders (more formal / more casual, more technical / more business)
- **P2-04:** Team formation mode — match groups of 3–4, not just pairs
- **P2-05:** Post-event follow-up email digest (Resend) — "Here are all your matches from today"
- **P2-06:** LinkedIn / GitHub profile import to auto-fill profile form

---

## 8. Technical Architecture

### Stack
| Layer | Technology |
|---|---|
| Framework | Next.js on Vercel |
| Agent Framework | Vercel eve (`npx eve@latest init`) |
| AI Models | Claude via Vercel AI Gateway (`claude-haiku-4-5-20251001` for chat, `claude-sonnet-4-6` for scoring/RAG) |
| AI SDK | Vercel AI SDK (`generateObject`, `streamText`, `embed`) |
| Durable Workflows | Vercel Workflows (`'use workflow'` / `'use step'`) |
| Database | Supabase Postgres |
| Vector Search | Supabase pgvector (HNSW index) |
| Realtime | Supabase Realtime Broadcast + Presence |
| Auth | Auth0 (`@auth0/nextjs-auth0` v4) |
| Email | Resend + React Email |
| Observability | Sentry + Vercel Agent Runs |

### Database Schema

```sql
-- Attendee profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT, -- 'dev' | 'designer' | 'ai_engineer' | 'pm' | 'other'
  skills TEXT[],
  looking_for TEXT,
  bio TEXT,
  agent_instructions TEXT,
  embedding VECTOR(1536), -- text-embedding-3-small
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations between two agents
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_a UUID REFERENCES profiles(id),
  profile_b UUID REFERENCES profiles(id),
  match_score FLOAT,
  match_reason TEXT,
  summary TEXT,
  status TEXT DEFAULT 'active', -- 'active' | 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual messages within conversations
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  speaker UUID REFERENCES profiles(id), -- which agent sent this
  content TEXT NOT NULL,
  turn_number INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Match / like records
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_profile UUID REFERENCES profiles(id),
  to_profile UUID REFERENCES profiles(id),
  mutual BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_profile, to_profile)
);

-- Hackathon knowledge base for RAG
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  source TEXT, -- 'buildnyc26-notion'
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW indexes for fast vector search
CREATE INDEX ON profiles USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON knowledge_base USING hnsw (embedding vector_cosine_ops);
```

### Row-Level Security
```sql
-- Users can only read/update their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid()::text = auth0_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid()::text = auth0_id);

-- Conversations are readable by participants only
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view conversations" ON conversations FOR SELECT
  USING (profile_a IN (SELECT id FROM profiles WHERE auth0_id = auth.uid()::text)
      OR profile_b IN (SELECT id FROM profiles WHERE auth0_id = auth.uid()::text));

-- Messages readable by conversation participants
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- (inherit via conversation_id join — or use service role key for agent writes)
```

### Eve Agent Structure
```
/agents
  /persona-agent/
    instructions.md        ← generated per user from profile
    tools/
      get_profile.ts       ← fetch own profile context
      end_conversation.ts  ← signal conversation is complete
  /concierge-agent/
    instructions.md        ← "You are the BuildNYC hackathon concierge..."
    tools/
      search_knowledge.ts  ← pgvector RAG search
      escalate_to_organizer.ts  ← needsApproval: true → Resend email
```

### Key API Routes
```
POST /api/profile          → save profile, generate embedding, trigger agent gen
POST /api/match            → run pgvector similarity, score with Claude, store matches
POST /api/conversation/start → spawn Vercel Workflow for agent pair
POST /api/smash            → record like, check mutual, fire Resend if match
POST /api/concierge        → RAG Q&A, escalate if low confidence
GET  /api/conversations    → list active conversations for Mission Control
```

### Vercel Workflow (conversation orchestration)
```typescript
'use workflow';

export async function runAgentConversation(
  profileA: Profile,
  profileB: Profile,
  conversationId: string
) {
  const messages: Message[] = [];

  for (let turn = 0; turn < 12; turn++) {
    'use step';
    const speaker = turn % 2 === 0 ? profileA : profileB;
    const listener = turn % 2 === 0 ? profileB : profileA;

    const response = await generateText({
      model: gateway('claude-haiku-4-5-20251001'),
      system: speaker.agent_instructions,
      messages: [
        ...messages,
        { role: 'user', content: `You are speaking with ${listener.name}. Continue the conversation naturally. Max 2 sentences.` }
      ]
    });

    // Save to Supabase + broadcast via Realtime
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      speaker: speaker.id,
      content: response.text,
      turn_number: turn
    });

    await supabase.channel(`conversation:${conversationId}`)
      .send({ type: 'broadcast', event: 'new_message', payload: { speaker: speaker.name, content: response.text, turn } });

    messages.push({ role: 'assistant', content: response.text });

    await sleep(800); // pacing for readability on Mission Control
  }
}
```

---

## 9. Pages / UI Screens

### Screen 1: Landing / Sign Up
- Headline: "Your AI agent networks the room. You just show up."
- Sub: "Sign in and your agent starts finding your perfect hackathon collaborators in real time."
- CTA: "Sign in with Google" / "Sign in with GitHub" (Auth0)
- Background: subtle animated particle/graph network

### Screen 2: Profile Onboarding
- Simple form: Name, Role (pill select), Skills (chips), Looking For (text), Bio (optional)
- Progress indicator
- On submit: "Generating your AI agent…" loading state → redirect to Mission Control

### Screen 3: Mission Control (the demo screen)
- Full-screen dark UI
- Top bar: "BuildNYC Agents · 🟢 12 online" + presence avatars
- Main area: 3–5 conversation cards in a responsive grid
- Each card:
  - Two participant names + role badge (e.g., "Dev" / "Designer")
  - Match score pill ("87% match")
  - Scrolling live message feed (auto-scroll to bottom)
  - ❤️ Smash button (disabled if already liked; green if mutual match)
- Bottom: "Ask the Concierge" tab that opens the concierge chat panel

### Screen 4: Concierge Chat (slide-up panel or tab)
- Chat interface: user types question, answer streams back in real time
- Low-confidence state: "I'm not sure — I've notified the organizer. You'll get an answer shortly." + spinner
- Shows source citations: "Based on: [Prizes section of BuildNYC Notion page]"

### Screen 5: Match Confirmed (toast / modal)
- "🎉 You matched with Alex!" 
- "Check your email — we've sent you both an introduction."
- Shows match reason: "You're both building with Supabase and Alex is the designer you're looking for."

---

## 10. Email Templates (Resend + React Email)

### Mutual Match Intro Email
```
Subject: You matched with {Name} at BuildNYC Agents 🤝

Hey {User},

Your AI agent just found a great match for you at the hackathon.

**{Match Name}** — {Role}
{Match Bio}

What they're looking for: {Looking For}

You both liked each other. Go find them! They're the person with the {role} badge. 

Or reply to this email to send them a message directly.

— BuildNYC Agents
```

### Organizer Escalation Email
```
Subject: ❓ Attendee question needs your answer

An attendee at BuildNYC asked a question your event page doesn't cover:

"{Question}"

Reply to this email with the answer and we'll post it back to them automatically.

— BuildNYC Agents
```

---

## 11. Hour-by-Hour Build Plan

| Time | Task | Owner Hint |
|---|---|---|
| 12:05–12:25 | Scaffold: `npx eve@latest init`, `vercel link`, Supabase project + schema, Auth0 app, Sentry wizard | Full team |
| 12:25–12:45 | Auth0 login flow + profile form UI + Supabase profile save | Frontend |
| 12:45–13:15 | Profile embedding (AI SDK) + pgvector match query + Claude match scoring (`generateObject`) | Backend |
| 13:15–14:15 | Vercel Workflow for agent conversation + Supabase Realtime broadcast per turn | Backend |
| 14:15–14:45 | Mission Control UI — conversation cards + Realtime subscription + Presence | Frontend |
| 14:45–15:05 | "Smash" button + mutual like detection + Resend intro email | Full team |
| 15:05–15:35 | Knowledge base seed (parse Notion content → chunk → embed → pgvector) + Concierge RAG Q&A | Backend |
| 15:35–15:50 | Eve organizer escalation tool (`needsApproval: true`) + Resend escalation email | Backend |
| 15:50–16:00 | Seed 8 fake profiles, pre-warm matches, deploy to Vercel, open Agent Runs + Sentry tabs, run full demo rehearsal | Full team |

---

## 12. Demo Script (3 minutes exactly)

**0:00–0:20 — The problem**
> "You walk into a hackathon with 100 other builders. You need a designer. Somewhere in this room there's a designer who needs a dev. You'll probably never find each other. That's what we fixed."

**0:20–1:40 — The live magic (sign up a judge)**
> "Sign in with Google." → Profile form ("Dev, building with Supabase, looking for a designer") → "Your agent is being created…" → Mission Control appears with live conversation cards → "Your agent is already talking to 4 other builders. Watch." → Scroll through cards live → Match score fires → "Smash it." → Email arrives on judge's phone live → "That's it. You just networked the whole room in 90 seconds."

**1:40–2:20 — Event concierge**
> "And while that's happening — ask anything about the hackathon." → Type "What are the prizes for 1st place?" → Answer streams back → Type a question the Notion page doesn't cover → "I'm not sure — I've notified the organizer." → Show Resend email firing → "They reply, and the answer posts back."

**2:20–3:00 — Tech + close**
> Show: Agent Runs dashboard (traces for all conversations), Sentry AI monitoring, one-slide stack diagram (eve + AI Gateway + Supabase Realtime/pgvector + Auth0 + Resend + Sentry). 
> "Every event, every conference, every company networking session. Observable AI agents — not black-box recommendations — networking on your behalf."

---

## 13. Success Metrics

### Demo-Day Metrics (leading)
- Judge can understand the product in < 20 seconds ✓/✗
- Live sign-up to first agent conversation: < 2 minutes ✓/✗
- Mission Control shows ≥ 3 live conversations during demo ✓/✗
- Match email lands on judge's phone during demo ✓/✗
- Concierge escalation fires and is visible during demo ✓/✗

### Post-Hackathon Metrics (lagging, if productized)
- Time to first match: target < 5 minutes from profile creation
- Match acceptance rate: target > 40% of intro emails lead to a real conversation
- Concierge answer accuracy: target > 85% of questions answered without escalation
- Attendee NPS: target > 50

---

## 14. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Agent conversations loop or go off-topic | Medium | High | Cap at 12 turns; inject "live audience" framing in system prompt; test with 5 pairs before demo |
| Parallel LLM calls exceed budget/latency | Medium | High | Cap concurrent pairs at 5; use Haiku for chat, Sonnet only for scoring; set AI Gateway budget alert |
| Notion content scraping is incomplete | Low | Medium | Pre-scrape and hard-code corpus into JSON file as fallback; don't rely on live fetch during demo |
| Auth0 misconfiguration blocks sign-up | Low | Critical | Test full auth flow on deployed URL (not localhost) 30 min before submission |
| Supabase Realtime drops messages | Low | High | Add message retry logic; fall back to polling every 2s if Realtime fails |
| Eve agent framework API changes (public beta) | Medium | High | Spike the eve conversation workflow first (first 20 min); if blocked, fall back to direct AI SDK streaming |
| Demo hardware / screen resolution issues | Low | Medium | Test Mission Control on projector resolution (1080p) before demo; have screenshot backup |
| Match email lands in spam | Low | Medium | Use a verified Resend domain; test email delivery to Gmail and Apple Mail before demo |

### Fallback Plan (if agent conversations don't work by Hour 2)
Drop the live agent-to-agent chat. Keep: profile creation → pgvector matching → match score card → smash button → Resend intro email → concierge RAG. This is still a complete, impressive product that uses all 7 sponsors and solves the core problem.

---

## 15. Open Questions

| # | Question | Owner | Blocking? |
|---|---|---|---|
| OQ-01 | Which Claude model strings are available on AI Gateway today? (confirm `claude-haiku-4-5-20251001` and `claude-sonnet-4-6` are live) | Engineering | Yes — check on Gateway dashboard at hack start |
| OQ-02 | Is the eve web channel compatible with Next.js App Router or Pages Router? | Engineering | Yes — spike first |
| OQ-03 | Does Vercel Workflow support the `sleep()` / pacing step between agent turns? | Engineering | Yes — test in spike |
| OQ-04 | What is the organizer's email address for escalation notifications? | Organizer / Team | Yes — hardcode before demo |
| OQ-05 | Do we have a verified Resend sending domain set up, or will we use the sandbox domain? | Engineering | Yes — set up before hack, not during |
| OQ-06 | How many real attendees will be at the event? (affects seeding strategy — need enough fake profiles if < 10 real sign-ups) | Team | No — seed 8 fake profiles regardless |
| OQ-07 | Should the Mission Control screen be accessible to all users or only the logged-in user? | Design | No — all users for demo purposes |

---

## 16. Submission Checklist

- [ ] GitHub repo is public and has a clear README
- [ ] 1:30 demo video recorded (YouTube unlisted or Loom)
- [ ] All team member names listed
- [ ] Tech stack listed: Vercel, Claude Code, Supabase, Auth0, Resend, Sentry, eve
- [ ] App is deployed and live at a Vercel URL
- [ ] Submission password `shipnyc` entered correctly
- [ ] Submitted before 4:00 PM EST at community.vercel.com/hackathons/built-in-nyc

---

*PRD authored: June 27, 2026 · Built in NYC Hackathon*
