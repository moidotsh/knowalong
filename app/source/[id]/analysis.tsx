// app/source/[id]/analysis.tsx
// Per-source analysis landing. Companion chip (status), Start CTA, prior
// runs list with delete-run action.

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobileSectionEyebrow,
  MobileActionFooter,
  MobilePrimaryButton,
  EmptyState,
} from '../../../components/MobilePremium';
import { useAppTheme } from '../../../context';
import { safeGoBack, navigateToAnalysisRun } from '../../../navigation';
import { SCREEN_BODY_STYLE } from '../../../constants';
import {
  useLearningSource,
  useSourceAnalysisRuns,
  useCompanionCredential,
  useStartSourceAnalysis,
  useDeleteAnalysisRun,
} from '../../../hooks';
import { CompanionStatusChip } from '../../../components/knowalong';

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export default function SourceAnalysisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sourceId = Array.isArray(id) ? id[0] : id;
  const { colors } = useAppTheme();

  const { data: source } = useLearningSource(sourceId);
  const credentialQuery = useCompanionCredential();
  const runsQuery = useSourceAnalysisRuns(sourceId);
  const startMutation = useStartSourceAnalysis();
  const deleteMutation = useDeleteAnalysisRun();

  const runs = runsQuery.data ?? [];
  const hasCredential = !!credentialQuery.data?.hasCredential;
  const canStart = hasCredential && !startMutation.isPending;

  const onStart = () => {
    if (!sourceId) return;
    startMutation.mutate(
      { sourceId },
      {
        onSuccess: (data) => {
          if (sourceId && data && typeof data === 'object' && 'status' in data && data.status === 'ok') {
            navigateToAnalysisRun(sourceId, data.runId);
          }
        },
      },
    );
  };

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: colors.backgroundDeep }]}
      edges={['top', 'bottom']}
    >
      <MobileAtmosphere surface="analytics" />
      <MobileHeader
        title="Analysis"
        eyebrow={source?.title ?? 'Source'}
        onBack={safeGoBack}
      />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.bodyContent}>
        <View style={styles.statusRow}>
          <CompanionStatusChip />
        </View>

        <MobileSurface padding={14}>
          <Text style={[styles.title, { color: colors.text }]}>Source analysis</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Run the local companion to extract sections, segments, lemmas,
            forms, tokens, morphology, grammar patterns, and study-card
            proposals. Every proposal is reviewed one-by-one before it lands
            in your library.
          </Text>
        </MobileSurface>

        <MobileSectionEyebrow>Prior runs ({runs.length})</MobileSectionEyebrow>
        {runs.length === 0 ? (
          <EmptyState
            title="No analysis runs yet"
            message="Start an analysis to see progress and review proposals."
            compact
          />
        ) : (
          <View style={styles.listGap}>
            {runs.map((run) => (
              <Pressable
                key={run.id}
                accessibilityRole="button"
                onPress={() => sourceId && navigateToAnalysisRun(sourceId, run.id)}
              >
                <MobileSurface padding={12}>
                  <View style={styles.runRowTop}>
                    <Text style={[styles.runStatus, { color: colors.brand }]}>
                      {run.status.replace(/_/g, ' ')}
                    </Text>
                    <Text style={[styles.runDate, { color: colors.textMuted }]}>
                      {formatTimestamp(run.completedAt ?? run.startedAt ?? run.requestedAt)}
                    </Text>
                  </View>
                  {run.failureReason ? (
                    <Text style={[styles.runFailureReason, { color: colors.status.error }]}>
                      {run.failureReason}
                    </Text>
                  ) : null}
                  {run.modelLabel ? (
                    <Text style={[styles.runMeta, { color: colors.textSecondary }]}>
                      model: {run.modelLabel}
                    </Text>
                  ) : null}
                  <View style={styles.runActionsRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        deleteMutation.mutate({
                          runId: run.id,
                          runType: 'source_analysis',
                          sourceId,
                        })
                      }
                      disabled={deleteMutation.isPending}
                    >
                      <Text
                        style={[
                          styles.deleteLabel,
                          { color: deleteMutation.isPending ? colors.textMuted : colors.status.error },
                        ]}
                      >
                        Delete run
                      </Text>
                    </Pressable>
                  </View>
                </MobileSurface>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <MobileActionFooter>
        <MobilePrimaryButton onPress={onStart} disabled={!canStart}>
          {hasCredential ? (startMutation.isPending ? 'Starting…' : 'Start analysis') : 'Companion not configured'}
        </MobilePrimaryButton>
      </MobileActionFooter>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 100,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
  },
  listGap: {
    gap: 8,
  },
  runRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  runStatus: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  runDate: {
    fontSize: 11,
  },
  runFailureReason: {
    fontSize: 12,
    marginBottom: 4,
  },
  runMeta: {
    fontSize: 11,
    marginBottom: 8,
  },
  runActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
