'use client';

import * as React from 'react';
import Link from 'next/link';
import { BookOpen, Inbox, Check, ExternalLink } from 'lucide-react';
import { Button, Spinner } from '@/components/ui';

interface Chunk { id: string; content: string; source: string | null }
interface Escalation { id: string; question: string; answer: string | null; status: string; created_at: string }

export function AdminDashboard({ slug, name, passcode }: { slug: string; name: string; passcode: string | null }) {
  const [tab, setTab] = React.useState<'kb' | 'inbox'>('inbox');
  const [chunks, setChunks] = React.useState<Chunk[]>([]);
  const [escalations, setEscalations] = React.useState<Escalation[]>([]);
  const [content, setContent] = React.useState('');
  const [adding, setAdding] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);

  const q = passcode ? `?key=${encodeURIComponent(passcode)}` : '';

  const loadKb = React.useCallback(async () => {
    const r = await fetch(`/api/events/${slug}/knowledge`);
    const d = await r.json();
    setChunks(d.chunks ?? []);
  }, [slug]);

  const loadInbox = React.useCallback(async () => {
    const r = await fetch(`/api/events/${slug}/escalations`);
    const d = await r.json();
    setEscalations(d.escalations ?? []);
  }, [slug]);

  React.useEffect(() => { loadKb(); loadInbox(); }, [loadKb, loadInbox]);

  async function addContent() {
    if (!content.trim()) return;
    setAdding(true);
    setNote(null);
    const r = await fetch(`/api/events/${slug}/knowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, passcode }),
    });
    const d = await r.json();
    setAdding(false);
    if (d.ok) { setNote(`Added ${d.inserted} chunk${d.inserted === 1 ? '' : 's'}.`); setContent(''); loadKb(); }
    else setNote(d.error ?? 'Failed to add.');
  }

  async function answer(id: string, text: string, saveToKb: boolean) {
    const r = await fetch('/api/organizer-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ escalationId: id, answer: text, saveToKb }),
    });
    if (r.ok) { loadInbox(); if (saveToKb) loadKb(); }
  }

  const openCount = escalations.filter((e) => e.status !== 'answered').length;

  return (
    <main className="bg-grid min-h-dvh px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-sm text-muted hover:text-foreground">← My events</Link>
            <h1 className="mt-2 text-2xl font-bold text-foreground">{name} <span className="text-muted">· admin</span></h1>
          </div>
          <Link href={`/${slug}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted hover:text-foreground">
            <ExternalLink className="h-4 w-4" /> /{slug}
          </Link>
        </div>

        {/* tabs */}
        <div className="mt-6 flex gap-2">
          <button onClick={() => setTab('inbox')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ring-1 transition-colors ${tab === 'inbox' ? 'bg-brand text-white ring-brand' : 'bg-surface text-muted ring-border'}`}>
            <Inbox className="h-4 w-4" /> Handoff inbox {openCount > 0 && <span className="rounded-full bg-accent px-1.5 text-xs text-white">{openCount}</span>}
          </button>
          <button onClick={() => setTab('kb')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ring-1 transition-colors ${tab === 'kb' ? 'bg-brand text-white ring-brand' : 'bg-surface text-muted ring-border'}`}>
            <BookOpen className="h-4 w-4" /> Knowledge base
          </button>
        </div>

        {tab === 'inbox' && (
          <div className="mt-6 space-y-3">
            {escalations.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center text-sm text-muted">No questions yet. When the concierge can&apos;t answer something, it lands here.</div>
            ) : escalations.map((e) => <EscalationCard key={e.id} esc={e} onAnswer={answer} />)}
          </div>
        )}

        {tab === 'kb' && (
          <div className="mt-6 space-y-5">
            <div className="glass rounded-2xl p-5">
              <h2 className="font-semibold text-foreground">Add knowledge</h2>
              <p className="mt-1 text-xs text-muted">Paste agenda, prizes, FAQ, WiFi — anything. We chunk &amp; embed it for the concierge.</p>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="Paste content here…" className="mt-3 w-full resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand/40" />
              <div className="mt-3 flex items-center gap-3">
                <Button onClick={addContent} disabled={adding || !content.trim()}>{adding ? <><Spinner className="h-4 w-4" /> Embedding…</> : 'Add to knowledge base'}</Button>
                {note && <span className="text-sm text-success">{note}</span>}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{chunks.length} chunks indexed</div>
              <div className="space-y-2">
                {chunks.map((c) => (
                  <div key={c.id} className="glass rounded-xl px-4 py-3 text-sm text-muted">
                    <span className="line-clamp-2">{c.content}</span>
                    {c.source && <span className="mt-1 block text-xs text-brand-2/70">{c.source}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function EscalationCard({ esc, onAnswer }: { esc: Escalation; onAnswer: (id: string, text: string, saveToKb: boolean) => void }) {
  const [text, setText] = React.useState(esc.answer ?? '');
  const [saveKb, setSaveKb] = React.useState(true);
  const answered = esc.status === 'answered';

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-foreground">“{esc.question}”</p>
        {answered && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs text-success"><Check className="h-3 w-3" /> answered</span>}
      </div>
      {answered ? (
        <p className="mt-2 text-sm text-muted">{esc.answer}</p>
      ) : (
        <div className="mt-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Type your answer — it posts back to the attendee." className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand/40" />
          <div className="mt-2 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={saveKb} onChange={(e) => setSaveKb(e.target.checked)} /> Save to knowledge base
            </label>
            <Button onClick={() => onAnswer(esc.id, text, saveKb)} disabled={!text.trim()} className="text-sm">Send answer →</Button>
          </div>
        </div>
      )}
    </div>
  );
}
