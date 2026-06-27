import { gateway } from '@ai-sdk/gateway';
import { embed, embedMany } from 'ai';
import { env, flags, EMBED_DIM } from './env';

/**
 * Centralized model + embedding helpers routed through the Vercel AI Gateway.
 *
 * Model ids are AI Gateway ids (provider/model). Confirm exact strings on the
 * Gateway dashboard (PRD OQ-01) and override via MODEL_FAST / MODEL_SMART / MODEL_EMBED.
 *
 * In MOCK mode (no gateway key) embedText returns a deterministic pseudo-vector so
 * pgvector inserts and cosine math still behave; LLM call sites should check
 * `flags.hasAIGateway` and use canned output.
 */

export function chatModel(which: 'fast' | 'smart' = 'fast') {
  return gateway(which === 'smart' ? env.modelSmart : env.modelFast);
}

export function embeddingModel() {
  return gateway.textEmbeddingModel(env.modelEmbed);
}

/** Deterministic fake embedding for MOCK mode — stable per input string. */
function fakeEmbedding(text: string): number[] {
  const v = new Array(EMBED_DIM).fill(0);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
    v[Math.abs(h) % EMBED_DIM] += 1;
  }
  // L2 normalize so cosine similarity is well-behaved
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

export async function embedText(text: string): Promise<number[]> {
  if (!flags.hasAIGateway) return fakeEmbedding(text);
  const { embedding } = await embed({ model: embeddingModel(), value: text });
  return embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (!flags.hasAIGateway) return texts.map(fakeEmbedding);
  const { embeddings } = await embedMany({ model: embeddingModel(), values: texts });
  return embeddings;
}

/** pgvector string literal: '[0.1,0.2,...]' */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}
