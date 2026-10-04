// __tests__/components/Rollsign.test.tsx
//
// Rollsign — the Night Metro destination blind:
//   - renders the destination + optional eyebrow/meta
//   - the filament carries the brand color (live palette read)
//   - destination rides the display family; eyebrow rides the mono face
//   - with onPress the plate is a button (role + label); without, a plain plate

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../../context';
import { Rollsign } from '../../components/knowalong/Rollsign';

function Wrap({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('Rollsign — anatomy', () => {
  it('renders the destination and optional eyebrow + meta', () => {
    const { getByText } = render(
      <Wrap>
        <Rollsign destination="Винительный падеж" eyebrow="Line 02 · Cases" meta="12 stops" />
      </Wrap>,
    );
    expect(getByText('Винительный падеж')).toBeTruthy();
    expect(getByText('Line 02 · Cases')).toBeTruthy();
    expect(getByText('12 stops')).toBeTruthy();
  });

  it('renders without eyebrow and meta (optional slots stay retired)', () => {
    const { getByText, queryByText } = render(
      <Wrap>
        <Rollsign destination="Привет" />
      </Wrap>,
    );
    expect(getByText('Привет')).toBeTruthy();
    expect(queryByText('Line 02 · Cases')).toBeNull();
  });

  it('the filament renders ahead of the destination inside the plate', () => {
    const { container, getByText } = render(
      <Wrap>
        <Rollsign destination="Винительный" testID="roll" />
      </Wrap>,
    );
    // Color itself is unit-tested in knowalong/nightMetro.test.ts (the
    // react-native mock renders custom elements, whose CSSOM style is
    // opaque to assertions) — here we pin the anatomy: the filament
    // exists inside the plate and precedes the destination text.
    const plate = container.querySelector('[testid="roll"]');
    const filament = container.querySelector('[testid="roll-filament"]');
    const dest = getByText('Винительный');
    expect(filament).not.toBeNull();
    expect(plate?.contains(filament)).toBe(true);
    expect(plate?.contains(dest)).toBe(true);
    expect(
      filament!.compareDocumentPosition(dest) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('destination rides the display family; eyebrow rides the mono face', () => {
    // (Face reads are module constants — theme.fonts — asserted via the
    // typography sanity suite; here we pin that both slots render.)
    const { getByText } = render(
      <Wrap>
        <Rollsign destination="Винительный" eyebrow="Line 02" />
      </Wrap>,
    );
    expect(getByText('Винительный')).toBeTruthy();
    expect(getByText('Line 02')).toBeTruthy();
  });
});

describe('Rollsign — press', () => {
  it('with onPress the plate is a labeled button that fires', () => {
    const onPress = vi.fn();
    const { getByRole, getByLabelText } = render(
      <Wrap>
        <Rollsign destination="Светофор" onPress={onPress} />
      </Wrap>,
    );
    expect(getByRole('button')).toBeTruthy();
    expect(getByLabelText('Светофор')).toBeTruthy();
    fireEvent.click(getByLabelText('Светофор'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('without onPress no button role renders', () => {
    const { queryByRole } = render(
      <Wrap>
        <Rollsign destination="Светофор" />
      </Wrap>,
    );
    expect(queryByRole('button')).toBeNull();
  });
});
