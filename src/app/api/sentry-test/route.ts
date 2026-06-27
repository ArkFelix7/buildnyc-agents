import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

/**
 * Deliberate error endpoint — PRD §16 acceptance test "Sentry catches a
 * deliberate test error". GET this route, then check the Sentry issues stream.
 * Works as a no-op-safe 500 even with no DSN configured.
 */
export async function GET() {
  try {
    throw new Error('Sentry test error — BuildNYC Agents observability check (intentional).');
  } catch (err) {
    Sentry.captureException(err);
    // Flush so the event is delivered before the serverless function freezes.
    await Sentry.flush(2000);
    return NextResponse.json(
      { ok: false, error: 'Deliberate test error thrown and captured by Sentry.' },
      { status: 500 },
    );
  }
}
