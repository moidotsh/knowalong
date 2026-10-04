// app/session/[sessionId].tsx
//
// THE SESSION PLAYER (brief §7) — one player for every session: a chapter
// step or a bounded notebook review. Encounter → recognize → build →
// return → recap, with an explicit Check, no lives, no streak punishment.
// Help is recorded as assistance, never failure. Leaving keeps your place
// (the pinned session); finishing clears it and merges evidence honestly
// ("correct without help" is the only recall).

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MobilePrimaryButton } from '../../components/MobilePremium';
import {
  HelpPanel,
  MeaningChoiceCard,
  PassageReturnCard,
  PhraseBuilderCard,
  PhraseRevealCard,
  RecapCard,
  SessionShell,
} from '../../components/journey';
import { useAppTheme } from '../../context';
import { safeGoBack, switchToJourney } from '../../navigation';
import { useJourneyStore } from '../../stores';
import {
  canEnterSession,
  resolveSessionPlan,
  todayStamp,
  type PinnedSessionAnswer,
  type SessionActivity,
} from '../../utils/journey';

export default function SessionScreen() {
  const params = useLocalSearchParams<{ sessionId: string }>();
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : '';

  const store = useJourneyStore();
  const { colors } = useAppTheme();
  const score = colors.score;
  const today = todayStamp();

  const plan = useMemo(() => (sessionId ? resolveSessionPlan(sessionId) : null), [sessionId]);
  const snapshot = useMemo(
    () => store.selectSnapshot(),
    [store.progress, store.language, store.contentRevision],
  );

  // ── Entry: gate + pin/resume ──────────────────────────────────────────
  const gate = plan ? canEnterSession(plan.id, snapshot) : ({ ok: false, reason: 'missing-plan' } as const);
  const pinned = snapshot.pinnedSession;
  const resumable =
    plan != null &&
    pinned != null &&
    pinned.planId === plan.id &&
    pinned.contentRevision === store.contentRevision;

  useEffect(() => {
    if (!plan || !gate.ok) return;
    // A pin from older session content is stale — start this one fresh.
    if (pinned && pinned.planId === plan.id && pinned.contentRevision !== store.contentRevision) {
      store.discardPinnedSession();
      return;
    }
    if (!pinned || pinned.planId !== plan.id) store.pinSession(plan.id);
    // Runs once per opened session id.
     
  }, [sessionId]);

  // ── Player state ──────────────────────────────────────────────────────
  const initialIndex = resumable && pinned ? Math.min(pinned.currentIndex, (plan?.activities.length ?? 1) - 1) : 0;
  const initialAnswers = resumable && pinned ? pinned.answers : [];
  const [index, setIndex] = useState(initialIndex);
  const [answers, setAnswers] = useState<PinnedSessionAnswer[]>(initialAnswers);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [assisted, setAssisted] = useState(false);

  const activity: SessionActivity | null = plan?.activities[index] ?? null;

  // Reset per-card state on advance; a card already answered keeps its
  // assisted flag honestly ("Helped on this card — noted").
  useEffect(() => {
    setChecked(false);
    setSelectedId(null);
    setPlacedIds([]);
    const prior = activity && answers.length > 0 ? answers.find((a) => a.activityId === activity.id) : undefined;
    setAssisted(prior?.assisted ?? false);
     
  }, [index, plan?.id]);

  const recordAnswer = useCallback(
    (entry: PinnedSessionAnswer) => {
      setAnswers((prev) => [...prev.filter((a) => a.activityId !== entry.activityId), entry]);
      if (plan) store.setPinnedProgress(plan.id, index, entry);
    },
    [plan, index, store],
  );

  const advance = useCallback(() => {
    if (!plan) return;
    const next = index + 1;
    store.setPinnedProgress(plan.id, next);
    setIndex(next);
  }, [plan, index, store]);

  const finish = useCallback(() => {
    if (!plan) return;
    store.completeSession(plan, answers);
    // Back to the Journey — the rail reflects the session immediately.
    switchToJourney();
  }, [plan, answers, store]);

  // ── Per-kind check/continue ───────────────────────────────────────────
  const isScored = activity != null && activity.unscored === false;
  const isRecap = activity?.kind === 'recap';

  const builderReady =
    activity?.kind === 'phrase-builder' ? placedIds.length === activity.answer.length : false;
  const choiceReady = activity?.kind === 'meaning-choice' ? selectedId != null : false;
  const canCheck = isScored && !checked && (builderReady || choiceReady);
  const canContinue = (isScored && checked) || (!isScored && activity != null);

  const onCheck = () => {
    if (!activity || !isScored) return;
    setChecked(true);
    let correct = false;
    if (activity.kind === 'meaning-choice') {
      correct = selectedId === activity.correctOptionId;
    } else if (activity.kind === 'phrase-builder') {
      const placed = activity.chips
        .filter((c) => placedIds.includes(c.id))
        .sort((a, b) => placedIds.indexOf(a.id) - placedIds.indexOf(b.id))
        .map((c) => c.text);
      correct = placed.join(' ') === activity.answer.join(' ');
    }
    recordAnswer({ activityId: activity.id, outcome: correct ? 'correct' : 'incorrect', assisted });
  };

  // "Try again" — the first outcome stands (no lives, no punishment);
  // this only clears the lock so the card can be rearranged.
  const onRetry = () => setChecked(false);

  const onUseHelp = () => {
    setAssisted(true);
    // If the card was already checked, the outcome stays; the assisted
    // flag is amended so the notebook's label stays honest.
    if (activity && isScored && checked) {
      const prior = answers.find((a) => a.activityId === activity.id);
      if (prior) recordAnswer({ ...prior, assisted: true });
    }
  };

  // ── Recap summary (recalled / with help / missed) ─────────────────────
  const summary = useMemo(() => {
    const scored = answers.filter((a) => a.outcome !== 'skipped');
    const correct = scored.filter((a) => a.outcome === 'correct');
    return {
      correct: correct.filter((a) => !a.assisted).length,
      withHelp: correct.filter((a) => a.assisted).length,
      missed: scored.filter((a) => a.outcome !== 'correct').length,
    };
  }, [answers]);

  // ── Not openable ──────────────────────────────────────────────────────
  if (!plan || !gate.ok) {
    return (
      <View style={[styles.closed, { backgroundColor: score.canvas }]}>
        <Text style={styles.closedTitle}>This session isn’t open right now.</Text>
        <Text style={[styles.closedNote, { color: score.inkSecondary }]}>
          Its step comes later on the path — the Journey screen keeps the order.
        </Text>
        <Pressable onPress={safeGoBack} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={[styles.closedBack, { color: score.accent }]}>← Back to your journey</Text>
        </Pressable>
      </View>
    );
  }

  if (!activity) {
    // Past the recap — the session is finished but completion didn't run
    // (e.g. a resumed stale pin). Close honestly.
    return (
      <View style={[styles.closed, { backgroundColor: score.canvas }]}>
        <Text style={styles.closedTitle}>That session is already over.</Text>
        <Pressable onPress={switchToJourney} accessibilityRole="button" accessibilityLabel="Go to your journey">
          <Text style={[styles.closedBack, { color: score.accent }]}>← Back to your journey</Text>
        </Pressable>
      </View>
    );
  }

  const helpContent = <HelpPanel activity={activity} assisted={assisted} onUseHelp={onUseHelp} />;

  const footer = (
    <View style={styles.footerRow}>
      {checked && isScored ? (
        <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Try this card again">
          <Text style={[styles.retry, { color: score.inkSecondary }]}>Try again</Text>
        </Pressable>
      ) : null}
      {isRecap ? (
        <View style={styles.footerPrimary}>
          <MobilePrimaryButton onPress={finish}>Done</MobilePrimaryButton>
        </View>
      ) : canCheck ? (
        <View style={styles.footerPrimary}>
          <MobilePrimaryButton onPress={onCheck}>Check</MobilePrimaryButton>
        </View>
      ) : canContinue ? (
        <View style={styles.footerPrimary}>
          <MobilePrimaryButton onPress={advance}>Continue</MobilePrimaryButton>
        </View>
      ) : (
        <View style={styles.footerPrimary}>
          <MobilePrimaryButton onPress={() => {}} disabled>
            Check
          </MobilePrimaryButton>
        </View>
      )}
    </View>
  );

  return (
    <SessionShell
      title={plan.title}
      sourceLabel={plan.sourceLabel}
      index={index + 1}
      total={plan.activities.length}
      onExit={safeGoBack}
      helpUsed={assisted || answers.some((a) => a.assisted)}
      helpContent={helpContent}
      footer={footer}
    >
      {activity.kind === 'phrase-reveal' ? <PhraseRevealCard activity={activity} /> : null}
      {activity.kind === 'meaning-choice' ? (
        <MeaningChoiceCard
          activity={activity}
          selectedId={selectedId}
          checked={checked}
          onSelect={setSelectedId}
        />
      ) : null}
      {activity.kind === 'phrase-builder' ? (
        <PhraseBuilderCard
          activity={activity}
          placedIds={placedIds}
          checked={checked}
          onPlace={(chipId) => setPlacedIds((prev) => [...prev, chipId])}
          onUnplace={(chipId) => setPlacedIds((prev) => prev.filter((id) => id !== chipId))}
        />
      ) : null}
      {activity.kind === 'passage-return' ? <PassageReturnCard activity={activity} /> : null}
      {activity.kind === 'recap' ? <RecapCard activity={activity} summary={summary} /> : null}
    </SessionShell>
  );
}

const styles = StyleSheet.create({
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 20,
  },
  footerPrimary: {
    minWidth: 140,
  },
  retry: {
    fontSize: 14,
    lineHeight: 20,
  },
  closed: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  closedTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    textAlign: 'center',
  },
  closedNote: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  closedBack: {
    fontSize: 15,
    lineHeight: 20,
    marginTop: 12,
  },
});
