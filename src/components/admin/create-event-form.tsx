'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { slugify, SLUG_RE } from '@/lib/events';
import { Button, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface CreateEventFormProps {
  /** Prefill organizer email (from the server session). */
  organizerEmail?: string;
}

const NAME_MAX = 80;
const TAGLINE_MAX = 160;
const DESC_MAX = 2000;

/**
 * Create-event form. Name drives a live (editable) slug preview validated
 * against SLUG_RE. POSTs /api/events, then routes to /{slug}/admin on success.
 * Slug-taken errors surface inline.
 */
export function CreateEventForm({ organizerEmail }: CreateEventFormProps) {
  const router = useRouter();

  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [slugEdited, setSlugEdited] = React.useState(false);
  const [tagline, setTagline] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [email, setEmail] = React.useState(organizerEmail ?? '');
  const [passcode, setPasscode] = React.useState('');
  const [matchingEnabled, setMatchingEnabled] = React.useState(true);

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Auto-derive slug from name until the user edits it directly.
  function onNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  function onSlugChange(value: string) {
    setSlugEdited(true);
    // Keep it URL-safe as the user types.
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  }

  const slugValid = SLUG_RE.test(slug);
  const canSubmit = name.trim().length > 0 && slugValid && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Give your event a name.');
      return;
    }
    if (!slugValid) {
      setError('Pick a URL: 3–40 chars, lowercase letters, numbers and hyphens.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug,
          tagline: tagline.trim() || undefined,
          description: description.trim() || undefined,
          organizer_email: email.trim() || undefined,
          admin_passcode: passcode.trim() || undefined,
          matching_enabled: matchingEnabled,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !data?.event) {
        throw new Error(data?.error ?? 'Could not create the event.');
      }
      router.push(`/${data.event.slug}/admin`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  }

  if (submitting) {
    return (
      <div className="glass animate-in flex flex-col items-center gap-4 rounded-2xl px-8 py-16 text-center">
        <Spinner className="h-7 w-7 text-brand" />
        <div>
          <p className="text-lg font-semibold text-foreground">Standing up your event…</p>
          <p className="mt-1 text-sm text-muted">Provisioning its room, concierge, and match pool.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="glass animate-in space-y-6 rounded-2xl p-6 sm:p-8">
      {/* Name */}
      <Field label="Event name" htmlFor="event-name">
        <input
          id="event-name"
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Built in NYC"
          maxLength={NAME_MAX}
          className={inputCls}
        />
      </Field>

      {/* Slug */}
      <Field
        label="Event URL"
        hint={slug && !slugValid ? 'invalid' : undefined}
        htmlFor="event-slug"
      >
        <div
          className={cn(
            'flex items-center rounded-xl border bg-surface-2 px-3 py-2.5 transition-colors focus-within:ring-2 focus-within:ring-brand/40',
            slug && !slugValid ? 'border-warning/50' : 'border-border',
          )}
        >
          <span className="select-none text-sm text-muted">/</span>
          <input
            id="event-slug"
            type="text"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            placeholder="buildnyc26"
            maxLength={40}
            spellCheck={false}
            autoCapitalize="off"
            className="ml-0.5 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
          />
        </div>
        <p className="text-xs text-muted">
          Your event lives at <span className="text-brand-2">/{slug || 'your-event'}</span>
        </p>
      </Field>

      {/* Tagline */}
      <Field label="Tagline" hint={`optional · ${tagline.length}/${TAGLINE_MAX}`} htmlFor="event-tagline">
        <input
          id="event-tagline"
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value.slice(0, TAGLINE_MAX))}
          placeholder="Your AI agent networks the room. You just show up."
          maxLength={TAGLINE_MAX}
          className={inputCls}
        />
      </Field>

      {/* Description */}
      <Field label="Description" hint={`optional · ${description.length}/${DESC_MAX}`} htmlFor="event-desc">
        <textarea
          id="event-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
          rows={3}
          maxLength={DESC_MAX}
          placeholder="A one-day AI hackathon in NYC."
          className={cn(inputCls, 'resize-none')}
        />
      </Field>

      {/* Organizer email */}
      <Field label="Organizer email" hint="for escalations & match intros" htmlFor="event-email">
        <input
          id="event-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className={inputCls}
        />
      </Field>

      {/* Admin passcode */}
      <Field label="Admin passcode" hint="optional · share-to-co-admin" htmlFor="event-passcode">
        <input
          id="event-passcode"
          type="text"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="leave blank for owner-only"
          maxLength={80}
          spellCheck={false}
          className={inputCls}
        />
      </Field>

      {/* Matching toggle */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-2 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Agent matching</p>
          <p className="text-xs text-muted">
            {matchingEnabled
              ? 'Participants get AI agents that network the room.'
              : 'Concierge only — no matching.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={matchingEnabled}
          onClick={() => setMatchingEnabled((v) => !v)}
          className={cn(
            'relative h-6 w-11 shrink-0 rounded-full transition-colors',
            matchingEnabled ? 'bg-brand' : 'bg-border',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform',
              matchingEnabled && 'translate-x-5',
            )}
          />
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning ring-1 ring-warning/30">
          {error}
        </p>
      )}

      <Button type="submit" disabled={!canSubmit} className="w-full py-3 text-base">
        Create event →
      </Button>
    </form>
  );
}

const inputCls =
  'w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:ring-2 focus:ring-brand/40';

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
          {label}
        </label>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
