/**
 * Regression test for audit finding C-07: the brand orange used on every
 * primary CTA failed WCAG AA (2.52:1 for white text on #FE8029).
 *
 * These tests pin the contrast of the accent tokens themselves, so no future
 * token edit can silently reintroduce unreadable CTAs. The math is the
 * standard WCAG 2.x relative-luminance formula.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { COLORS, LAYOUT } from './constants';
import { DARK_COLORS } from '../hooks/useTheme';

/** Relative luminance per WCAG 2.x (https://www.w3.org/TR/WCAG22/#dfn-relative-luminance). */
function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Contrast ratio per WCAG 2.x, scaled 1 (same) to 21 (black/white). */
function contrast(foreground: string, background: string): number {
  const l1 = luminance(foreground);
  const l2 = luminance(background);
  const [lighter, darker] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

const WHITE = '#FFFFFF';

test('light accent token carries white text at WCAG AA (CTA fill)', () => {
  assert.ok(
    contrast(COLORS.accent, WHITE) >= 4.5,
    `white on ${COLORS.accent} must be >= 4.5:1 (CTA fill)`,
  );
});

test('light accent token is readable as text on white and on accentSoft', () => {
  assert.ok(contrast(COLORS.accent, WHITE) >= 4.5, `accent text on white must be >= 4.5:1`);
  assert.ok(
    contrast(COLORS.accent, COLORS.accentSoft) >= 4.5,
    'accent text on accentSoft (selected pills, highlighted rows) must be >= 4.5:1',
  );
});

test('light CTA tokens in LAYOUT carry white text at WCAG AA', () => {
  assert.ok(contrast(LAYOUT.btn.primary, WHITE) >= 4.5, 'LAYOUT.btn.primary fill must be >= 4.5:1 with white text');
});

test('dark theme CTA fill carries white text; dark accent text stays readable on dark surfaces', () => {
  assert.ok(
    contrast(LAYOUT.btn.primary, WHITE) >= 4.5,
    'dark theme primary button fill must keep white text >= 4.5:1',
  );
  assert.ok(
    contrast(DARK_COLORS.accent, DARK_COLORS.paper) >= 4.5,
    'dark accent used as text on dark surfaces must be >= 4.5:1',
  );
});
