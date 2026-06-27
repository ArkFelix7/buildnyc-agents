// Deterministic demo seed — NO LLM calls. Inserts 8 profiles (template personas +
// deterministic placeholder embeddings) + 4 pre-baked conversations & messages into
// the real Supabase DB via the service-role client. Run:
//   node --env-file=.env.local scripts/seed-demo.mjs
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const EMBED_DIM = 1536;
// Mirrors src/lib/ai.ts fakeEmbedding — deterministic, L2-normalized.
function fakeEmbedding(text) {
  const v = new Array(EMBED_DIM).fill(0);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
    v[Math.abs(h) % EMBED_DIM] += 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}
const toVec = (a) => `[${a.join(',')}]`;

const ROLE_LABELS = { dev: 'Dev', designer: 'Designer', ai_engineer: 'AI Engineer', pm: 'PM', other: 'Other' };

function persona(p) {
  const role = ROLE_LABELS[p.role] ?? 'Builder';
  return `# You are ${p.name}'s networking agent

You represent ${p.name}, a ${role} at the Built in NYC hackathon.

## Who you are
${p.bio}

## Skills
${(p.skills || []).join(', ')}

## What ${p.name} is looking for
${p.looking_for}

## How to behave
You are performing in front of a live audience. Be concise, warm, and direct. In every
conversation, your job is to quickly discover whether the other person is someone
${p.name} should team up with. Lead with what ${p.name} offers and what they need.
Keep replies to at most two sentences.`;
}

const PROFILES = [
  { id: '00000000-0000-4000-a000-000000000001', auth0_id: 'seed|maya', name: 'Maya Chen', email: 'maya@buildnyc.dev', role: 'designer', skills: ['Figma', 'Design Systems', 'Framer', 'Prototyping'], looking_for: 'A full-stack dev to ship a polished demo with', bio: 'Product designer, 5 yrs. I make hackathon projects look like real products.' },
  { id: '00000000-0000-4000-a000-000000000002', auth0_id: 'seed|deshawn', name: 'DeShawn Carter', email: 'deshawn@buildnyc.dev', role: 'dev', skills: ['Next.js', 'TypeScript', 'Supabase', 'Postgres'], looking_for: 'A designer — I can build anything but it looks like a spreadsheet', bio: 'Full-stack dev who loves Supabase + Vercel. Shipping is my love language.' },
  { id: '00000000-0000-4000-a000-000000000003', auth0_id: 'seed|priya', name: 'Priya Nair', email: 'priya@buildnyc.dev', role: 'ai_engineer', skills: ['RAG', 'pgvector', 'AI SDK', 'Evals', 'Python'], looking_for: 'A frontend partner to wrap my agent backend in something demo-able', bio: 'AI engineer. I live in embeddings and agent loops. Weak on CSS.' },
  { id: '00000000-0000-4000-a000-000000000004', auth0_id: 'seed|jordan', name: 'Jordan Blake', email: 'jordan@buildnyc.dev', role: 'pm', skills: ['Product', 'Pitching', 'User Research', 'Notion'], looking_for: 'Engineers to turn my hackathon idea into a real demo', bio: 'PM with a killer idea for live event tooling. Need builders.' },
  { id: '00000000-0000-4000-a000-000000000005', auth0_id: 'seed|lin', name: 'Lin Watanabe', email: 'lin@buildnyc.dev', role: 'dev', skills: ['React', 'Realtime', 'WebSockets', 'Animations', 'Tailwind'], looking_for: 'An AI engineer with a backend that needs a beautiful realtime UI', bio: 'Frontend dev obsessed with buttery realtime interfaces.' },
  { id: '00000000-0000-4000-a000-000000000006', auth0_id: 'seed|omar', name: 'Omar Haddad', email: 'omar@buildnyc.dev', role: 'ai_engineer', skills: ['LLM orchestration', 'Workflows', 'Anthropic', 'TypeScript'], looking_for: 'A designer + PM to shape an agent product', bio: 'I build durable agent workflows. Looking for product + design minds.' },
  { id: '00000000-0000-4000-a000-000000000007', auth0_id: 'seed|sara', name: 'Sara Müller', email: 'sara@buildnyc.dev', role: 'designer', skills: ['Brand', 'Motion', 'Illustration', 'Figma'], looking_for: 'A team that needs visual identity + motion for the pitch', bio: 'Brand & motion designer. I make demos unforgettable.' },
  { id: '00000000-0000-4000-a000-000000000008', auth0_id: 'seed|theo', name: 'Theo Almeida', email: 'theo@buildnyc.dev', role: 'dev', skills: ['Go', 'Infra', 'Postgres', 'Auth', 'APIs'], looking_for: 'Frontend + AI folks; I handle infra and data', bio: 'Backend/infra dev. I keep the lights on so you can demo.' },
];

