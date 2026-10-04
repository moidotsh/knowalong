// components/journey/JourneyRail.tsx
//
// The score itself: chapter headings with a straight vertical rail, one
// milestone per step. Five states, each readable by shape, color AND
// text (brief §5.3): completed (filled dot · "Done"), current (ringed
// dot · "Now"), upcoming (hollow · "Ahead"), needs-refresh (warm dot ·
// "Revise"), unavailable (hollow gray · "Locked").

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../context';
import { theme } from '../../constants';
import { Pressable } from '../MobilePremium';
import type { ChapterView, StepView } from '../../utils/journey';
import { JOURNEY_TYPE, LABEL_TRACKING, MILESTONE_VISUALS } from './tokens';

// ── Chapter header ───────────────────────────────────────────────────────

export function ChapterHeader({
  chapter,
  completed,
  total,
  locked,
  isPast,
}: {
  chapter: ChapterView['chapter'];
  completed: number;
  total: number;
  locked: boolean;
  isPast: boolean;
}) {
  const { colors } = useAppTheme();
  const fonts = theme.fonts;
  const score = colors.score;
  const titleSize = JOURNEY_TYPE.chapterTitle.phone;
  return (
    <View style={styles.header}>
      <Text style={[styles.chapterEyebrow, { color: score.inkTertiary }]}>
        Chapter {String(chapter.number).padStart(2, '0')}
        {isPast ? ' · behind you' : locked ? ' · locked' : ''}
      </Text>
      <Text
        style={[
          styles.chapterTitle,
          {
            color: locked ? score.inkTertiary : score.ink,
            fontFamily: fonts.serif,
            fontSize: titleSize,
          },
        ]}
        accessibilityRole="header"
      >
        {chapter.title}
      </Text>
      <Text style={[styles.chapterDestination, { color: score.inkSecondary }]}>
        {chapter.destination}
      </Text>
      <Text style={[styles.chapterProgress, { color: score.inkTertiary }]}>
        {completed} of {total} steps
      </Text>
      {chapter.overlapNote && !locked ? <Text style={[styles.overlapNote, { color: score.inkSecondary }]}>
          {chapter.overlapNote}
        </Text> : null}
    </View>
  );
}

// ── One milestone ────────────────────────────────────────────────────────

interface MilestoneRowProps {
  view: StepView;
  /** First (top) or last (bottom) — the guide line stops at the dot. */
  edge: 'first' | 'last' | 'middle';
  disabled?: boolean;
  onPress?: () => void;
}

