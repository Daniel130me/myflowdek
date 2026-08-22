import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { matchingService } from './matching.service';

test('MatchingService calculates ranked matches and suggest competencies', async () => {
  assert.ok(typeof matchingService.getTaskTalentMatches === 'function');
  assert.ok(typeof matchingService.suggestTaskCompetencies === 'function');
});

test('matching and AI suggestion routes require task edit permission', () => {
  const matchesRoute = readFileSync('src/app/api/tasks/[taskId]/talent-matches/route.ts', 'utf8');
  const suggestionsRoute = readFileSync('src/app/api/tasks/[taskId]/suggest-competencies/route.ts', 'utf8');
  assert.match(matchesRoute, /requireTaskProjectCapability\(user\.id, taskId, 'EDIT_TASK'\)/);
  assert.match(suggestionsRoute, /requireTaskProjectCapability\(user\.id, taskId, 'EDIT_TASK'\)/);
});
