import type { Profile, Conversation, Message, ConversationCard, Role } from './types';

/**
 * Seed roster — 8 fake builders (PRD OQ-06). Used to (a) seed Supabase before the
 * hack and (b) power MOCK mode so Mission Control has live-looking content with no DB.
 *
 * Ids are stable UUID-ish strings so cross-references in mock conversations hold.
 */
export const SEED_PROFILES: Profile[] = [
  {
    id: '00000000-0000-4000-a000-000000000001',
    auth0_id: 'seed|maya',
    name: 'Maya Chen',
    email: 'maya@buildnyc.dev',
    role: 'designer',
    skills: ['Figma', 'Design Systems', 'Framer', 'Prototyping'],
    looking_for: 'A full-stack dev to ship a polished demo with',
    bio: 'Product designer, 5 yrs. I make hackathon projects look like real products.',
    agent_instructions: null,
    avatar_url: null,
    created_at: '2026-06-27T12:10:00Z',
  },
  {
    id: '00000000-0000-4000-a000-000000000002',
    auth0_id: 'seed|deshawn',
    name: 'DeShawn Carter',
    email: 'deshawn@buildnyc.dev',
    role: 'dev',
    skills: ['Next.js', 'TypeScript', 'Supabase', 'Postgres'],
    looking_for: 'A designer — I can build anything but it looks like a spreadsheet',
    bio: 'Full-stack dev who loves Supabase + Vercel. Shipping is my love language.',
    agent_instructions: null,
    avatar_url: null,
    created_at: '2026-06-27T12:11:00Z',
  },
  {
    id: '00000000-0000-4000-a000-000000000003',
    auth0_id: 'seed|priya',
    name: 'Priya Nair',
    email: 'priya@buildnyc.dev',
    role: 'ai_engineer',
    skills: ['RAG', 'pgvector', 'AI SDK', 'Evals', 'Python'],
    looking_for: 'A frontend partner to wrap my agent backend in something demo-able',
    bio: 'AI engineer. I live in embeddings and agent loops. Weak on CSS.',
    agent_instructions: null,
    avatar_url: null,
    created_at: '2026-06-27T12:12:00Z',
  },
  {
    id: '00000000-0000-4000-a000-000000000004',
    auth0_id: 'seed|jordan',
    name: 'Jordan Blake',
    email: 'jordan@buildnyc.dev',
    role: 'pm',
    skills: ['Product', 'Pitching', 'User Research', 'Notion'],
    looking_for: 'Engineers to turn my hackathon idea into a real demo',
    bio: 'PM with a killer idea for live event tooling. Need builders.',
    agent_instructions: null,
    avatar_url: null,
    created_at: '2026-06-27T12:13:00Z',
  },
  {
    id: '00000000-0000-4000-a000-000000000005',
    auth0_id: 'seed|lin',
    name: 'Lin Watanabe',
    email: 'lin@buildnyc.dev',
    role: 'dev',
    skills: ['React', 'Realtime', 'WebSockets', 'Animations', 'Tailwind'],
    looking_for: 'An AI engineer with a backend that needs a beautiful realtime UI',
    bio: 'Frontend dev obsessed with buttery realtime interfaces.',
    agent_instructions: null,
    avatar_url: null,
    created_at: '2026-06-27T12:14:00Z',
  },
  {
    id: '00000000-0000-4000-a000-000000000006',
    auth0_id: 'seed|omar',
    name: 'Omar Haddad',
    email: 'omar@buildnyc.dev',
    role: 'ai_engineer',
    skills: ['LLM orchestration', 'Workflows', 'Anthropic', 'TypeScript'],
    looking_for: 'A designer + PM to shape an agent product',
    bio: 'I build durable agent workflows. Looking for product + design minds.',
    agent_instructions: null,
    avatar_url: null,
    created_at: '2026-06-27T12:15:00Z',
  },
  {
    id: '00000000-0000-4000-a000-000000000007',
    auth0_id: 'seed|sara',
    name: 'Sara Müller',
    email: 'sara@buildnyc.dev',
    role: 'designer',
    skills: ['Brand', 'Motion', 'Illustration', 'Figma'],
    looking_for: 'A team that needs visual identity + motion for the pitch',
    bio: 'Brand & motion designer. I make demos unforgettable.',
    agent_instructions: null,
    avatar_url: null,
    created_at: '2026-06-27T12:16:00Z',
  },
  {
    id: '00000000-0000-4000-a000-000000000008',
    auth0_id: 'seed|theo',
    name: 'Theo Almeida',
    email: 'theo@buildnyc.dev',
    role: 'dev',
    skills: ['Go', 'Infra', 'Postgres', 'Auth', 'APIs'],
    looking_for: 'Frontend + AI folks; I handle infra and data',
    bio: 'Backend/infra dev. I keep the lights on so you can demo.',
    agent_instructions: null,
    avatar_url: null,
    created_at: '2026-06-27T12:17:00Z',
  },
];