export function MilestoneRow({ view, edge, disabled, onPress }: MilestoneRowProps) {
  const { colors } = useAppTheme();
  const fonts = theme.fonts;
  const score = colors.score;
  const visual = MILESTONE_VISUALS[view.status];
  const dotColor =
    visual.dot === 'accent'
      ? score.accent
      : visual.dot === 'warmNote'
        ? score.warmNote
        : visual.dot === 'rule'
          ? score.ruleStrong
          : score.paper;
  const ringColor =
    visual.ring === 'accent' ? score.accent : visual.ring === 'warmNote' ? score.warmNote : score.rule;
  const isCurrent = view.status === 'current';
  const interactive = !disabled && onPress != null && view.status !== 'unavailable';

  return (
    <Pressable
      onPress={interactive ? onPress : undefined}
      disabled={!interactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !interactive, selected: isCurrent }}
      accessibilityLabel={`${view.step.title} — ${visual.label}`}
      style={({ pressed }) => [
        styles.row,
        interactive && pressed && { backgroundColor: score.accentWash },
      ]}
    >
      {/* Rail column: guide line above, dot, guide line below. */}
      <View style={styles.railColumn}>
        {edge !== 'first' && <View style={[styles.guideLine, { backgroundColor: score.rule }]} />}
        <View
          style={[
            styles.dotWrap,
            visual.ring !== 'none' && {
              borderColor: ringColor,
              borderWidth: 2,
            },
          ]}
        >
          <View
            style={[
              styles.dot,
              {
                width: visual.size,
                height: visual.size,
                borderRadius: visual.size / 2,
                backgroundColor: visual.hollow ? score.paper : dotColor,
                borderColor: visual.hollow ? ringColor : dotColor,
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}
          />
        </View>
        {edge !== 'last' && <View style={[styles.guideLine, { backgroundColor: score.rule }]} />}
      </View>

      {/* Milestone text. */}
      <View style={styles.rowText}>
        <View style={styles.rowTitleRow}>
          <Text
            style={[
              styles.stepTitle,
              {
                color: view.status === 'unavailable' ? score.inkTertiary : score.ink,
                fontFamily: isCurrent ? fonts.serif : fonts.body,
                fontWeight: isCurrent ? '700' : '500',
              },
            ]}
          >
            {view.step.title}
          </Text>
          <Text
            style={[
              styles.statusLabel,
              {
                color:
                  view.status === 'needs-refresh'
                    ? score.warmNote
                    : isCurrent
                      ? score.accent
                      : score.inkTertiary,
              },
            ]}
          >
            {visual.label}
          </Text>
        </View>
        <Text
          style={[styles.stepPurpose, { color: view.status === 'unavailable' ? score.inkTertiary : score.inkSecondary }]}
          numberOfLines={2}
        >
          {view.status === 'unavailable' && view.step.assessed
            ? 'Finishes after the steps it builds on.'
            : view.step.purpose}
        </Text>
        <Text style={[styles.stepMeta, { color: score.inkTertiary }]}>
          {view.step.kind}
          {view.step.estimatedMinutes != null ? ` · about ${view.step.estimatedMinutes} min` : ''}
          {view.planCount > 1
            ? ` · ${view.status === 'completed' ? view.planCount : view.nextPlanIndex} of ${view.planCount} sessions`
            : view.planCount === 1
              ? ' · 1 session'
              : ''}
        </Text>
      </View>
    </Pressable>
  );
}

// ── Chapter rail ─────────────────────────────────────────────────────────

export function JourneyRail({
  chapter,
  isPast,
  onSelectStep,
}: {
  chapter: ChapterView;
  isPast: boolean;
  onSelectStep: (view: StepView) => void;
}) {
  const { colors } = useAppTheme();
  const score = colors.score;
  return (
    <View style={styles.chapter}>
      <ChapterHeader
        chapter={chapter.chapter}
        completed={chapter.completedSteps}
        total={chapter.totalSteps}
        locked={chapter.locked}
        isPast={isPast}
      />
      {chapter.locked ? (
        <Text style={[styles.lockedNote, { color: score.inkSecondary }]}>
          Unlocks with “Northern platform” — a demo purchase, no charge.
        </Text>
      ) : null}
      <View style={styles.rows}>
        {chapter.steps.map((view, index) => (
          <MilestoneRow
            key={view.step.id}
            view={view}
            edge={index === 0 ? 'first' : index === chapter.steps.length - 1 ? 'last' : 'middle'}
            disabled={chapter.locked}
            onPress={() => onSelectStep(view)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chapter: { marginBottom: 40 } as const,
  header: { marginBottom: 18, paddingHorizontal: 16 } as const,
  chapterEyebrow: {
    fontSize: 12,
    letterSpacing: LABEL_TRACKING,
    textTransform: 'uppercase',
    fontWeight: '600',
  } as const,
  chapterTitle: {
    fontWeight: '700',
    lineHeight: 38,
    marginTop: 6,
  } as const,
  chapterDestination: { fontSize: 16, lineHeight: 23, marginTop: 6 } as const,
  chapterProgress: {
    fontSize: 12,
    letterSpacing: LABEL_TRACKING,
    textTransform: 'uppercase',
    marginTop: 10,
    fontWeight: '600',
  } as const,
  overlapNote: { fontSize: 14, lineHeight: 20, marginTop: 10, fontStyle: 'italic' } as const,
  lockedNote: { paddingHorizontal: 16, fontSize: 13, lineHeight: 19, marginBottom: 16 } as const,
  rows: { paddingHorizontal: 16 } as const,
  row: {
    flexDirection: 'row',
    borderRadius: 10,
  } as const,
  railColumn: {
    width: 32,
    alignItems: 'center',
  } as const,
  guideLine: { width: 2, flex: 1, borderRadius: 1 } as const,
  dotWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  dot: {} as const,
  rowText: { flex: 1, paddingTop: 10, paddingBottom: 14, paddingLeft: 4 } as const,
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  } as const,
  stepTitle: { fontSize: 18, lineHeight: 24 } as const,
  statusLabel: {
    fontSize: 11,
    letterSpacing: LABEL_TRACKING,
    textTransform: 'uppercase',
    fontWeight: '700',
  } as const,
  stepPurpose: { fontSize: 14, lineHeight: 20, marginTop: 4 } as const,
  stepMeta: {
    fontSize: 11,
    letterSpacing: LABEL_TRACKING / 2,
    textTransform: 'uppercase',
    marginTop: 6,
    fontWeight: '600',
  } as const,
});

export default JourneyRail;
