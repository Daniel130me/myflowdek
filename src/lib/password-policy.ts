import { z } from 'zod';

/**
 * Password policy for FlowDeck.
 *
 * Enforces a minimum length plus at least three of four character classes
 * (lowercase, uppercase, digit, symbol). This balances security with
 * usability — strict "all four classes" rules tend to produce passwords
 * users write down.
 */

export const PASSWORD_MIN_LENGTH = 8;

/** Character-class checks used by the policy. */
const hasLower = /[a-z]/;
const hasUpper = /[A-Z]/;
const hasDigit = /[0-9]/;
const hasSymbol = /[^a-zA-Z0-9]/;

/** Count how many of the four character classes are present. */
function characterClassCount(pw: string): number {
  let n = 0;
  if (hasLower.test(pw)) n++;
  if (hasUpper.test(pw)) n++;
  if (hasDigit.test(pw)) n++;
  if (hasSymbol.test(pw)) n++;
  return n;
}

/** Minimum number of character classes that must be present. */
const MIN_CLASSES = 3;

/**
 * Zod string schema that validates a password against the policy.
 * Use inside the registration/reset schemas.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .refine((pw) => characterClassCount(pw) >= MIN_CLASSES, {
    message: `Password must contain at least ${MIN_CLASSES} of: lowercase, uppercase, digit, symbol`,
  });

/** Human-readable description of the policy (for UI hints). */
export const PASSWORD_POLICY_HINT =
  `Use ${PASSWORD_MIN_LENGTH}+ characters with at least ${MIN_CLASSES} of: lowercase, uppercase, digit, symbol.`;
