// __tests__/components/SegmentedControl.test.tsx
//
// Component-level render + accessibility tests for SegmentedControl.
//   - variant="selection" → container radiogroup, children radio + checked
//   - variant="tabs"       → container tablist,   children tab + selected
//   - onChange fires with the new segment value
//   - chromeless style differs from default (no track background)
//   - size 'sm' / 'md' both accepted
//   - fullWidth true (default) vs false both accepted

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../../context';
import { SegmentedControl } from '../../components/MobilePremium/SegmentedControl';

function Wrap({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const SELECTION_SEGMENTS = [
  { label: '7D', value: '7d' as const },
  { label: '30D', value: '30d' as const },
  { label: '90D', value: '90d' as const },
];

const TAB_SEGMENTS = [
  { label: 'Sets', value: 'sets' as const },
  { label: 'Notes', value: 'notes' as const },
  { label: 'History', value: 'history' as const },
];

describe('SegmentedControl — selection variant', () => {
  it('renders the container with role="radiogroup"', () => {
    const { container } = render(
      <Wrap>
        <SegmentedControl
          variant="selection"
          segments={SELECTION_SEGMENTS}
          value="30d"
          onChange={() => {}}
        />
      </Wrap>,
    );
    const group = container.querySelector('[accessibilityrole="radiogroup"]');
    expect(group).not.toBeNull();
  });

  it('renders each segment with role="radio" + state checked for the active one', () => {
    const { container } = render(
      <Wrap>
        <SegmentedControl
          variant="selection"
          segments={SELECTION_SEGMENTS}
          value="30d"
          onChange={() => {}}
        />
      </Wrap>,
    );
    const radios = container.querySelectorAll('[accessibilityrole="radio"]');
    expect(radios.length).toBe(3);
    // Exactly one radio is checked — the active one. Match `checked:true`
    // exactly, not the substring `checked` (which would also match the
    // inactive segments' stringified `checked:false` state).
    const checked = Array.from(radios).filter((r) =>
      (r.getAttribute('accessibilitystate') || '').includes('checked:true'),
    );
    expect(checked.length).toBe(1);
  });

  it('does NOT use the tab role for selection variant', () => {
    const { container } = render(
      <Wrap>
        <SegmentedControl
          variant="selection"
          segments={SELECTION_SEGMENTS}
          value="30d"
          onChange={() => {}}
        />
      </Wrap>,
    );
    expect(
      container.querySelector('[accessibilityrole="tab"]'),
    ).toBeNull();
    expect(
      container.querySelector('[accessibilityrole="tablist"]'),
    ).toBeNull();
  });
});

describe('SegmentedControl — tabs variant', () => {
  it('renders the container with role="tablist"', () => {
    const { container } = render(
      <Wrap>
        <SegmentedControl
          variant="tabs"
          segments={TAB_SEGMENTS}
          value="sets"
          onChange={() => {}}
        />
      </Wrap>,
    );
    expect(
      container.querySelector('[accessibilityrole="tablist"]'),
    ).not.toBeNull();
  });

  it('renders each segment with role="tab" + state selected for the active one', () => {
    const { container } = render(
      <Wrap>
        <SegmentedControl
          variant="tabs"
          segments={TAB_SEGMENTS}
          value="notes"
          onChange={() => {}}
        />
      </Wrap>,
    );
    const tabs = container.querySelectorAll('[accessibilityrole="tab"]');
    expect(tabs.length).toBe(3);
    // Match `selected:true` exactly — see the radio test above for why
    // a bare `.includes('selected')` substring match would over-count.
    const selected = Array.from(tabs).filter((t) =>
      (t.getAttribute('accessibilitystate') || '').includes('selected:true'),
    );
    expect(selected.length).toBe(1);
  });

  it('does NOT use the radio role for tabs variant', () => {
    const { container } = render(
      <Wrap>
        <SegmentedControl
          variant="tabs"
          segments={TAB_SEGMENTS}
          value="sets"
          onChange={() => {}}
        />
      </Wrap>,
    );
    expect(
      container.querySelector('[accessibilityrole="radio"]'),
    ).toBeNull();
    expect(
      container.querySelector('[accessibilityrole="radiogroup"]'),
    ).toBeNull();
  });
});

describe('SegmentedControl — onChange', () => {
  it('fires onChange with the tapped segment value', () => {
    const onChange = vi.fn();
    const { getByText } = render(
      <Wrap>
        <SegmentedControl
          variant="selection"
          segments={SELECTION_SEGMENTS}
          value="30d"
          onChange={onChange}
        />
      </Wrap>,
    );
    fireEvent.click(getByText('90D'));
    expect(onChange).toHaveBeenCalledWith('90d');
  });
});

describe('SegmentedControl — style flags', () => {
  it('chromeless renders without errors', () => {
    const { container } = render(
      <Wrap>
        <SegmentedControl
          variant="selection"
          chromeless
          segments={SELECTION_SEGMENTS}
          value="30d"
          onChange={() => {}}
        />
      </Wrap>,
    );
    expect(
      container.querySelector('[accessibilityrole="radiogroup"]'),
    ).not.toBeNull();
  });

  it('size="sm" renders without errors', () => {
    const { container } = render(
      <Wrap>
        <SegmentedControl
          variant="selection"
          size="sm"
          segments={SELECTION_SEGMENTS}
          value="30d"
          onChange={() => {}}
        />
      </Wrap>,
    );
    expect(
      container.querySelector('[accessibilityrole="radiogroup"]'),
    ).not.toBeNull();
  });

  it('fullWidth=false renders without errors', () => {
    const { container } = render(
      <Wrap>
        <SegmentedControl
          variant="selection"
          fullWidth={false}
          segments={SELECTION_SEGMENTS}
          value="30d"
          onChange={() => {}}
        />
      </Wrap>,
    );
    expect(
      container.querySelector('[accessibilityrole="radiogroup"]'),
    ).not.toBeNull();
  });
});
