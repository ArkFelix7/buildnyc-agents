import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEventBySlug, isEventAdmin } from '@/lib/events';
import { getSessionUser } from '@/lib/session';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { Button } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function EventAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ event: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { event: slug } = await params;
  const { key } = await searchParams;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const user = await getSessionUser();
  const authorized = isEventAdmin(event, { auth0Id: user?.auth0Id, passcode: key });

  if (!authorized) {
    return (
      <main className="bg-grid flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">Admin access required</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Sign in as the organizer of <span className="text-brand-2">{event.name}</span>, or open this page with the event passcode (<code className="text-muted">?key=…</code>).
        </p>
        <Link href={`/auth/login?returnTo=/${event.slug}/admin`} className="mt-6">
          <Button className="px-6 py-3">Sign in →</Button>
        </Link>
      </main>
    );
  }

  return <AdminDashboard slug={event.slug} name={event.name} passcode={key ?? null} />;
}
