// components/premium/shared/useFieldChrome.ts
// The field-chrome mapping shared by the kit's form trio (MobileInput,
// MobileSelect, DatePickerField): how border / background / label color
// respond to focus and error. One mapping, three primitives — the form
// rhythm stays in lockstep by construction.
import { useMemo } from 'react';
import { MOBILE_CONTENT_WIDTH_STYLE } from '../../../constants';
import { useAppTheme } from '../../../context';

export interface FieldChromeOptions {
  /** Focus state (the open flag doubles as focus for press-trigger fields). */
  focused: boolean;
  /** Error state — outranks focus. */
  hasError?: boolean;
  /** Accent (default theme brand). */
  accent?: string;
}

export interface FieldChrome {
  borderColor: string;
  backgroundColor: string;
  labelColor: string;
}

export function useFieldChrome({ focused, hasError = false, accent }: FieldChromeOptions): FieldChrome {
  const { colors } = useAppTheme();
  const a = accent ?? colors.brand;
  return useMemo(() => {
    const borderColor = hasError ? colors.status.error : focused ? `${a}66` : colors.glass.emptyInputBorder;
    const backgroundColor = hasError
      ? `${colors.status.error}0a`
      : focused
        ? colors.glass.inputFocusBackground
        : colors.glass.inputBackground;
    const labelColor = hasError ? colors.status.error : focused ? a : colors.text;
    return { borderColor, backgroundColor, labelColor };
    // Colors object identity changes with the resolved palette — deps stay
    // coarse on purpose so palette flips recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, hasError, a, colors]);
}

/**
 * The shared field-group layout: label + control rhythm, the mobile
 * content-width policy, slot-filling alignSelf, and the 16px tail gap.
 * Spread into the outer View's style array — identical in all three
 * field primitives.
 */
export const FIELD_GROUP_STYLE = {
  gap: 6,
  ...MOBILE_CONTENT_WIDTH_STYLE,
  // Fill the slot: the width policy centers cross-axis, which in a row
  // pair vertically floats the shorter field off the top edge.
  alignSelf: 'stretch',
  marginBottom: 16,
} as const;
