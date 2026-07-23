// components/MobilePremium/MobileSettingsRow.tsx
// The canonical settings row primitive for mobile premium surfaces.
//
// Layout (the whole point — one declaration, applied to every row):
//
//   ┌──────────────────────────────────────────────────────────┐
//   │ [36×36 iconBox]   Title         (optional descr)    [R]  │
//   │                                                    ↑     │
//   │                                           marginRight:12 │
//   │                                           on iconBox    │
//   └──────────────────────────────────────────────────────────┘
//
// The text column uses `flex: 1` (not `flexShrink: 1`) — this is the fix
// for indent drift. Because the text column explicitly claims all
// remaining horizontal space, the title's x-coordinate is locked at
// `iconBox.width + 12` regardless of right-element width, description
// length, or Pressable-vs-View wrapper.
//
// Icon visual: colored iconBox — 36×36 rounded square, accent-tinted
// background, 18px Lucide centered. The iconBox frame gives every glyph
// a consistent visual mass even when the glyph itself is light.
//
// API compatibility: accepts both `title`/`description`/`icon` and
// `label`/`value`/`leftIcon` prop triples (same semantics, different prop
// names). Consumers can use whichever triple fits their calling convention;
// the component resolves `title ?? label`, `description ?? value`, and
// `icon ?? leftIcon`.

import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronRight } from '@tamagui/lucide-icons-2';
import { usePressedStyle } from '../premium/shared';
import { theme, MOBILE_CONTENT_WIDTH_STYLE } from '../../constants';
import { useAppTheme } from '../../context';

export interface MobileSettingsRowProps {
  /** Icon node centered in the 36×36 iconBox. */
  icon?: React.ReactNode;
  /** Title. `title` is the primary prop name. */
  title?: string;
  /** Optional supporting description under the title. */
  description?: string;
  /** Right-aligned element. Defaults to ChevronRight when onPress is set, else null. */
  rightElement?: React.ReactNode;
  /** Label. Alternative alias for `title`. */
  label?: string;
  /** Value text. Alternative alias for `description` (rendered as muted). */
  value?: string;
  /** Left icon. Alternative alias for `icon` (rendered without the iconBox frame). */
  leftIcon?: React.ReactNode;
  /** Hide the chevron (when onPress is set but the action is non-navigational). */
  hideChevron?: boolean;
  /** When set, the row renders as a Pressable; otherwise a plain View. */
  onPress?: () => void;
  /** Red title + red-tinted iconBox. For destructive actions. */
  destructive?: boolean;
  /** IconBox tint. Default theme brand; ignored when `destructive`. */
  accentColor?: string;
  /** Suppresses the bottom hairline divider. Set on the last row in a surface. */
  isLast?: boolean;
  /** Custom accessibility label. */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const ROW_TITLE_STYLE = {
  fontSize: 15,
  fontWeight: '500',
  lineHeight: 20,
} as const;

const ROW_DESCRIPTION_STYLE = {
  fontSize: 13,
  fontWeight: '400',
  lineHeight: 17,
} as const;

/**
 * Canonical settings row. Renders an optional 36×36 iconBox + title +
 * optional description + optional right-aligned element, with a hairline
 * divider between rows.
 *
 * One declaration for every settings row — kills the per-section drift.
 */
export function MobileSettingsRow({
  icon,
  title,
  description,
  rightElement,
  label,
  value,
  leftIcon,
  hideChevron = false,
  onPress,
  destructive = false,
  accentColor,
  isLast = false,
  accessibilityLabel,
  testID,
  style,
}: MobileSettingsRowProps) {
  const { colors } = useAppTheme();
  const pressedStyle = usePressedStyle();

  const accent = destructive ? colors.status.error : (accentColor ?? colors.brand);
  const titleColor = destructive ? colors.status.error : colors.text;
  const descriptionColor = colors.textSecondary;
  const iconBoxBg = `${accent}10`;
  const hairline = colors.mobilePremium.hairlineBorder;

  const resolvedTitle = title ?? label ?? '';
  const resolvedDescription = description ?? value;
  const resolvedIcon = icon ?? leftIcon;
  const useIconBox = icon != null;

  const resolvedRight =
    rightElement !== undefined
      ? rightElement
      : onPress && !hideChevron
        ? <ChevronRight size={18} color={colors.textSecondary} />
        : null;

  const rowStyle: (ViewStyle | null)[] = [
    styles.row,
    isLast ? null : { borderBottomWidth: 1, borderBottomColor: hairline },
  ];

  const inner = (
    <>
      {resolvedIcon ? (
        useIconBox ? (
          <View style={[styles.iconBox, { backgroundColor: iconBoxBg }]}>
            {resolvedIcon}
          </View>
        ) : (
          <View style={styles.leftIconSlot}>{resolvedIcon}</View>
        )
      ) : null}
      <View style={styles.textColumn}>
        <Text style={[ROW_TITLE_STYLE, { color: titleColor }]} numberOfLines={1}>
          {resolvedTitle}
        </Text>
        {resolvedDescription ? (
          <Text
            style={[ROW_DESCRIPTION_STYLE, { color: descriptionColor }]}
            numberOfLines={1}
          >
            {resolvedDescription}
          </Text>
        ) : null}
      </View>
      {resolvedRight !== null ? (
        <View style={styles.right}>{resolvedRight}</View>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...rowStyle, pressed ? pressedStyle : null, style]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View style={[...rowStyle, style]} accessibilityLabel={accessibilityLabel} testID={testID}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  // Defensive standalone cap. Rows LIVE inside the column rather than
  // defining its boundary — MobileSurface is the canonical column site
  // for a settings group — but MobileSettingsRow is also used directly
  // on standalone surfaces. Preserving the cap on the row itself
  // (carried over from the pre-policy `maxWidth: 420` literal) keeps
  // standalone usage mobile-shaped without relying on every caller
  // wrapping the row. In fluid mode the cap collapses; the row fills
  // whatever width its container provides.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 56,
    ...MOBILE_CONTENT_WIDTH_STYLE,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  leftIconSlot: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
    flexDirection: 'column',
  },
  right: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export default MobileSettingsRow;
