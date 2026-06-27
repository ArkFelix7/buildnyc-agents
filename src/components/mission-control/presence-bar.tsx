'use client';

import * as React from 'react';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface PresenceBarProps {
  /** Names to render as overlapping avatars (optional). */
  names?: string[];
  /** Total online count (drives the "+N" overflow and the trailing label). */
  count: number;
  /** Max avatars to show before collapsing into "+N". */
  max?: number;
  className?: string;
}

/**
 * Row of overlapping avatars for online builders + a live count.
 * If no names are supplied (e.g. anonymous presence), renders count-only chips.
 */
export function PresenceBar({ names, count, max = 6, className }: PresenceBarProps) {
  const labels = names && names.length > 0 ? names : Array.from({ length: Math.min(count, max) }, () => '');
  const shown = labels.slice(0, max);
  const overflow = Math.max(0, count - shown.length);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex -space-x-2">
        {shown.map((name, i) => (
          <Avatar
            key={`${name}-${i}`}
            name={name || `Builder ${i + 1}`}
            size={32}
            className="ring-2 ring-background"
          />
        ))}
        {overflow > 0 && (
          <span
            className="flex items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-muted ring-2 ring-background"
            style={{ width: 32, height: 32 }}
          >
            +{overflow}
          </span>
        )}
      </div>
      <span className="text-sm font-medium text-muted">
        <span className="text-foreground tabular-nums">{count}</span> online
      </span>
    </div>
  );
}
