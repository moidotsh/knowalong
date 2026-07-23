// __tests__/components/RevealMask.test.tsx
//
// Component-level render + a11y tests for RevealMask.
//   - Masked state hides content behind a tap affordance
//   - Tap fires onReveal
//   - Masked content has accessibilityElementsHidden on the children wrapper
//   - Revealed state renders children without the mask wrapper
//   - Custom accessibilityLabel is respected

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../../context';
import { RevealMask } from '../../components/MobilePremium/RevealMask';

function Wrap({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function findByA11yLabel(container: HTMLElement, label: string): Element | null {
  return container.querySelector(`[accessibilitylabel="${label}"]`);
}

describe('RevealMask — masked state', () => {
  it('renders children + a tap affordance when masked', () => {
    const { getByText, container } = render(
      <Wrap>
        <RevealMask>
          <span>Secret content</span>
        </RevealMask>
      </Wrap>,
    );
    expect(getByText('Secret content')).toBeTruthy();
    expect(findByA11yLabel(container, 'Tap to reveal')).not.toBeNull();
  });

  it('tap fires onReveal', () => {
    const onReveal = vi.fn();
    const { container } = render(
      <Wrap>
        <RevealMask onReveal={onReveal}>
          <span>Secret</span>
        </RevealMask>
      </Wrap>,
    );
    const affordance = findByA11yLabel(container, 'Tap to reveal') as Element;
    fireEvent.click(affordance);
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it('marks the wrapped children with accessibilityElementsHidden', () => {
    const { container } = render(
      <Wrap>
        <RevealMask>
          <span>Hidden</span>
        </RevealMask>
      </Wrap>,
    );
    const wrapper = container.querySelector('[accessibilityelementshidden]');
    expect(wrapper).not.toBeNull();
  });

  it('respects a custom accessibilityLabel', () => {
    const { container } = render(
      <Wrap>
        <RevealMask accessibilityLabel="Reveal private notes">
          <span>Secret</span>
        </RevealMask>
      </Wrap>,
    );
    expect(findByA11yLabel(container, 'Reveal private notes')).not.toBeNull();
  });
});

describe('RevealMask — revealed state', () => {
  it('renders children without the mask button when masked=false', () => {
    const { container, getByText } = render(
      <Wrap>
        <RevealMask masked={false}>
          <span>Plain content</span>
        </RevealMask>
      </Wrap>,
    );
    expect(getByText('Plain content')).toBeTruthy();
    expect(findByA11yLabel(container, 'Tap to reveal')).toBeNull();
  });
});
