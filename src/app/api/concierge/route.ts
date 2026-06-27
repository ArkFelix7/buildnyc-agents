import { z } from 'zod';
import { streamText } from 'ai';
import { chatModel } from '@/lib/ai';
import { TUNING, EVENT } from '@/lib/constants';
import { flags } from '@/lib/env';
import { retrieveChunks, topSimilarity, escalate } from '@/lib/concierge';

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
  const { question, profileId } = parsed.data;

  const chunks = await retrieveChunks(question);
  const top = topSimilarity(chunks);

  // ── Low confidence → escalate to organizer, stream a heads-up to the user.
  if (top < TUNING.ragMinSimilarity) {
    await escalate({ question, profileId }).catch((err) => {
      console.error('[concierge] escalate failed:', err);
    });

    if (!flags.hasAIGateway) {
      return textResponse(staticStream(ESCALATION_MESSAGE), { escalated: true, source: null });
    }

    const result = streamText({
      model: chatModel('fast'),
      system:
        "You are the BuildNYC event concierge. You don't know the answer to the user's " +
        'question, so an organizer has already been notified by email. In one warm, brief ' +
        "sentence, tell the user you're not sure but you've notified the organizer and " +
        "they'll get an answer shortly. Do not invent any facts.",
      prompt: question,
    });
    return textResponse(result.textStream, { escalated: true, source: null });
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
      `You are the concierge for ${EVENT.name} (${EVENT.slug}), a one-day hackathon. ` +
      'Answer the user\'s question using ONLY the context below. Be concise, friendly, ' +
      'and specific (include times, prices, passwords, etc. when present). If the context ' +
      'does not contain the answer, say you are not certain rather than guessing. ' +
      `End your answer with a citation line exactly: "Based on: ${sourceLabel}".\n\n` +
      `Context:\n${context}`,
    prompt: question,
  });

  return textResponse(result.textStream, { escalated: false, source: sourceLabel });
}

// ─────────────────────────────────────────── helpers

function citationLabel(source: string | null): string {
  if (!source) return 'BuildNYC knowledge base';
  // db sources look like "buildnyc26-notion" → present a friendly label.
  return `BuildNYC knowledge base (${source})`;
}

function textResponse(
  stream: ReadableStream<Uint8Array> | ReadableStream<string> | AsyncIterable<string>,
  meta: { escalated: boolean; source: string | null },
): Response {
  const body = toByteStream(stream);
  const headers: Record<string, string> = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Concierge-Escalated': meta.escalated ? 'true' : 'false',
  };
  if (meta.source) headers['X-Concierge-Source'] = meta.source;
  return new Response(body, { headers });
}

/** Normalize a string async-iterable (AI SDK textStream) or stream into bytes. */
function toByteStream(
  src: ReadableStream<Uint8Array> | ReadableStream<string> | AsyncIterable<string>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  // If it's already a byte ReadableStream, pass through.
  if (src instanceof ReadableStream) {
    return src as ReadableStream<Uint8Array>;
  }
  const iterable = src as AsyncIterable<string>;
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const part of iterable) {
          controller.enqueue(encoder.encode(part));
        }
      } catch (err) {
        controller.error(err);
        return;
      }
      controller.close();
    },
  });
}

/** A one-shot text stream for canned/offline answers. */
function staticStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
