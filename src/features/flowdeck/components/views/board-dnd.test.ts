/**
 * Regression tests for audit finding C-08: board drag-and-drop must work on
 * touch devices and be reachable by keyboard.
 *
 * The board previously used native HTML5 drag events (which never fire on
 * touch), rendered cards as non-focusable divs, and left the installed
 * dnd-kit packages with zero imports. These guards pin the dnd-kit
 * migration: pointer + keyboard sensors, sortable cards, focusable
 * activators, and no return to the native draggable implementation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const BOARD = 'src/features/flowdeck/components/views/BoardView.tsx';

function boardSource() {
  return readFileSync(BOARD, 'utf8');
}

test('board uses dnd-kit instead of native HTML5 drag events', () => {
  const source = boardSource();
  assert.match(source, /DndContext/, 'the board must be wrapped in a DndContext');
  assert.match(source, /useSortable\(/, 'cards must be sortable items');
  assert.doesNotMatch(source, /draggable(\s|=)/, 'no native draggable attribute may remain');
  assert.doesNotMatch(source, /onDragStart=\{\(\)/, 'no native onDragStart handlers may remain');
  assert.doesNotMatch(source, /onDrop=\{/, 'no native onDrop handlers may remain');
});

test('board drag works with pointer (touch) and keyboard sensors', () => {
  const source = boardSource();
  assert.match(source, /PointerSensor/, 'pointer sensor drives mouse + touch dragging');
  assert.match(source, /KeyboardSensor/, 'keyboard sensor makes the board operable without a pointer');
  assert.match(source, /sortableKeyboardCoordinates/, 'keyboard moves follow the sortable order');
  assert.match(
    source,
    /activationConstraint:\s*\{\s*distance:/,
    'pointer drags need an activation distance so taps and scrolls still work',
  );
});

test('board columns accept drops, including empty columns', () => {
  const source = boardSource();
  assert.match(source, /useDroppable\(/, 'columns must register as drop targets');
  assert.match(source, /SortableContext/, 'card order inside a column is a sortable list');
});

test('board cards stay openable without dragging', () => {
  const source = boardSource();
  // Enter opens the focused card; clicks after a drag are suppressed so a
  // drop never accidentally opens the task.
  assert.match(source, /DRAG_CLICK_SUPPRESS_MS/, 'ghost clicks after a drop must be suppressed');
  assert.match(source, /e\.key === 'Enter'/, 'Enter must open the focused card');
});
