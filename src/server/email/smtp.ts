const GMAIL_SMTP_HOST = 'smtp.gmail.com';
const GMAIL_SMTP_PORT = 465;

export interface GmailSmtpConfiguration {
  host: string;
  port: number;
  secure: true;
  auth: {
    user: string;
    pass: string;
  };
}

interface GmailSmtpEnvironment {
  GMAIL_SMTP_USER?: string;
  GMAIL_SMTP_APP_PASSWORD?: string;
}

/** Accept both a plain address and the legacy "Name <address>" format. */
export function normalizeSenderAddress(value: string): string {
  const bracketedAddress = value.match(/<([^<>]+)>/)?.[1];
  return (bracketedAddress ?? value).trim();
}

/**
 * Build Gmail's SMTP configuration from environment variables.
 *
 * Google presents app passwords in grouped blocks, so whitespace is removed
 * before authentication. A partial configuration is rejected early instead of
 * failing later during a security-sensitive email flow.
 */
export function gmailSmtpConfiguration(
  environment: GmailSmtpEnvironment = process.env as GmailSmtpEnvironment,
): GmailSmtpConfiguration | null {
  const user = environment.GMAIL_SMTP_USER?.trim();
  const password = environment.GMAIL_SMTP_APP_PASSWORD?.replace(/\s/g, '');

  if (!user && !password) return null;
  if (!user || !password) {
    throw new Error(
      'Gmail SMTP is partially configured. Set both GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD.',
    );
  }

  return {
    host: GMAIL_SMTP_HOST,
    port: GMAIL_SMTP_PORT,
    secure: true,
    auth: { user, pass: password },
  };
}