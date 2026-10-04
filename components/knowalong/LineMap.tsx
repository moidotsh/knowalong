// components/knowalong/LineMap.tsx
//
// NIGHT METRO — the line map: a vertical transit spine with station dots,
// colored by service state (nightMetro.stationColor). The learner's route
// rendered as a metro line — mastered stops are served (green), the
// current stop is the lit amber station with its ring, stumbled stops
// carry the signal red, and beyond-the-terminus stops sit unlit.
//
// The one layout trick: the spine is drawn PER ROW (a segment above and
// below each dot) rather than as one absolute rail — first/last rows
// retire their outer segment, so the line starts at the first station
// and ends at the last without measuring anything.
//
// Presentational: stations come in as data; press handling is the
// consumer's. All color reads go through the live palette.

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

export interface LineMapStation {
  /** Stable key — also the per-stop testID suffix (`${testID}-stop-${id}`). */
  id: string;
  /** The station name (the concept, lesson, deck). */
  title: string;
  /** Optional ledger line under the name (a gloss, a count). */
  meta?: string;
  /** Service state — the dot's color. */
  state: StationState;
  /** The train is here — the current stop gets the amber-style ring. */
  current?: boolean;
}

export interface LineMapProps {
  /** Stops in service order (top → bottom). */
  stations: LineMapStation[];
  /** When set, every stop is pressable (opened by the consumer). */
  onStationPress?: (station: LineMapStation) => void;
  /** Optional line code above the map ("LINE 01 · CORE"), PT Mono. */
  lineLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function LineMap({
  stations,
  onStationPress,
  lineLabel,
  testID,
  style,
}: LineMapProps) {
  const { colors } = useAppTheme();
  const pressable = typeof onStationPress === 'function';

  return (
    <View testID={testID} style={[styles.line, style]}>
      {lineLabel != null ? (
        <Text style={[styles.lineLabel, { color: colors.textMuted }]}>{lineLabel}</Text>
      ) : null}
      {stations.map((station, i) => {
        const c = stationColor(colors, station.state);
        const isFirst = i === 0;
        const isLast = i === stations.length - 1;
        const label = station.meta != null ? `${station.title} — ${station.meta}` : station.title;
        return (
          <Pressable
            key={station.id}
            testID={testID != null ? `${testID}-stop-${station.id}` : undefined}
            onPress={pressable ? () => onStationPress(station) : undefined}
            disabled={!pressable}
            accessibilityRole={pressable ? 'button' : undefined}
            accessibilityLabel={label}
            style={({ pressed }) => [styles.stop, pressed && pressable ? { opacity: 0.6 } : null]}
          >
            {/* The spine column — segments + the dot well (fixed size so
                ringed and plain dots occupy the same column). The outer
                segment on the first/last stop never mounts: the line
                starts at the first station and ends at the last. */}
            <View style={styles.spineCol}>
              {isFirst ? null : (
                <View style={[styles.spine, { backgroundColor: colors.border }]} />
              )}
              <View
                style={[
                  styles.dotWell,
                  { borderColor: station.current === true ? c + '55' : 'transparent' },
                ]}
              >
                <View
                  style={[styles.dot, station.current === true ? styles.dotLit : null, { backgroundColor: c }]}
                />
              </View>
              {isLast ? null : (
                <View style={[styles.spine, { backgroundColor: colors.border }]} />
              )}
            </View>
            <View style={styles.stopText}>
              <Text
                style={[styles.stopTitle, { color: stationTitleColor(colors, station.state) }]}
                numberOfLines={1}
              >
                {station.title}
              </Text>
              {station.meta != null ? (
                <Text style={[styles.stopMeta, { color: colors.textMuted }]} numberOfLines={1}>
                  {station.meta}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    gap: 0,
  },
  lineLabel: {
    ...theme.typography.mobileEyebrow,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingLeft: 34,
  },
  stop: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  spineCol: {
    width: 24,
    alignItems: 'center',
  },
  spine: {
    width: 2,
    flex: 1,
  },
  dotWell: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 5,
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
  stopText: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 2,
  },
  stopTitle: {
    ...theme.typography.mobileItemTitle,
    fontSize: 15,
    lineHeight: 20,
  },
  stopMeta: {
    ...theme.typography.mobileLedger,
    fontSize: 11,
    lineHeight: 15,
  },
});

export default LineMap;
