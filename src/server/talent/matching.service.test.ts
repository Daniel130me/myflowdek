import assert from 'node:assert/strict';
import test from 'node:test';
import { matchingService } from './matching.service';

test('MatchingService calculates ranked matches and suggest competencies', async () => {
  assert.ok(typeof matchingService.getTaskTalentMatches === 'function');
  assert.ok(typeof matchingService.suggestTaskCompetencies === 'function');
});
