const GMAIL_SMTP_HOST = 'smtp.gmail.com';
const DEFAULT_GMAIL_SMTP_PORT = 587;
const SUPPORTED_GMAIL_SMTP_PORTS = new Set([465, 587]);

export interface GmailSmtpConfiguration {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface GmailSmtpEnvironment {
  GMAIL_SMTP_USER?: string;
  GMAIL_SMTP_APP_PASSWORD?: string;
  GMAIL_SMTP_PORT?: string;
}

/** Accept both a plain address and the legacy "Name <address>" format. */
export function normalizeSenderAddress(value: string): string {
  const bracketedAddress = value.match(/<([^<>]+)>/)?.[1];
  return (bracketedAddress ?? value).trim();
}

/** Parse the configured Gmail port and reject accidental or unsafe values. */
function gmailSmtpPort(value?: string): number {
  if (!value?.trim()) return DEFAULT_GMAIL_SMTP_PORT;

  const port = Number(value);
  if (!Number.isInteger(port) || !SUPPORTED_GMAIL_SMTP_PORTS.has(port)) {
    throw new Error('GMAIL_SMTP_PORT must be either 465 or 587.');
  }
  return port;
}

/**
 * Build Gmail's SMTP configuration from environment variables.
 *
 * Port 587 with STARTTLS is the default because it is more commonly available
 * on hosted and local networks. Port 465 remains available for implicit TLS.
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

  const port = gmailSmtpPort(environment.GMAIL_SMTP_PORT);
  return {
    host: GMAIL_SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  };
}
