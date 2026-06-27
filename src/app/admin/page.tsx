import Link from 'next/link';
import { getSessionUser } from '@/lib/session';
import { listEventsByOwner } from '@/lib/events';
import { CreateEventForm } from '@/components/admin/create-event-form';
import { Button } from '@/components/ui';
import { BRAND } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <main className="bg-grid flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <h1 className="text-3xl font-bold text-foreground">Organizer sign-in</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">Sign in to create and manage your events on {BRAND.name}.</p>
        <Link href="/auth/login?returnTo=/admin" className="mt-6">
          <Button className="px-6 py-3 text-base">Sign in →</Button>
        </Link>
      </main>
    );
  }

  const events = await listEventsByOwner(user.auth0Id);

  return (
    <main className="bg-grid min-h-dvh px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-muted hover:text-foreground">← {BRAND.name}</Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Your events</h1>
        <p className="mt-1 text-sm text-muted">Create a new event, or manage an existing one.</p>

        {events.length > 0 && (
          <div className="mt-6 grid gap-3">
            {events.map((e) => (
              <div key={e.id} className="glass flex items-center justify-between rounded-2xl p-4">
                <div>
                  <div className="font-semibold text-foreground">{e.name}</div>
                  <div className="text-xs text-muted">/{e.slug}</div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/${e.slug}`}><Button variant="ghost" className="text-sm">View</Button></Link>
                  <Link href={`/${e.slug}/admin`}><Button variant="outline" className="text-sm">Manage</Button></Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Create a new event</h2>
          <CreateEventForm organizerEmail={user.email} />
        </div>
      </div>
    </main>
  );
}
