// app/clcc/[runId].tsx
// CLCC run detail. Same shape as the source-analysis run screen: progress
// card + stage rail + event timeline + realization proposal list. Acceptance
// is disabled per the matrix; export/edit/reject are enabled.

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobileActionFooter,
  MobilePrimaryButton,
} from '../../components/MobilePremium';
import { useAppTheme } from '../../context';
import { safeGoBack } from '../../navigation';
import { SCREEN_BODY_STYLE, theme } from '../../constants';
import {
  useAnalysisRun,
  useAnalysisRunEvents,
  useAnalysisProposals,
  useCancelAnalysisRun,
} from '../../hooks';
import { useAnalysisRunEventStream } from '../../hooks';
import {
  AnalysisProgressCard,
  AnalysisStageRail,
  AnalysisEventTimeline,
  ClccRealizationProposal,
} from '../../components/knowalong';

export default function ClccRunScreen() {
  const { runId } = useLocalSearchParams<{ runId: string }>();
  const resolvedRunId = Array.isArray(runId) ? runId[0] : runId;
  const { colors } = useAppTheme();

  const runQuery = useAnalysisRun(resolvedRunId);
  const eventsQuery = useAnalysisRunEvents(resolvedRunId);
  const proposalsQuery = useAnalysisProposals(resolvedRunId, { kind: 'realization' });
  const cancelMutation = useCancelAnalysisRun();

  const streamState = useAnalysisRunEventStream({
    runId: resolvedRunId,
    runType: 'clcc_generation',
  });

  const run = runQuery.data;
  const events = eventsQuery.data ?? [];
  const proposals = proposalsQuery.data ?? [];
  const isTerminal =
    run?.status === 'awaiting_review' || run?.status === 'failed' || run?.status === 'cancelled';

  const stageName = streamState.latestStage;
  const stageIndex = run?.summary && typeof run.summary.stageIndex === 'number'
    ? (run.summary.stageIndex as number)
    : null;
  const latestEvent = events.length > 0 ? events[events.length - 1] : null;

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: colors.backgroundDeep }]}
      edges={['top', 'bottom']}
    >
      <MobileAtmosphere surface="analytics" />
      <MobileHeader
        title="Internal CLCC run"
        eyebrow="Internal operator tooling"
        onBack={safeGoBack}
      />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.bodyContent}>
        <MobileSurface padding={12}>
          <Text style={[styles.internalBannerTitle, { color: colors.textSecondary }]}>
            Internal CLCC research and export tool
          </Text>
          <Text style={[styles.internalBannerBody, { color: colors.textMuted }]}>
            Local candidate generation only. Does not publish packs, grant
            learner access, or promote candidates into canonical shared
            realizations. Final destination: the separate future KnowAlong
            Studio application.
          </Text>
        </MobileSurface>
        <View style={{ height: 12 }} />
        <AnalysisProgressCard
          run={run}
          latestEvent={latestEvent}
          companionStatus={{
            id: resolvedRunId ?? '',
            status: (run?.status ?? 'queued') as never,
            stage: stageName,
            stageIndex,
            stageCount: null,
            subProgress: null,
          }}
        />

        <View style={{ height: 12 }} />

        {run ? (
          <AnalysisStageRail
            runType="clcc_generation"
            stageIndex={stageIndex}
            stageName={stageName}
            allComplete={Boolean(isTerminal && run.status === 'awaiting_review')}
          />
        ) : null}

        <View style={{ height: 16 }} />
        <AnalysisEventTimeline events={events} />

        {isTerminal && run?.status === 'awaiting_review' ? (
          <>
            <View style={{ height: 16 }} />
            <Text style={[styles.proposalsHeader, { color: colors.text }]}>
              Realization proposals ({proposals.length})
            </Text>
            {proposals.length === 0 ? (
              <MobileSurface padding={14}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No realization proposals were emitted.
                </Text>
              </MobileSurface>
            ) : (
              <View style={styles.listGap}>
                {proposals.map((p) => (
                  <ClccRealizationProposal
                    key={p.id}
                    proposal={p}
                    runId={resolvedRunId ?? ''}
                  />
                ))}
              </View>
            )}
          </>
        ) : null}

        {run?.status === 'failed' ? (
          <MobileSurface padding={14}>
            <Text style={[styles.failureTitle, { color: colors.status.error }]}>
              CLCC generation failed
            </Text>
            <Text style={[styles.failureBody, { color: colors.textSecondary }]}>
              {run.failureReason ?? 'The companion reported a failure.'}
            </Text>
          </MobileSurface>
        ) : null}
      </ScrollView>
      {!isTerminal ? (
        <MobileActionFooter>
          <MobilePrimaryButton
            variant="secondary"
            onPress={() => cancelMutation.mutate(resolvedRunId ?? '')}
            disabled={cancelMutation.isPending}
          >
            Cancel run
          </MobilePrimaryButton>
        </MobileActionFooter>
      ) : null}
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
  internalBannerTitle: {
    ...theme.typography.mobileEyebrow,
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  internalBannerBody: {
    ...theme.typography.mobileBody,
    fontSize: 12,
    lineHeight: 16,
  },
  proposalsHeader: {
    ...theme.typography.mobileEyebrow,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  listGap: {
    gap: 8,
  },
  emptyText: {
    ...theme.typography.mobileBody,
    fontSize: 13,
    lineHeight: 18,
  },
  failureTitle: {
    ...theme.typography.mobileItemTitle,
    marginBottom: 4,
  },
  failureBody: {
    ...theme.typography.mobileBody,
    fontSize: 13,
    lineHeight: 18,
  },
});
