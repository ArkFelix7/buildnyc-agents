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
import { sendOrganizerEscalation } from '@/lib/email';
import { supabaseAdmin } from './supabase';
import { getEventById } from './events';

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
export async function retrieveChunks(
  question: string,
  eventId: string,
): Promise<RetrievedChunk[]> {
  const admin = supabaseAdmin();

  // MOCK: no DB or no embeddings → keyword-overlap rank over the bundled corpus.
  if (!admin || !flags.hasAIGateway) {
    return keywordRank(question);
  }

  try {
    const queryEmbedding = await embedText(question);
    const { data, error } = await admin.rpc('match_knowledge', {
      query_embedding: toVectorLiteral(queryEmbedding),
      p_event_id: eventId,
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
export async function seedKnowledge(
  eventId: string,
  source: string = KB_SOURCE,
): Promise<{ inserted: number }> {
  const admin = supabaseAdmin();
  if (!admin) return { inserted: 0 };

  // Clear prior rows from this source+event so re-seeding doesn't duplicate.
  await admin.from('knowledge_base').delete().eq('source', source).eq('event_id', eventId);

  const embeddings = await embedTexts(KB_CHUNKS);
  const rows = KB_CHUNKS.map((content, i) => ({
    event_id: eventId,
    content,
    source,
    embedding: toVectorLiteral(embeddings[i]),
  }));

  const { data, error } = await admin.from('knowledge_base').insert(rows).select('id');
  if (error) throw error;
  return { inserted: data?.length ?? 0 };
}

/**
 * Chunk raw text (~`maxChars`-sized segments on paragraph boundaries), embed each,
 * and insert into the event's knowledge base. Used by the admin "paste content" flow.
 */
export async function addKnowledge(
  eventId: string,
  rawText: string,
  source: string,
): Promise<{ inserted: number }> {
  const admin = supabaseAdmin();
  if (!admin) return { inserted: 0 };

  const chunks = chunkText(rawText);
  if (chunks.length === 0) return { inserted: 0 };

  const embeddings = await embedTexts(chunks);
  const rows = chunks.map((content, i) => ({
    event_id: eventId,
    content,
    source,
    embedding: toVectorLiteral(embeddings[i]),
  }));
  const { data, error } = await admin.from('knowledge_base').insert(rows).select('id');
  if (error) throw error;
  return { inserted: data?.length ?? 0 };
}

/** Split text into ~`maxChars`-sized chunks, breaking on blank lines / sentences. */
function chunkText(text: string, maxChars = 1200): string[] {
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const out: string[] = [];
  let buf = '';
  for (const p of paras) {
    if ((buf + '\n\n' + p).length > maxChars && buf) {
      out.push(buf.trim());
      buf = p;
    } else {
      buf = buf ? `${buf}\n\n${p}` : p;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
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
  eventId,
  profileId,
}: {
  question: string;
  eventId: string;
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
        event_id: eventId,
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

  // Notify the event's organizer. Failures here must not break the concierge response.
  try {
    const event = await getEventById(eventId);
    await sendOrganizerEscalation({
      question,
      escalationId,
      to: event?.organizer_email,
      eventName: event?.name,
    });
  } catch (err) {
    console.error('[concierge] sendOrganizerEscalation failed:', err);
  }

  return { escalationId };
}
