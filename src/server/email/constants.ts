import { normalizeSenderAddress } from './smtp';

/**
 * Email-related constants.
 *
 * Centralised so email logic never hard-codes sender addresses, subjects, or
 * TTLs.
 */

/**
 * Sender address resolution (audit Table 7.1: the source used to bake in a
 * personal Gmail fallback, so a misconfigured production silently mailed
 * customers from an unrelated personal account).
 *
 * Resolution: EMAIL_FROM, then GMAIL_SMTP_USER. Production with neither
 * fails at boot with an actionable message instead of sending from the
 * wrong identity. Development falls back to a clearly-fake local address.
 */
export const EMAIL_FROM = normalizeSenderAddress(
  process.env.EMAIL_FROM
    ?? process.env.GMAIL_SMTP_USER
    ?? devFallback('EMAIL_FROM or GMAIL_SMTP_USER must be set in production — transactional email would otherwise send from an unconfigured address.'),
);

/** The display name shown next to the sender address. */
export const EMAIL_FROM_NAME = 'FlowDeck';

/**
 * Public origin used to build invitation / verification / reset links
 * (audit Table 7.1: a localhost fallback here emailed dead links when a
 * production deploy omitted the variable).
 *
 * Production requires APP_BASE_URL or NEXTAUTH_URL — a missing value fails
 * at boot rather than emailing links nobody can open.
 */
export const APP_BASE_URL = process.env.APP_BASE_URL
  ?? process.env.NEXTAUTH_URL
  ?? devFallback('APP_BASE_URL (or NEXTAUTH_URL) must be set in production — emailed links would point at localhost.');

function devFallback(message: string): string {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`[email] ${message}`);
  }
  return 'http://localhost:3000';
}

/** Token TTLs in hours. */
export const VERIFICATION_TOKEN_TTL_HOURS = 24;
export const PASSWORD_RESET_TOKEN_TTL_HOURS = 1;

/** Token types stored in the VerificationToken.type column. */
export const TOKEN_TYPES = {
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
} as const;

/** Email subject lines. */
export const EMAIL_SUBJECTS = {
  EMAIL_VERIFICATION: 'Verify your FlowDeck email',
  PASSWORD_RESET: 'Reset your FlowDeck password',
} as const;

/** Length of the generated token (URL-safe hex). */
export const TOKEN_LENGTH = 48;

/**
 * Brand accent used inside email HTML bodies.
 *
 * Emails cannot read the app's design tokens (standalone static markup), so
 * this mirrors COLORS.accent. Value chosen for WCAG AA: 5.18:1 with white
 * button text and 5.18:1 as text on the white email background. The vivid
 * marketing orange #FE8029 measured 2.52:1 and failed AA everywhere.
 */
export const EMAIL_BRAND_COLOR = '#C2410C';
