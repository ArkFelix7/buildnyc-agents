import { z } from 'zod';
import { streamText } from 'ai';
import { chatModel } from '@/lib/ai';
import { TUNING, BRAND } from '@/lib/constants';
import { flags } from '@/lib/env';
import { retrieveChunks, topSimilarity, escalate } from '@/lib/concierge';
import { getEventBySlug } from '@/lib/events';

export const maxDuration = 60;

/**
 * POST /api/concierge — answer a hackathon question via RAG, or escalate.
 *
 * Body: { question: string, profileId?: string }
 *
 * STREAM FORMAT: a plain UTF-8 *text stream* (text/plain). The body is the raw
 * answer text streamed chunk-by-chunk — the client reads it directly off the
 * ReadableStream (no SSE / data-stream framing). Two response headers carry
 * metadata the client reads up-front:
 *   - `X-Concierge-Escalated: 'true' | 'false'`
 *   - `X-Concierge-Source: <knowledge source label>` (citation)
 */

const BodySchema = z.object({
  question: z.string().min(1).max(1000),
  eventSlug: z.string().optional(),
  profileId: z.string().min(1).optional(),
});

const ESCALATION_MESSAGE =
  "I'm not sure about that one — I've notified the organizer and you'll get an answer shortly.";

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError('question is required', 400);
  }
  const { question, profileId, eventSlug } = parsed.data;

  const event = eventSlug ? await getEventBySlug(eventSlug) : await getEventBySlug(BRAND.defaultEventSlug);
  const eventId = event?.id ?? 'e0000000-0000-4000-a000-000000000001';
  const eventName = event?.name ?? 'this event';

  const chunks = await retrieveChunks(question, eventId);
  const top = topSimilarity(chunks);

  // ── Low confidence → escalate to organizer, stream a heads-up to the user.
  if (top < TUNING.ragMinSimilarity) {
    await escalate({ question, eventId, profileId }).catch((err) => {
      console.error('[concierge] escalate failed:', err);
    });

    if (!flags.hasAIGateway) {
      return textResponse(staticStream(ESCALATION_MESSAGE), { escalated: true, source: null });
    }

    const result = streamText({
      model: chatModel('fast'),
      system:
        `You are the ${eventName} concierge. You don't know the answer to the user's ` +
        'question, so an organizer has already been notified by email. In one warm, brief ' +
        "sentence, tell the user you're not sure but you've notified the organizer and " +
        "they'll get an answer shortly. Do not invent any facts.",
      prompt: question,
    });
    // If the gateway is rate-limited/unavailable, fall back to the canned line.
    return textResponse(result.textStream, { escalated: true, source: null, fallback: ESCALATION_MESSAGE });
  }

  // ── Confident → answer from retrieved context with a citation.
  const context = chunks
    .map((c, i) => `[${i + 1}] ${c.content}`)
    .join('\n\n');
  const sourceLabel = citationLabel(chunks[0]?.source ?? null);

  if (!flags.hasAIGateway) {
    // Offline: synthesize an answer from the strongest chunk + a citation line.
    const answer = `${chunks[0]?.content ?? ''}\n\n(Based on: ${sourceLabel})`;
    return textResponse(staticStream(answer), { escalated: false, source: sourceLabel });
  }

  const result = streamText({
    model: chatModel('smart'),
    system:
      `You are the concierge for ${eventName}. ` +
      'Answer the user\'s question using ONLY the context below. Be concise, friendly, ' +
      'and specific (include times, prices, passwords, etc. when present). If the context ' +
      'does not contain the answer, say you are not certain rather than guessing. ' +
      `End your answer with a citation line exactly: "Based on: ${sourceLabel}".\n\n` +
      `Context:\n${context}`,
    prompt: question,
  });

  // If the gateway is rate-limited/unavailable, serve the retrieved chunk verbatim
  // so the concierge still answers (upgrades to LLM phrasing once credits exist).
  const fallbackAnswer = `${chunks[0]?.content ?? ''}\n\nBased on: ${sourceLabel}`;
  return textResponse(result.textStream, { escalated: false, source: sourceLabel, fallback: fallbackAnswer });
}

// ─────────────────────────────────────────── helpers

function citationLabel(source: string | null): string {
  if (!source) return 'BuildNYC knowledge base';
  // db sources look like "buildnyc26-notion" → present a friendly label.
  return `BuildNYC knowledge base (${source})`;
}

function textResponse(
  stream: AsyncIterable<string | Uint8Array>,
  meta: { escalated: boolean; source: string | null; fallback?: string },
): Response {
  const body = toByteStream(stream, meta.fallback);
  const headers: Record<string, string> = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Concierge-Escalated': meta.escalated ? 'true' : 'false',
  };
  if (meta.source) headers['X-Concierge-Source'] = meta.source;
  return new Response(body, { headers });
}

/**
 * Drain a text/byte async-iterable (AI SDK `textStream` is both a ReadableStream
 * AND async-iterable) into a byte stream. If the source produces nothing — a thrown
 * error OR a silently-empty stream (e.g. AI Gateway rate limit) — emit `fallback`
 * so the concierge still returns a usable answer.
 */
function toByteStream(
  src: AsyncIterable<string | Uint8Array>,
  fallback?: string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let emitted = 0;
      try {
        for await (const part of src) {
          if (part == null) continue;
          const bytes = typeof part === 'string' ? encoder.encode(part) : part;
          if (bytes.length) {
            controller.enqueue(bytes);
            emitted += bytes.length;
          }
        }
      } catch (err) {
        console.error('[concierge] answer stream failed:', err instanceof Error ? err.message : err);
      }
      if (emitted === 0 && fallback) {
        controller.enqueue(encoder.encode(fallback));
      }
      controller.close();
    },
  });
}

/** A one-shot text source for canned/offline answers. */
async function* staticStream(text: string): AsyncIterable<string> {
  yield text;
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
