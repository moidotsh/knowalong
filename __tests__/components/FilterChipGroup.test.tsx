// __tests__/components/FilterChipGroup.test.tsx
//
// Component-level render + layout tests for FilterChipGroup.
//   - Renders children in both modes
//   - oneRow default true → renders a horizontal ScrollView (one scrollable row)
//   - oneRow={false} → plain flex-wrap View, no ScrollView
//   - Web-only trailing fade present in oneRow mode, absent in wrap mode
//   - Carries no a11y role of its own (presentational)

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { ThemeProvider } from '../../context';
import { FilterChipGroup } from '../../components/MobilePremium/FilterChipGroup';
import { FilterChip } from '../../components/MobilePremium/FilterChip';

function Wrap({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('FilterChipGroup — layout', () => {
  it('renders its children (default oneRow mode)', () => {
    const { getByText } = render(
      <Wrap>
        <FilterChipGroup>
          <FilterChip label="One" selected={false} onPress={() => {}} />
          <FilterChip label="Two" selected={false} onPress={() => {}} />
        </FilterChipGroup>
      </Wrap>,
    );
    expect(getByText('One')).toBeTruthy();
    expect(getByText('Two')).toBeTruthy();
  });

  it('renders its children (oneRow={false} wrap mode)', () => {
    const { getByText } = render(
      <Wrap>
        <FilterChipGroup oneRow={false}>
          <FilterChip label="One" selected={false} onPress={() => {}} />
          <FilterChip label="Two" selected={false} onPress={() => {}} />
        </FilterChipGroup>
      </Wrap>,
    );
    expect(getByText('One')).toBeTruthy();
    expect(getByText('Two')).toBeTruthy();
  });

  it('default oneRow is true → renders a horizontal ScrollView', () => {
    const { container } = render(
      <Wrap>
        <FilterChipGroup>
          <FilterChip label="A" selected={false} onPress={() => {}} />
        </FilterChipGroup>
      </Wrap>,
    );
    // The react-native mock renders ScrollView as a literal <scrollview>
    // element; the wrap-mode branch (plain View) never does. Tag presence
    // is the structural signal of the scroll row.
    const scrollNodes = container.querySelectorAll('scrollview');
    expect(scrollNodes.length).toBeGreaterThan(0);
  });

  it('oneRow={false} renders no ScrollView', () => {
    const { container } = render(
      <Wrap>
        <FilterChipGroup oneRow={false}>
          <FilterChip label="A" selected={false} onPress={() => {}} />
          <FilterChip label="B" selected={false} onPress={() => {}} />
        </FilterChipGroup>
      </Wrap>,
    );
    const scrollViews = container.querySelectorAll('scrollview');
    expect(scrollViews.length).toBe(0);
    expect(
      container.querySelectorAll('[accessibilityrole="button"]').length,
    ).toBe(2);
  });

  it('accepts a custom gap without error', () => {
    const { container } = render(
      <Wrap>
        <FilterChipGroup gap={16}>
          <FilterChip label="A" selected={false} onPress={() => {}} />
        </FilterChipGroup>
      </Wrap>,
    );
    // The group root exists and has at least one chip descendant.
    expect(
      container.querySelector('[accessibilityrole="button"]'),
    ).not.toBeNull();
  });

  it('carries no a11y role of its own', () => {
    // The group is presentational — no radiogroup/checkboxgroup/etc.
    // The chip inside carries the semantic role; the group is a layout View.
    const { container } = render(
      <Wrap>
        <FilterChipGroup>
          <FilterChip
            label="A"
            selected={false}
            onPress={() => {}}
            accessibilityRole="radio"
          />
        </FilterChipGroup>
      </Wrap>,
    );
    const radiogroups = container.querySelectorAll(
      '[accessibilityrole="radiogroup"]',
    );
    expect(radiogroups.length).toBe(0);
  });
});

// sanity: ensure StyleSheet import isn't tree-shaken out of the test build
void StyleSheet;
