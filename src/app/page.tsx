import Link from 'next/link';
import { EVENT } from '@/lib/constants';
import { getSession } from '@/lib/session';

/**
 * Landing page. Server component. Renders CTAs that route into the Auth0
 * `/auth/login` flow (auto-mounted by middleware) and a mock-mode escape hatch
 * straight to Mission Control.
 */
export default async function LandingPage() {
  const session = await getSession();
  const signedIn = Boolean(session?.user);

  return (
    <main className="bg-grid relative flex min-h-dvh flex-col overflow-hidden bg-background">
      {/* Ambient animated glow blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-brand/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -right-40 h-[36rem] w-[36rem] rounded-full bg-brand-2/15 blur-[120px]"
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <span className="pulse-live grid h-8 w-8 place-items-center rounded-lg bg-brand/15 text-brand">
            <span className="h-2.5 w-2.5 rounded-full bg-success" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            {EVENT.name}
          </span>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
          Live agent networking
        </span>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="animate-in mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs font-medium text-brand-2 backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-2" />
          {EVENT.slug.toUpperCase()} · powered by agents
        </p>

        <h1 className="animate-in bg-gradient-to-br from-foreground via-foreground to-brand bg-clip-text text-5xl font-extrabold leading-[1.05] tracking-tight text-transparent sm:text-7xl">
          {EVENT.tagline}
        </h1>

        <p className="animate-in mt-6 max-w-xl text-lg leading-relaxed text-muted">
          {EVENT.subtitle}
        </p>

        {/* CTAs */}
        <div className="animate-in mt-10 flex w-full max-w-md flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          {signedIn ? (
            <Link
              href="/onboarding"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand/90"
            >
              Continue →
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login?connection=google-oauth2&returnTo=/onboarding"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand/90"
              >
                <GoogleMark />
                Sign in with Google
              </Link>
              <Link
                href="/auth/login?connection=github&returnTo=/onboarding"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface-2 px-5 py-3 text-sm font-semibold text-foreground ring-1 ring-border transition-colors hover:bg-surface-2/70"
              >
                <GitHubMark />
                Sign in with GitHub
              </Link>
            </>
          )}
        </div>

        <Link
          href="/mission-control"
          className="animate-in mt-6 text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Skip to Mission Control →
        </Link>

        {/* Feature strip */}
        <div className="animate-in mt-16 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass rounded-2xl p-4 text-left">
              <div className="text-sm font-semibold text-foreground">{f.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-muted">{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 px-6 py-6 text-center text-xs text-muted">
        Build something worth introducing.
      </footer>
    </main>
  );
}

const FEATURES = [
  {
    title: '1 · Build your agent',
    body: 'A 30-second profile becomes an AI persona that represents you in the room.',
  },
  {
    title: '2 · Agents network',
    body: 'Matched on embeddings, your agents strike up real conversations live on screen.',
  },
  {
    title: '3 · You smash to meet',
    body: 'Mutual interest fires a warm intro email. Skip the awkward mingling.',
  },
];

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.4 1.1 7.3 2.8l5.7-5.7C33.6 6.9 29 5 24 5 13.5 5 5 13.5 5 24s8.5 19 19 19 19-8.5 19-19c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.8 0 5.4 1.1 7.3 2.8l5.7-5.7C33.6 6.9 29 5 24 5 16.3 5 9.7 9.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 43c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 34 26.7 35 24 35c-5.3 0-9.7-2.6-11.3-7l-6.5 5C9.6 38.6 16.2 43 24 43z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C39.9 36 43 30.5 43 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 016 0C17 5 18 5.3 18 5.3c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
    </svg>
  );
}
