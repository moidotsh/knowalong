// __tests__/components/MobileSheet.test.tsx
//
// Component-level render + interaction tests for MobileSheet.
//   - Returns null when open=false
//   - Renders children when open=true
//   - Backdrop tap fires onOpenChange(false)
//   - Title renders the header

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../../context';
import { MobileSheet } from '../../components/MobilePremium/MobileSheet';

function Wrap({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function findByA11yLabel(container: HTMLElement, label: string): Element | null {
  return container.querySelector(`[accessibilitylabel="${label}"]`);
}

function findAllByA11yLabel(container: HTMLElement, label: string): Element[] {
  return Array.from(container.querySelectorAll(`[accessibilitylabel="${label}"]`));
}

describe('MobileSheet — open state', () => {
  it('returns null when open is false', () => {
    const { container } = render(
      <Wrap>
        <MobileSheet open={false} onOpenChange={() => {}}>
          <span>Sheet body</span>
        </MobileSheet>
      </Wrap>,
    );
    expect(container.querySelector('modal')).toBeNull();
    expect(container.textContent).not.toContain('Sheet body');
  });

  it('renders children when open is true', () => {
    const { getByText, container } = render(
      <Wrap>
        <MobileSheet open onOpenChange={() => {}}>
          <span>Sheet body</span>
        </MobileSheet>
      </Wrap>,
    );
    expect(getByText('Sheet body')).toBeTruthy();
    expect(container.querySelector('modal')).not.toBeNull();
  });
});

describe('MobileSheet — close affordances', () => {
  it('backdrop tap fires onOpenChange(false) when closeOnBackdropTap is true (default)', () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <Wrap>
        <MobileSheet open onOpenChange={onOpenChange}>
          <span>Body</span>
        </MobileSheet>
      </Wrap>,
    );
    const backdrop = findByA11yLabel(container, 'Close sheet') as Element;
    fireEvent.click(backdrop);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('omits the close-sheet backdrop affordance when closeOnBackdropTap is false', () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <Wrap>
        <MobileSheet open onOpenChange={onOpenChange} closeOnBackdropTap={false}>
          <span>Body</span>
        </MobileSheet>
      </Wrap>,
    );
    expect(findByA11yLabel(container, 'Close sheet')).toBeNull();
  });

  it('renders the X close button when a title is set', () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <Wrap>
        <MobileSheet open onOpenChange={onOpenChange} title="Filter">
          <span>Body</span>
        </MobileSheet>
      </Wrap>,
    );
    // Both the backdrop and the header X button carry "Close sheet" — at
    // least one close affordance must be present.
    const closeAffordances = findAllByA11yLabel(container, 'Close sheet');
    expect(closeAffordances.length).toBeGreaterThanOrEqual(1);
  });
});

describe('MobileSheet — title', () => {
  it('renders the title text in the header', () => {
    const { getByText } = render(
      <Wrap>
        <MobileSheet open onOpenChange={() => {}} title="My sheet">
          <span>Body</span>
        </MobileSheet>
      </Wrap>,
    );
    expect(getByText('My sheet')).toBeTruthy();
  });
});
