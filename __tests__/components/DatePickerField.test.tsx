// __tests__/components/DatePickerField.test.tsx
//
// Component-level render + interaction tests for DatePickerField.
// The web branch now renders a styled Pressable trigger that opens a
// MobileSheet hosting <CalendarGrid>; the native branch keeps the community
// DateTimePicker spinner. Tests cover:
//   - Label rendering
//   - Trigger label shows the YYYY-MM-DD value or the placeholder
//   - Pressing the trigger opens the sheet
//   - CalendarGrid renders inside the sheet with month/day-of-week structure
//   - Tapping a day cell fires onChange with the YYYY-MM-DD string
//   - Cancel does not commit; Done commits the draft
//   - Renders errorText when provided; helperText when no errorText

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../../context';
import { DatePickerField } from '../../components/MobilePremium/DatePickerField';

function Wrap({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function openSheet(container: HTMLElement) {
  const trigger = container.querySelector(
    '[accessibilityrole="button"]',
  ) as Element | null;
  if (!trigger) throw new Error('trigger not found');
  fireEvent.click(trigger);
}

describe('DatePickerField — trigger rendering', () => {
  it('renders the label text', () => {
    const { getByText } = render(
      <Wrap>
        <DatePickerField label="Start date" value="2026-07-19" onChange={() => {}} />
      </Wrap>,
    );
    expect(getByText('Start date')).toBeTruthy();
  });

  it('shows the value in the trigger label when set', () => {
    const { getByText } = render(
      <Wrap>
        <DatePickerField label="d" value="2026-07-19" onChange={() => {}} />
      </Wrap>,
    );
    expect(getByText('2026-07-19')).toBeTruthy();
  });

  it('shows the placeholder when value is null', () => {
    const { getByText } = render(
      <Wrap>
        <DatePickerField label="d" value={null} onChange={() => {}} placeholder="Pick a day" />
      </Wrap>,
    );
    expect(getByText('Pick a day')).toBeTruthy();
  });
});

describe('DatePickerField — sheet + calendar grid', () => {
  it('opens the sheet on trigger press and renders the calendar grid header', () => {
    const { container, getByText } = render(
      <Wrap>
        <DatePickerField label="Start date" value={null} onChange={() => {}} />
      </Wrap>,
    );
    openSheet(container);
    // CalendarGrid renders "Previous month" / "Next month" as accessibility
    // labels (not visible text) on the nav chevrons. The Today affordance is
    // always present as visible text.
    expect(
      container.querySelector('[accessibilitylabel="Previous month"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[accessibilitylabel="Next month"]'),
    ).not.toBeNull();
    expect(getByText('Today')).toBeTruthy();
  });

  it('renders day-of-week headers (Su Mo ... Sa)', () => {
    const { container, getByText } = render(
      <Wrap>
        <DatePickerField label="d" value={null} onChange={() => {}} />
      </Wrap>,
    );
    openSheet(container);
    expect(getByText('Su')).toBeTruthy();
    expect(getByText('Sa')).toBeTruthy();
  });

  it('fires onChange with YYYY-MM-DD when a day cell is tapped and Done is pressed', () => {
    const onChange = vi.fn();
    const { container, getByText } = render(
      <Wrap>
        <DatePickerField label="d" value={null} onChange={onChange} />
      </Wrap>,
    );
    openSheet(container);

    // Tap any enabled day cell — the first day cell renders the literal "1".
    const dayOne = getByText('1');
    fireEvent.click(dayOne);

    // Then tap Done to commit the draft.
    const doneButtons = Array.from(container.querySelectorAll('pressable'));
    const done = doneButtons.find((el) => el.textContent === 'Done');
    if (!done) throw new Error('Done button not found');
    fireEvent.click(done);

    expect(onChange).toHaveBeenCalledTimes(1);
    const arg = onChange.mock.calls[0][0];
    expect(typeof arg).toBe('string');
    expect(arg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('does NOT fire onChange when Cancel is pressed after a day tap', () => {
    const onChange = vi.fn();
    const { container, getByText } = render(
      <Wrap>
        <DatePickerField label="d" value={null} onChange={onChange} />
      </Wrap>,
    );
    openSheet(container);

    const dayOne = getByText('1');
    fireEvent.click(dayOne);

    const cancel = Array.from(container.querySelectorAll('pressable')).find(
      (el) => el.textContent === 'Cancel',
    );
    if (!cancel) throw new Error('Cancel button not found');
    fireEvent.click(cancel);

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('DatePickerField — messaging', () => {
  it('renders errorText when provided', () => {
    const { getByText } = render(
      <Wrap>
        <DatePickerField
          label="d"
          value={null}
          onChange={() => {}}
          errorText="Date is required."
        />
      </Wrap>,
    );
    expect(getByText('Date is required.')).toBeTruthy();
  });

  it('renders helperText when no errorText is provided', () => {
    const { getByText } = render(
      <Wrap>
        <DatePickerField
          label="d"
          value={null}
          onChange={() => {}}
          helperText="Local date — no UTC drift."
        />
      </Wrap>,
    );
    expect(getByText('Local date — no UTC drift.')).toBeTruthy();
  });
});
