'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Shuffle } from 'lucide-react';
import { GenAvatar, AVATAR_STYLES, genSeed } from '@/lib/avatar';
import { cn } from '@/lib/utils';

export interface AvatarValue {
  style: string;
  seed: string;
}

/**
 * Delightful avatar picker — a grid of generated SVG avatars spanning every
 * style, with a Shuffle button that re-rolls infinite variety. No upload, no
 * network: avatars are deterministic local SVG keyed by { style, seed }.
 */
export function AvatarPicker({
  value,
  onChange,
  name,
}: {
  value: AvatarValue;
  onChange: (v: AvatarValue) => void;
  name?: string;
}) {
  // Each tile = one style with its own seed; Shuffle re-rolls all seeds.
  const [seeds, setSeeds] = React.useState<string[]>(() =>
    AVATAR_STYLES.flatMap((_, i) => [genSeed() + i, genSeed() + 'b' + i]),
  );

  const options = React.useMemo(() => {
    const out: AvatarValue[] = [];
    AVATAR_STYLES.forEach((style, i) => {
      out.push({ style, seed: seeds[i * 2] });
      out.push({ style, seed: seeds[i * 2 + 1] });
    });
    return out;
  }, [seeds]);

  function shuffle() {
    const next = AVATAR_STYLES.flatMap((_, i) => [genSeed() + i + Date.now(), genSeed() + 'b' + i + Date.now()]);
    setSeeds(next);
    onChange({ style: AVATAR_STYLES[0], seed: next[0] });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-surface-2 p-1 ring-2 ring-brand/50">
            <GenAvatar style={value.style} seed={value.seed} size={56} title={name} />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Your avatar</div>
            <div className="text-xs text-muted">Pick one, or shuffle for more</div>
          </div>
        </div>
        <button
          type="button"
          onClick={shuffle}
          className="inline-flex items-center gap-1.5 rounded-xl bg-surface-2 px-3 py-2 text-sm font-medium text-foreground ring-1 ring-border transition-colors hover:bg-surface"
        >
          <Shuffle className="h-4 w-4" />
          Shuffle
        </button>
      </div>

      <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-6">
        {options.map((opt) => {
          const selected = opt.style === value.style && opt.seed === value.seed;
          return (
            <motion.button
              key={`${opt.style}:${opt.seed}`}
              type="button"
              onClick={() => onChange(opt)}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.06 }}
              className={cn(
                'rounded-xl p-1 transition-shadow',
                selected
                  ? 'ring-2 ring-brand shadow-lg shadow-brand/30'
                  : 'ring-1 ring-border hover:ring-brand/40',
              )}
              aria-label={`Choose ${opt.style} avatar`}
              aria-pressed={selected}
            >
              <GenAvatar style={opt.style} seed={opt.seed} size={48} />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
