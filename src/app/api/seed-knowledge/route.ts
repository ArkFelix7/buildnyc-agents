import { NextResponse } from 'next/server';
import { seedKnowledge } from '@/lib/concierge';

export const maxDuration = 60;

/**
 * POST /api/seed-knowledge — embed db/knowledge.json and (re)load knowledge_base.
 * Idempotent: clears prior rows from the same source first. MOCK (no DB): inserted 0.
 */
export async function POST() {
  try {
    const { inserted } = await seedKnowledge();
    return NextResponse.json({ ok: true, inserted });
  } catch (err) {
    console.error('[seed-knowledge] failed:', err);
    return NextResponse.json({ ok: false, error: 'Seeding failed' }, { status: 500 });
  }
}
