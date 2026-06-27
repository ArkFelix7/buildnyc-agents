import * as React from 'react';
import { cn, initials } from '@/lib/utils';
import { ROLE_LABELS, type Role } from '@/lib/types';

/** Shared UI primitives. Feature slices import these — do not fork them. */

export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-surface-2 text-foreground font-semibold ring-1 ring-border overflow-hidden shrink-0',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      title={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </div>
  );
}

const ROLE_COLORS: Record<Role, string> = {
  dev: 'bg-brand/15 text-brand ring-brand/30',
  designer: 'bg-accent/15 text-accent ring-accent/30',
  ai_engineer: 'bg-brand-2/15 text-brand-2 ring-brand-2/30',
  pm: 'bg-warning/15 text-warning ring-warning/30',
  other: 'bg-surface-2 text-muted ring-border',
};

export function RoleBadge({ role, className }: { role: Role | null; className?: string }) {
  const r = role ?? 'other';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1',
        ROLE_COLORS[r],
        className,
      )}
    >
      {ROLE_LABELS[r]}
    </span>
  );
}

export function ScoreBadge({ score, className }: { score: number | null; className?: string }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const tone =
    pct >= 85 ? 'bg-success/15 text-success ring-success/30' : 'bg-brand/15 text-brand ring-brand/30';
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ring-1', tone, className)}>
      {pct}% match
    </span>
  );
}

export function Button({
  className,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline';
}) {
  const variants = {
    primary: 'bg-brand text-white hover:bg-brand/90 shadow-lg shadow-brand/20',
    ghost: 'bg-transparent hover:bg-surface-2 text-foreground',
    outline: 'bg-transparent ring-1 ring-border hover:bg-surface-2 text-foreground',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    />
  );
}
