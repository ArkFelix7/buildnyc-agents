import { Resend } from 'resend';
import { env, flags } from './env';
import type { Profile } from './types';
import { MatchIntroEmail } from '@/emails/match-intro';
import { OrganizerEscalationEmail } from '@/emails/organizer-escalation';

/**
 * Resend wrapper. Falls back to console logging in MOCK mode (no RESEND_API_KEY),
 * so the app works end-to-end before any keys are pasted in.
 */

let _resend: Resend | null = null;
function client(): Resend {
  if (!_resend) _resend = new Resend(env.resendKey!);
  return _resend;
}

function matchSubject(name: string, eventName: string): string {
  return `You matched with ${name} at ${eventName} 🤝`;
}

/**
 * Send a mutual-match introduction. Fires TWO emails — one to each person,
 * each describing the other and carrying the shared match code.
 */
export async function sendMatchIntro(
  a: Profile,
  b: Profile,
  opts: { matchCode?: string | null; eventName?: string } = {},
): Promise<{ ok: boolean; mock?: boolean }> {
  const eventName = opts.eventName ?? 'Orbit';
  if (!flags.hasResend) {
    // eslint-disable-next-line no-console
    console.log(
      `[EMAIL] match intro ${a.name} <${a.email}> <-> ${b.name} <${b.email}> · code ${opts.matchCode ?? '—'} (${eventName})`,
    );
    return { ok: true, mock: true };
  }

  try {
    const resend = client();
    await Promise.all([
      resend.emails.send({
        from: env.emailFrom,
        to: a.email,
        subject: matchSubject(b.name, eventName),
        react: (
          <MatchIntroEmail
            recipientName={a.name}
            matchName={b.name}
            matchRole={b.role}
            matchBio={b.bio}
            matchLookingFor={b.looking_for}
            matchCode={opts.matchCode}
            eventName={eventName}
          />
        ),
      }),
      resend.emails.send({
        from: env.emailFrom,
        to: b.email,
        subject: matchSubject(a.name, eventName),
        react: (
          <MatchIntroEmail
            recipientName={b.name}
            matchName={a.name}
            matchRole={a.role}
            matchBio={a.bio}
            matchLookingFor={a.looking_for}
            matchCode={opts.matchCode}
            eventName={eventName}
          />
        ),
      }),
    ]);
    return { ok: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[email] sendMatchIntro failed', err);
    return { ok: false };
  }
}

/**
 * Email the organizer when the concierge escalates a question it can't answer.
 * In MOCK mode just logs and returns.
 */
export async function sendOrganizerEscalation(args: {
  question: string;
  escalationId: string;
  to?: string;
  eventName?: string;
}): Promise<{ ok: boolean; mock?: boolean }> {
  const replyUrl = `${env.appUrl}/api/organizer-reply?escalationId=${encodeURIComponent(
    args.escalationId,
  )}`;
  const to = args.to ?? env.organizerEmail;

  if (!flags.hasResend) {
    // eslint-disable-next-line no-console
    console.log(
      `[EMAIL] organizer escalation -> ${to} :: "${args.question}" (reply: ${replyUrl})`,
    );
    return { ok: true, mock: true };
  }

  try {
    const resend = client();
    await resend.emails.send({
      from: env.emailFrom,
      to,
      subject: `❓ Attendee question needs your answer${args.eventName ? ` · ${args.eventName}` : ''}`,
      react: <OrganizerEscalationEmail question={args.question} replyUrl={replyUrl} />,
    });
    return { ok: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[email] sendOrganizerEscalation failed', err);
    return { ok: false };
  }
}
