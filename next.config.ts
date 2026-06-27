import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// Wrap with Sentry. Source-map upload only happens when SENTRY_AUTH_TOKEN is
// present; org/project fall through to undefined and the build still succeeds
// with zero Sentry env keys.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Quiet build logs.
  silent: true,
  // Upload a larger set of source maps for better client-side stack traces.
  widenClientFileUpload: true,
  // Don't emit the noisy Sentry logger.
  disableLogger: true,
});
