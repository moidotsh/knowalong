// app/notebook/[entryId].tsx
//
// NOTEBOOK ENTRY — one word's honest record (brief §10): the word sheet
// (form, meaning, role, family) plus its evidence ledger — what happened,
// when it last happened, and when seeing it again becomes genuinely
// useful. No streaks, no scores dressed up as skill.

import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '../../context';
import { theme } from '../../constants';
import { navigateToCollectionItem, navigateToReader, safeGoBack } from '../../navigation';
import { useJourneyStore } from '../../stores';
import {
  getMediaItem,
  getPassageWord,
  isEvidenceDue,
  projectNotebook,
  todayStamp,
} from '../../utils/journey';

const STATUS_STORY: Record<string, string> = {
  encountered: 'Met in a passage — never practiced yet. That’s all “saved” means.',
  practised: 'Practiced in a session. Recall hasn’t happened yet.',
  recalled: 'Recalled without help. This is the only thing that counts as knowing here.',
};

export default function NotebookEntryScreen() {
  const params = useLocalSearchParams<{ entryId: string }>();
  const entryId = typeof params.entryId === 'string' ? decodeURIComponent(params.entryId) : '';

  const store = useJourneyStore();
  const snapshot = useMemo(
    () => store.selectSnapshot(),
    [store.progress, store.language, store.contentRevision],
  );
  const today = todayStamp();
  const { colors } = useAppTheme();
  const fonts = theme.fonts;
  const score = colors.score;

  const entry = useMemo(
    () => projectNotebook(snapshot, today).find((e) => e.wordKey === entryId) ?? null,
    [snapshot, today, entryId],
  );
  const word = entry?.word ?? getPassageWord(entryId);

  if (!entry || !word) {
    return (
      <SafeAreaView style={[styles.missing, { backgroundColor: score.canvas }]} edges={['top', 'bottom']}>
        <Text style={[styles.missingTitle, { color: score.ink }]}>That word isn’t in your notebook.</Text>
        <Pressable onPress={safeGoBack} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={[styles.link, { color: score.accent }]}>← Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const due = isEvidenceDue(entry.evidence, today);
  const media = getMediaItem(entry.mediaId);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: score.canvas }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={safeGoBack} accessibilityRole="button" accessibilityLabel="Back to the notebook">
          <Text style={[styles.link, { color: score.accent }]}>← Notebook</Text>
        </Pressable>

        {/* Word sheet */}
        <View style={styles.head}>
          <Text style={[styles.form, { color: score.ink, fontFamily: fonts.serif }]}>{word.form}</Text>
          <Text style={[styles.lemma, { color: score.inkTertiary }]}>
            {word.lemma}
            {word.lemma !== word.form ? ` — from “${word.form}”` : ''}
          </Text>
          <Text style={[styles.meaning, { color: score.ink }]}>{word.meaning}</Text>
          {word.transliteration ? (
            <Text style={[styles.transliteration, { color: score.inkSecondary }]}>[{word.transliteration}]</Text>
          ) : null}
          {word.roleLabel ? (
            <Text style={[styles.role, { color: score.inkSecondary }]}>It’s {word.roleLabel}.</Text>
          ) : null}
        </View>

        {word.patternNote ? (
          <View style={[styles.patternCard, { backgroundColor: score.paper, borderColor: score.rule }]}>
            <Text style={[styles.eyebrow, { color: score.inkTertiary }]}>A pattern worth noticing</Text>
            <Text style={[styles.patternText, { color: score.ink }]}>{word.patternNote}</Text>
          </View>
        ) : null}

        {/* Evidence ledger */}
        <View style={[styles.evidenceCard, { backgroundColor: score.paper, borderColor: due ? score.warmNote : score.rule }]}>
          <Text style={[styles.eyebrow, { color: due ? score.warmNote : score.inkTertiary }]}>
            {due ? 'Ready to revisit' : 'Resting'}
          </Text>
          <Text style={[styles.story, { color: score.ink }]}>
            {STATUS_STORY[entry.evidence.status] ?? STATUS_STORY.practised}
          </Text>
          <View style={styles.ledgerRows}>
            <LedgerRow label="Last seen" value={entry.evidence.lastSeenDay} ink={score.inkSecondary} />
            <LedgerRow
              label={due ? 'Was due' : 'Comes back'}
              value={entry.evidence.dueOn}
              ink={due ? score.warmNote : score.inkSecondary}
            />
            <LedgerRow label="Recalled without help" value={`${entry.evidence.correct}`} ink={score.inkSecondary} />
            <LedgerRow label="With help" value={`${entry.evidence.assisted}`} ink={score.inkSecondary} />
            <LedgerRow label="Missed" value={`${entry.evidence.incorrect}`} ink={score.inkSecondary} />
          </View>
          <Text style={[styles.footnote, { color: score.inkTertiary }]}>
            Help is recorded, never punished. Missing today only means it
            comes back sooner.
          </Text>
        </View>

        {/* Where it lives */}
        {media ? (
          <View style={styles.whereBlock}>
            <Text style={[styles.eyebrow, { color: score.inkTertiary }]}>Where you met it</Text>
            <Pressable
              onPress={() => navigateToCollectionItem(media.id)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${media.title}`}
            >
              <Text style={[styles.link, { color: score.accent }]}>“{media.title}” in your collection →</Text>
            </Pressable>
            <Pressable
              onPress={() => navigateToReader(media.id)}
              accessibilityRole="button"
              accessibilityLabel={`Read ${media.title}`}
            >
              <Text style={[styles.link, { color: score.accent }]}>Read the passage →</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function LedgerRow({ label, value, ink }: { label: string; value: string; ink: string }) {
  return (
    <View style={styles.ledgerRow}>
      <Text style={[styles.ledgerLabel, { color: ink }]}>{label}</Text>
      <Text style={[styles.ledgerValue, { color: ink }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 48,
    gap: 16,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  link: {
    fontSize: 15,
    lineHeight: 20,
  },
  head: {
    gap: 3,
  },
  form: {
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 48,
    letterSpacing: -0.5,
  },
  lemma: {
    fontSize: 13,
    lineHeight: 18,
  },
  meaning: {
    fontSize: 17,
    lineHeight: 24,
    marginTop: 4,
  },
  transliteration: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  role: {
    fontSize: 13,
    lineHeight: 18,
  },
  patternCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  patternText: {
    fontSize: 14,
    lineHeight: 21,
  },
  evidenceCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  story: {
    fontSize: 14,
    lineHeight: 21,
  },
  ledgerRows: {
    gap: 4,
    marginTop: 4,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ledgerLabel: {
    fontSize: 13,
    lineHeight: 19,
  },
  ledgerValue: {
    fontSize: 13,
    lineHeight: 19,
    fontVariant: ['tabular-nums'],
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
    marginTop: 4,
  },
  whereBlock: {
    gap: 6,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  missingTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
});
