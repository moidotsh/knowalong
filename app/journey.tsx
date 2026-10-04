// app/journey.tsx
//
// YOUR JOURNEY — the experience's central surface (brief §5). One path,
// read like an annotated score: chapters in order, milestones down a
// straight rail, the current step's panel in the first screenful on
// phones and in the right panel on desktops. Review lives IN the path
// ("Bring these back"), bounded at five. Nothing here is a feed.

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  ChapterPreview,
  CurrentStepPanel,
  JourneyRail,
  JourneyScaffold,
  ReviewOffer,
} from '../components/journey';
import { useAppTheme } from '../context';
import { theme } from '../constants';
import {
  navigateToCollectionItem,
  navigateToNotebook,
  navigateToSession,
} from '../navigation';
import { useJourneyStore } from '../stores';
import {
  buildBoundedReviewPlan,
  canEnterSession,
  deriveJourneyView,
  getChapter,
  getMediaItem,
  isEvidenceDue,
  projectNotebook,
  todayStamp,
  type ChapterView,
  type StepView,
} from '../utils/journey';

const WIDE_SHELL_BREAKPOINT = 1280;

export default function JourneyScreen() {
  const { width } = useWindowDimensions();
  const wideShell = width >= WIDE_SHELL_BREAKPOINT;
  const { colors } = useAppTheme();
  const fonts = theme.fonts;
  const score = colors.score;

  const store = useJourneyStore();
  const today = todayStamp();

  const snapshot = useMemo(
    () => store.selectSnapshot(),
    [store.progress, store.language, store.contentRevision],
  );
  const view = useMemo(() => deriveJourneyView(snapshot, today), [snapshot, today]);
  const dueEntries = useMemo(
    () => projectNotebook(snapshot, today).filter((e) => isEvidenceDue(e.evidence, today)),
    [snapshot, today],
  );

  const current = view.currentStepView;
  const activeIndex = view.chapters.findIndex((c) => c.chapter.id === view.activeChapterId);

  const startSession = (planId: string | null) => {
    if (!planId) return;
    if (!canEnterSession(planId, snapshot).ok) return; // Locked rows never open.
    navigateToSession(planId);
  };

  const startReview = () => {
    const plan = buildBoundedReviewPlan(view.dueReviewKeys);
    if (plan) navigateToSession(plan.id);
  };

  const stepPanel = (variant: 'body' | 'panel') => {
    if (current) {
      const media = current.step.mediaId ? getMediaItem(current.step.mediaId) : null;
      const chapterTitle = getChapter(current.step.chapterId)?.title ?? '';
      return (
        <CurrentStepPanel
          view={current}
          chapterTitle={chapterTitle}
          mediaTitle={media?.title ?? null}
          onStart={startSession}
          onOpenMedia={current.step.mediaId ? () => navigateToCollectionItem(current.step.mediaId as string) : undefined}
        />
      );
    }
    // Every reachable step is done — the journey rests; review stays open.
    return (
      <View style={[styles.restCard, { backgroundColor: score.paper, borderColor: score.rule }]}>
        <Text style={[styles.restTitle, { color: score.ink, fontFamily: fonts.serif }]}>
          You’ve reached the end of the open path
        </Text>
        <Text style={[styles.restNote, { color: score.inkSecondary }]}>
          New chapters are waiting below — and whatever drifted comes back through review.
        </Text>
        {/* ReviewOffer self-hides when nothing is due. */}
        <ReviewOffer entries={dueEntries} onReview={startReview} onOpenNotebook={navigateToNotebook} variant="inline" />
      </View>
    );
  };

  const rails = (chapters: ChapterView[]) => (
    <>
      {chapters.map((chapterView, index) => (
        <JourneyRail
          key={chapterView.chapter.id}
          chapter={chapterView}
          isPast={index < activeIndex}
          onSelectStep={(stepView: StepView) => startSession(stepView.resumePlanId ?? stepView.nextPlanId)}
        />
      ))}
    </>
  );

  const nextChapter = view.chapters[activeIndex + 1] ?? null;

  const preview = () => {
    if (!nextChapter) return null;
    const requires = nextChapter.chapter.requiresPurchaseOf;
    return (
      <ChapterPreview
        chapter={nextChapter.chapter}
        locked={nextChapter.locked}
        isActive={false}
        entitled={requires ? snapshot.entitledMediaIds.includes(requires) : true}
        onOpen={() => store.activateChapter(nextChapter.chapter.id)}
        onPurchase={() => {
          if (requires) navigateToCollectionItem(requires);
        }}
      />
    );
  };

  // Phone: the current-step panel leads (within the first screenful), then
  // the review offer, then the score itself, then the next chapter.
  const phoneBody = (
    <ScrollView
      style={styles.body}
      contentContainerStyle={[styles.bodyContent, { paddingBottom: 40 + 72 }]}
    >
      <View style={styles.pageHead}>
        <Text style={[styles.pageTitle, { color: score.ink, fontFamily: fonts.serif }]}>Your Journey</Text>
        <Text style={[styles.pageNote, { color: score.inkSecondary }]}>
          One chapter at a time — the path keeps your place.
        </Text>
      </View>
      {stepPanel('body')}
      <ReviewOffer entries={dueEntries} onReview={startReview} onOpenNotebook={navigateToNotebook} />
      {rails(view.chapters)}
      {preview()}
    </ScrollView>
  );

  // Desktop: rails carry the main column; the current step + review live
  // in the contextual panel.
  const desktopBody = (
    <ScrollView style={styles.body} contentContainerStyle={[styles.bodyContent, { paddingBottom: 48 }]}>
      <View style={styles.pageHead}>
        <Text style={[styles.pageTitle, { color: score.ink, fontFamily: fonts.serif }]}>Your Journey</Text>
      </View>
      {rails(view.chapters)}
      {preview()}
    </ScrollView>
  );

  const desktopPanel = (
    <View style={styles.panelColumn}>
      {stepPanel('panel')}
      <ReviewOffer entries={dueEntries} onReview={startReview} onOpenNotebook={navigateToNotebook} />
    </View>
  );

  return (
    <JourneyScaffold destination="journey" panel={wideShell ? desktopPanel : undefined}>
      {wideShell ? desktopBody : phoneBody}
    </JourneyScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  bodyContent: {
    // Wide windows center the score instead of stretching it (the phone
    // is unaffected — the cap sits above phone width).
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 20,
  },
  pageHead: {
    gap: 4,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.4,
  },
  pageNote: {
    fontSize: 14,
    lineHeight: 20,
  },
  restCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  restTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  restNote: {
    fontSize: 14,
    lineHeight: 20,
  },
  panelColumn: {
    gap: 16,
  },
});
