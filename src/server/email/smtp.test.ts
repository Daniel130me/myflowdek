import assert from 'node:assert';
import { describe, test } from 'node:test';
import { gmailSmtpConfiguration, normalizeSenderAddress } from './smtp';

describe('normalizeSenderAddress', () => {
  test('accepts plain and legacy display-name sender values', () => {
    assert.equal(normalizeSenderAddress('sender@example.com'), 'sender@example.com');
    assert.equal(
      normalizeSenderAddress('FlowDeck <sender@example.com>'),
      'sender@example.com',
    );
  });
});

describe('gmailSmtpConfiguration', () => {
  test('returns null when Gmail SMTP is not configured', () => {
    assert.equal(gmailSmtpConfiguration({}), null);
  });

  test('defaults to Gmail STARTTLS on port 587', () => {
    const configuration = gmailSmtpConfiguration({
      GMAIL_SMTP_USER: ' sender@example.com ',
      GMAIL_SMTP_APP_PASSWORD: 'abcd efgh ijkl mnop',
    });

    assert.deepEqual(configuration, {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'sender@example.com',
        pass: 'abcdefghijklmnop',
      },
    });
  });

  test('supports Gmail implicit TLS on port 465', () => {
    const configuration = gmailSmtpConfiguration({
      GMAIL_SMTP_USER: 'sender@example.com',
      GMAIL_SMTP_APP_PASSWORD: 'abcdefghijklmnop',
      GMAIL_SMTP_PORT: '465',
    });

    assert.equal(configuration?.port, 465);
    assert.equal(configuration?.secure, true);
  });

  test('rejects unsupported SMTP ports', () => {
    assert.throws(
      () => gmailSmtpConfiguration({
        GMAIL_SMTP_USER: 'sender@example.com',
        GMAIL_SMTP_APP_PASSWORD: 'abcdefghijklmnop',
        GMAIL_SMTP_PORT: '25',
      }),
      /must be either 465 or 587/,
    );
  });

  test('rejects a partial Gmail SMTP configuration', () => {
    assert.throws(
      () => gmailSmtpConfiguration({ GMAIL_SMTP_USER: 'sender@example.com' }),
      /partially configured/,
    );
    assert.throws(
      () => gmailSmtpConfiguration({ GMAIL_SMTP_APP_PASSWORD: 'abcdefghijklmnop' }),
      /partially configured/,
    );
  });
});
