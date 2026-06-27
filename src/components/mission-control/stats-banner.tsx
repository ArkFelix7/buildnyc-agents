'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Users, MessagesSquare, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatsBannerProps {
  /** Builders currently online (presence count). */
  online: number;
  /** Active conversations happening right now. */
  conversations: number;
  /** Mutual matches made. */
  matches: number;
  className?: string;
}

function Stat({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tone)}>
        {icon}
      </span>
      <div className="leading-tight">
        <motion.div
          key={value}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold tabular-nums text-foreground"
        >
          {value}
        </motion.div>
        <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      </div>
    </div>
  );
}

/** Live stats strip across the top of Mission Control. */
export function StatsBanner({ online, conversations, matches, className }: StatsBannerProps) {
  return (
    <div
      className={cn(
        'glass flex flex-wrap items-center gap-x-10 gap-y-4 rounded-2xl px-6 py-4',
        className,
      )}
    >
      <Stat
        icon={<Users className="h-5 w-5 text-brand" />}
        value={online}
        label="builders online"
        tone="bg-brand/15"
      />
      <span className="hidden h-8 w-px bg-border sm:block" />
      <Stat
        icon={<MessagesSquare className="h-5 w-5 text-brand-2" />}
        value={conversations}
        label="conversations live"
        tone="bg-brand-2/15"
      />
      <span className="hidden h-8 w-px bg-border sm:block" />
      <Stat
        icon={<Heart className="h-5 w-5 text-accent" />}
        value={matches}
        label="matches made"
        tone="bg-accent/15"
      />
    </div>
  );
}
