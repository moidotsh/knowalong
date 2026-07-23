// __tests__/components/StatCard.test.tsx
//
// Component-level render + accessibility tests for StatCard.
//   - Renders label + value
//   - Renders subtitle when provided, omits when absent
//   - Renders icon when provided
//   - Fires onPress when tapped
//   - Non-interactive (no onPress) renders role="text"
//   - Interactive (with onPress) renders role="button"
//   - Composed accessibilityLabel includes label + value + subtitle

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../../context';
import { StatCard } from '../../components/MobilePremium/StatCard';

function Wrap({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('StatCard — rendering', () => {
  it('renders label and value', () => {
    const { getByText } = render(
      <Wrap>
        <StatCard label="Activity" value="14" />
      </Wrap>,
    );
    expect(getByText('Activity')).toBeTruthy();
    expect(getByText('14')).toBeTruthy();
  });

  it('renders the subtitle when provided', () => {
    const { getByText } = render(
      <Wrap>
        <StatCard label="Entries" value="8.2k" subtitle="this month" />
      </Wrap>,
    );
    expect(getByText('this month')).toBeTruthy();
  });

  it('renders an icon node when provided', () => {
    const { getByTestId } = render(
      <Wrap>
        <StatCard
          label="HR"
          value="142"
          icon={<span data-testid="custom-icon" />}
        />
      </Wrap>,
    );
    expect(getByTestId('custom-icon')).toBeTruthy();
  });
});

describe('StatCard — interaction', () => {
  it('fires onPress when tapped (interactive mode)', () => {
    const onPress = vi.fn();
    const { getByText } = render(
      <Wrap>
        <StatCard label="HR" value="142" onPress={onPress} />
      </Wrap>,
    );
    fireEvent.click(getByText('HR'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('interactive mode exposes role="button"', () => {
    const { container } = render(
      <Wrap>
        <StatCard label="HR" value="142" onPress={() => {}} />
      </Wrap>,
    );
    const node = container.querySelector('[accessibilityrole="button"]');
    expect(node).not.toBeNull();
  });

  it('non-interactive mode exposes role="text"', () => {
    const { container } = render(
      <Wrap>
        <StatCard label="HR" value="142" />
      </Wrap>,
    );
    const node = container.querySelector('[accessibilityrole="text"]');
    expect(node).not.toBeNull();
  });
});

describe('StatCard — accessibility', () => {
  it('composed label includes label + value + subtitle', () => {
    const { container } = render(
      <Wrap>
        <StatCard label="Entries" value="8.2k" subtitle="this month" />
      </Wrap>,
    );
    const node = container.querySelector('[accessibilityrole="text"]');
    expect(node?.getAttribute('accessibilitylabel')).toBe(
      'Entries: 8.2k, this month',
    );
  });

  it('composed label omits subtitle when not provided', () => {
    const { container } = render(
      <Wrap>
        <StatCard label="Volume" value="8.2k" />
      </Wrap>,
    );
    const node = container.querySelector('[accessibilityrole="text"]');
    expect(node?.getAttribute('accessibilitylabel')).toBe('Volume: 8.2k');
  });

  it('allows overriding accessibilityLabel', () => {
    const { container } = render(
      <Wrap>
        <StatCard
          label="Volume"
          value="8.2k"
          accessibilityLabel="Custom label"
        />
      </Wrap>,
    );
    const node = container.querySelector('[accessibilityrole="text"]');
    expect(node?.getAttribute('accessibilitylabel')).toBe('Custom label');
  });
});
