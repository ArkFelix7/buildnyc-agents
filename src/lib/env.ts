/**
 * Central environment access + capability flags.
 *
 * The app is designed to run in two modes:
 *  - LIVE  : all service keys present → real Supabase / AI Gateway / Resend / Auth0
 *  - MOCK  : a key is missing → graceful fallback (seed data, deterministic embeddings,
 *            canned LLM output) so `pnpm dev` works before any credentials are pasted in.
 *
 * Every feature slice should branch on these flags rather than reading process.env directly.
 */

const str = (v: string | undefined) => (v && v.trim().length > 0 ? v.trim() : undefined);

export const env = {
  // Supabase
  supabaseUrl: str(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: str(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  supabaseServiceKey: str(process.env.SUPABASE_SERVICE_ROLE_KEY),

  // AI Gateway (Vercel)
  aiGatewayKey: str(process.env.AI_GATEWAY_API_KEY),
  modelFast: str(process.env.MODEL_FAST) ?? 'anthropic/claude-haiku-4.5',
  modelSmart: str(process.env.MODEL_SMART) ?? 'anthropic/claude-sonnet-4.5',
  modelEmbed: str(process.env.MODEL_EMBED) ?? 'openai/text-embedding-3-small',

  // Resend
  resendKey: str(process.env.RESEND_API_KEY),
  emailFrom: str(process.env.EMAIL_FROM) ?? 'BuildNYC Agents <onboarding@resend.dev>',
  organizerEmail: str(process.env.ORGANIZER_EMAIL) ?? 'organizer@buildnyc.dev',

  // Auth0
  auth0Domain: str(process.env.AUTH0_DOMAIN),
  auth0ClientId: str(process.env.AUTH0_CLIENT_ID),
  auth0Secret: str(process.env.AUTH0_SECRET),

  // App
  appUrl: str(process.env.APP_BASE_URL) ?? 'http://localhost:3000',
} as const;

export const flags = {
  hasSupabase: Boolean(env.supabaseUrl && env.supabaseServiceKey),
  hasSupabasePublic: Boolean(env.supabaseUrl && env.supabaseAnonKey),
  hasAIGateway: Boolean(env.aiGatewayKey),
  hasResend: Boolean(env.resendKey),
  hasAuth0: Boolean(env.auth0Domain && env.auth0ClientId && env.auth0Secret),
} as const;

/** True when we should serve seed/mock data instead of hitting real services. */
export const MOCK_MODE = !flags.hasSupabase;

export const EMBED_DIM = 1536;
