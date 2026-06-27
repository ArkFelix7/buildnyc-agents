/** Domain types — mirror db/schema.sql + db/schema_v2.sql. Shared by every slice. */

export type Role = 'dev' | 'designer' | 'ai_engineer' | 'pm' | 'other';

export const ROLE_LABELS: Record<Role, string> = {
  dev: 'Dev',
  designer: 'Designer',
  ai_engineer: 'AI Engineer',
  pm: 'PM',
  other: 'Other',
};

/** An event — the top-level tenant. Slug-routed at /{slug}. */
export interface Event {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  organizer_auth0_id: string;
  organizer_email: string;
  admin_passcode: string | null;
  theme_color: string | null;
  matching_enabled: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  event_id: string | null;
  auth0_id: string;
  name: string;
  email: string;
  role: Role | null;
  skills: string[] | null;
  looking_for: string | null;
  bio: string | null;
  agent_instructions: string | null;
  avatar_style: string | null; // see AVATAR_STYLES
  avatar_seed: string | null; // deterministic render seed
  wants_matching: boolean;
  open_to_connect: boolean;
  avatar_url?: string | null; // legacy; unused (generated avatars now)
  created_at: string;
}

export interface Conversation {
  id: string;
  event_id: string | null;
  profile_a: string;
  profile_b: string;
  match_score: number | null;
  match_reason: string | null;
  summary: string | null;
  status: 'active' | 'completed';
  created_at: string;
}

/** Minimal participant shape for cards/presence (includes generated-avatar fields). */
export type ProfileBrief = Pick<
  Profile,
  'id' | 'name' | 'role' | 'avatar_style' | 'avatar_seed'
>;

export interface Message {
  id: string;
  conversation_id: string;
  speaker: string; // profile id
  content: string;
  turn_number: number;
  created_at: string;
}

export interface Match {
  id: string;
  event_id: string | null;
  from_profile: string;
  to_profile: string;
  mutual: boolean;
  match_code: string | null; // shared 'AMBER-FALCON' on mutual match
  email_sent: boolean;
  created_at: string;
}

export interface KnowledgeChunk {
  id: string;
  content: string;
  source: string | null;
  created_at: string;
}

/** Zod-validated shape returned by Claude when scoring a match. */
export interface MatchScore {
  match_score: number; // 0..1
  reason: string; // <= 15 words
}

/** A conversation card as rendered on Mission Control (joined view). */
export interface ConversationCard {
  conversation: Conversation;
  a: ProfileBrief;
  b: ProfileBrief;
  messages: Message[];
}

/** Realtime broadcast payload for a new conversation turn. */
export interface NewMessageEvent {
  conversation_id: string;
  speaker_id: string;
  speaker_name: string;
  content: string;
  turn: number;
}

export const REALTIME = {
  conversationChannel: (id: string) => `conversation:${id}`,
  globalChannel: 'mission-control',
  presenceChannel: 'presence:lobby',
  newMessage: 'new_message',
  conversationStarted: 'conversation_started',
  matchMade: 'match_made',
} as const;
