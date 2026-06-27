'use client';

import * as React from 'react';
import { Sparkles, Send } from 'lucide-react';
import { Button, Spinner } from '@/components/ui';

/**
 * ConciergePanel — chat UI for the Event Concierge (RAG + escalation).
 *
 * Talks to POST /api/concierge, which returns a PLAIN TEXT STREAM (text/plain).
 * We read the raw bytes off the fetch ReadableStream and append them to the
 * latest concierge bubble as they arrive. Two response headers drive UI state:
 *   - `X-Concierge-Escalated: 'true'|'false'` → low-confidence escalation state
 *   - `X-Concierge-Source` → citation shown beneath confident answers
 */

interface ChatMessage {
  id: string;
  role: 'user' | 'concierge';
  content: string;
  source?: string | null;
  escalated?: boolean;
  pending?: boolean; // streaming in progress
}

const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'concierge',
  content:
    "Hi! I'm the BuildNYC concierge. Ask me anything about the hackathon — schedule, " +
    "prizes, WiFi, judging, food. If I don't know, I'll ping an organizer for you.",
};

const SUGGESTIONS = ['What are the prizes?', 'When is lunch?', "What's the WiFi password?"];

export default function ConciergePanel({
  profileId,
  eventSlug,
}: { profileId?: string; eventSlug?: string } = {}) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const feedRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: q };
    const botId = `c-${Date.now()}`;
    const botMsg: ChatMessage = { id: botId, role: 'concierge', content: '', pending: true };

    setMessages((m) => [...m, userMsg, botMsg]);
    setInput('');
    setBusy(true);

    try {
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, profileId, eventSlug }),
      });

      const escalated = res.headers.get('X-Concierge-Escalated') === 'true';
      const source = res.headers.get('X-Concierge-Source');

      setMessages((m) =>
        m.map((msg) =>
          msg.id === botId ? { ...msg, escalated, source: source ?? null } : msg,
        ),
      );

      if (!res.ok || !res.body) {
        throw new Error(`Concierge error (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const text = acc;
        setMessages((m) =>
          m.map((msg) => (msg.id === botId ? { ...msg, content: text } : msg)),
        );
      }
      acc += decoder.decode();
      setMessages((m) =>
        m.map((msg) =>
          msg.id === botId ? { ...msg, content: acc, pending: false } : msg,
        ),
      );
    } catch {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === botId
            ? {
                ...msg,
                content:
                  "Sorry — I hit a snag reaching the concierge. Please try again in a moment.",
                pending: false,
              }
            : msg,
        ),
      );
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/15 text-brand ring-1 ring-brand/30">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">Event Concierge</p>
          <p className="text-xs text-muted">Ask anything about BuildNYC</p>
        </div>
      </div>

      {/* Message feed */}
      <div ref={feedRef} className="feed-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
      </div>

      {/* Suggestion chips */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setInput(s);
                inputRef.current?.focus();
              }}
              className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-foreground ring-1 ring-border transition-colors hover:bg-brand/15 hover:text-brand hover:ring-brand/30"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-border p-3">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the concierge…"
          disabled={busy}
          className="flex-1 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-brand/50 disabled:opacity-60"
        />
        <Button type="submit" disabled={busy || !input.trim()} className="px-3">
          {busy ? <Spinner /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="animate-in flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-3.5 py-2 text-sm text-white">
          {msg.content}
        </div>
      </div>
    );
  }

  const showSpinner = msg.pending && msg.content.length === 0;

  return (
    <div className="animate-in flex justify-start">
      <div className="max-w-[85%] space-y-1.5">
        <div
          className={
            'rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm ring-1 ' +
            (msg.escalated
              ? 'bg-warning/10 text-foreground ring-warning/30'
              : 'glass text-foreground ring-border')
          }
        >
          {showSpinner ? (
            <span className="flex items-center gap-2 text-muted">
              <Spinner className="h-3.5 w-3.5" />
              {msg.escalated ? 'Notifying the organizer…' : 'Thinking…'}
            </span>
          ) : (
            <span className="whitespace-pre-wrap">{msg.content}</span>
          )}
          {msg.escalated && msg.pending && msg.content.length > 0 && (
            <span className="ml-1 inline-flex align-middle">
              <Spinner className="h-3 w-3 text-warning" />
            </span>
          )}
        </div>
        {!msg.escalated && msg.source && !msg.pending && (
          <p className="px-1 text-[11px] text-muted">Based on: {stripSourcePrefix(msg.source)}</p>
        )}
      </div>
    </div>
  );
}

/** The header already reads e.g. "BuildNYC knowledge base (buildnyc26-notion)". */
function stripSourcePrefix(source: string): string {
  return source;
}
