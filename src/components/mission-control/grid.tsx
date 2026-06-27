'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useLiveConversations } from '@/lib/realtime-client';
import { Button } from '@/components/ui';
import { ConversationCard } from '@/components/mission-control/conversation-card';
import { StatsBanner } from '@/components/mission-control/stats-banner';
import { PresenceBar } from '@/components/mission-control/presence-bar';
import ConciergePanel from '@/components/concierge/panel';
import type { ConversationCard as Card, Event } from '@/lib/types';

export interface MissionControlGridProps {
  event: Event;
  initialCards: Card[];
  currentProfileId: string | null;
  /** True when the viewer hasn't created a profile for this event yet. */
  showJoinCta?: boolean;
}

/** Top-level client surface for an event's Mission Control. */
export function MissionControlGrid({
  event,
  initialCards,
  currentProfileId,
  showJoinCta,
}: MissionControlGridProps) {
  const { cards, online } = useLiveConversations(initialCards, event.id);
  const [conciergeOpen, setConciergeOpen] = React.useState(false);

  const activeCount = cards.filter((c) => c.conversation.status === 'active').length;
  // Matches "made" approximated by high-confidence pairs for the live banner.
  const matchesCount = cards.filter(
    (c) => (c.conversation.match_score ?? 0) >= 0.85,
  ).length;

  // Unique participant names for the presence bar (fallback to count-only).
  const names = React.useMemo(() => {
    const set = new Map<string, string>();
    for (const c of cards) {
      set.set(c.a.id, c.a.name);
      set.set(c.b.id, c.b.name);
    }
    return Array.from(set.values());
  }, [cards]);

  return (
    <div className="bg-grid min-h-screen text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 px-6 py-6">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success ring-1 ring-success/30">
              <span className="pulse-live h-2.5 w-2.5 rounded-full bg-success" />
              LIVE
            </span>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {event.name}
              <span className="ml-2 text-brand">Mission Control</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {showJoinCta && event.matching_enabled ? (
              <Link href={`/${event.slug}/join`}>
                <Button variant="outline" className="text-sm">
                  Join the matching
                </Button>
              </Link>
            ) : null}
            <PresenceBar count={online} names={names} />
          </div>
        </header>

        {/* Stats */}
        <StatsBanner online={online} conversations={activeCount} matches={matchesCount} />

        {/* Conversation grid */}
        <main className="flex-1">
          {cards.length === 0 ? (
            <div className="flex h-[60vh] items-center justify-center text-center text-muted">
              <div>
                <div className="mx-auto mb-3 h-3 w-3 animate-pulse rounded-full bg-brand" />
                Agents are warming up — conversations will appear here live.
              </div>
            </div>
          ) : (
            <div
              className="grid gap-5"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}
            >
              <AnimatePresence>
                {cards.map((card) => (
                  <ConversationCard
                    key={card.conversation.id}
                    card={card}
                    currentProfileId={currentProfileId}
                    eventSlug={event.slug}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      {/* Concierge launcher */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setConciergeOpen((v) => !v)}
          className="rounded-full px-5 py-3 text-base shadow-2xl shadow-brand/30"
        >
          <Sparkles className="h-5 w-5" />
          Ask the Concierge
        </Button>
      </div>

      {/* Slide-up Concierge panel */}
      <AnimatePresence>
        {conciergeOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConciergeOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              className="glass fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-t-3xl shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div className="flex items-center gap-2 font-semibold">
                  <Sparkles className="h-5 w-5 text-brand" />
                  Concierge
                </div>
                <button
                  onClick={() => setConciergeOpen(false)}
                  className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-foreground"
                  aria-label="Close concierge"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="max-h-[calc(80vh-3.5rem)] overflow-y-auto">
                <ConciergePanel eventSlug={event.slug} profileId={currentProfileId ?? undefined} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
