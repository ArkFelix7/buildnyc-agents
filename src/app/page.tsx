import Link from 'next/link';
import { BRAND } from '@/lib/constants';
import { getSessionUser } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase';
import { EnterEventInput } from '@/components/enter-event-input';
import type { Event } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function recentEvents(): Promise<Event[]> {
  const db = supabaseAdmin();
  if (!db) {
    return [
      {
        id: 'e0000000-0000-4000-a000-000000000001',
        slug: 'buildnyc26',
        name: 'Built in NYC',
        tagline: 'Your AI agent networks the room.',
        description: null,
        starts_at: null,
        ends_at: null,
        organizer_auth0_id: '',
        organizer_email: '',
        admin_passcode: null,
        theme_color: '#6d5efc',
        matching_enabled: true,
        created_at: '',
      },
    ];
  }
  const { data } = await db.from('events').select('*').order('created_at', { ascending: false }).limit(6);
  return (data as Event[]) ?? [];
}

export default async function LandingPage() {
  const [user, events] = await Promise.all([getSessionUser(), recentEvents()]);

  return (
    <main className="bg-grid relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-brand/20 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 -right-40 h-[36rem] w-[36rem] rounded-full bg-brand-2/15 blur-[120px]" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/15 text-brand">
            <span className="pulse-live h-2.5 w-2.5 rounded-full bg-brand" />
          </span>
          <span className="text-base font-bold tracking-tight text-foreground">{BRAND.name}</span>
        </div>
        <Link href={user ? '/admin' : '/auth/login?returnTo=/admin'} className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground">
          {user ? 'My events' : 'For organizers'}
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="animate-in mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs font-medium text-brand-2 backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-2" />
          AI agents that network the room
        </p>

        <h1 className="animate-in bg-gradient-to-br from-foreground via-foreground to-brand bg-clip-text text-5xl font-extrabold leading-[1.05] tracking-tight text-transparent sm:text-7xl">
          {BRAND.tagline}
        </h1>
        <p className="animate-in mt-6 max-w-xl text-lg leading-relaxed text-muted">{BRAND.subtitle}</p>

        <div className="animate-in mt-10 flex w-full max-w-md flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <Link href={user ? '/admin' : '/auth/login?returnTo=/admin'} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand/90">
            Create an event →
          </Link>
          <EnterEventInput />
        </div>

        {events.length > 0 && (
          <div className="animate-in mt-14 w-full">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Live events</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {events.map((e) => (
                <Link key={e.id} href={`/${e.slug}`} className="glass group rounded-2xl p-4 text-left transition-colors hover:ring-brand/40">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-foreground">{e.name}</div>
                    <span className="text-xs text-brand-2 opacity-0 transition-opacity group-hover:opacity-100">/{e.slug} →</span>
                  </div>
                  {e.tagline ? <div className="mt-1 truncate text-xs text-muted">{e.tagline}</div> : null}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <footer className="relative z-10 px-6 py-6 text-center text-xs text-muted">
        {BRAND.name} — build something worth introducing.
      </footer>
    </main>
  );
}
