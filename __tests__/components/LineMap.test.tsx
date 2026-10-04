// __tests__/components/LineMap.test.tsx
//
// LineMap — the Night Metro transit spine:
//   - renders one stop per station, in order
//   - spine retires its outer segments on the first/last stops
//     (first stop has one spine, middle stops have two, last has one)
//   - the current stop's dot well carries the state-colored ring
//   - onStationPress makes stops pressable (role + callback with the station)
//   - the optional line label renders

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../../context';
import { theme } from '../../constants';
import { LineMap, type LineMapStation } from '../../components/knowalong/LineMap';

function Wrap({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const STATIONS: LineMapStation[] = [
  { id: 'privet', title: 'Приветствие', state: 'known' },
  { id: 'gen', title: 'Родительный', meta: '3 stops ahead', state: 'seen', current: true },
  { id: 'vin', title: 'Винительный', state: 'new' },
  { id: 'tvor', title: 'Творительный', state: 'locked' },
];

describe('LineMap — structure', () => {
  it('renders every station in order', () => {
    const { getByText } = render(
      <Wrap>
        <LineMap stations={STATIONS} />
      </Wrap>,
    );
    expect(getByText('Приветствие')).toBeTruthy();
    expect(getByText('Родительный')).toBeTruthy();
    expect(getByText('Винительный')).toBeTruthy();
    expect(getByText('Творительный')).toBeTruthy();
  });

  it('renders the line label when given', () => {
    const { getByText, queryByText } = render(
      <Wrap>
        <LineMap stations={STATIONS} lineLabel="Line 01 · Core" />
      </Wrap>,
    );
    expect(getByText('Line 01 · Core')).toBeTruthy();
  });

  it('first and last stops retire the outer spine (interior stops have one more spine segment)', () => {
    const { container } = render(
      <Wrap>
        <LineMap stations={STATIONS} testID="line" />
      </Wrap>,
    );
    // Per-stop testIDs let us inspect the spine columns individually.
    // The spine column is each stop's first child; its direct children
    // are [outer segment, dot well, inner segment] — the retired outer
    // segment never mounts, so terminal stops carry one less.
    const countSegments = (stopId: string) => {
      const stop = container.querySelector(`[testid="line-stop-${stopId}"]`) as HTMLElement;
      const spineCol = stop.firstElementChild as HTMLElement;
      return spineCol.children.length;
    };
    expect(countSegments('privet')).toBe(2); // first: stub + dot
    expect(countSegments('gen')).toBe(3); // interior: spine + dot + spine
    expect(countSegments('vin')).toBe(3);
    expect(countSegments('tvor')).toBe(2); // last: dot + stub
  });
});

describe('LineMap — press', () => {
  it('without onStationPress stops carry no button role', () => {
    const { queryByRole } = render(
      <Wrap>
        <LineMap stations={STATIONS} />
      </Wrap>,
    );
    expect(queryByRole('button')).toBeNull();
  });

  it('with onStationPress stops are buttons that fire with their station', () => {
    const onStationPress = vi.fn();
    const { getByLabelText } = render(
      <Wrap>
        <LineMap stations={STATIONS} onStationPress={onStationPress} />
      </Wrap>,
    );
    fireEvent.click(getByLabelText('Винительный'));
    expect(onStationPress).toHaveBeenCalledTimes(1);
    expect(onStationPress).toHaveBeenCalledWith(STATIONS[2]);
  });
});
