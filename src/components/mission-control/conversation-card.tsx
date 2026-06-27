'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar, RoleBadge, ScoreBadge } from '@/components/ui';
import { SmashButton } from '@/components/smash-button'; // Agent E — resolves at integration
import { cn } from '@/lib/utils';
import type { ConversationCard as Card, Message } from '@/lib/types';

export interface ConversationCardProps {
  card: Card;
  /** The signed-in user's profile id (null in mock / anonymous). */
  currentProfileId: string | null;
}

function Bubble({
  message,
  isA,
  authorName,
}: {
  message: Message;
  isA: boolean;
  authorName: string;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={cn('flex w-full', isA ? 'justify-start' : 'justify-end')}
    >
      <div className={cn('max-w-[82%]', isA ? 'items-start' : 'items-end')}>
        <div
          className={cn(
            'mb-0.5 px-1 text-[11px] font-medium text-muted',
            isA ? 'text-left' : 'text-right',
          )}
        >
          {authorName}
        </div>
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2 text-sm leading-snug shadow-sm',
            isA
              ? 'rounded-tl-sm bg-surface-2 text-foreground'
              : 'rounded-tr-sm bg-brand/20 text-foreground ring-1 ring-brand/30',
          )}
        >
          {message.content}
        </div>
      </div>
    </motion.div>
  );
}

/** One live agent-to-agent conversation. */
export function ConversationCard({ card, currentProfileId }: ConversationCardProps) {
  const { conversation, a, b, messages } = card;
  const feedRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever a message arrives.
  React.useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  // Smash target = the participant who is NOT the current user.
  // If current user is unknown, default target to participant B.
  const target = currentProfileId === a.id ? b : currentProfileId === b.id ? a : b;

  const isActive = conversation.status === 'active';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 28 }}
      className="glass flex h-[440px] flex-col overflow-hidden rounded-2xl shadow-xl shadow-black/30 ring-1 ring-border transition-shadow hover:ring-brand/40"
    >
      {/* Header — the two participants */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex -space-x-1.5">
            <Avatar name={a.name} src={a.avatar_url} size={36} className="ring-2 ring-surface" />
            <Avatar name={b.name} src={b.avatar_url} size={36} className="ring-2 ring-surface" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
              <span className="truncate">{a.name}</span>
              <span className="text-muted">×</span>
              <span className="truncate">{b.name}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <RoleBadge role={a.role} />
              <RoleBadge role={b.role} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isActive && (
            <span
              className="pulse-live h-2.5 w-2.5 rounded-full bg-success"
              title="Live"
              aria-label="Live"
            />
          )}
          <ScoreBadge score={conversation.match_score} />
        </div>
      </div>

      {/* Match reason subtitle */}
      {conversation.match_reason && (
        <div className="truncate border-b border-border/60 bg-surface/40 px-4 py-1.5 text-xs italic text-muted">
          “{conversation.match_reason}”
        </div>
      )}

      {/* Message feed */}
      <div
        ref={feedRef}
        className="feed-scroll flex-1 space-y-2.5 overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            <span className="flex items-center gap-2">
              <span className="pulse-live h-2 w-2 rounded-full bg-brand-2" />
              Agents connecting…
            </span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((m) => {
              const isA = m.speaker === a.id;
              return (
                <Bubble
                  key={m.id}
                  message={m}
                  isA={isA}
                  authorName={isA ? a.name : b.name}
                />
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer — smash control */}
      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <span className="text-xs text-muted">
          {messages.length} {messages.length === 1 ? 'turn' : 'turns'}
        </span>
        <SmashButton
          currentProfileId={currentProfileId}
          targetProfileId={target.id}
          targetName={target.name}
        />
      </div>
    </motion.div>
  );
}
