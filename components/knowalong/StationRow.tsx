// components/knowalong/StationRow.tsx
//
// NIGHT METRO — the station row: the list-row voice of the line map. A
// single stop rendered as a row — state dot (ring when current) + the
// station name + an optional PT Mono ledger line + an optional right
// slot (chevron, count chip). For lists that are stops on a route but
// don't carry the spine (deck contents, search results, mistakes).
//
// The row's visual language is LineMap's: same dot geometry, same
// stationColor mapping, same type voices — the two components read as
// one system. Presentational; press handling is the consumer's.

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { theme } from '../../constants';
import { useAppTheme } from '../../context';
import { stationColor, stationTitleColor, type StationState } from './nightMetro';

export interface StationRowProps {
  /** The station name. */
  title: string;
  /** Optional ledger line under the name. */
  meta?: string;
  /** Service state — the dot's color. */
  state: StationState;
  /** The train is here — the current stop gets the ring. */
  current?: boolean;
  /** When set, the row is a button. */
  onPress?: () => void;
  /** Optional right slot (chevron, count chip). */
  right?: React.ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function StationRow({
  title,
  meta,
  state,
  current,
  onPress,
  right,
  testID,
  style,
}: StationRowProps) {
  const { colors } = useAppTheme();
  const c = stationColor(colors, state);
  const pressable = typeof onPress === 'function';

  const body = (
    <>
      <View
        testID={testID != null ? `${testID}-dot` : undefined}
        style={[
          styles.dotWell,
          { borderColor: current === true ? c + '55' : 'transparent' },
        ]}
      >
        <View
          style={[styles.dot, current === true ? styles.dotLit : null, { backgroundColor: c }]}
        />
      </View>
      <View style={styles.textBlock}>
        <Text
          style={[styles.title, { color: stationTitleColor(colors, state) }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {meta != null ? (
          <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {right != null ? <View style={styles.right}>{right}</View> : null}
    </>
  );

  if (pressable) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={meta != null ? `${title} — ${meta}` : title}
        style={({ pressed }) => [styles.row, style, pressed ? { opacity: 0.6 } : null]}
      >
        {body}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={[styles.row, style]}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  dotWell: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotLit: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...theme.typography.mobileItemTitle,
    fontSize: 15,
    lineHeight: 20,
  },
  meta: {
    ...theme.typography.mobileLedger,
    fontSize: 11,
    lineHeight: 15,
  },
  right: {
    alignItems: 'flex-end',
  },
});

export default StationRow;
