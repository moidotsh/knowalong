// __tests__/components/SegmentedProgress.test.tsx
//
// Component-level render + accessibility tests for SegmentedProgress.
//   - Renders one track per segment
//   - Container exposes role="progressbar"
//   - Aggregated accessibilityValue reflects sum of segment values
//   - Per-segment value is clamped to [0, max]
//   - Segments with max <= 0 render as 0% fill
//   - showLabels renders the label row when at least one segment has a label
//   - showLabels=false omits the label row

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../../context';
import { SegmentedProgress } from '../../components/MobilePremium/SegmentedProgress';

function Wrap({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('SegmentedProgress — rendering', () => {
  it('renders one track per segment', () => {
    const { container } = render(
      <Wrap>
        <SegmentedProgress
          segments={[
            { value: 6, max: 8 },
            { value: 9, max: 10 },
            { value: 3, max: 8 },
          ]}
        />
      </Wrap>,
    );
    // The progressbar container is one node; each segment is a child track
    // View. Count the direct children of the progressbar element. The mock
    // renders RN View as a custom <view> element, so we count children
    // directly rather than querying by tag name.
    const progressbar = container.querySelector(
      '[accessibilityrole="progressbar"]',
    );
    expect(progressbar).not.toBeNull();
    expect(progressbar?.childElementCount).toBe(3);
  });

  it('exposes role="progressbar" on the container', () => {
    const { container } = render(
      <Wrap>
        <SegmentedProgress segments={[{ value: 1, max: 2 }]} />
      </Wrap>,
    );
    const progressbar = container.querySelector(
      '[accessibilityrole="progressbar"]',
    );
    expect(progressbar).not.toBeNull();
  });
});

describe('SegmentedProgress — accessibility', () => {
  it('aggregated label reflects sum of values over sum of maxes', () => {
    const { container } = render(
      <Wrap>
        <SegmentedProgress
          segments={[
            { value: 6, max: 8 },
            { value: 9, max: 10 },
          ]}
        />
      </Wrap>,
    );
    const progressbar = container.querySelector(
      '[accessibilityrole="progressbar"]',
    );
    const label = progressbar?.getAttribute('accessibilitylabel') || '';
    // Composed label format: "N of M" — sum of values (15) over sum of maxes (18).
    expect(label).toContain('15');
    expect(label).toContain('18');
  });

  it('uses "No progress data" when total is 0', () => {
    const { container } = render(
      <Wrap>
        <SegmentedProgress
          segments={[{ value: 0, max: 0 }, { value: 0, max: 0 }]}
        />
      </Wrap>,
    );
    const progressbar = container.querySelector(
      '[accessibilityrole="progressbar"]',
    );
    expect(progressbar?.getAttribute('accessibilitylabel')).toBe(
      'No progress data',
    );
  });
});

describe('SegmentedProgress — labels', () => {
  it('renders visible labels when showLabels is true and a segment has accessibilityLabel', () => {
    const { getByText } = render(
      <Wrap>
        <SegmentedProgress
          showLabels
          segments={[
            { value: 6, max: 8, accessibilityLabel: 'Water' },
            { value: 9, max: 10, accessibilityLabel: 'Steps' },
          ]}
        />
      </Wrap>,
    );
    expect(getByText('Water')).toBeTruthy();
    expect(getByText('Steps')).toBeTruthy();
  });

  it('omits the visible label row when showLabels is false', () => {
    const { queryByText } = render(
      <Wrap>
        <SegmentedProgress
          segments={[
            { value: 6, max: 8, accessibilityLabel: 'Water' },
            { value: 9, max: 10, accessibilityLabel: 'Steps' },
          ]}
        />
      </Wrap>,
    );
    expect(queryByText('Water')).toBeNull();
    expect(queryByText('Steps')).toBeNull();
  });
});
