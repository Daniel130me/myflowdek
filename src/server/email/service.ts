import nodemailer, { type Transporter } from 'nodemailer';
import { EMAIL_FROM, EMAIL_FROM_NAME } from './constants';
import { gmailSmtpConfiguration } from './smtp';

/**
 * Transactional email service backed by Gmail SMTP.
 *
 * Callers depend only on sendEmail and the purpose-specific helpers below, so
 * Gmail can later be replaced by Resend without changing authentication,
 * invitation, or workspace services.
 */
let transporter: Transporter | null = null;

function gmailTransport(): Transporter | null {
  const configuration = gmailSmtpConfiguration();
  if (!configuration) return null;
  transporter ??= nodemailer.createTransport(configuration);
  return transporter;
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
 * Send an email. Returns true on success and false on provider failure.
 *
 * Production fails closed when Gmail SMTP credentials are absent. Development
 * logs only envelope metadata so verification and reset tokens never reach
 * logs. SMTP delivery errors are reported without exposing credentials.
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  const emailTransport = gmailTransport();

  if (!emailTransport) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Transactional email provider (Gmail SMTP) is not configured. '
        + 'Set GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD in production.',
      );
    }

    // Development fallback intentionally excludes token-bearing message bodies.
    console.log('[email] (dev mode — Gmail SMTP not configured)');
    console.log('  To:      ', params.to);
    console.log('  From:    ', EMAIL_FROM_NAME + ' <' + EMAIL_FROM + '>');
    console.log('  Subject: ', params.subject);
    return true;
  }

  try {
    await emailTransport.sendMail({
      to: params.to,
      from: { address: EMAIL_FROM, name: EMAIL_FROM_NAME },
      subject: params.subject,
      text: params.text,
      html: params.html ?? params.text,
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown SMTP error';
    console.error('[email] Gmail SMTP send failed:', message);
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
