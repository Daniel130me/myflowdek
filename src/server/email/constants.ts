import { normalizeSenderAddress } from './smtp';

/**
 * Email-related constants.
 *
 * Centralised so email logic never hard-codes sender addresses, subjects, or
 * TTLs.
 */

/** Gmail normally requires the From address to match the authenticated user. */
export const EMAIL_FROM = normalizeSenderAddress(
  process.env.EMAIL_FROM
    ?? process.env.GMAIL_SMTP_USER
    ?? 'kosokodaniel@gmail.com',
);

/** The display name shown next to the sender address. */
export const EMAIL_FROM_NAME = 'FlowDeck';

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

/** Base URL for constructing verification/reset links. Falls back to
 *  NEXTAUTH_URL if the dedicated env var isn't set. */
export const APP_BASE_URL = process.env.APP_BASE_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

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
