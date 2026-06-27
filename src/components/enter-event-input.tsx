'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/events';

/** Small "enter an event by slug" input for the platform landing. */
export function EnterEventInput() {
  const router = useRouter();
  const [slug, setSlug] = React.useState('');

  function go(e: React.FormEvent) {
    e.preventDefault();
    const s = slugify(slug);
    if (s) router.push(`/${s}`);
  }

  return (
    <form onSubmit={go} className="flex flex-1 items-center rounded-xl border border-border bg-surface-2 px-3 py-1 focus-within:ring-2 focus-within:ring-brand/40">
      <span className="select-none text-sm text-muted">/</span>
      <input
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder="enter-event-code"
        spellCheck={false}
        autoCapitalize="off"
        className="ml-0.5 min-w-0 flex-1 bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-muted"
      />
      <button type="submit" className="rounded-lg px-2 py-1 text-sm font-semibold text-brand hover:text-brand/80">
        Go
      </button>
    </form>
  );
}
