// components/knowalong/AnalysisProgressCard.tsx
// Persistent compact progress card shown while an analysis or CLCC run is
// active. Reads the run + the latest event to render:
//   - run type label (Source analysis / CLCC generation)
//   - current stage label + (i/n)
//   - progress bar (stageIndex / stageCount)
//   - most recent sanitized message

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MobileSurface } from '../MobilePremium';
import { useAppTheme } from '../../context';
import type { AnalysisRun, AnalysisEvent } from '../../shared/types/knowalong';
import type { CompanionJobStatusResponse } from '../../shared/types/knowalong';

interface Props {
  run: AnalysisRun | null | undefined;
  companionStatus?: CompanionJobStatusResponse | null;
  latestEvent?: AnalysisEvent | null;
}

const STAGE_LABELS_SOURCE = [
  'Sections',
  'Segments',
  'Translations',
  'Lemmas',
  'Forms',
  'Tokens',
  'Morphology',
  'Grammar + concepts',
  'Study cards',
];
const STAGE_LABELS_CLCC = ['Profile', 'Realizations', 'Examples', 'Validation', 'Summary'];

function terminalLabel(status: string): string {
  if (status === 'awaiting_review') return 'Analysis complete — review required';
  if (status === 'failed') return 'Analysis failed';
  if (status === 'cancelled') return 'Analysis cancelled';
  return status;
}

export function AnalysisProgressCard({ run, companionStatus, latestEvent }: Props) {
  const { colors } = useAppTheme();
  if (!run) {
    return null;
  }
  const isClcc = run.runType === 'clcc_generation';
  const stageLabels = isClcc ? STAGE_LABELS_CLCC : STAGE_LABELS_SOURCE;
  const stageCount = companionStatus?.stageCount ?? stageLabels.length;
  const stageIndex = companionStatus?.stageIndex ?? null;
  const stageName =
    companionStatus?.stage ?? latestEvent?.stage ?? (stageIndex !== null ? stageLabels[stageIndex] : null);
  const isTerminal = ['awaiting_review', 'failed', 'cancelled'].includes(run.status);
  const fraction = stageIndex !== null && stageCount > 0 ? (stageIndex + 1) / stageCount : 0;

  return (
    <MobileSurface padding={14}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isClcc ? 'CLCC generation' : 'Source analysis'}
        </Text>
        <Text style={[styles.stageIndex, { color: colors.textSecondary }]}>
          {isTerminal
            ? terminalLabel(run.status)
            : stageIndex !== null
              ? `Stage ${stageIndex + 1} of ${stageCount}`
              : 'Starting…'}
        </Text>
      </View>
      <View style={styles.barOuter}>
        <View
          style={[
            styles.barInner,
            {
              width: `${Math.round((isTerminal ? 1 : fraction) * 100)}%`,
              backgroundColor: colors.brand,
            },
          ]}
        />
      </View>
      <Text style={[styles.stageName, { color: colors.textSecondary }]} numberOfLines={2}>
        {isTerminal ? terminalLabel(run.status) : (stageName ?? 'Preparing…')}
      </Text>
      {latestEvent && latestEvent.message ? (
        <Text style={[styles.message, { color: colors.textMuted }]} numberOfLines={3}>
          {latestEvent.message}
        </Text>
      ) : null}
      {run.status === 'failed' && run.failureReason ? (
        <Text style={[styles.failureReason, { color: colors.status.error }]}>
          {run.failureReason}
        </Text>
      ) : null}
    </MobileSurface>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  stageIndex: {
    fontSize: 12,
    fontWeight: '500',
  },
  barOuter: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(127,127,127,0.18)',
    overflow: 'hidden',
  },
  barInner: {
    height: 4,
    borderRadius: 2,
  },
  stageName: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 10,
  },
  message: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  failureReason: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
});
