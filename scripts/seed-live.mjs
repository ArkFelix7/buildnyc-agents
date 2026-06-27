// Throttled LIVE seed — generates REAL Claude personas + REAL agent-to-agent
// conversations, paced to stay under the AI Gateway per-minute rate limit (with
// exponential backoff on 429s). Run:
//   node --env-file=.env.local scripts/seed-live.mjs
import { createClient } from '@supabase/supabase-js';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL_SMART || 'claude-sonnet-4-6'; // sonnet for quality
if (!url || !key) { console.error('Missing Supabase env'); process.exit(1); }
if (!anthropicKey) { console.error('Missing ANTHROPIC_API_KEY'); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });
const anthropic = createAnthropic({ apiKey: anthropicKey });

const SPACING_MS = 800;        // gap between calls to respect RPM
const TURNS = 6;               // turns per conversation
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Call with backoff on rate-limit. Returns text, or null if it ultimately fails.
async function llm(system, prompt, label) {
  let delay = 4000;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const { text } = await generateText({ model: anthropic(MODEL), system, prompt, maxRetries: 0 });
      return text.trim();
    } catch (e) {
      const rate = (e?.name || '').includes('RateLimit') || /rate.?limit|429/i.test(e?.message || '');
      if (rate && attempt < 5) {
        console.log(`  · ${label}: rate-limited, backoff ${delay}ms (attempt ${attempt})`);
        await sleep(delay);
        delay *= 2;
        continue;
      }
      console.log(`  ✗ ${label}: ${e?.message?.slice(0, 80) || e}`);
      return null;
    }
  }
  return null;
}

const ROLE_LABELS = { dev: 'Dev', designer: 'Designer', ai_engineer: 'AI Engineer', pm: 'PM', other: 'Builder' };

function personaPrompt(p) {
  return `Write a first-person system prompt (an "instructions.md") for an AI networking agent that represents this hackathon attendee. The agent will chat with other attendees' agents to find collaborators.

Attendee:
- Name: ${p.name}
- Role: ${ROLE_LABELS[p.role] || 'Builder'}
- Skills: ${(p.skills || []).join(', ')}
- Looking for: ${p.looking_for}
- Bio: ${p.bio}

The prompt must tell the agent to be concise, warm, and direct; to perform in front of a live audience; and to quickly discover whether the other person is a good teammate match. Keep it under 180 words. Output only the prompt text.`;
}

async function main() {
  const { data: profiles, error } = await db
    .from('profiles').select('*').like('auth0_id', 'seed|%').order('created_at');
  if (error) throw error;
  console.log(`Found ${profiles.length} seed profiles.\n— Generating real personas —`);

  for (const p of profiles) {
    const text = await llm(
      'You are an expert prompt engineer.', personaPrompt(p), `persona ${p.name}`);
    if (text) {
      await db.from('profiles').update({ agent_instructions: text }).eq('id', p.id);
      console.log(`  ✓ ${p.name}`);
    }
    await sleep(SPACING_MS);
  }

  // Reload personas for conversation generation
  const byId = Object.fromEntries(
    (await db.from('profiles').select('*').like('auth0_id', 'seed|%')).data.map((p) => [p.id, p]));

  const { data: convos } = await db.from('conversations').select('*').order('match_score', { ascending: false });
  console.log(`\n— Generating real conversations (${convos.length}) —`);

  for (const c of convos) {
    const a = byId[c.profile_a], b = byId[c.profile_b];
    if (!a || !b) continue;
    await db.from('messages').delete().eq('conversation_id', c.id);
    console.log(`  ${a.name} <> ${b.name}`);
    const history = [];
    for (let turn = 0; turn < TURNS; turn++) {
      const speaker = turn % 2 === 0 ? a : b;
      const listener = turn % 2 === 0 ? b : a;
      const convoSoFar = history.length
        ? `Conversation so far:\n${history.join('\n')}\n\n`
        : '';
      const text = await llm(
        speaker.agent_instructions || `You are ${speaker.name}, a ${ROLE_LABELS[speaker.role]}.`,
        `${convoSoFar}You are ${speaker.name}, speaking with ${listener.name} (${ROLE_LABELS[listener.role]}, looking for: ${listener.looking_for}). Continue the conversation naturally. You are performing in front of a live audience — be concise, warm, and direct. Prioritize discovering whether you two should team up. Max 2 sentences. Reply with ONLY your message.`,
        `turn ${turn} (${speaker.name})`);
      const content = text || `[${speaker.name} is thinking...]`;
      await db.from('messages').insert({
        conversation_id: c.id, speaker: speaker.id, content, turn_number: turn,
      });
      history.push(`${speaker.name}: ${content}`);
      process.stdout.write(`    ✓ turn ${turn}\n`);
      await sleep(SPACING_MS);
    }
    await db.from('conversations').update({ status: 'active' }).eq('id', c.id);
  }
  console.log('\nDone. Real personas + conversations seeded.');
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
