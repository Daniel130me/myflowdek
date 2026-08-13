import assert from 'node:assert';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { FlowdekDataProvider, useFlowdekData } from './FlowdekDataProvider';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

/**
 * Wrap a component tree with the SessionProvider so that FlowdekDataProvider's
 * useSession() call doesn't throw during server-side test rendering.
 */
function wrapWithSession(children: React.ReactNode): React.ReactElement {
  return React.createElement(SessionProvider, null, children);
}

test('FlowdekDataProvider exposes shared state to layout and child components', () => {
  let layoutState: ReturnType<typeof useFlowdekData> | null = null;
  let childState: ReturnType<typeof useFlowdekData> | null = null;

  function LayoutComponent() {
    layoutState = useFlowdekData();
    return React.createElement('div', null, React.createElement(ChildComponent));
  }

  function ChildComponent() {
    childState = useFlowdekData();
    return React.createElement('span', null, 'child');
  }

  renderToStaticMarkup(
    wrapWithSession(
      React.createElement(
        FlowdekDataProvider,
        null,
        React.createElement(LayoutComponent)
      )
    )
  );

  assert.ok(layoutState !== null);
  assert.ok(childState !== null);
  // Verify that both layout and child receive the EXACT same store instance reference
  assert.strictEqual(layoutState, childState);
});

test('useFlowDeck throws when called outside FlowdekDataProvider', () => {
  function StandaloneComponent() {
    useFlowDeck();
    return null;
  }

  assert.throws(() => {
    renderToStaticMarkup(wrapWithSession(React.createElement(StandaloneComponent)));
  }, /must be used within a FlowdekDataProvider/);
});
