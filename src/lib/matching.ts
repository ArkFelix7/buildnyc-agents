import { generateObject } from 'ai';
import { z } from 'zod';
import { chatModel, embedText, toVectorLiteral } from './ai';
import { TUNING } from './constants';
import { flags } from './env';
import { seedProfileById, SEED_PROFILES } from './mock-data';
import { supabaseAdmin } from './supabase';
import { ROLE_LABELS, type Conversation, type MatchScore, type Profile, type Role } from './types';
import { startConversation } from './conversation';

/**
 * Matching engine.
 *
 * For a given profile: find candidates (pgvector in LIVE, heuristic in MOCK),
 * score each pair with an LLM judge (heuristic fallback offline), keep the top N,
 * create `conversations` rows, and kick off agent-to-agent dialogues.
 */

const matchScoreSchema = z.object({
  match_score: z.number().min(0).max(1),
  reason: z.string(),
});

// ─────────────────────────── public API

export async function runMatchesForProfile(profileId: string): Promise<Conversation[]> {
  const admin = supabaseAdmin();

  // ── MOCK mode: no DB. Rank seed profiles, fabricate conversations, don't write.
  if (!admin) {
    return mockMatches(profileId);
  }

  const profile = await loadProfile(profileId);
  if (!profile) return [];

  // 1) candidates via pgvector
  const candidates = await findCandidates(profile);

  // 2) score each candidate pair
  const scored = await Promise.all(
    candidates.map(async (c) => ({ candidate: c, score: await scoreMatch(profile, c) })),
  );

  // 3) keep top N by score
  const top = scored
    .sort((a, b) => b.score.match_score - a.score.match_score)
    .slice(0, TUNING.topMatches);

  // 4) upsert conversation rows (dedupe by pair)
  const conversations: Conversation[] = [];
  for (const { candidate, score } of top) {
    const conv = await ensureConversation(profile.id, candidate.id, score);
    if (conv) conversations.push(conv);
  }

  // 5) kick off agent dialogues (fire-and-forget, honoring the concurrency cap)
  let started = 0;
  for (const conv of conversations) {
    if (conv.status !== 'active') continue;
    if (started >= TUNING.maxConcurrentPairs) break;
    started++;
    void startConversation(conv.id).catch(() => {
      /* fire-and-forget — failures are logged inside startConversation */
    });
  }

  return conversations;
}

/**
 * Score how good a collaboration between two builders would be (0..1 + short why).
 * Uses the smart model as a judge; falls back to a heuristic offline.
 */
export async function scoreMatch(a: Profile, b: Profile): Promise<MatchScore> {
  if (!flags.hasAIGateway) return heuristicScore(a, b);

  try {
    const { object } = await generateObject({
      model: chatModel('smart'),
      schema: matchScoreSchema,
      prompt:
        'Two builders at a hackathon are deciding whether to team up. Rate how good ' +
        'a collaboration would be from 0 (poor) to 1 (perfect), favoring complementary ' +
        'skills and aligned goals. Give a reason of at most 15 words.\n\n' +
        `Builder A:\n${profileBrief(a)}\n\nBuilder B:\n${profileBrief(b)}`,
    });
    return { match_score: clamp01(object.match_score), reason: trimReason(object.reason) };
  } catch {
    return heuristicScore(a, b);
  }
}

// ─────────────────────────── candidate selection

async function findCandidates(profile: Profile): Promise<Profile[]> {
  const admin = supabaseAdmin();
  if (!admin) return [];

  // Embed the profile's searchable text, then call the pgvector RPC.
  const queryEmbedding = await embedText(profileSearchText(profile));
  const { data, error } = await admin.rpc('match_profiles', {
    query_embedding: toVectorLiteral(queryEmbedding),
    exclude_id: profile.id,
    match_count: TUNING.topCandidates,
  });

  if (error || !data) return [];

  // RPC rows are a partial profile shape; normalize to Profile for downstream use.
  return (data as MatchProfileRow[]).map(rowToProfile);
}

interface MatchProfileRow {
  id: string;
  name: string;
  role: string | null;
  skills: string[] | null;
  looking_for: string | null;
  bio: string | null;
  agent_instructions: string | null;
  similarity: number;
}

function rowToProfile(r: MatchProfileRow): Profile {
  return {
    id: r.id,
    auth0_id: '',
    name: r.name,
    email: '',
    role: (r.role as Role | null) ?? null,
    skills: r.skills,
    looking_for: r.looking_for,
    bio: r.bio,
    agent_instructions: r.agent_instructions,
    avatar_url: null,
    created_at: '',
  };
}

// ─────────────────────────── conversation persistence

/** Create a conversation for this pair unless one already exists (either direction). */
async function ensureConversation(
  profileA: string,
  profileB: string,
  score: MatchScore,
): Promise<Conversation | null> {
  const admin = supabaseAdmin();
  if (!admin) return null;

  // Dedupe: a conversation between this pair in either direction.
  const { data: existing } = await admin
    .from('conversations')
    .select('*')
    .or(
      `and(profile_a.eq.${profileA},profile_b.eq.${profileB}),` +
        `and(profile_a.eq.${profileB},profile_b.eq.${profileA})`,
    )
    .maybeSingle();

  if (existing) return existing as Conversation;

  const { data, error } = await admin
    .from('conversations')
    .insert({
      profile_a: profileA,
      profile_b: profileB,
      match_score: score.match_score,
      match_reason: score.reason,
      status: 'active',
    })
    .select('*')
    .single();

  if (error || !data) return null;
  return data as Conversation;
}

