// components/knowalong/AnalysisEventTimeline.tsx
// Expandable sanitized event timeline from useAnalysisRunEvents. Never
// displays raw model chain-of-thought — the source events are already
// sanitized (the companion emits structured messages, not raw model output).
// Severity-coloured glyph per row; stage label eyebrow; message body.

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MobileSurface, MobileSectionEyebrow } from '../MobilePremium';
import { useAppTheme } from '../../context';
import type { AnalysisEvent } from '../../shared/types/knowalong';

interface Props {
  events: AnalysisEvent[];
  /** Optional cap on rendered rows; older events beyond the cap are hidden until expanded. */
  initialCap?: number;
}

function severityGlyph(severity: AnalysisEvent['severity']): string {
  switch (severity) {
    case 'stage_start':
      return '▸';
    case 'stage_complete':
      return '✓';
    case 'stage_failed':
      return '✗';
    case 'warning':
      return '!';
    case 'error':
      return '✗';
    default:
      return '·';
  }
}

export function AnalysisEventTimeline({ events, initialCap = 12 }: Props) {
  const { colors } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const ordered = [...events].sort((a, b) => a.ordinal - b.ordinal);
  const visible = expanded ? ordered : ordered.slice(-initialCap);
  const hiddenCount = ordered.length - visible.length;

  return (
    <View>
      <MobileSectionEyebrow>Timeline ({ordered.length})</MobileSectionEyebrow>
      {ordered.length === 0 ? (
        <MobileSurface padding={12}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Events will appear here as the analysis progresses.
          </Text>
        </MobileSurface>
      ) : (
        <MobileSurface padding={12}>
          {hiddenCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setExpanded(true)}
              style={styles.expandRow}
            >
              <Text style={[styles.expandLabel, { color: colors.brand }]}>
                Show {hiddenCount} earlier event{hiddenCount === 1 ? '' : 's'}
              </Text>
            </Pressable>
          ) : null}
          {visible.map((event) => {
            const isErrorLike =
              event.severity === 'error' ||
              event.severity === 'stage_failed' ||
              event.severity === 'warning';
            const glyphColor = isErrorLike
              ? event.severity === 'warning'
                ? colors.status.warning
                : colors.status.error
              : event.severity === 'stage_complete'
                ? colors.status.success
                : colors.textSecondary;
            return (
              <View key={`${event.ordinal}`} style={styles.timelineRow}>
                <Text style={[styles.glyph, { color: glyphColor }]}>
                  {severityGlyph(event.severity)}
                </Text>
                <View style={styles.body}>
                  {event.stage ? (
                    <Text style={[styles.stageLabel, { color: colors.textSecondary }]}>
                      {event.stage}
                    </Text>
                  ) : null}
                  <Text style={[styles.message, { color: colors.text }]} numberOfLines={4}>
                    {event.message}
                  </Text>
                </View>
              </View>
            );
          })}
          {!expanded && ordered.length > initialCap ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setExpanded(true)}
              style={[styles.expandRow, { marginTop: 8 }]}
            >
              <Text style={[styles.expandLabel, { color: colors.brand }]}>
                Show all {ordered.length} events
              </Text>
            </Pressable>
          ) : null}
          {expanded && ordered.length > initialCap ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setExpanded(false)}
              style={[styles.expandRow, { marginTop: 8 }]}
            >
              <Text style={[styles.expandLabel, { color: colors.brand }]}>Collapse</Text>
            </Pressable>
          ) : null}
        </MobileSurface>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    fontSize: 13,
  },
  expandRow: {
    paddingVertical: 4,
  },
  expandLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
  },
  glyph: {
    fontSize: 13,
    width: 14,
    lineHeight: 18,
    textAlign: 'center',
  },
  body: {
    flex: 1,
  },
  stageLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
});
