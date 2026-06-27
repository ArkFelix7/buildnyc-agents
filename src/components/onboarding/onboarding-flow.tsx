'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Compass, ArrowLeft } from 'lucide-react';
import { Button, Spinner } from '@/components/ui';
import { AvatarPicker, type AvatarValue } from '@/components/onboarding/avatar-picker';
import { genSeed, AVATAR_STYLES } from '@/lib/avatar';
import { ROLE_LABELS, type Role } from '@/lib/types';

export interface OnboardingFlowProps {
  event: { slug: string; name: string; matching_enabled: boolean };
  prefill?: { name?: string; email?: string };
}

const ROLE_KEYS = Object.keys(ROLE_LABELS) as Role[];

export function OnboardingFlow({ event, prefill }: OnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [name, setName] = React.useState(prefill?.name ?? '');
  const [avatar, setAvatar] = React.useState<AvatarValue>({ style: AVATAR_STYLES[0], seed: genSeed() });
  const [wantsMatching, setWantsMatching] = React.useState<boolean | null>(null);
  const [role, setRole] = React.useState<Role | null>(null);
  const [skills, setSkills] = React.useState<string[]>([]);
  const [skillInput, setSkillInput] = React.useState('');
  const [lookingFor, setLookingFor] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function addSkill() {
    const s = skillInput.trim();
    if (s && !skills.includes(s) && skills.length < 20) setSkills([...skills, s]);
    setSkillInput('');
  }

  async function submit(matching: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventSlug: event.slug,
          name: name || 'Guest',
          email: prefill?.email,
          avatar_style: avatar.style,
          avatar_seed: avatar.seed,
          wants_matching: matching,
          role: matching ? role : null,
          skills: matching ? skills : [],
          looking_for: matching ? lookingFor : '',
          bio: matching ? bio : '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Something went wrong');
        setBusy(false);
        return;
      }
      router.push(`/${event.slug}/mission-control`);
    } catch {
      setError('Network error');
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-xl">
      {/* progress dots */}
      <div className="mb-6 flex justify-center gap-2">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-1.5 rounded-full transition-all ${n === step ? 'w-8 bg-brand' : n < step ? 'w-4 bg-brand/50' : 'w-4 bg-border'}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Step 1: identity + avatar ── */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass rounded-3xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-foreground">Welcome to {event.name} 👋</h2>
            <p className="mt-1 text-sm text-muted">First, make yourself recognizable.</p>

            <label className="mt-6 block text-sm font-medium text-foreground">Your name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground outline-none ring-brand/50 focus:ring-2"
              maxLength={80}
            />

            <div className="mt-6">
              <AvatarPicker value={avatar} onChange={setAvatar} name={name || 'You'} />
            </div>

            <Button onClick={() => setStep(2)} disabled={!name.trim()} className="mt-7 w-full py-3 text-base">
              Continue →
            </Button>
          </motion.div>
        )}

        {/* ── Step 2: the fork ── */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass rounded-3xl p-6 sm:p-8">
            <button onClick={() => setStep(1)} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <h2 className="text-2xl font-bold text-foreground">How do you want to use {event.name}?</h2>
            <p className="mt-1 text-sm text-muted">You can always do both — pick what you need now.</p>

            <div className="mt-6 grid gap-4">
              {event.matching_enabled && (
                <button
                  onClick={() => { setWantsMatching(true); setStep(3); }}
                  className="group rounded-2xl border border-border bg-surface p-5 text-left transition-all hover:border-brand hover:bg-surface-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-brand/15 p-2.5 text-brand"><Users className="h-6 w-6" /></span>
                    <div>
                      <div className="text-lg font-semibold text-foreground">Find me teammates 🤝</div>
                      <div className="text-sm text-muted">Spin up an AI agent that networks the room and finds your matches.</div>
                    </div>
                  </div>
                </button>
              )}
              <button
                onClick={() => { setWantsMatching(false); submit(false); }}
                disabled={busy}
                className="group rounded-2xl border border-border bg-surface p-5 text-left transition-all hover:border-brand-2 hover:bg-surface-2 disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-brand-2/15 p-2.5 text-brand-2">{busy ? <Spinner className="h-6 w-6" /> : <Compass className="h-6 w-6" />}</span>
                  <div>
                    <div className="text-lg font-semibold text-foreground">Just exploring 👀</div>
                    <div className="text-sm text-muted">Skip matching — head straight in and ask the concierge anything.</div>
                  </div>
                </div>
              </button>
            </div>
            {error ? <p className="mt-4 text-sm text-accent">{error}</p> : null}
          </motion.div>
        )}

        {/* ── Step 3: matching profile ── */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass rounded-3xl p-6 sm:p-8">
            <button onClick={() => setStep(2)} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <h2 className="text-2xl font-bold text-foreground">Tell your agent who you are</h2>
            <p className="mt-1 text-sm text-muted">It uses this to represent you and find your people.</p>

            <label className="mt-6 block text-sm font-medium text-foreground">Your role</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ROLE_KEYS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition-colors ${role === r ? 'bg-brand text-white ring-brand' : 'bg-surface text-muted ring-border hover:text-foreground'}`}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>

            <label className="mt-5 block text-sm font-medium text-foreground">Your skills</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2.5 py-1 text-sm text-brand">
                  {s}
                  <button onClick={() => setSkills(skills.filter((x) => x !== s))} className="text-brand/70 hover:text-brand">×</button>
                </span>
              ))}
            </div>
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(); } }}
              placeholder="Type a skill, press Enter"
              className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground outline-none ring-brand/50 focus:ring-2"
            />

            <label className="mt-5 block text-sm font-medium text-foreground">What are you looking for?</label>
            <input
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value)}
              placeholder="e.g. a designer to build a polished demo"
              maxLength={200}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground outline-none ring-brand/50 focus:ring-2"
            />

            <label className="mt-5 block text-sm font-medium text-foreground">Short bio <span className="text-muted">(optional)</span></label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="One line about you"
              maxLength={300}
              rows={2}
              className="mt-1.5 w-full resize-none rounded-xl border border-border bg-surface px-4 py-2.5 text-foreground outline-none ring-brand/50 focus:ring-2"
            />

            <Button onClick={() => submit(true)} disabled={busy} className="mt-7 w-full py-3 text-base">
              {busy ? (<><Spinner className="h-5 w-5" /> Spinning up your agent…</>) : 'Launch my agent →'}
            </Button>
            {error ? <p className="mt-4 text-sm text-accent">{error}</p> : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
