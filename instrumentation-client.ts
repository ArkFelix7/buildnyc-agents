// Sentry client-side init (browser). Next.js 16 loads this automatically.
// No-ops gracefully when NEXT_PUBLIC_SENTRY_DSN is absent.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Browser performance tracing.
  tracesSampleRate: 1,
  // AI Agent Monitoring on the client (e.g. streamed conversations) is enabled
  // server-side; here we keep browser tracing + replay-free perf for the demo.
  integrations: [Sentry.browserTracingIntegration()],
  sendDefaultPii: true,
  debug: false,
});

// Instruments App Router client-side navigations as transactions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