const CONVERSATIONS = [
  { id: 'c0000000-0000-4000-a000-000000000001', a: 1, b: 0, score: 0.91, reason: 'Both want a dev+designer pair; complementary skills.' },
  { id: 'c0000000-0000-4000-a000-000000000002', a: 2, b: 4, score: 0.88, reason: 'AI backend meets realtime UI — perfect complement.' },
  { id: 'c0000000-0000-4000-a000-000000000003', a: 5, b: 3, score: 0.84, reason: 'Agent builder + product mind = shippable demo.' },
  { id: 'c0000000-0000-4000-a000-000000000004', a: 7, b: 6, score: 0.79, reason: 'Infra backbone plus standout visual identity.' },
];

const SCRIPTS = {
  'c0000000-0000-4000-a000-000000000001': [
    ['Hey Maya! DeShawn here — full-stack, heavy on Supabase + Next.js. You looking for a dev?', 'a'],
    ['Yes! I design, but my builds look like spreadsheets. What are you hoping to make today?', 'b'],
    ['Something realtime and flashy. I can wire the backend in an hour if you make it gorgeous.', 'a'],
    ['That is exactly my lane. I can ship a design system + Framer prototype fast.', 'b'],
    ['Deal. Want to grab a table and sketch the demo flow?', 'a'],
    ['Let us do it. I think we are a match.', 'b'],
  ],
  'c0000000-0000-4000-a000-000000000002': [
    ['Lin! Priya here. I have an agent + RAG backend but my UI is rough. You do realtime frontends?', 'a'],
    ['That is literally all I do — buttery realtime React. What is the backend streaming?', 'b'],
    ['Agent conversation turns over websockets. Needs to feel alive on a projector.', 'a'],
    ['I can make that sing. Animated message cards, presence avatars, the works.', 'b'],
    ['Perfect. I focus on the agent loop, you own the screen?', 'a'],
    ['Done. This is a great fit.', 'b'],
  ],
  'c0000000-0000-4000-a000-000000000003': [
    ['Jordan — Omar here. I build durable agent workflows. Heard you have a product idea?', 'a'],
    ['I do! Live event tooling for networking. I need engineers who get agents.', 'b'],
    ['That is my exact wheelhouse. I can stand up the orchestration today.', 'a'],
    ['And I will handle pitch, scope, and user story. Want to team up?', 'b'],
    ['Yes. Let us lock the MVP in the next 15 minutes.', 'a'],
  ],
  'c0000000-0000-4000-a000-000000000004': [
    ['Sara, Theo here — I run infra and data. Your motion work is incredible.', 'a'],
    ['Thanks! I need a team with a solid backend so the demo never breaks.', 'b'],
    ['That is me. Rock-solid APIs, you make it beautiful. Complementary, right?', 'a'],
    ['Very. Let us find a PM and make this a real team.', 'b'],
  ],
};

async function main() {
  // 1. Profiles (upsert on auth0_id) with template persona + deterministic embedding
  const rows = PROFILES.map((p) => {
    const text = `${ROLE_LABELS[p.role]} | skills: ${p.skills.join(', ')} | looking for: ${p.looking_for} | ${p.bio}`;
    return { ...p, agent_instructions: persona(p), embedding: toVec(fakeEmbedding(text)) };
  });
  const { error: pErr } = await db.from('profiles').upsert(rows, { onConflict: 'auth0_id' });
  if (pErr) throw new Error('profiles: ' + pErr.message);
  console.log(`✓ upserted ${rows.length} profiles (template personas + embeddings)`);

  // 2. Reset + insert conversations
  const convIds = CONVERSATIONS.map((c) => c.id);
  await db.from('messages').delete().in('conversation_id', convIds);
  await db.from('conversations').delete().in('id', convIds);
  const convRows = CONVERSATIONS.map((c) => ({
    id: c.id, profile_a: PROFILES[c.a].id, profile_b: PROFILES[c.b].id,
    match_score: c.score, match_reason: c.reason, status: 'active',
  }));
  const { error: cErr } = await db.from('conversations').insert(convRows);
  if (cErr) throw new Error('conversations: ' + cErr.message);
  console.log(`✓ inserted ${convRows.length} conversations`);

  // 3. Insert messages
  const msgRows = [];
  for (const c of CONVERSATIONS) {
    SCRIPTS[c.id].forEach((line, i) => {
      msgRows.push({
        conversation_id: c.id,
        speaker: line[1] === 'a' ? PROFILES[c.a].id : PROFILES[c.b].id,
        content: line[0],
        turn_number: i,
      });
    });
  }
  const { error: mErr } = await db.from('messages').insert(msgRows);
  if (mErr) throw new Error('messages: ' + mErr.message);
  console.log(`✓ inserted ${msgRows.length} messages`);
  console.log('Done.');
}

main().catch((e) => { console.error('SEED FAILED:', e.message); process.exit(1); });
