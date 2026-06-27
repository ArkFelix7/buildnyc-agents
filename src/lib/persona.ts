import { generateText } from 'ai';
import { chatModel } from './ai';
import { flags } from './env';
import { supabaseAdmin } from './supabase';
import { ROLE_LABELS, type Profile } from './types';

/**
 * Generate an `instructions.md`-style system prompt that makes an agent embody a
 * given builder (their skills, goals, what they're looking for, personality).
 *
 * - LIVE  (hasAIGateway): one fast-model call writes a rich persona prompt.
 * - MOCK  (no gateway key): returns a deterministic template — no LLM call.
 *
 * The result is persisted to `profiles.agent_instructions` when a real Supabase
 * admin client is available, then returned to the caller.
 */
export async function generatePersona(profile: Profile): Promise<string> {
  const instructions = flags.hasAIGateway
    ? await generateWithLLM(profile)
    : deterministicPersona(profile);

  await persist(profile.id, instructions);
  return instructions;
}

async function generateWithLLM(profile: Profile): Promise<string> {
  try {
    const { text } = await generateText({
      model: chatModel('fast'),
      system:
        'You write concise system prompts ("instructions.md") that make an AI agent ' +
        'role-play a real person at a hackathon. The agent will network on the ' +
        "person's behalf: chatting with other builders' agents to find collaborators. " +
        'Write in second person ("You are ..."). Capture their skills, goals, what ' +
        'they want in a teammate, and a believable personality/voice. Keep it tight ' +
        '(120-180 words), warm, and action-oriented. Output only the instructions.',
      prompt: profileBrief(profile),
    });
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : deterministicPersona(profile);
  } catch {
    // Never let a model hiccup block onboarding — fall back to the template.
    return deterministicPersona(profile);
  }
}

/** Compact, human-readable dump of a profile for prompting. */
function profileBrief(p: Profile): string {
  const role = p.role ? ROLE_LABELS[p.role] : 'Builder';
  const skills = p.skills?.length ? p.skills.join(', ') : 'unspecified';
  return [
    `Name: ${p.name}`,
    `Role: ${role}`,
    `Skills: ${skills}`,
    `Looking for: ${p.looking_for ?? 'open to collaboration'}`,
    `Bio: ${p.bio ?? 'n/a'}`,
  ].join('\n');
}

/** Deterministic, LLM-free persona used in MOCK mode (and as a safety fallback). */
function deterministicPersona(p: Profile): string {
  const role = p.role ? ROLE_LABELS[p.role] : 'Builder';
  const skills = p.skills?.length ? p.skills.join(', ') : 'a range of skills';
  const lookingFor = p.looking_for ?? 'a great teammate to build something with';
  const bio = p.bio ?? `A ${role.toLowerCase()} at the hackathon.`;

  return [
    `You are ${p.name}, a ${role} networking at a live hackathon.`,
    '',
    `About you: ${bio}`,
    `Your skills: ${skills}.`,
    `You are looking for: ${lookingFor}.`,
    '',
    'How you talk to other builders:',
    "- Be warm, direct, and concise — you're performing for a live audience.",
    '- Lead with what you bring and quickly probe whether your skills complement theirs.',
    '- Ask sharp questions about what they want to build today.',
    '- If it feels like a strong fit, enthusiastically suggest teaming up.',
    '- Keep every message to at most two sentences. No filler.',
  ].join('\n');
}

/** Persist instructions to Supabase if a real admin client exists (no-op in MOCK). */
async function persist(profileId: string, instructions: string): Promise<void> {
  const admin = supabaseAdmin();
  if (!admin) return;
  try {
    await admin
      .from('profiles')
      .update({ agent_instructions: instructions })
      .eq('id', profileId);
  } catch {
    // Persistence is best-effort; the caller still gets the instructions string.
  }
}
