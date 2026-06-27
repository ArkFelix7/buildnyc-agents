import * as React from 'react';

/**
 * Generated avatars — deterministic, local inline SVG. No uploads, no network,
 * CSP-safe. A profile stores { avatar_style, avatar_seed } and renders the same
 * avatar everywhere (onboarding picker, cards, presence, emails fall back to initials).
 *
 * Inspired by boring-avatars; reimplemented locally with curated palettes.
 */

export const AVATAR_STYLES = ['beam', 'sunset', 'bauhaus', 'rings', 'blobs'] as const;
export type AvatarStyle = (typeof AVATAR_STYLES)[number];

export const DEFAULT_AVATAR_STYLE: AvatarStyle = 'beam';

const PALETTES: string[][] = [
  ['#6d5efc', '#00e0c6', '#ff5c8a', '#ffb547', '#22d39a'],
  ['#0d1b2a', '#1b9aaa', '#ef476f', '#ffc43d', '#06d6a0'],
  ['#2d00f7', '#8900f2', '#f20089', '#ff7900', '#ffd000'],
  ['#114b5f', '#1a936f', '#88d498', '#f3e9d2', '#c6dabf'],
  ['#231942', '#5e548e', '#9f86c0', '#be95c4', '#e0b1cb'],
  ['#011627', '#2ec4b6', '#e71d36', '#ff9f1c', '#fdfffc'],
];

// ── deterministic seed helpers ───────────────────────────────────────────────
function hashCode(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
const digit = (n: number, nth: number) => Math.floor((n / Math.pow(10, nth)) % 10);
const bool = (n: number, nth: number) => digit(n, nth) % 2 === 0;
function unit(n: number, range: number, index?: number) {
  const v = n % range;
  if (index !== undefined && digit(n, index) % 2 === 0) return -v;
  return v;
}
function palette(n: number): string[] {
  return PALETTES[n % PALETTES.length];
}

/** A fresh random seed (for the picker's "shuffle"). Call at event time, not module init. */
export function genSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ── variants ─────────────────────────────────────────────────────────────────
function Beam({ n, c }: { n: number; c: string[] }) {
  const wrapperT = unit(n, 10, 1);
  const wrapperR = unit(n, 360, 0);
  const faceR = unit(n, 10, 3);
  const faceT = unit(n, 8, 2);
  const eyeSpread = 4 + (n % 4);
  const mouthSmile = bool(n, 3);
  const mouthY = 22 + (n % 4);
  const eyeY = 14;
  return (
    <g>
      <rect width={36} height={36} fill={c[0]} />
      <rect
        x="0" y="0" width={36} height={36}
        transform={`translate(${wrapperT} 0) rotate(${wrapperR} 18 18)`}
        fill={c[1]} rx={36}
      />
      <g transform={`translate(${faceT} ${faceR})`}>
        {mouthSmile ? (
          <path d={`M13,${mouthY} a1,0.75 0 0,0 10,0`} fill="none" stroke={c[3]} strokeWidth={1.5} strokeLinecap="round" />
        ) : (
          <rect x={14} y={mouthY} width={8} height={2} rx={1} fill={c[3]} />
        )}
        <rect x={18 - eyeSpread - 1} y={eyeY} width={2} height={3} rx={1} fill={c[3]} />
        <rect x={18 + eyeSpread - 1} y={eyeY} width={2} height={3} rx={1} fill={c[3]} />
      </g>
    </g>
  );
}

function Sunset({ n, c, id }: { n: number; c: string[]; id: string }) {
  const a = `${id}-a`;
  const b = `${id}-b`;
  return (
    <g>
      <defs>
        <linearGradient id={a} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c[(n + 0) % c.length]} />
          <stop offset="100%" stopColor={c[(n + 1) % c.length]} />
        </linearGradient>
        <linearGradient id={b} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={c[(n + 2) % c.length]} />
          <stop offset="100%" stopColor={c[(n + 3) % c.length]} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={36} height={18} fill={`url(#${a})`} />
      <rect x="0" y="18" width={36} height={18} fill={`url(#${b})`} />
    </g>
  );
}

function Bauhaus({ n, c }: { n: number; c: string[] }) {
  const t1 = unit(n, 36, 1);
  const r1 = unit(n, 360, 0);
  return (
    <g>
      <rect width={36} height={36} fill={c[0]} />
      <rect x={10} y={Math.abs(t1) % 24} width={36} height={6} fill={c[1]} transform={`rotate(${r1} 18 18)`} />
      <circle cx={18} cy={18} r={6 + (n % 6)} fill={c[2]} transform={`translate(${unit(n, 8, 1)} ${unit(n, 8, 2)})`} />
      <line x1={0} y1={18} x2={36} y2={18} stroke={c[3]} strokeWidth={1.5} transform={`rotate(${unit(n, 90, 3)} 18 18)`} />
    </g>
  );
}

function Rings({ n, c }: { n: number; c: string[] }) {
  return (
    <g>
      <rect width={36} height={36} fill={c[0]} />
      {[14, 10, 6, 3].map((r, i) => (
        <circle key={i} cx={18} cy={18} r={r} fill={c[(n + i + 1) % c.length]} />
      ))}
    </g>
  );
}

function Blobs({ n, c, id }: { n: number; c: string[]; id: string }) {
  const f = `${id}-blur`;
  const blobs = [0, 1, 2].map((i) => ({
    cx: 18 + unit(n * (i + 1), 16, 1),
    cy: 18 + unit(n * (i + 2), 16, 2),
    r: 10 + (n % 6) + i * 2,
    fill: c[(n + i + 1) % c.length],
  }));
  return (
    <g>
      <defs>
        <filter id={f}>
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <rect width={36} height={36} fill={c[0]} />
      <g filter={`url(#${f})`}>
        {blobs.map((b, i) => (
          <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={b.fill} />
        ))}
      </g>
    </g>
  );
}

export function GenAvatar({
  style = DEFAULT_AVATAR_STYLE,
  seed = 'anon',
  size = 64,
  className,
  title,
}: {
  style?: string | null;
  seed?: string | null;
  size?: number;
  className?: string;
  title?: string;
}) {
  const s = (AVATAR_STYLES.includes(style as AvatarStyle) ? style : DEFAULT_AVATAR_STYLE) as AvatarStyle;
  const key = `${s}:${seed ?? 'anon'}`;
  const n = hashCode(key);
  const c = palette(n);
  // Stable id for gradient/filter refs (avoids collisions across multiple avatars).
  const id = `av${n.toString(36)}`;
  const maskId = `${id}-m`;

  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      role="img"
      aria-label={title ?? 'avatar'}
      className={className}
      style={{ borderRadius: '50%', display: 'block', flexShrink: 0 }}
    >
      {title ? <title>{title}</title> : null}
      <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36">
        <rect width="36" height="36" rx="72" fill="#fff" />
      </mask>
      <g mask={`url(#${maskId})`}>
        {s === 'beam' && <Beam n={n} c={c} />}
        {s === 'sunset' && <Sunset n={n} c={c} id={id} />}
        {s === 'bauhaus' && <Bauhaus n={n} c={c} />}
        {s === 'rings' && <Rings n={n} c={c} />}
        {s === 'blobs' && <Blobs n={n} c={c} id={id} />}
      </g>
    </svg>
  );
}