// ─────────────────────────── MOCK mode

function mockMatches(profileId: string): Conversation[] {
  const self = seedProfileById(profileId) ?? SEED_PROFILES[0];

  const ranked = SEED_PROFILES.filter((p) => p.id !== self.id)
    .map((candidate) => ({ candidate, score: heuristicScore(self, candidate) }))
    .sort((a, b) => b.score.match_score - a.score.match_score)
    .slice(0, TUNING.topMatches);

  return ranked.map(({ candidate, score }, i) => ({
    id: `mock-conv-${self.id}-${candidate.id}-${i}`,
    profile_a: self.id,
    profile_b: candidate.id,
    match_score: score.match_score,
    match_reason: score.reason,
    summary: null,
    status: 'active' as const,
    created_at: new Date().toISOString(),
  }));
}

// ─────────────────────────── heuristics & helpers

/** Cheap complementary-fit score: role complement + skill overlap + goal keyword hits. */
function heuristicScore(a: Profile, b: Profile): MatchScore {
  let score = 0.4; // baseline "could work"

  const roleA = a.role;
  const roleB = b.role;
  const complementary = isComplementaryRole(roleA, roleB);
  if (complementary) score += 0.3;
  else if (roleA && roleB && roleA === roleB) score += 0.05; // same role: weaker

  // Goal/skill keyword resonance: does what A wants show up in B's skills/role?
  if (goalMatchesPartner(a, b)) score += 0.15;
  if (goalMatchesPartner(b, a)) score += 0.15;

  score = clamp01(score);

  const reason = complementary
    ? `Complementary ${roleLabel(roleA)} + ${roleLabel(roleB)} with aligned goals.`
    : `Shared interests; some overlap between ${a.name} and ${b.name}.`;

  return { match_score: round2(score), reason: trimReason(reason) };
}

const COMPLEMENTS: Record<string, Role[]> = {
  dev: ['designer', 'pm', 'ai_engineer'],
  designer: ['dev', 'ai_engineer', 'pm'],
  ai_engineer: ['dev', 'designer', 'pm'],
  pm: ['dev', 'designer', 'ai_engineer'],
  other: ['dev', 'designer', 'ai_engineer', 'pm'],
};

function isComplementaryRole(a: Role | null, b: Role | null): boolean {
  if (!a || !b) return false;
  return COMPLEMENTS[a]?.includes(b) ?? false;
}

/** Does what `a` is looking for resonate with `b`'s role/skills? */
function goalMatchesPartner(a: Profile, b: Profile): boolean {
  const want = (a.looking_for ?? '').toLowerCase();
  if (!want) return false;
  const needles: string[] = [];
  if (b.role) needles.push(b.role, ROLE_LABELS[b.role].toLowerCase());
  for (const s of b.skills ?? []) needles.push(s.toLowerCase());
  // Map common role synonyms found in free-text goals.
  if (b.role === 'dev') needles.push('dev', 'engineer', 'full-stack', 'frontend', 'backend', 'build');
  if (b.role === 'designer') needles.push('design', 'designer', 'visual', 'ui', 'ux');
  if (b.role === 'ai_engineer') needles.push('ai', 'agent', 'backend', 'ml');
  if (b.role === 'pm') needles.push('pm', 'product');
  return needles.some((n) => n.length > 2 && want.includes(n));
}

function profileBrief(p: Profile): string {
  const role = p.role ? ROLE_LABELS[p.role] : 'Builder';
  const skills = p.skills?.length ? p.skills.join(', ') : 'unspecified';
  return [
    `Name: ${p.name}`,
    `Role: ${role}`,
    `Skills: ${skills}`,
    `Looking for: ${p.looking_for ?? 'open to collaboration'}`,
    `Bio: ${p.bio ?? 'n/a'}`,
  ].join('\n');
}

function profileSearchText(p: Profile): string {
  const role = p.role ? ROLE_LABELS[p.role] : '';
  return [role, (p.skills ?? []).join(' '), p.looking_for ?? '', p.bio ?? '']
    .filter(Boolean)
    .join('. ');
}

async function loadProfile(id: string): Promise<Profile | null> {
  const admin = supabaseAdmin();
  if (!admin) return null;
  const { data } = await admin.from('profiles').select('*').eq('id', id).maybeSingle();
  return (data as Profile | null) ?? null;
}

function roleLabel(r: Role | null): string {
  return r ? ROLE_LABELS[r] : 'Builder';
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Enforce the ≤15-word constraint defensively. */
function trimReason(reason: string): string {
  const words = reason.trim().split(/\s+/);
  return words.length <= 15 ? reason.trim() : words.slice(0, 15).join(' ');
}
