/**
 * Event Concierge — RAG retrieval + organizer escalation.
 *
 * LIVE mode: embeds the question, calls the `match_knowledge` pgvector RPC, and
 * (on low confidence) writes an `escalations` row + emails the organizer.
 *
 * MOCK mode (no Supabase admin client OR no AI Gateway key): ranks the hardcoded
 * `db/knowledge.json` corpus by keyword overlap and fabricates escalation ids so
 * the whole flow works with zero credentials.
 */

import knowledge from '../../db/knowledge.json';
import { embedText, embedTexts, toVectorLiteral } from './ai';
import { TUNING } from './constants';
import { flags } from './env';
import { sendOrganizerEscalation } from '@/lib/email'; // Agent E — resolves at integration
import { supabaseAdmin } from './supabase';

export interface RetrievedChunk {
  content: string;
  source: string | null;
  similarity: number;
}

const KB_SOURCE: string = knowledge.source;
const KB_CHUNKS: string[] = knowledge.chunks;

// ─────────────────────────────────────────── retrieval

/**
 * Retrieve the top `ragTopChunks` knowledge chunks for a question.
 * LIVE: pgvector cosine via `match_knowledge`. MOCK: keyword-overlap ranking.
 */
export async function retrieveChunks(question: string): Promise<RetrievedChunk[]> {
  const admin = supabaseAdmin();

  // MOCK: no DB or no embeddings → keyword-overlap rank over the bundled corpus.
  if (!admin || !flags.hasAIGateway) {
    return keywordRank(question);
  }

  try {
    const queryEmbedding = await embedText(question);
    const { data, error } = await admin.rpc('match_knowledge', {
      query_embedding: toVectorLiteral(queryEmbedding),
      match_count: TUNING.ragTopChunks,
    });
    if (error || !data) return keywordRank(question);

    return (data as MatchKnowledgeRow[]).map((r) => ({
      content: r.content,
      source: r.source ?? null,
      similarity: typeof r.similarity === 'number' ? r.similarity : 0,
    }));
  } catch {
    return keywordRank(question);
  }
}

interface MatchKnowledgeRow {
  id: string;
  content: string;
  source: string | null;
  similarity: number;
}

/** Highest similarity among retrieved chunks (0 when none). */
export function topSimilarity(chunks: RetrievedChunk[]): number {
  return chunks.reduce((max, c) => (c.similarity > max ? c.similarity : max), 0);
}

/**
 * MOCK ranking: pseudo-similarity = fraction of distinct query words that appear
 * in the chunk, lightly boosted so a strong keyword match clears ragMinSimilarity.
 */
function keywordRank(question: string): RetrievedChunk[] {
  const words = tokenize(question);
  const unique = Array.from(new Set(words)).filter((w) => w.length > 2);

  const scored = KB_CHUNKS.map((content) => {
    const haystack = content.toLowerCase();
    if (unique.length === 0) return { content, similarity: 0 };
    const hits = unique.filter((w) => haystack.includes(w)).length;
    // fraction matched, scaled to feel like cosine similarity in [0,1]
    const frac = hits / unique.length;
    const similarity = Math.min(1, frac * 1.15);
    return { content, similarity };
  });

  return scored
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, TUNING.ragTopChunks)
    .map((s) => ({ content: s.content, source: KB_SOURCE, similarity: round3(s.similarity) }));
}

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// ─────────────────────────────────────────── seeding

/**
 * Embed every chunk in db/knowledge.json and (re)insert into knowledge_base.
 * Clears existing rows from the same source first so re-seeding is idempotent.
 * MOCK (no admin client): no-op, returns { inserted: 0 }.
 */
export async function seedKnowledge(): Promise<{ inserted: number }> {
  const admin = supabaseAdmin();
  if (!admin) return { inserted: 0 };

  // Clear prior rows from this source so re-seeding doesn't duplicate.
  await admin.from('knowledge_base').delete().eq('source', KB_SOURCE);

  const embeddings = await embedTexts(KB_CHUNKS);
  const rows = KB_CHUNKS.map((content, i) => ({
    content,
    source: KB_SOURCE,
    embedding: toVectorLiteral(embeddings[i]),
  }));

  const { data, error } = await admin.from('knowledge_base').insert(rows).select('id');
  if (error) throw error;
  return { inserted: data?.length ?? 0 };
}

// ─────────────────────────────────────────── escalation

/**
 * Record an organizer escalation and notify them by email.
 * Shared by /api/concierge (low-confidence path) and /api/escalate.
 * MOCK (no admin client): fabricates an id; the email helper mocks itself when
 * Resend is absent.
 */
export async function escalate({
  question,
  profileId,
}: {
  question: string;
  profileId?: string;
}): Promise<{ escalationId: string }> {
  const admin = supabaseAdmin();

  let escalationId: string;
  if (!admin) {
    escalationId = `mock-esc-${Date.now()}`;
  } else {
    const { data, error } = await admin
      .from('escalations')
      .insert({
        question,
        asker_profile: profileId ?? null,
        status: 'open',
      })
      .select('id')
      .single();
    if (error || !data) {
      escalationId = `mock-esc-${Date.now()}`;
    } else {
      escalationId = data.id as string;
    }
  }

  // Notify the organizer. Failures here must not break the concierge response.
  try {
    await sendOrganizerEscalation({ question, escalationId });
  } catch (err) {
    console.error('[concierge] sendOrganizerEscalation failed:', err);
  }

  return { escalationId };
}
