import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEventBySlug } from '@/lib/events';
import { getSessionUser } from '@/lib/session';
import { Button } from '@/components/ui';
import { BRAND } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function EventHero({ params }: { params: Promise<{ event: string }> }) {
  const { event: slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const user = await getSessionUser();
  const accent = event.theme_color ?? '#6d5efc';
  const joinHref = user ? `/${event.slug}/join` : `/auth/login?returnTo=/${event.slug}/join`;

  return (
    <main className="bg-grid relative flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <div aria-hidden className="pointer-events-none absolute -top-32 h-[32rem] w-[32rem] rounded-full blur-[140px]" style={{ background: `${accent}28` }} />
      <div className="relative z-10 mx-auto max-w-2xl">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
          {BRAND.name}
        </Link>

        <h1 className="text-balance text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
          {event.name}
        </h1>
        {event.tagline ? (
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted">{event.tagline}</p>
        ) : null}

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href={joinHref}>
            <Button className="px-7 py-3.5 text-base" style={{ backgroundColor: accent }}>
              {event.matching_enabled ? 'Join — find your people →' : 'Join →'}
            </Button>
          </Link>
          <Link href={`/${event.slug}/mission-control`}>
            <Button variant="outline" className="px-7 py-3.5 text-base">
              Enter the room
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-sm text-muted">
          {event.matching_enabled
            ? 'Spin up an AI agent that meets the whole room for you — or just ask the concierge anything.'
            : 'Ask the concierge anything about this event.'}
        </p>
      </div>
    </main>
  );
}
