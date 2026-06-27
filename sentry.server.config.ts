// Sentry server-side init (nodejs runtime). Loaded via instrumentation.ts → register().
// No-ops gracefully when no DSN is set: Sentry.init({ dsn: undefined }) disables the SDK.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Full sampling for the hackathon demo — low traffic, we want every trace.
  tracesSampleRate: 1,
  // AI Agent Monitoring: instrument Vercel AI SDK + Anthropic calls so agent
  // conversations, personas, and matching show up as spans in Sentry.
  // `recordInputs`/`recordOutputs` capture prompts + completions for the demo.
  integrations: [
    Sentry.vercelAIIntegration({ recordInputs: true, recordOutputs: true }),
  ],
  sendDefaultPii: true,
  // Quiet unless explicitly debugging.
  debug: false,
});
