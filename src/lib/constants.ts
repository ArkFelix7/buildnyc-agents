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
  ragMinSimilarity: 0.7, // below this → escalate to organizer
  ragTopChunks: 3,
} as const;
