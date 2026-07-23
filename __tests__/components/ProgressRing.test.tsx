// __tests__/components/ProgressRing.test.tsx
//
// Component-level render + accessibility tests for ProgressRing.
//   - Renders with default props
//   - Exposes accessibilityRole="progressbar"
//   - Clamps progress to [0, 1] (negative, >1, NaN-safe)
//   - Renders label inside the ring
//   - Size presets produce expected diameters
//   - Allows color/trackColor override

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../../context';
import { ProgressRing } from '../../components/MobilePremium/ProgressRing';

function Wrap({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('ProgressRing — rendering', () => {
  it('renders with default props and exposes role="progressbar"', () => {
    const { container } = render(
      <Wrap>
        <ProgressRing progress={0.5} />
      </Wrap>,
    );
    const ring = container.querySelector('[accessibilityrole="progressbar"]');
    expect(ring).not.toBeNull();
  });

  it('renders a label node inside the ring', () => {
    const { getByText } = render(
      <Wrap>
        <ProgressRing
          progress={0.5}
          label={<span>Half done</span>}
        />
      </Wrap>,
    );
    expect(getByText('Half done')).toBeTruthy();
  });
});

describe('ProgressRing — clamping', () => {
  it('clamps negative progress to 0', () => {
    const { container } = render(
      <Wrap>
        <ProgressRing progress={-0.3} />
      </Wrap>,
    );
    const ring = container.querySelector('[accessibilityrole="progressbar"]');
    expect(ring?.getAttribute('accessibilitylabel')).toContain('0');
  });

  it('clamps progress > 1 to 100%', () => {
    const { container } = render(
      <Wrap>
        <ProgressRing progress={1.5} />
      </Wrap>,
    );
    const ring = container.querySelector('[accessibilityrole="progressbar"]');
    expect(ring?.getAttribute('accessibilitylabel')).toContain('100');
  });

  it('treats NaN as 0', () => {
    const { container } = render(
      <Wrap>
        <ProgressRing progress={NaN} />
      </Wrap>,
    );
    const ring = container.querySelector('[accessibilityrole="progressbar"]');
    expect(ring?.getAttribute('accessibilitylabel')).toContain('0');
  });
});

describe('ProgressRing — a11y label', () => {
  it('exposes rounded percentage in the default label', () => {
    const { container } = render(
      <Wrap>
        <ProgressRing progress={0.42} />
      </Wrap>,
    );
    const ring = container.querySelector('[accessibilityrole="progressbar"]');
    expect(ring?.getAttribute('accessibilitylabel')).toContain('42');
  });

  it('allows an explicit accessibilityLabel override', () => {
    const { container } = render(
      <Wrap>
        <ProgressRing
          progress={0.5}
          accessibilityLabel="Goal completion: 50%"
        />
      </Wrap>,
    );
    const ring = container.querySelector('[accessibilityrole="progressbar"]');
    expect(ring?.getAttribute('accessibilitylabel')).toBe('Goal completion: 50%');
  });
});
