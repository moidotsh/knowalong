// app/source/[id]/analysis/[runId].tsx
// Live run detail. Persistent AnalysisProgressCard + AnalysisStageRail +
// AnalysisEventTimeline + ProposalCard list + ProposalReviewBatch.
// SSE-backed via useAnalysisRunEventStream.

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobileSectionEyebrow,
  MobileActionFooter,
  MobilePrimaryButton,
} from '../../../../components/MobilePremium';
import { useAppTheme } from '../../../../context';
import { safeGoBack } from '../../../../navigation';
import { SCREEN_BODY_STYLE } from '../../../../constants';
import {
  useAnalysisRun,
  useAnalysisRunEvents,
  useAnalysisProposals,
  useCancelAnalysisRun,
} from '../../../../hooks';
import { useAnalysisRunEventStream } from '../../../../hooks';
import {
  AnalysisProgressCard,
  AnalysisStageRail,
  AnalysisEventTimeline,
  ProposalCard,
  ProposalReviewBatch,
} from '../../../../components/knowalong';

export default function AnalysisRunScreen() {
  const { id, runId } = useLocalSearchParams<{ id: string; runId: string }>();
  const sourceId = Array.isArray(id) ? id[0] : id;
  const resolvedRunId = Array.isArray(runId) ? runId[0] : runId;
  const { colors } = useAppTheme();

  const runQuery = useAnalysisRun(resolvedRunId);
  const eventsQuery = useAnalysisRunEvents(resolvedRunId);
  const proposalsQuery = useAnalysisProposals(resolvedRunId);
  const cancelMutation = useCancelAnalysisRun();

  // SSE lifecycle — opens the authenticated event stream while the run is
  // active, closes on terminal status or unmount. Mutates React Query cache
  // via the events hook's dedupe-by-ordinal logic.
  const streamState = useAnalysisRunEventStream({
    runId: resolvedRunId,
    runType: runQuery.data?.runType ?? 'source_analysis',
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
        title={run ? (run.runType === 'clcc_generation' ? 'CLCC run' : 'Analysis run') : 'Run'}
        eyebrow={resolvedRunId}
        onBack={safeGoBack}
      />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.bodyContent}>
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
            runType={run.runType}
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
            <MobileSectionEyebrow>Proposals ({proposals.length})</MobileSectionEyebrow>
            {proposals.length === 0 ? (
              <MobileSurface padding={14}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No proposals were emitted. Re-run or adjust the source.
                </Text>
              </MobileSurface>
            ) : (
              <View style={styles.listGap}>
                {proposals.map((p) => (
                  <ProposalCard
                    key={p.id}
                    proposal={p}
                    runId={resolvedRunId ?? ''}
                  />
                ))}
              </View>
            )}

            <View style={{ height: 16 }} />
            <ProposalReviewBatch runId={resolvedRunId ?? ''} />
          </>
        ) : null}

        {run?.status === 'failed' ? (
          <MobileSurface padding={14}>
            <Text style={[styles.failureTitle, { color: colors.status.error }]}>
              Analysis failed
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
  listGap: {
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
  },
  failureTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  failureBody: {
    fontSize: 13,
    lineHeight: 18,
  },
});
