import sgMail from '@sendgrid/mail';
import { EMAIL_FROM, EMAIL_FROM_NAME } from './constants';

/**
 * Email service — sends transactional emails via Twilio SendGrid.
 *
 * The sender address (kosokodaniel@gmail.com) is configured in SendGrid as a
 * verified sender. The API key is read from the SENDGRID_API_KEY env var.
 *
 * If SendGrid is not configured (no API key), emails are logged to the
 * console instead of being sent — this keeps development flowing without
 * a SendGrid account.
 */

let initialized = false;

/** Initialise the SendGrid client once (idempotent). */
function ensureInitialized(): boolean {
  if (initialized) return true;
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return false;
  sgMail.setApiKey(apiKey);
  initialized = true;
  return true;
}

export interface EmailParams {
  to: string;
  subject: string;
  /** Plain-text body. */
  text: string;
  /** Optional HTML body. If omitted, the text version is sent. */
  html?: string;
}

/**
 * Send an email. Returns true on success, false on failure.
 *
 * Behavior:
 *   - Production + no SendGrid API key: THROWS — transactional emails
 *     (password reset, verification, invitations) must not be silently
 *     logged in production, as that would leak security tokens into logs.
 *   - Development + no SendGrid API key: logs the email to the console
 *     (minus sensitive tokens — the full body is NOT logged; only To,
 *     From, Subject, and a truncated preview).
 *   - SendGrid configured: sends via the API.
 *
 * Never throws for SendGrid API errors (returns false) — but DOES throw
 * if production email is not configured, as that's a deployment blocker.
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  const isConfigured = ensureInitialized();

  if (!isConfigured) {
    if (process.env.NODE_ENV === 'production') {
      // CRITICAL: do not log security tokens in production.
      throw new Error(
        'Transactional email provider (SendGrid) is not configured. ' +
        'Set SENDGRID_API_KEY in production environment.'
      );
    }
    // Development mode: log a safe preview (no full token-bearing body).
    console.log('[email] (dev mode — SendGrid not configured)');
    console.log('  To:      ', params.to);
    console.log('  From:    ', `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`);
    console.log('  Subject: ', params.subject);
    // Log only the first 80 chars — enough to identify the email type
    // without exposing the full token link.
    console.log('  Preview: ', params.text.slice(0, 80));
    return true;
  }

  try {
    await sgMail.send({
      to: params.to,
      from: { email: EMAIL_FROM, name: EMAIL_FROM_NAME },
      subject: params.subject,
      text: params.text,
      html: params.html ?? params.text,
    });
    return true;
  } catch (err) {
    console.error('[email] SendGrid send failed:', err);
    return false;
  }
}

/**
 * Send a verification email with a token link.
 *
 * The link points to the frontend verification page, which will POST the
 * token to /api/auth/verify-email.
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  baseUrl: string,
): Promise<boolean> {
  const link = `${baseUrl}/verify-email?token=${token}`;
  return sendEmail({
    to: email,
    subject: 'Verify your FlowDeck email',
    text: `Welcome to FlowDeck!\n\nPlease verify your email address by clicking the link below:\n\n${link}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #FE8029;">Welcome to FlowDeck!</h2>
        <p>Please verify your email address by clicking the button below:</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background: #FE8029; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Verify Email</a>
        </p>
        <p style="color: #6B7280; font-size: 13px;">This link expires in 24 hours.</p>
        <p style="color: #6B7280; font-size: 13px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
  });
}

/**
 * Send a password reset email with a token link.
 *
 * The link points to the frontend reset page, which will POST the token +
 * new password to /api/auth/reset-password.
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  baseUrl: string,
): Promise<boolean> {
  const link = `${baseUrl}/reset-password?token=${token}`;
  return sendEmail({
    to: email,
    subject: 'Reset your FlowDeck password',
    text: `We received a request to reset your FlowDeck password.\n\nClick the link below to set a new password:\n\n${link}\n\nThis link expires in 1 hour.\n\nIf you didn't request a password reset, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #FE8029;">Reset your password</h2>
        <p>We received a request to reset your FlowDeck password.</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background: #FE8029; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Reset Password</a>
        </p>
        <p style="color: #6B7280; font-size: 13px;">This link expires in 1 hour.</p>
        <p style="color: #6B7280; font-size: 13px;">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  });
}

/**
 * Send a workspace invitation email with a token link.
 *
 * The link points to the frontend invitation accept page, which will
 * POST the token to /api/invitations/:token/accept.
 */
export async function sendInvitationEmail(
  email: string,
  token: string,
  workspaceName: string,
  baseUrl: string,
): Promise<boolean> {
  const link = `${baseUrl}/invitations/${token}`;
  return sendEmail({
    to: email,
    subject: `You're invited to join "${workspaceName}" on FlowDeck`,
    text: `You've been invited to join "${workspaceName}" on FlowDeck.\n\nClick the link below to accept the invitation:\n\n${link}\n\nThis invitation expires in 24 hours.\n\nIf you weren't expecting this invitation, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #FE8029;">You're invited to FlowDeck!</h2>
        <p>You've been invited to join <strong>${workspaceName}</strong> on FlowDeck.</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background: #FE8029; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">Accept Invitation</a>
        </p>
        <p style="color: #6B7280; font-size: 13px;">This invitation expires in 24 hours.</p>
        <p style="color: #6B7280; font-size: 13px;">If you weren't expecting this invitation, you can safely ignore this email.</p>
      </div>
    `,
  });
}
