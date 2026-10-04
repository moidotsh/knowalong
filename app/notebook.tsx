// app/notebook.tsx
//
// NOTEBOOK (brief §10) — the evidence ledger. Every word met in practice
// appears once, labeled by what actually happened: Practiced, Recalled,
// Recalled today, Ready to revisit — or plainly Saved, for words that
// were met in a passage but never practiced. Saved ≠ learned, and this
// screen keeps that line visible.

import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { JourneyScaffold, ReviewOffer } from '../components/journey';
import { useAppTheme } from '../context';
import { theme } from '../constants';
import { navigateToNotebookEntry, navigateToSession } from '../navigation';
import { useJourneyStore } from '../stores';
import {
  buildBoundedReviewPlan,
  isEvidenceDue,
  projectNotebook,
  todayStamp,
  type NotebookLabel,
} from '../utils/journey';

const LABEL_COLOR: Record<NotebookLabel, 'accent' | 'warmNote' | 'inkSecondary' | 'inkTertiary'> = {
  'Recalled today': 'accent',
  Recalled: 'accent',
  'Ready to revisit': 'warmNote',
  Practiced: 'inkSecondary',
  Saved: 'inkTertiary',
};

export default function NotebookScreen() {
  const store = useJourneyStore();
  const snapshot = useMemo(
    () => store.selectSnapshot(),
    [store.progress, store.language, store.contentRevision],
  );
  const today = todayStamp();
  const { colors } = useAppTheme();
  const fonts = theme.fonts;
  const score = colors.score;

  const entries = useMemo(() => projectNotebook(snapshot, today), [snapshot, today]);
  const dueEntries = entries.filter((e) => isEvidenceDue(e.evidence, today));

  const startReview = () => {
    const plan = buildBoundedReviewPlan(
      dueEntries.map((e) => e.wordKey),
    );
    if (plan) navigateToSession(plan.id);
  };

  return (
    <JourneyScaffold destination="notebook">
      <ScrollView style={styles.body} contentContainerStyle={[styles.bodyContent, { paddingBottom: 40 + 72 }]}>
        <View style={styles.pageHead}>
          <Text style={[styles.pageTitle, { color: score.ink, fontFamily: fonts.serif }]}>Your Notebook</Text>
          <Text style={[styles.pageNote, { color: score.inkSecondary }]}>
            What each word has actually done — met, practiced, recalled. Saved
            is not the same as learned, and the labels never blur that.
          </Text>
        </View>

        <ReviewOffer entries={dueEntries} onReview={startReview} />

        {entries.length === 0 ? (
          <Text style={[styles.empty, { color: score.inkTertiary }]}>
            Nothing here yet. Words arrive on their own as you practice —
            this page only records what really happened.
          </Text>
        ) : (
          <View style={styles.list}>
            {entries.map((entry) => {
              const colorKey = LABEL_COLOR[entry.label];
              const labelColor =
                colorKey === 'accent' ? score.accent : colorKey === 'warmNote' ? score.warmNote : colorKey === 'inkSecondary' ? score.inkSecondary : score.inkTertiary;
              return (
                <Pressable
                  key={entry.wordKey}
                  onPress={() => navigateToNotebookEntry(entry.wordKey)}
                  accessibilityRole="button"
                  accessibilityLabel={`${entry.word?.form ?? entry.wordKey}, ${entry.label}`}
                  style={({ pressed }) => [
                    styles.row,
                    { backgroundColor: score.paper, borderColor: score.rule },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={styles.rowMain}>
                    <Text style={[styles.word, { color: score.ink, fontFamily: fonts.serif }]}>
                      {entry.word?.form ?? entry.wordKey.replace(/^ru:/, '')}
                    </Text>
                    <Text style={[styles.meaning, { color: score.inkSecondary }]}>
                      {entry.word?.meaning ?? '—'}
                    </Text>
                  </View>
                  <View style={styles.rowSide}>
                    <Text style={[styles.label, { color: labelColor }]}>{entry.label}</Text>
                    <Text style={[styles.note, { color: score.inkTertiary }]}>{entry.note}</Text>
                  </View>
                  <Text style={[styles.arrow, { color: score.accent }]}>→</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </JourneyScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  bodyContent: {
    // Wide windows center the list instead of stretching it.
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  pageHead: {
    gap: 4,
    marginBottom: 4,
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
  empty: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowMain: {
    flex: 1,
    gap: 1,
  },
  word: {
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 25,
  },
  meaning: {
    fontSize: 13,
    lineHeight: 18,
  },
  rowSide: {
    alignItems: 'flex-end',
    gap: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  note: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'right',
    maxWidth: 150,
  },
  arrow: {
    fontSize: 15,
  },
});
