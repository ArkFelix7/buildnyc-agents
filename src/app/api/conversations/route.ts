import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { seedConversationCards } from '@/lib/mock-data';
import { TUNING } from '@/lib/constants';
import type {
  Conversation,
  ConversationCard,
  Message,
  Profile,
  Role,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Shape of the conversations row joined with its two profiles + messages. */
type ProfileLite = Pick<Profile, 'id' | 'name' | 'role' | 'avatar_url'>;

function toCard(
  conversation: Conversation,
  a: ProfileLite,
  b: ProfileLite,
  messages: Message[],
): ConversationCard {
  return {
    conversation,
    a,
    b,
    messages: [...messages].sort((m1, m2) => m1.turn_number - m2.turn_number),
  };
}

/**
 * GET /api/conversations
 *   → { cards: ConversationCard[] } for the Mission Control screen.
 *
 * LIVE  (supabaseAdmin non-null): query active conversations, newest first,
 *        join both profiles + recent messages.
 * MOCK  (supabaseAdmin null): return pre-baked seed cards.
 *
 * ?all=1 includes completed conversations as well.
 */
export async function GET(req: Request) {
  const includeAll = new URL(req.url).searchParams.get('all') === '1';
  const db = supabaseAdmin();

  // ── MOCK MODE ──────────────────────────────────────────────────────────
  if (!db) {
    return NextResponse.json({ cards: seedConversationCards() });
  }

  // ── LIVE MODE ──────────────────────────────────────────────────────────
  try {
    let query = db
      .from('conversations')
      .select(
        `
        id, profile_a, profile_b, match_score, match_reason, summary, status, created_at,
        a:profiles!conversations_profile_a_fkey ( id, name, role, avatar_url ),
        b:profiles!conversations_profile_b_fkey ( id, name, role, avatar_url ),
        messages ( id, conversation_id, speaker, content, turn_number, created_at )
      `,
      )
      .order('created_at', { ascending: false })
      .limit(TUNING.maxConcurrentPairs);

    if (!includeAll) query = query.eq('status', 'active');

    const { data, error } = await query;
    if (error) throw error;

    const cards: ConversationCard[] = (data ?? []).map((row: Record<string, unknown>) => {
      const conversation: Conversation = {
        id: row.id as string,
        profile_a: row.profile_a as string,
        profile_b: row.profile_b as string,
        match_score: (row.match_score as number | null) ?? null,
        match_reason: (row.match_reason as string | null) ?? null,
        summary: (row.summary as string | null) ?? null,
        status: row.status as Conversation['status'],
        created_at: row.created_at as string,
      };
      const rawA = (Array.isArray(row.a) ? row.a[0] : row.a) as ProfileLite | undefined;
      const rawB = (Array.isArray(row.b) ? row.b[0] : row.b) as ProfileLite | undefined;
      const fallback = (id: string): ProfileLite => ({
        id,
        name: 'Builder',
        role: null as Role | null,
        avatar_url: null,
      });
      const messages = (row.messages as Message[] | null) ?? [];
      return toCard(
        conversation,
        rawA ?? fallback(conversation.profile_a),
        rawB ?? fallback(conversation.profile_b),
        messages,
      );
    });

    return NextResponse.json({ cards });
  } catch (err) {
    console.error('[api/conversations] query failed, falling back to seed:', err);
    return NextResponse.json({ cards: seedConversationCards() });
  }
}
