'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0';
import { ROLE_LABELS, type Role } from '@/lib/types';
import { Button, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface ProfileFormInitial {
  name?: string;
  email?: string;
  role?: Role | null;
  skills?: string[];
  looking_for?: string;
  bio?: string;
}

const ROLE_ENTRIES = Object.entries(ROLE_LABELS) as [Role, string][];
const LOOKING_MAX = 200;
const BIO_MAX = 300;

export function ProfileForm({ initial }: { initial?: ProfileFormInitial }) {
  const router = useRouter();
  const { user } = useUser();

  const [name, setName] = React.useState(initial?.name ?? '');
  const [role, setRole] = React.useState<Role | null>(initial?.role ?? null);
  const [skills, setSkills] = React.useState<string[]>(initial?.skills ?? []);
  const [skillDraft, setSkillDraft] = React.useState('');
  const [lookingFor, setLookingFor] = React.useState(initial?.looking_for ?? '');
  const [bio, setBio] = React.useState(initial?.bio ?? '');

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const prefilled = React.useRef(false);

  // Prefill name/email from Auth0 once it loads (don't clobber user edits).
  React.useEffect(() => {
    if (prefilled.current || !user) return;
    prefilled.current = true;
    if (!initial?.name && user.name) setName(user.name);
  }, [user, initial?.name]);

  function addSkill(raw: string) {
    const v = raw.trim().replace(/,$/, '').trim();
    if (!v) return;
    setSkills((prev) =>
      prev.some((s) => s.toLowerCase() === v.toLowerCase()) || prev.length >= 20
        ? prev
        : [...prev, v],
    );
    setSkillDraft('');
  }

  function onSkillKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(skillDraft);
    } else if (e.key === 'Backspace' && skillDraft === '' && skills.length > 0) {
      setSkills((prev) => prev.slice(0, -1));
    }
  }

  function removeSkill(s: string) {
    setSkills((prev) => prev.filter((x) => x !== s));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please add your name.');
      return;
    }
    if (!role) {
      setError('Pick the role that fits you best.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: initial?.email ?? user?.email ?? undefined,
          role,
          skills,
          looking_for: lookingFor.trim(),
          bio: bio.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? 'Something went wrong saving your profile.');
      }
      router.push('/mission-control');
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
          <p className="text-lg font-semibold text-foreground">Generating your AI agent…</p>
          <p className="mt-1 text-sm text-muted">
            Building your persona and finding collaborators in the room.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="glass animate-in space-y-6 rounded-2xl p-6 sm:p-8">
      {/* Name */}
      <Field label="Name" htmlFor="name">
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ada Lovelace"
          autoComplete="name"
          maxLength={80}
          className={inputCls}
        />
      </Field>

      {/* Role */}
      <Field label="Role">
        <div className="flex flex-wrap gap-2">
          {ROLE_ENTRIES.map(([value, label]) => {
            const active = role === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                aria-pressed={active}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium ring-1 transition-colors',
                  active
                    ? 'bg-brand text-white ring-brand'
                    : 'bg-surface-2 text-muted ring-border hover:text-foreground',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Field>

      {/* Skills */}
      <Field label="Skills" hint="Type and press Enter to add">
        <div
          className={cn(
            'flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2',
            'focus-within:ring-2 focus-within:ring-brand/40',
          )}
        >
          {skills.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-xs font-medium text-brand ring-1 ring-brand/30"
            >
              {s}
              <button
                type="button"
                onClick={() => removeSkill(s)}
                aria-label={`Remove ${s}`}
                className="text-brand/70 transition-colors hover:text-brand"
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={skillDraft}
            onChange={(e) => setSkillDraft(e.target.value)}
            onKeyDown={onSkillKeyDown}
            onBlur={() => addSkill(skillDraft)}
            placeholder={skills.length === 0 ? 'React, pgvector, Figma…' : 'Add another…'}
            className="min-w-[8rem] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
          />
        </div>
      </Field>

      {/* Looking for */}
      <Field
        label="Looking for"
        hint={`${lookingFor.length}/${LOOKING_MAX}`}
        htmlFor="looking_for"
      >
        <textarea
          id="looking_for"
          value={lookingFor}
          onChange={(e) => setLookingFor(e.target.value.slice(0, LOOKING_MAX))}
          rows={2}
          maxLength={LOOKING_MAX}
          placeholder="A designer to make my agent backend demo-ready"
          className={cn(inputCls, 'resize-none')}
        />
      </Field>

      {/* Bio */}
      <Field label="Bio" hint={`optional · ${bio.length}/${BIO_MAX}`} htmlFor="bio">
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
          rows={3}
          maxLength={BIO_MAX}
          placeholder="Full-stack dev who loves shipping fast. Weak on CSS."
          className={cn(inputCls, 'resize-none')}
        />
      </Field>

      {error && (
        <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning ring-1 ring-warning/30">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full py-3 text-base">
        Generate my agent →
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
