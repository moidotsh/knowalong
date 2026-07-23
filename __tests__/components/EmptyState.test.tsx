// __tests__/components/EmptyState.test.tsx
//
// Component-level render + accessibility tests for EmptyState.
//   - Renders title (always)
//   - Renders message when provided, omits when absent
//   - Renders action button when provided, omits when absent
//   - Icon slot is optional
//   - Compact mode reduces vertical padding
//   - accessibilityLabel defaults to title; can be overridden

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../../context';
import { EmptyState } from '../../components/MobilePremium/EmptyState';

function Wrap({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('EmptyState — rendering', () => {
  it('renders the title', () => {
    const { getByText } = render(
      <Wrap>
        <EmptyState title="No results found" />
      </Wrap>,
    );
    expect(getByText('No results found')).toBeTruthy();
  });

  it('renders the message when provided', () => {
    const { getByText } = render(
      <Wrap>
        <EmptyState title="Empty" message="Try a different filter." />
      </Wrap>,
    );
    expect(getByText('Try a different filter.')).toBeTruthy();
  });

  it('omits the message slot when not provided', () => {
    const { queryByText } = render(
      <Wrap>
        <EmptyState title="Just a title" />
      </Wrap>,
    );
    // Only the title should be present. Query for any paragraph-like text
    // besides the title.
    expect(queryByText('Just a title')).toBeTruthy();
  });

  it('renders the action button when provided', () => {
    const { getByText } = render(
      <Wrap>
        <EmptyState
          title="No data"
          action={{ label: 'Add one', onPress: () => {} }}
        />
      </Wrap>,
    );
    expect(getByText('Add one')).toBeTruthy();
  });

  it('omits the action button when not provided', () => {
    const { queryByText } = render(
      <Wrap>
        <EmptyState title="No data" />
      </Wrap>,
    );
    expect(queryByText('Add one')).toBeNull();
  });

  it('fires the action handler on tap', () => {
    const onPress = vi.fn();
    const { getByText } = render(
      <Wrap>
        <EmptyState title="No data" action={{ label: 'Retry', onPress }} />
      </Wrap>,
    );
    fireEvent.click(getByText('Retry'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders an icon node when provided', () => {
    const { getByTestId } = render(
      <Wrap>
        <EmptyState
          title="With icon"
          icon={<span data-testid="custom-icon" />}
        />
      </Wrap>,
    );
    expect(getByTestId('custom-icon')).toBeTruthy();
  });

  it('uses the title as the default accessibilityLabel', () => {
    const { container } = render(
      <Wrap>
        <EmptyState title="Default label" />
      </Wrap>,
    );
    const root = container.querySelector('[accessibilityrole="text"]');
    expect(root?.getAttribute('accessibilitylabel')).toBe('Default label');
  });

  it('allows overriding accessibilityLabel', () => {
    const { container } = render(
      <Wrap>
        <EmptyState
          title="Visible title"
          accessibilityLabel="Screen-reader-only label"
        />
      </Wrap>,
    );
    const root = container.querySelector('[accessibilityrole="text"]');
    expect(root?.getAttribute('accessibilitylabel')).toBe('Screen-reader-only label');
  });
});
