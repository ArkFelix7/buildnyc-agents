'use client';

import * as React from 'react';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui';

type SmashState = 'idle' | 'pending' | 'liked' | 'mutual';

export interface SmashButtonProps {
  currentProfileId: string | null;
  targetProfileId: string;
  targetName: string;
  eventSlug?: string;
}

/**
 * Heart "smash" (like) button. POSTs to /api/smash; celebrates on a mutual match
 * and shows the shared match code. With no signed-in profile (mock/no-auth) it
 * uses a placeholder id so the demo still works.
 */
export function SmashButton({
  currentProfileId,
  targetProfileId,
  targetName,
  eventSlug,
}: SmashButtonProps) {
  const [state, setState] = React.useState<SmashState>('idle');
  const [showBanner, setShowBanner] = React.useState(false);
  const [matchCode, setMatchCode] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const disabled = state === 'pending' || state === 'liked' || state === 'mutual';

  async function handleClick() {
    if (disabled) return;
    setState('pending');
    setError(null);

    const fromProfileId = currentProfileId ?? 'mock-current';

    try {
      const res = await fetch('/api/smash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromProfileId, toProfileId: targetProfileId, eventSlug }),
      });
      const data: { ok: boolean; mutual?: boolean; matchCode?: string | null; error?: string } =
        await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Something went wrong');
        setState('idle');
        return;
      }

      if (data.mutual) {
        setState('mutual');
        setMatchCode(data.matchCode ?? null);
        setShowBanner(true);
      } else {
        setState('liked');
      }
    } catch {
      setError('Network error');
      setState('idle');
    }
  }

  const filled = state === 'liked' || state === 'mutual';
  const isMutual = state === 'mutual';

  const label =
    state === 'pending'
      ? 'Smashing…'
      : isMutual
        ? 'Matched! 🎉'
        : state === 'liked'
          ? 'Liked'
          : 'Smash';

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <motion.button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        whileTap={disabled ? undefined : { scale: 0.92 }}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:pointer-events-none',
          isMutual
            ? 'bg-success/15 text-success ring-1 ring-success/40'
            : 'bg-accent/15 text-accent ring-1 ring-accent/40 hover:bg-accent/25',
          state === 'liked' && 'opacity-80',
        )}
        aria-label={isMutual ? `Matched with ${targetName}` : `Smash ${targetName}`}
      >
        {state === 'pending' ? (
          <Spinner className="h-4 w-4" />
        ) : (
          <motion.span
            key={filled ? 'filled' : 'outline'}
            initial={false}
            animate={filled ? { scale: [1, 1.4, 1] } : { scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="inline-flex"
          >
            <Heart
              className="h-4 w-4"
              fill={filled ? 'currentColor' : 'none'}
              strokeWidth={2}
            />
          </motion.span>
        )}
        <span>{label}</span>
      </motion.button>

      <AnimatePresence>
        {showBanner ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg bg-success/15 px-3 py-2 text-xs font-medium text-success ring-1 ring-success/30"
            role="status"
          >
            🎉 You matched with {targetName}! Check your email.
            {matchCode ? (
              <span className="mt-1 block font-mono text-sm font-bold tracking-wider text-success">
                Code: {matchCode}
              </span>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {error ? (
        <span className="text-xs text-muted" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export default SmashButton;
