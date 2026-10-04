// components/MobilePremium/MobileFootnote.tsx
//
// Page-tail colophon — the quiet close of a surface: small-print lines
// (legal, tax, attribution) and an optional children slot for link rows
// (policies, contact, hours). Purely presentational; the consumer owns
// the content. Reads as printed matter: hairline rule, muted small
// type, centered in the content column.

import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '../../context';

export interface MobileFootnoteProps {
  /** Small-print lines rendered under a hairline rule. */
  lines?: string[];
  /** Optional slot above the lines — link rows, hours, contact. */
  children?: React.ReactNode;
  /** Test ID. */
  testID?: string;
  /** Outer style pass-through. */
  style?: StyleProp<ViewStyle>;
}

export function MobileFootnote({ lines, children, testID, style }: MobileFootnoteProps) {
  const { colors } = useAppTheme();

  return (
    <View
      testID={testID}
      style={[styles.shell, { borderColor: colors.cardBorder }, style]}
      accessibilityLabel="Footnote"
    >
      {children != null ? <View style={styles.links}>{children}</View> : null}
      {lines != null && lines.length > 0 ? (
        <View style={styles.lines}>
          {lines.map((line) => (
            <Text key={line} style={[styles.line, { color: colors.textMuted }]}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    borderTopWidth: 1,
    paddingTop: 16,
    paddingBottom: 8,
  },
  links: {
    gap: 4,
    marginBottom: 12,
  },
  lines: {
    gap: 4,
  },
  line: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});

export default MobileFootnote;
