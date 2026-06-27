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

function matchSubject(name: string): string {
  return `You matched with ${name} at BuildNYC Agents 🤝`;
}

/**
 * Send a mutual-match introduction. Fires TWO emails — one to each person,
 * each describing the other. In MOCK mode just logs and returns.
 */
export async function sendMatchIntro(
  a: Profile,
  b: Profile,
): Promise<{ ok: boolean; mock?: boolean }> {
  if (!flags.hasResend) {
    // eslint-disable-next-line no-console
    console.log(
      `[MOCK EMAIL] match intro ${a.name} <${a.email}> <-> ${b.name} <${b.email}> — two intro emails would be sent.`,
    );
    return { ok: true, mock: true };
  }

  try {
    const resend = client();
    await Promise.all([
      resend.emails.send({
        from: env.emailFrom,
        to: a.email,
        subject: matchSubject(b.name),
        react: (
          <MatchIntroEmail
            recipientName={a.name}
            matchName={b.name}
            matchRole={b.role}
            matchBio={b.bio}
            matchLookingFor={b.looking_for}
          />
        ),
      }),
      resend.emails.send({
        from: env.emailFrom,
        to: b.email,
        subject: matchSubject(a.name),
        react: (
          <MatchIntroEmail
            recipientName={b.name}
            matchName={a.name}
            matchRole={a.role}
            matchBio={a.bio}
            matchLookingFor={a.looking_for}
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
}): Promise<{ ok: boolean; mock?: boolean }> {
  const replyUrl = `${env.appUrl}/api/organizer-reply?escalationId=${encodeURIComponent(
    args.escalationId,
  )}`;

  if (!flags.hasResend) {
    // eslint-disable-next-line no-console
    console.log(
      `[MOCK EMAIL] organizer escalation -> ${env.organizerEmail} :: "${args.question}" (reply: ${replyUrl})`,
    );
    return { ok: true, mock: true };
  }

  try {
    const resend = client();
    await resend.emails.send({
      from: env.emailFrom,
      to: env.organizerEmail,
      subject: '❓ Attendee question needs your answer',
      react: <OrganizerEscalationEmail question={args.question} replyUrl={replyUrl} />,
    });
    return { ok: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[email] sendOrganizerEscalation failed', err);
    return { ok: false };
  }
}
