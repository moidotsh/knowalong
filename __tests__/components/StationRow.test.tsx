// __tests__/components/StationRow.test.tsx
//
// StationRow — the list-row voice of the line map:
//   - renders title + optional meta + optional right slot
//   - the dot carries the state's line color (stationColor mapping)
//   - locked rows render muted titles; served rows render in the text color
//   - with onPress the row is a labeled button; without, a plain row

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { ThemeProvider } from '../../context';
import { StationRow } from '../../components/knowalong/StationRow';

function Wrap({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('StationRow — anatomy', () => {
  it('renders the title, meta, and a right slot when given', () => {
    const { getByText } = render(
      <Wrap>
        <StationRow title="Светофор" meta="Deck · 24 words" state="seen" right={<Text>24</Text>} />
      </Wrap>,
    );
    expect(getByText('Светофор')).toBeTruthy();
    expect(getByText('Deck · 24 words')).toBeTruthy();
    expect(getByText('24')).toBeTruthy();
  });

  it('meta and right slots stay retired when omitted', () => {
    const { getByText, queryByText } = render(
      <Wrap>
        <StationRow title="Светофор" state="known" />
      </Wrap>,
    );
    expect(getByText('Светофор')).toBeTruthy();
    expect(queryByText('Deck · 24 words')).toBeNull();
  });

  it('the dot renders as the first element of the row (structural)', () => {
    const { container } = render(
      <Wrap>
        <StationRow title="Привет" state="seen" testID="row" />
      </Wrap>,
    );
    // The dot's COLOR mapping is unit-tested in knowalong/nightMetro.test.ts
    // (the react-native mock renders custom elements, whose CSSOM style is
    // opaque to assertions) — here we pin the anatomy.
    const row = container.querySelector('[testid="row"]');
    const dot = container.querySelector('[testid="row-dot"]');
    expect(dot).not.toBeNull();
    expect(dot).toBe(row?.firstElementChild);
  });

  it('locked and served rows both render their titles', () => {
    const { getByText } = render(
      <Wrap>
        <StationRow title="Творительный" state="locked" testID="locked-row" />
        <StationRow title="Приветствие" state="known" testID="known-row" />
      </Wrap>,
    );
    // The muted-vs-text ink rule is unit-tested in
    // knowalong/nightMetro.test.ts; here both rows render their names.
    expect(getByText('Творительный')).toBeTruthy();
    expect(getByText('Приветствие')).toBeTruthy();
  });
});

describe('StationRow — press', () => {
  it('with onPress the row is a labeled button that fires', () => {
    const onPress = vi.fn();
    const { getByLabelText } = render(
      <Wrap>
        <StationRow title="Светофор" meta="Deck" state="seen" onPress={onPress} />
      </Wrap>,
    );
    expect(getByLabelText('Светофор — Deck')).toBeTruthy();
    fireEvent.click(getByLabelText('Светофор — Deck'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('without onPress no button role renders', () => {
    const { queryByRole } = render(
      <Wrap>
        <StationRow title="Светофор" state="seen" />
      </Wrap>,
    );
    expect(queryByRole('button')).toBeNull();
  });
});
