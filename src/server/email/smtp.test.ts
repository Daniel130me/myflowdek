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

  test('builds the secure Gmail SMTP configuration', () => {
    const configuration = gmailSmtpConfiguration({
      GMAIL_SMTP_USER: ' sender@example.com ',
      GMAIL_SMTP_APP_PASSWORD: 'abcd efgh ijkl mnop',
    });

    assert.deepEqual(configuration, {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'sender@example.com',
        pass: 'abcdefghijklmnop',
      },
    });
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