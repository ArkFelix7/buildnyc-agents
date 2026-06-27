import { notFound } from 'next/navigation';
import { getEventBySlug } from '@/lib/events';
import { getSessionUser } from '@/lib/session';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';

export const dynamic = 'force-dynamic';

export default async function JoinPage({ params }: { params: Promise<{ event: string }> }) {
  const { event: slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const user = await getSessionUser();

  return (
    <main className="bg-grid relative flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div aria-hidden className="pointer-events-none absolute -top-40 right-0 h-[30rem] w-[30rem] rounded-full bg-brand/15 blur-[120px]" />
      <OnboardingFlow
        event={{ slug: event.slug, name: event.name, matching_enabled: event.matching_enabled }}
        prefill={{ name: user?.name, email: user?.email }}
      />
    </main>
  );
}
