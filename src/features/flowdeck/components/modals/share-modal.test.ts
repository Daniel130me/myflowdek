/**
 * Regression tests for audit finding C-03: the Share modal must stop being
 * a false affordance.
 *
 * The old modal fabricated a `flowdeck.app/share/<id>-<random>` link (every
 * copied link 404'd), kept the View/Edit dropdown in local-only state, and
 * truncated the people list to `members.slice(0, 4)`. Users believed they
 * had shared a project when nothing happened.
 *
 * These source guards pin the honest behaviour: no fabricated link, no
 * truncation, and the access dropdown must call the real role-change API.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const MODAL = 'src/features/flowdeck/components/modals/ShareModal.tsx';

function modalSource() {
  return readFileSync(MODAL, 'utf8');
}

test('ShareModal no longer fabricates a share link', () => {
  const source = modalSource();
  assert.doesNotMatch(source, /flowdeck\.app/, 'no fake share domain may appear');
  assert.doesNotMatch(source, /Math\.random/, 'no client-fabricated link tokens');
  assert.doesNotMatch(source, /copyLink|navigator\.clipboard/, 'no dead copy-link affordance');
});

test('ShareModal lists every member — no arbitrary truncation', () => {
  assert.doesNotMatch(modalSource(), /slice\(0,\s*4\)/, 'the access list must not be truncated');
});

test('ShareModal renders real API members with their project roles', () => {
  const source = modalSource();
  assert.match(source, /useProjectMembers\(/, 'the access list comes from the members API');
  const directory = readFileSync(
    'src/features/flowdeck/components/ui/MemberDirectory.tsx',
    'utf8',
  );
  assert.match(directory, /projectRole:\s*api\.role/, 'members must carry their real project role');
});

test('the View/Edit control persists the role change with rollback', () => {
  const source = modalSource();
  assert.match(source, /apiUpdateProjectMemberRole\(/, 'access changes must PATCH the members API');
  assert.match(source, /toast\.error\(/, 'failures must surface an honest error');
  assert.match(source, /canManage/, 'controls must be gated on manage rights');
});
