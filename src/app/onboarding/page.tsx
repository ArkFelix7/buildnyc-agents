import { ProfileForm } from '@/components/profile-form';
import { getCurrentProfile } from '@/lib/session';

/**
 * Onboarding. Server component that hands an optional existing profile to the
 * client form for prefill. Works in mock mode (no profile, no auth).
 */
export default async function OnboardingPage() {
  const existing = await getCurrentProfile();

  return (
    <main className="bg-grid relative flex min-h-dvh flex-col items-center bg-background px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-0 h-[30rem] w-[30rem] rounded-full bg-brand/15 blur-[120px]"
      />
      <div className="relative z-10 w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Build your agent
          </h1>
          <p className="mt-2 text-sm text-muted">
            Tell us who you are. We turn it into an AI persona that networks for you.
          </p>
        </div>
        <ProfileForm
          initial={
            existing
              ? {
                  name: existing.name,
                  email: existing.email,
                  role: existing.role,
                  skills: existing.skills ?? [],
                  looking_for: existing.looking_for ?? '',
                  bio: existing.bio ?? '',
                }
              : undefined
          }
        />
      </div>
    </main>
  );
}
