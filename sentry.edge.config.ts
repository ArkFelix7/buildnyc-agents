// Sentry edge-runtime init. Loaded via instrumentation.ts → register().
// No-ops gracefully when no DSN is set.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1,
  debug: false,
});
