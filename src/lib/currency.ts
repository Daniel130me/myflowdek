/**
 * Single source of truth for platform money defaults.
 *
 * Audit H-20: three features declared three different defaults (engagements
 * USD, budgets USD, payments NGN-only) so an engagement created with the
 * default currency could never be funded. Everything now reads this one
 * value, which follows the environment's DEFAULT_CURRENCY (see .env.example)
 * and falls back to NGN — the currency the Paystack launch settles in.
 */

/** Currencies the payment launch can process. NGN-only for now (Paystack). */
export const PAYMENT_SUPPORTED_CURRENCIES = ['NGN'] as const;

/** The default currency for new money-bearing records. */
export const DEFAULT_CURRENCY: string = process.env.DEFAULT_CURRENCY ?? 'NGN';

/**
 * Whether a currency can actually be funded through the payment launch.
 * Kept next to the default so schema validation and payment checks cannot
 * drift apart again.
 */
export function isPaymentSupportedCurrency(currency: string): boolean {
  return (PAYMENT_SUPPORTED_CURRENCIES as readonly string[]).includes(currency);
}
