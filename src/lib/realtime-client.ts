'use client';

import * as React from 'react';
import {
  createClient,
  type SupabaseClient,
  type RealtimeChannel,
} from '@supabase/supabase-js';
import { env } from '@/lib/env';
import {
  REALTIME,
  type ConversationCard,
  type Conversation,
  type Message,
} from '@/lib/types';
import { TUNING } from '@/lib/constants';

/**
 * Browser-safe Supabase client built from the NEXT_PUBLIC anon credentials.
 * Returns null when the public keys are not configured (→ MOCK mode).
 */
let _browser: SupabaseClient | null | undefined;
export function createBrowserSupabase(): SupabaseClient | null {
  if (_browser !== undefined) return _browser;
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    _browser = null;
    return null;
  }
  _browser = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return _browser;
}

// ── helpers ───────────────────────────────────────────────────────────────

function appendMessage(cards: ConversationCard[], msg: Message): ConversationCard[] {
  let touched = false;
  const next = cards.map((card) => {
    if (card.conversation.id !== msg.conversation_id) return card;
    if (card.messages.some((m) => m.id === msg.id)) return card; // dedupe
    touched = true;
    const messages = [...card.messages, msg].sort(
      (a, b) => a.turn_number - b.turn_number,
    );
    return { ...card, messages };
  });
  return touched ? next : cards;
}

function emptyCardFromConversation(conv: Conversation): ConversationCard {
  return {
    conversation: conv,
    a: { id: conv.profile_a, name: 'Builder', role: null, avatar_style: null, avatar_seed: null },
    b: { id: conv.profile_b, name: 'Builder', role: null, avatar_style: null, avatar_seed: null },
    messages: [],
  };
}

// ── hook ────────────────────────────────────────────────────────────────────

/**
 * Drives the live Mission Control feed.
 *
 * LIVE: subscribes to Postgres changes (messages INSERT, conversations
 *       INSERT/UPDATE) and tracks Supabase Presence for the online count.
 * MOCK: progressively reveals the seeded messages so the screen visibly
 *       animates with zero backend.
 *
 * Returns the current cards plus the online (presence) count.
 */
export function useLiveConversations(
  initialCards: ConversationCard[],
  eventId?: string | null,
): {
  cards: ConversationCard[];
  online: number;
} {
  const client = React.useMemo(() => createBrowserSupabase(), []);

  // In mock mode we start cards empty (just-the-pair, no messages) and reveal
  // their seeded transcripts over time. In live mode we start from the SSR
  // snapshot and let realtime append.
  const [cards, setCards] = React.useState<ConversationCard[]>(() => {
    if (client) return initialCards;
    return initialCards.map((c) => ({ ...c, messages: [] }));
  });
  const [online, setOnline] = React.useState<number>(() =>
    client ? 0 : initialCards.length * 2, // mock: both participants per card
  );

  // ── MOCK liveness simulation ──────────────────────────────────────────
  React.useEffect(() => {
    if (client) return; // real client handles liveness via realtime

    // Flat, time-ordered queue of every seeded message across all cards,
    // interleaved by turn so cards light up roughly in parallel.
    const queue: Message[] = [];
    const maxTurns = Math.max(0, ...initialCards.map((c) => c.messages.length));
    for (let turn = 0; turn < maxTurns; turn++) {
      for (const card of initialCards) {
        const msg = card.messages[turn];
        if (msg) queue.push(msg);
      }
    }

    if (queue.length === 0) return;

    let i = 0;
    let live = true;
    const interval = window.setInterval(() => {
      if (!live) return;
      const msg = queue[i % queue.length];
      // When we loop back to the start, reset feeds so it keeps animating.
      if (i > 0 && i % queue.length === 0) {
        setCards(initialCards.map((c) => ({ ...c, messages: [] })));
      }
      setCards((prev) => appendMessage(prev, msg));
      i += 1;
    }, 2500);

    return () => {
      live = false;
      window.clearInterval(interval);
    };
  }, [client, initialCards]);

  // ── LIVE realtime subscription ────────────────────────────────────────
  React.useEffect(() => {
    if (!client) return;

    const channel: RealtimeChannel = client.channel(REALTIME.globalChannel);

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as Message;
          setCards((prev) => appendMessage(prev, msg));
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        (payload) => {
          const conv = payload.new as Conversation;
          // Only surface conversations belonging to this event's room.
          if (eventId && conv.event_id && conv.event_id !== eventId) return;
          setCards((prev) => {
            if (prev.some((c) => c.conversation.id === conv.id)) return prev;
            return [emptyCardFromConversation(conv), ...prev].slice(
              0,
              TUNING.maxConcurrentPairs,
            );
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          const conv = payload.new as Conversation;
          setCards((prev) =>
            prev.map((c) =>
              c.conversation.id === conv.id
                ? { ...c, conversation: { ...c.conversation, ...conv } }
                : c,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, eventId]);

  // ── LIVE presence (online count) ──────────────────────────────────────
  React.useEffect(() => {
    if (!client) return;

    const presence: RealtimeChannel = client.channel(REALTIME.presenceChannel, {
      config: { presence: { key: crypto.randomUUID() } },
    });

    const recount = () => {
      const state = presence.presenceState();
      setOnline(Object.keys(state).length);
    };

    presence
      .on('presence', { event: 'sync' }, recount)
      .on('presence', { event: 'join' }, recount)
      .on('presence', { event: 'leave' }, recount)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void presence.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      void client.removeChannel(presence);
    };
  }, [client]);

  return { cards, online };
}
