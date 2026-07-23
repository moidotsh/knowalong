// components/knowalong/AnalysisStageRail.tsx
// Fixed stage labels for the source analysis (9) and CLCC (5) pipelines.
// Renders a check for completed stages, a filled dot for the current stage,
// and an empty dot for pending stages. Drives off `stageIndex` from the
// companion status response (or the latest event's stage field).

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../context';

interface Props {
  runType: 'source_analysis' | 'clcc_generation';
  stageIndex: number | null;
  stageName?: string | null;
  /** When true, every stage renders as complete (terminal awaiting_review). */
  allComplete?: boolean;
}

const STAGES_SOURCE = [
  'sections',
  'segments',
  'translations',
  'lemmas',
  'forms',
  'tokens',
  'morphology',
  'grammar_and_concepts',
  'cards',
];
const STAGES_CLCC = ['profile', 'realizations', 'examples', 'validation', 'summary'];

function humanize(stage: string): string {
  const map: Record<string, string> = {
    sections: 'Sections',
    segments: 'Segments',
    translations: 'Translations',
    lemmas: 'Lemmas',
    forms: 'Forms',
    tokens: 'Tokens',
    morphology: 'Morphology',
    grammar_and_concepts: 'Grammar + concepts',
    cards: 'Study cards',
    profile: 'Profile',
    realizations: 'Realizations',
    examples: 'Examples',
    validation: 'Validation',
    summary: 'Summary',
  };
  return map[stage] ?? stage;
}

export function AnalysisStageRail({ runType, stageIndex, stageName, allComplete }: Props) {
  const { colors } = useAppTheme();
  const stages = runType === 'clcc_generation' ? STAGES_CLCC : STAGES_SOURCE;
  const currentIdx =
    stageIndex !== null
      ? stageIndex
      : stageName
        ? Math.max(0, stages.indexOf(stageName))
        : -1;

  return (
    <View style={styles.rail}>
      {stages.map((stage, i) => {
        const isDone = allComplete || (currentIdx >= 0 && i < currentIdx);
        const isCurrent = !allComplete && currentIdx === i;
        const labelColor = isDone
          ? colors.status.success
          : isCurrent
            ? colors.brand
            : colors.textMuted;
        return (
          <View key={stage} style={styles.row}>
            <Text
              accessibilityLabel={`${humanize(stage)} ${isDone ? 'done' : isCurrent ? 'in progress' : 'pending'}`}
              style={[styles.glyph, { color: labelColor }]}
            >
              {isDone ? '✓' : isCurrent ? '●' : '○'}
            </Text>
            <Text
              style={[
                styles.label,
                {
                  color: isDone || isCurrent ? colors.text : colors.textMuted,
                  fontWeight: isCurrent ? '600' : '400',
                },
              ]}
            >
              {humanize(stage)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  glyph: {
    fontSize: 13,
    width: 14,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
  },
});