export function seedProfileById(id: string): Profile | undefined {
  return SEED_PROFILES.find((p) => p.id === id);
}

/** Pre-baked conversations so MOCK Mission Control shows ≥3 live cards instantly. */
function mkConversation(
  id: string,
  aId: string,
  bId: string,
  score: number,
  reason: string,
): Conversation {
  return {
    id,
    profile_a: aId,
    profile_b: bId,
    match_score: score,
    match_reason: reason,
    summary: null,
    status: 'active',
    created_at: '2026-06-27T12:20:00Z',
  };
}

export const SEED_CONVERSATIONS: Conversation[] = [
  mkConversation(
    'c0000000-0000-4000-a000-000000000001',
    SEED_PROFILES[1].id, // DeShawn (dev)
    SEED_PROFILES[0].id, // Maya (designer)
    0.91,
    'Both want a dev+designer pair; complementary skills.',
  ),
  mkConversation(
    'c0000000-0000-4000-a000-000000000002',
    SEED_PROFILES[2].id, // Priya (AI eng)
    SEED_PROFILES[4].id, // Lin (frontend)
    0.88,
    'AI backend meets realtime UI — perfect complement.',
  ),
  mkConversation(
    'c0000000-0000-4000-a000-000000000003',
    SEED_PROFILES[5].id, // Omar (AI eng)
    SEED_PROFILES[3].id, // Jordan (PM)
    0.84,
    'Agent builder + product mind = shippable demo.',
  ),
  mkConversation(
    'c0000000-0000-4000-a000-000000000004',
    SEED_PROFILES[7].id, // Theo (infra dev)
    SEED_PROFILES[6].id, // Sara (designer)
    0.79,
    'Infra backbone plus standout visual identity.',
  ),
];

const MOCK_SCRIPTS: Record<string, [string, string][]> = {
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

export function seedMessagesFor(conversationId: string): Message[] {
  const conv = SEED_CONVERSATIONS.find((c) => c.id === conversationId);
  const script = MOCK_SCRIPTS[conversationId];
  if (!conv || !script) return [];
  return script.map((line, i) => ({
    id: `${conversationId}-m${i}`,
    conversation_id: conversationId,
    speaker: line[1] === 'a' ? conv.profile_a : conv.profile_b,
    content: line[0],
    turn_number: i,
    created_at: '2026-06-27T12:21:00Z',
  }));
}

export function seedConversationCards(): ConversationCard[] {
  return SEED_CONVERSATIONS.map((conversation) => {
    const a = seedProfileById(conversation.profile_a)!;
    const b = seedProfileById(conversation.profile_b)!;
    return {
      conversation,
      a: { id: a.id, name: a.name, role: a.role, avatar_url: a.avatar_url },
      b: { id: b.id, name: b.name, role: b.role, avatar_url: b.avatar_url },
      messages: seedMessagesFor(conversation.id),
    };
  });
}
