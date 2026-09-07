/**
 * Tests for the single currency default (audit H-20): engagements used to
 * default to USD while funding accepted NGN only, so default-currency
 * engagements could never be funded. Creation now validates the currency
 * up front and everything reads one constant.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createEngagementSchema } from './engagement.schemas';
import { DEFAULT_CURRENCY, PAYMENT_SUPPORTED_CURRENCIES } from '@/lib/currency';

const MINIMAL_ENGAGEMENT = {
  taskId: 't1',
  professionalProfileId: 'p1',
  title: 'Build the landing page',
  scopeDescription: 'A sufficiently detailed scope of work for validation.',
  agreedPrice: 50000,
};

describe('platform currency defaults (audit H-20)', () => {
  test('engagements default to the platform currency (NGN at launch)', () => {
    const parsed = createEngagementSchema.parse(MINIMAL_ENGAGEMENT);
    assert.equal(parsed.currency, DEFAULT_CURRENCY);
    assert.equal(parsed.currency, 'NGN');
  });

  test('non-fundable currencies are rejected at creation with a clear error', () => {
    const result = createEngagementSchema.safeParse({ ...MINIMAL_ENGAGEMENT, currency: 'USD' });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.match(result.error.issues[0]?.message ?? '', /NGN/);
    }
  });

  test('creation validation and the payment gate share one supported list', () => {
    assert.deepEqual([...PAYMENT_SUPPORTED_CURRENCIES], ['NGN']);
  });
});
