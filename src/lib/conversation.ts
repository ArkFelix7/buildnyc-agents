import { generateText, type ModelMessage } from 'ai';
import { chatModel } from './ai';
import { TUNING } from './constants';
import { flags } from './env';
import { supabaseAdmin } from './supabase';
import { REALTIME, ROLE_LABELS, type Conversation, type Profile } from './types';

/**
 * Agent-to-agent conversation engine.
 *
 * Given a conversation row, loads both profiles and runs a turn-based dialogue
 * between their agents. Each turn is INSERTed into `messages`; that insert is the
 * primary Realtime broadcast (Mission Control subscribes via postgres_changes).
 * A best-effort channel broadcast is also sent as a belt-and-suspenders signal.
 *
 * NOTE: This plain async orchestration is the PRD fallback. It could later be
 * promoted to a Vercel Workflow (mark this function `'use workflow'` and wrap
 * each turn in a `'use step'` helper) for durable execution — but it ships and
 * works as-is today.
 */

// ─────────────────────────── module-level concurrency guard
const activeConversations = new Set<string>();

/** True if we're already at the concurrent-pair cap. */
export function atConcurrencyCap(): boolean {
  return activeConversations.size >= TUNING.maxConcurrentPairs;
}

export async function startConversation(conversationId: string): Promise<void> {
  const admin = supabaseAdmin();
  // MOCK mode (no DB) → nothing to orchestrate; seed data drives the UI.
  if (!admin) return;

  // Concurrency guard: don't exceed the configured cap, and never double-run.
  if (activeConversations.has(conversationId)) return;
  if (atConcurrencyCap()) return;
  activeConversations.add(conversationId);

  try {
    const conv = await loadConversation(conversationId);
    if (!conv) return;

    const [profileA, profileB] = await Promise.all([
      loadProfile(conv.profile_a),
      loadProfile(conv.profile_b),
    ]);
    if (!profileA || !profileB) return;

    await runTurns(conversationId, profileA, profileB);

    // Mark completed regardless of how the loop ended.
    await admin
      .from('conversations')
      .update({ status: 'completed' })
      .eq('id', conversationId);
  } finally {
    activeConversations.delete(conversationId);
  }
}

async function runTurns(
  conversationId: string,
  profileA: Profile,
  profileB: Profile,
): Promise<void> {
  // Chronological dialogue history shared across turns (as model messages).
  const history: ModelMessage[] = [];

  for (let t = 0; t < TUNING.conversationTurns; t++) {
    const speaker = t % 2 === 0 ? profileA : profileB;
    const listener = t % 2 === 0 ? profileB : profileA;

    let content: string;
    try {
      content = await speakTurn(speaker, listener, history);
    } catch {
      // One failed turn shouldn't abort the whole conversation — skip it.
      continue;
    }
    if (!content) continue;

    // Record this turn for the next speaker's context.
    history.push({ role: 'assistant', content: `${speaker.name}: ${content}` });

    await recordMessage(conversationId, speaker, content, t);

    // Early exit if both sides have clearly agreed to team up near the end.
    if (t >= 3 && signalsDone(content)) break;

    // Pacing so Mission Control reads like a live conversation.
    await sleep(TUNING.turnPacingMs);
  }
}

/** Generate one reply in the speaker's voice. */
async function speakTurn(
  speaker: Profile,
  listener: Profile,
  history: ModelMessage[],
): Promise<string> {
  const directive =
    `You are speaking with ${listener.name}. Continue naturally. Max 2 sentences. ` +
    'You are performing in front of a live audience — be concise, warm, direct; ' +
    'prioritize discovering whether you two should team up.';

  if (!flags.hasAIGateway) {
    // Deterministic offline reply (no LLM). Keeps live-ish UI when DB exists but no gateway.
    return offlineLine(speaker, listener, history.length);
  }

  const { text } = await generateText({
    model: chatModel('fast'),
    system: speaker.agent_instructions ?? fallbackPersona(speaker),
    messages: [...history, { role: 'user', content: directive }],
  });
  return text.trim();
}

/** Insert the turn (primary broadcast) + best-effort channel broadcast. */
async function recordMessage(
  conversationId: string,
  speaker: Profile,
  content: string,
  turn: number,
): Promise<void> {
  const admin = supabaseAdmin();
  if (!admin) return;

  // The table insert IS the broadcast — Mission Control listens on postgres_changes.
  await admin.from('messages').insert({
    conversation_id: conversationId,
    speaker: speaker.id,
    content,
    turn_number: turn,
  });

  // Belt-and-suspenders: also push a realtime broadcast event.
  try {
    const channel = admin.channel(REALTIME.conversationChannel(conversationId));
    await channel.send({
      type: 'broadcast',
      event: REALTIME.newMessage,
      payload: {
        conversation_id: conversationId,
        speaker_id: speaker.id,
        speaker_name: speaker.name,
        content,
        turn,
      },
    });
  } catch {
    // Broadcast is optional; the insert already drives the UI.
  }
}

// ─────────────────────────── loaders
async function loadConversation(id: string): Promise<Conversation | null> {
  const admin = supabaseAdmin();
  if (!admin) return null;
  const { data } = await admin
    .from('conversations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as Conversation | null) ?? null;
}

async function loadProfile(id: string): Promise<Profile | null> {
  const admin = supabaseAdmin();
  if (!admin) return null;
  const { data } = await admin.from('profiles').select('*').eq('id', id).maybeSingle();
  return (data as Profile | null) ?? null;
}

// ─────────────────────────── helpers
function fallbackPersona(p: Profile): string {
  const role = p.role ? ROLE_LABELS[p.role] : 'Builder';
  const skills = p.skills?.length ? p.skills.join(', ') : 'a range of skills';
  return (
    `You are ${p.name}, a ${role} at a hackathon. Skills: ${skills}. ` +
    `Looking for: ${p.looking_for ?? 'a great teammate'}. ` +
    'Be warm, concise (max 2 sentences), and probe for a strong collaboration fit.'
  );
}

/** Heuristic: did the speaker clearly propose teaming up? */
function signalsDone(content: string): boolean {
  const c = content.toLowerCase();
  return /\b(team up|teaming up|let'?s (do|build)|it'?s a (match|fit)|we'?re a (match|fit)|partner up|locked in|deal\b)/.test(
    c,
  );
}

/** Deterministic offline dialogue line keyed by turn index. */
function offlineLine(speaker: Profile, listener: Profile, turn: number): string {
  const skill = speaker.skills?.[0] ?? 'building';
  const lines = [
    `Hey ${listener.name}! ${speaker.name} here — I work in ${skill}. What are you hoping to build today?`,
    `Nice — that lines up with what I'm looking for: ${speaker.looking_for ?? 'a strong teammate'}.`,
    `I think our skills are complementary. Want to sketch a quick demo idea together?`,
    `Love it. I'm in — let's team up and ship something great.`,
  ];
  return lines[Math.min(turn, lines.length - 1)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
