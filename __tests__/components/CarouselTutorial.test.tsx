// __tests__/components/CarouselTutorial.test.tsx
//
// Component-level render + accessibility tests for CarouselTutorial.
//   - Renders the first slide on mount
//   - Next button advances the active slide
//   - Back button is hidden on the first slide
//   - Next button becomes Done on the last slide
//   - Done fires onComplete
//   - Dot row exposes role="progressbar"
//   - onSlideChange fires with the new index on navigation

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../../context';
import { CarouselTutorial } from '../../components/MobilePremium/CarouselTutorial';

function Wrap({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const SLIDES = [
  {
    id: 'slide-1',
    content: <div>Slide one</div>,
    accessibilityLabel: 'First slide',
  },
  {
    id: 'slide-2',
    content: <div>Slide two</div>,
    accessibilityLabel: 'Second slide',
  },
  {
    id: 'slide-3',
    content: <div>Slide three</div>,
    accessibilityLabel: 'Third slide',
  },
];

describe('CarouselTutorial — rendering', () => {
  it('renders the first slide on mount', () => {
    const { getByText } = render(
      <Wrap>
        <CarouselTutorial slides={SLIDES} />
      </Wrap>,
    );
    expect(getByText('Slide one')).toBeTruthy();
  });

  it('dot row exposes role="progressbar" with current position', () => {
    const { container } = render(
      <Wrap>
        <CarouselTutorial slides={SLIDES} />
      </Wrap>,
    );
    const progressbar = container.querySelector(
      '[accessibilityrole="progressbar"]',
    );
    expect(progressbar).not.toBeNull();
    expect(progressbar?.getAttribute('accessibilitylabel')).toBe(
      'Slide 1 of 3',
    );
  });
});

describe('CarouselTutorial — navigation', () => {
  it('Next advances to the next slide', () => {
    const onSlideChange = vi.fn();
    const { getByText } = render(
      <Wrap>
        <CarouselTutorial slides={SLIDES} onSlideChange={onSlideChange} />
      </Wrap>,
    );
    fireEvent.click(getByText('Next'));
    expect(getByText('Slide two')).toBeTruthy();
    expect(onSlideChange).toHaveBeenCalledWith(1);
  });

  it('Back is hidden on the first slide', () => {
    const { queryByText } = render(
      <Wrap>
        <CarouselTutorial slides={SLIDES} />
      </Wrap>,
    );
    expect(queryByText('Back')).toBeNull();
  });

  it('Next becomes Done on the last slide', () => {
    const { getByText } = render(
      <Wrap>
        <CarouselTutorial slides={[SLIDES[0]]} />
      </Wrap>,
    );
    expect(getByText('Done')).toBeTruthy();
  });

  it('Done fires onComplete', () => {
    const onComplete = vi.fn();
    const { getByText } = render(
      <Wrap>
        <CarouselTutorial slides={[SLIDES[0]]} onComplete={onComplete} />
      </Wrap>,
    );
    fireEvent.click(getByText('Done'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('Back returns to the previous slide', () => {
    const { getByText } = render(
      <Wrap>
        <CarouselTutorial slides={SLIDES} initialIndex={1} />
      </Wrap>,
    );
    // Start on slide 2 (index 1). Back should return to slide 1.
    expect(getByText('Slide two')).toBeTruthy();
    fireEvent.click(getByText('Back'));
    expect(getByText('Slide one')).toBeTruthy();
  });
});
