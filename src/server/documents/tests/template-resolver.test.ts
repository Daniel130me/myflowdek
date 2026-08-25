import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveTemplateVariables } from '../template-resolver';

test('resolves supported project variables recursively with deterministic dates', () => {
  const resolved = resolveTemplateVariables({ sections: [
    { type: 'heading', text: '{{project.name}}' },
    { type: 'field', label: 'Manager', value: '{{project.manager.name}} · {{currentDate}}' },
  ] }, {
    project: { name: 'Apollo', description: null, startDate: new Date('2026-08-20T10:00:00Z'), endDate: null, manager: { name: 'Daniel', email: 'daniel@example.com' } },
    workspace: { name: 'Operations' }, currentDate: new Date('2026-08-21T09:00:00Z'),
  });
  assert.ok('sections' in resolved);
  assert.equal(resolved.sections[0]?.type === 'heading' ? resolved.sections[0].text : '', 'Apollo');
  assert.equal(resolved.sections[1]?.type === 'field' ? resolved.sections[1].value : '', 'Daniel · 2026-08-21');
});

test('uses safe fallbacks and never evaluates unknown expressions', () => {
  const resolved = resolveTemplateVariables({ sections: [{ type: 'section', heading: 'Scope', body: '{{project.description}} / {{future.metric}}' }] }, {
    project: { name: 'Project', description: null, startDate: null, endDate: null, manager: { name: null, email: 'owner@example.com' } }, workspace: { name: 'Workspace' },
  });
  assert.ok('sections' in resolved);
  const body = resolved.sections[0]?.type === 'section' ? resolved.sections[0].body : '';
  assert.equal(body, 'Add the project description here. / [future.metric: not available yet]');
});