import { supabaseAdmin } from '@/lib/supabase';
import { seedConversationCards } from '@/lib/mock-data';
import { getCurrentProfile } from '@/lib/session'; // Agent A — resolves at integration
import { TUNING } from '@/lib/constants';
import { MissionControlGrid } from '@/components/mission-control/grid';
import type {
  Conversation,
  ConversationCard,
  Message,
  Profile,
  Role,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

type ProfileLite = Pick<Profile, 'id' | 'name' | 'role' | 'avatar_url'>;

/** Server-side fetch of the initial card snapshot (mirrors /api/conversations). */
async function fetchInitialCards(): Promise<ConversationCard[]> {
  const db = supabaseAdmin();
  if (!db) return seedConversationCards();

  try {
    const { data, error } = await db
      .from('conversations')
      .select(
        `
        id, profile_a, profile_b, match_score, match_reason, summary, status, created_at,
        a:profiles!conversations_profile_a_fkey ( id, name, role, avatar_url ),
        b:profiles!conversations_profile_b_fkey ( id, name, role, avatar_url ),
        messages ( id, conversation_id, speaker, content, turn_number, created_at )
      `,
      )
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(TUNING.maxConcurrentPairs);

    if (error) throw error;

    return (data ?? []).map((row: Record<string, unknown>): ConversationCard => {
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
      const messages = ((row.messages as Message[] | null) ?? []).sort(
        (m1, m2) => m1.turn_number - m2.turn_number,
      );
      return {
        conversation,
        a: rawA ?? fallback(conversation.profile_a),
        b: rawB ?? fallback(conversation.profile_b),
        messages,
      };
    });
  } catch (err) {
    console.error('[mission-control] initial fetch failed, using seed:', err);
    return seedConversationCards();
  }
}

export default async function MissionControlPage() {
  const [cards, profile] = await Promise.all([fetchInitialCards(), getCurrentProfile()]);

  return (
    <MissionControlGrid
      initialCards={cards}
      currentProfileId={profile?.id ?? null}
    />
  );
}
