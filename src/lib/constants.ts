/** Hackathon-specific configuration. v1 is hardcoded to buildnyc26 (see PRD §4). */

export const EVENT = {
  slug: 'buildnyc26',
  name: 'Built in NYC',
  tagline: 'Your AI agent networks the room. You just show up.',
  subtitle:
    'Sign in and your agent starts finding your perfect hackathon collaborators in real time.',
} as const;

/** Matching / conversation tuning knobs. */
export const TUNING = {
  topCandidates: 5, // pgvector returns top-N candidates to score
  topMatches: 3, // store/converse top-N scored matches
  maxConcurrentPairs: 5, // cap concurrent agent conversations (cost control)
  conversationTurns: 12, // turns per agent-to-agent conversation
  turnPacingMs: 800, // delay between turns for Mission Control readability
  autoMatchThreshold: 0.85, // P1-01: auto-fire intro above this score
  // Below this cosine similarity → escalate to organizer. Calibrated for real
  // text-embedding-3-small scores (a question vs a chunk lands ~0.35–0.5; the
  // keyword-mock fallback inflates higher). 0.7 was too high → escalated everything.
  ragMinSimilarity: 0.3,
  ragTopChunks: 3,
} as const;
