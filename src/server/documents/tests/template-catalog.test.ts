import assert from 'node:assert/strict';
import test from 'node:test';
import { DOCUMENT_TEMPLATE_CATALOG } from '../template-catalog';

const REQUIRED_PHASES = ['INITIATION', 'PLANNING', 'EXECUTION_MONITORING', 'CLOSING'];

test('catalog contains 36 uniquely-addressable templates across every project phase', () => {
  assert.equal(DOCUMENT_TEMPLATE_CATALOG.length, 36);
  assert.equal(new Set(DOCUMENT_TEMPLATE_CATALOG.map((item) => item.slug)).size, 36);
  assert.deepEqual([...new Set(DOCUMENT_TEMPLATE_CATALOG.map((item) => item.phase))].sort(), [...REQUIRED_PHASES].sort());
});

test('each template has provider-ready structured content', () => {
  for (const template of DOCUMENT_TEMPLATE_CATALOG) {
    assert.ok(template.name.trim());
    assert.ok(template.description.trim());
    assert.ok(template.tags.length);
    if (template.documentType === 'GOOGLE_SHEET') assert.ok('sheets' in template.content && template.content.sheets.length);
    else assert.ok('sections' in template.content && template.content.sections.length);
  }
});