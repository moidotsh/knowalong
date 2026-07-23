// __tests__/components/Avatar.test.tsx
//
// Component-level render + accessibility tests for Avatar.
//   - Renders initials when no source is provided
//   - Single-word name → single-letter initials
//   - Multi-word name → two-letter initials (first + last)
//   - Empty/whitespace name → '?'
//   - accessibilityRole="image"
//   - Composed a11y label includes name
//   - Composed a11y label includes presence when not 'offline'
//   - accessibilityLabel override is respected

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../../context';
import { Avatar } from '../../components/MobilePremium/Avatar';

function Wrap({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('Avatar — initials fallback', () => {
  it('renders two-letter initials for multi-word name', () => {
    const { getByText } = render(
      <Wrap>
        <Avatar name="Ada Lovelace" />
      </Wrap>,
    );
    expect(getByText('AL')).toBeTruthy();
  });

  it('renders single-letter initials for single-word name', () => {
    const { getByText } = render(
      <Wrap>
        <Avatar name="Grace" />
      </Wrap>,
    );
    expect(getByText('G')).toBeTruthy();
  });

  it('renders "?" when name is omitted', () => {
    const { getByText } = render(
      <Wrap>
        <Avatar />
      </Wrap>,
    );
    expect(getByText('?')).toBeTruthy();
  });

  it('renders "?" when name is whitespace-only', () => {
    const { getByText } = render(
      <Wrap>
        <Avatar name="   " />
      </Wrap>,
    );
    expect(getByText('?')).toBeTruthy();
  });

  it('uppercases lowercase initials', () => {
    const { getByText } = render(
      <Wrap>
        <Avatar name="lower case" />
      </Wrap>,
    );
    expect(getByText('LC')).toBeTruthy();
  });
});

describe('Avatar — accessibility', () => {
  it('exposes role="image"', () => {
    const { container } = render(
      <Wrap>
        <Avatar name="Ada Lovelace" />
      </Wrap>,
    );
    const node = container.querySelector('[accessibilityrole="image"]');
    expect(node).not.toBeNull();
  });

  it('composed label includes the name when presence is offline', () => {
    const { container } = render(
      <Wrap>
        <Avatar name="Ada Lovelace" presence="offline" />
      </Wrap>,
    );
    const node = container.querySelector('[accessibilityrole="image"]');
    expect(node?.getAttribute('accessibilitylabel')).toBe('Ada Lovelace');
  });

  it('composed label includes presence when not offline', () => {
    const { container } = render(
      <Wrap>
        <Avatar name="Ada Lovelace" presence="online" />
      </Wrap>,
    );
    const node = container.querySelector('[accessibilityrole="image"]');
    expect(node?.getAttribute('accessibilitylabel')).toBe(
      'Ada Lovelace, online',
    );
  });

  it('falls back to "Avatar" label when no name is provided', () => {
    const { container } = render(
      <Wrap>
        <Avatar />
      </Wrap>,
    );
    const node = container.querySelector('[accessibilityrole="image"]');
    expect(node?.getAttribute('accessibilitylabel')).toBe('Avatar');
  });

  it('allows overriding accessibilityLabel', () => {
    const { container } = render(
      <Wrap>
        <Avatar name="Ada Lovelace" accessibilityLabel="Profile photo" />
      </Wrap>,
    );
    const node = container.querySelector('[accessibilityrole="image"]');
    expect(node?.getAttribute('accessibilitylabel')).toBe('Profile photo');
  });
});
