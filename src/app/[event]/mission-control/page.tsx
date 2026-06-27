import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { seedConversationCards } from '@/lib/mock-data';
import { getEventBySlug } from '@/lib/events';
import { getCurrentProfile } from '@/lib/session';
import { TUNING } from '@/lib/constants';
import { MissionControlGrid } from '@/components/mission-control/grid';
import type { Conversation, ConversationCard, Message, ProfileBrief } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function fetchCards(eventId: string): Promise<ConversationCard[]> {
  const db = supabaseAdmin();
  if (!db) return seedConversationCards();
  try {
    const { data, error } = await db
      .from('conversations')
      .select(`
        id, event_id, profile_a, profile_b, match_score, match_reason, summary, status, created_at,
        a:profiles!conversations_profile_a_fkey ( id, name, role, avatar_style, avatar_seed ),
        b:profiles!conversations_profile_b_fkey ( id, name, role, avatar_style, avatar_seed ),
        messages ( id, conversation_id, speaker, content, turn_number, created_at )
      `)
      .eq('event_id', eventId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(TUNING.maxConcurrentPairs);
    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>): ConversationCard => {
      const conversation: Conversation = {
        id: row.id as string,
        event_id: (row.event_id as string | null) ?? null,
        profile_a: row.profile_a as string,
        profile_b: row.profile_b as string,
        match_score: (row.match_score as number | null) ?? null,
        match_reason: (row.match_reason as string | null) ?? null,
        summary: (row.summary as string | null) ?? null,
        status: row.status as Conversation['status'],
        created_at: row.created_at as string,
      };
      const rawA = (Array.isArray(row.a) ? row.a[0] : row.a) as ProfileBrief | undefined;
      const rawB = (Array.isArray(row.b) ? row.b[0] : row.b) as ProfileBrief | undefined;
      const fb = (id: string): ProfileBrief => ({ id, name: 'Builder', role: null, avatar_style: null, avatar_seed: null });
      const messages = ((row.messages as Message[] | null) ?? []).sort((m1, m2) => m1.turn_number - m2.turn_number);
      return { conversation, a: rawA ?? fb(conversation.profile_a), b: rawB ?? fb(conversation.profile_b), messages };
    });
  } catch {
    return seedConversationCards();
  }
}

export default async function EventMissionControl({ params }: { params: Promise<{ event: string }> }) {
  const { event: slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const [cards, profile] = await Promise.all([fetchCards(event.id), getCurrentProfile(event.id)]);

  return (
    <MissionControlGrid
      event={event}
      initialCards={cards}
      currentProfileId={profile?.id ?? null}
      showJoinCta={!profile}
    />
  );
}
