// __tests__/components/OfflineBanner.test.tsx
//
// Component-level render + accessibility tests for OfflineBanner.
//   - Renders the default message per variant
//   - Renders a custom message when provided
//   - Appends pending count to the offline variant
//   - Renders the action button when actionLabel + onAction are provided
//   - Omits the action button when not provided
//   - Carries accessibilityLiveRegion="polite" by default

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../../context';
import { OfflineBanner } from '../../components/MobilePremium/OfflineBanner';

function Wrap({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('OfflineBanner — message rendering', () => {
  it('renders the default offline message', () => {
    const { getByText } = render(
      <Wrap>
        <OfflineBanner variant="offline" />
      </Wrap>,
    );
    expect(getByText("You're offline")).toBeTruthy();
  });

  it('renders the default syncing message', () => {
    const { getByText } = render(
      <Wrap>
        <OfflineBanner variant="syncing" />
      </Wrap>,
    );
    expect(getByText('Syncing…')).toBeTruthy();
  });

  it('renders the default sync-failed message', () => {
    const { getByText } = render(
      <Wrap>
        <OfflineBanner variant="sync-failed" />
      </Wrap>,
    );
    expect(getByText('Sync failed')).toBeTruthy();
  });

  it('renders a custom message when provided', () => {
    const { getByText } = render(
      <Wrap>
        <OfflineBanner variant="offline" message="Connection lost" />
      </Wrap>,
    );
    expect(getByText('Connection lost')).toBeTruthy();
  });

  it('appends pending count to the offline variant', () => {
    const { getByText } = render(
      <Wrap>
        <OfflineBanner variant="offline" pendingCount={4} />
      </Wrap>,
    );
    expect(getByText(/4 pending/)).toBeTruthy();
  });
});

describe('OfflineBanner — action', () => {
  it('renders the action button when actionLabel + onAction are provided', () => {
    const onAction = vi.fn();
    const { getByText } = render(
      <Wrap>
        <OfflineBanner
          variant="sync-failed"
          actionLabel="Retry"
          onAction={onAction}
        />
      </Wrap>,
    );
    const btn = getByText('Retry');
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('omits the action button when actionLabel is not provided', () => {
    const { queryByText } = render(
      <Wrap>
        <OfflineBanner variant="syncing" />
      </Wrap>,
    );
    expect(queryByText('Retry')).toBeNull();
  });
});

describe('OfflineBanner — live region', () => {
  it('carries accessibilityLiveRegion="polite" by default', () => {
    const { container } = render(
      <Wrap>
        <OfflineBanner variant="offline" />
      </Wrap>,
    );
    const root = container.firstChild as HTMLElement | null;
    expect(root?.getAttribute('accessibilityliveregion')).toBe('polite');
  });

  it('respects an explicit assertive live region override', () => {
    const { container } = render(
      <Wrap>
        <OfflineBanner
          variant="sync-failed"
          accessibilityLiveRegion="assertive"
        />
      </Wrap>,
    );
    const root = container.firstChild as HTMLElement | null;
    expect(root?.getAttribute('accessibilityliveregion')).toBe('assertive');
  });
});
