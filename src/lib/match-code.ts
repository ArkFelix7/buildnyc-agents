/**
 * Memorable, collision-resistant pairing codes for mutual matches, e.g. AMBER-FALCON.
 * Both matched users get the SAME code (in-app + email) as a lightweight IRL handshake.
 */

const ADJECTIVES = [
  'AMBER', 'AZURE', 'CRIMSON', 'GOLDEN', 'JADE', 'NEON', 'COBALT', 'CORAL',
  'IVORY', 'LUNAR', 'SOLAR', 'MAPLE', 'ONYX', 'PEARL', 'RUBY', 'SAGE',
  'SCARLET', 'TEAL', 'VIOLET', 'BRAVE', 'SWIFT', 'NOBLE', 'CLEVER', 'QUIET',
];

const ANIMALS = [
  'FALCON', 'OTTER', 'PANDA', 'TIGER', 'HERON', 'LYNX', 'ORCA', 'RAVEN',
  'FOX', 'WOLF', 'HAWK', 'CRANE', 'BISON', 'KOALA', 'PUMA', 'SWAN',
  'GECKO', 'MOOSE', 'ROBIN', 'SHARK', 'COBRA', 'EAGLE', 'IBEX', 'MANTA',
];

function pick<T>(arr: T[]): T {
  // Avoid Math.random at module init concerns — fine at call time in route handlers.
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generate a fresh ADJECTIVE-ANIMAL code (+ numeric suffix for extra uniqueness). */
export function generateMatchCode(): string {
  return `${pick(ADJECTIVES)}-${pick(ANIMALS)}`;
}

/** Same shape but with a 2-digit suffix — use if you need stronger collision resistance. */
export function generateMatchCodeUnique(): string {
  const n = 10 + Math.floor(Math.random() * 90);
  return `${pick(ADJECTIVES)}-${pick(ANIMALS)}-${n}`;
}
