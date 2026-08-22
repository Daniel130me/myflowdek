import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { isTalentNetworkEnabled } from './feature-flags';
import { moderateProfileSchema } from './moderation.schemas';

test('Talent Network flag defaults on but honors an explicit false value', () => {
  assert.equal(isTalentNetworkEnabled(undefined), true);
  assert.equal(isTalentNetworkEnabled('true'), true);
  assert.equal(isTalentNetworkEnabled(' FALSE '), false);
});

test('proxy covers Talent pages, APIs, and task-integrated endpoints', () => {
  const proxySource = readFileSync('src/proxy.ts', 'utf8');
  assert.match(proxySource, /'\/talent\/:path\*'/);
  assert.match(proxySource, /'\/api\/talent\/:path\*'/);
  assert.match(proxySource, /'\/api\/tasks\/:taskId\/talent-matches'/);
  assert.match(proxySource, /'\/api\/tasks\/:taskId\/opportunity\/:path\*'/);
});

test('moderation exposes only implemented profile state transitions', () => {
  assert.equal(moderateProfileSchema.safeParse({ profileId: 'profile-1', action: 'SUSPEND', reason: 'Policy violation' }).success, true);
  assert.equal(moderateProfileSchema.safeParse({ profileId: 'profile-1', action: 'DELETE', reason: 'Policy violation' }).success, false);
});
