/**
 * Auth-related constants for FlowDeck.
 *
 * Centralised so the same value is never hard-coded in two places and every
 * "magic number/string" has a name that explains its purpose. Import from
 * here instead of inlining literals.
 */

/** bcrypt cost factor. Higher = slower but more secure; 10 is the documented
 *  baseline and keeps auth latency under ~100ms on typical hardware. */
export const BCRYPT_ROUNDS = 10;

/** Job title assigned to a newly registered user. This is a DISPLAY-ONLY
 *  field (e.g. shown on a profile badge). Authorization NEVER derives from
 *  this — it comes from WorkspaceMember.role / ProjectMember.role. */
export const DEFAULT_JOB_TITLE = 'Project Manager';

/** Avatar colour assigned at registration (picked at random from this palette).
 *  Mirrors the team-member palette in `features/flowdeck/model/data.ts` so a
 *  new user visually fits in with seeded users. */
export const AVATAR_COLORS = [
  '#FE8029',
  '#0891B2',
  '#16A34A',
  '#D97706',
  '#DC2626',
  '#7C3AED',
  '#DB2777',
] as const;

/** Fallback avatar colour when a session has none (e.g. legacy users). */
export const DEFAULT_AVATAR_COLOR = '#FE8029';

/** Fallback job title when a session has none set. */
export const DEFAULT_JOB_TITLE_FALLBACK = 'Project Manager';

/** NextAuth session strategy. JWT keeps the app stateless (no session table). */
export const SESSION_STRATEGY = 'jwt' as const;

/** Route NextAuth redirects to when a user must sign in. */
export const LOGIN_PATH = '/login';

/* ----------------------------- input rules ------------------------------ */

/** Minimum password length enforced at registration. */
export const PASSWORD_MIN_LENGTH = 6;

/** Maximum display-name length enforced at registration. */
export const NAME_MAX_LENGTH = 100;

/* --------------------------- localStorage keys -------------------------- */

/** Key under which the one-time onboarding payload is persisted client-side. */
export const ONBOARDING_STORAGE_KEY = 'flowdeck_onboarding';

/* ------------------------------- demo ----------------------------------- */

/**
 * Credentials for the "Try demo workspace" button.
 *
 * The demo account is created by `prisma/seed.ts` (Wale Johnson, the project
 * manager). Keeping the credentials here means the seed script and the UI
 * button can never drift out of sync.
 */
export const DEMO_CREDENTIALS = {
  email: 'wale.johnson@flowdeck.io',
  password: 'flowdeck123',
} as const;

/** Password assigned to every seeded demo user (so any of them can sign in). */
export const DEMO_PASSWORD = DEMO_CREDENTIALS.password;

/** Domain used for seeded demo emails (e.g. `wale.johnson@flowdeck.io`). */
export const DEMO_EMAIL_DOMAIN = 'flowdeck.io';
