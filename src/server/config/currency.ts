/**
 * Single source of truth for the platform's default currency (audit H-20).
 *
 * Engagements defaulted to USD while the payment launch only funds NGN, and
 * .env declared DEFAULT_CURRENCY which nothing read — a client accepting the
 * default could never fund. One constant, one env var, read everywhere.
 */
export const DEFAULT_CURRENCY = (process.env.DEFAULT_CURRENCY || 'NGN').toUpperCase();

/** Currencies the payment launch supports (Paystack NGN-only at launch). */
export const SUPPORTED_PAYMENT_CURRENCIES = ['NGN'] as const;
