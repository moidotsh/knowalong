// __tests__/components/AppErrorBoundary.test.tsx
//
// Component-level fallback test for AppErrorBoundary.
//
// Scope — what this test verifies:
//   - When a descendant throws in render, AppErrorBoundary's fallback
//     UI renders in its place.
//   - The thrown error does NOT propagate to the test renderer (the
//     render call itself does not reject).
//   - The fallback UI exposes role="alert" so screen readers announce
//     the boundary state.
//
// Scope — what this test does NOT verify (explicit non-claim):
//   - It does NOT verify real browser crash-to-white-screen behavior.
//     jsdom does not reproduce the browser's React reconciler crash
//     pathway; production-equivalent runtime behavior is a separate
//     manual-browser verification (tracked separately).
//   - It does NOT verify event-handler errors, async errors, or errors
//     thrown outside React's render pipeline — the boundary by design
//     does not catch those.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AppErrorBoundary } from '../../components/primitives/AppErrorBoundary';

// React logs caught errors via console.error even when a boundary
// handles them. Suppress to keep test output clean.
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

function ThrowOnRender({ message }: { message: string }): null {
  throw new Error(message);
}

function makeTree(broken: boolean): ReactNode {
  return (
    <AppErrorBoundary>
      <div>
        <span>before-fallback-marker</span>
        {broken ? <ThrowOnRender message="intentional render error for test" /> : null}
        <span>after-fallback-marker</span>
      </div>
    </AppErrorBoundary>
  );
}

describe('AppErrorBoundary — component-level fallback', () => {
  it('renders children when no error occurs', () => {
    render(makeTree(false));
    expect(screen.getByText('before-fallback-marker')).toBeInTheDocument();
    expect(screen.getByText('after-fallback-marker')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the fallback UI when a child throws in render', () => {
    // The render call itself must not reject; the boundary catches.
    expect(() => render(makeTree(true))).not.toThrow();

    // Fallback UI is present.
    const alertRegion = screen.getByRole('alert');
    expect(alertRegion).toBeInTheDocument();
    expect(alertRegion).toHaveTextContent('Something went wrong');

    // The reload affordance is present.
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();

    // Child markers are absent — the fallback replaced the throw site.
    expect(screen.queryByText('before-fallback-marker')).not.toBeInTheDocument();
    expect(screen.queryByText('after-fallback-marker')).not.toBeInTheDocument();
  });

  it('does not propagate the thrown error to the renderer', () => {
    // If the boundary failed to catch, render() would either throw or
    // emit the original error to console.error with the original
    // message intact. Assert neither happens: render completes; the
    // spy was called only with React's "logged" boundary-caught
    // diagnostic, not with an uncaught throw.
    render(makeTree(true));
    expect(consoleErrorSpy).toHaveBeenCalled();
    // The thrown message may appear inside React's diagnostic log,
    // but the boundary's own logger.error call (componentDidCatch)
    // also fires — assert the fallback rendered as the stronger
    // signal that the boundary caught rather than rethrew.
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
