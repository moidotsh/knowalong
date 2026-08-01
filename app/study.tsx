// app/study.tsx
// CLCC flashcard study session. Renders concept_realizations from the
// prototype fixture as flip cards: front = surface_form + transliteration
// + ipa; back = gloss + examples + grammatical note. Again/Hard/Good/Easy
// ratings (provisional — no scheduler yet, just session tracking).
// Ordered by tier + frequency (the gradient: basal concepts first).

import React, { useState, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobilePrimaryButton,
  MobileActionFooter,
} from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import { getStudyQueue, type ClccRealization } from '../utils/knowalong/fixtures/clccRealizations';

type Rating = 'again' | 'hard' | 'good' | 'easy';

const RATINGS: { label: string; value: Rating; colorKey: 'error' | 'warning' | 'brand' | 'success' }[] = [
  { label: 'Again', value: 'again', colorKey: 'error' },
  { label: 'Hard', value: 'hard', colorKey: 'warning' },
  { label: 'Good', value: 'good', colorKey: 'brand' },
  { label: 'Easy', value: 'easy', colorKey: 'success' },
];

function ratingColor(colors: ReturnType<typeof useAppTheme>['colors'], key: 'error' | 'warning' | 'brand' | 'success'): string {
  if (key === 'brand') return colors.brand;
  return colors.status[key];
}

export default function StudyScreen() {
  const { colors } = useAppTheme();
  const queue = useState(() => getStudyQueue())[0];
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [ratings, setRatings] = useState<Rating[]>([]);

  const card: ClccRealization | undefined = queue[index];
  const total = queue.length;
  const isComplete = index >= total;

  const handleRate = useCallback((rating: Rating) => {
    setRatings((r) => [...r, rating]);
    setRevealed(false);
    setIndex((i) => i + 1);
  }, []);

  const againCount = ratings.filter((r) => r === 'again').length;

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: colors.backgroundDeep }]} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader
        title={isComplete ? 'Session complete' : `Study ${index + 1} / ${total}`}
        eyebrow="CLCC Flashcards"
        onBack={safeGoBack}
      />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.bodyContent}>
        {isComplete || !card ? (
          <MobileSurface padding={24}>
            <Text style={[styles.completeTitle, { color: colors.text }]}>Session complete</Text>
            <Text style={[styles.completeBody, { color: colors.textSecondary }]}>
              Studied {total} concept{total === 1 ? '' : 's'}. {againCount} marked "again".
            </Text>
            <View style={{ height: 16 }} />
            <MobilePrimaryButton
              variant="secondary"
              onPress={() => { setIndex(0); setRevealed(false); setRatings([]); }}
            >
              Study again
            </MobilePrimaryButton>
          </MobileSurface>
        ) : (
          <MobileSurface padding={20}>
            {/* Card meta */}
            <View style={styles.cardMetaRow}>
              <Text style={[styles.cardKind, { color: colors.textMuted }]}>
                Tier {card.tier} · {card.functionalCluster}
              </Text>
              <Text style={[styles.cardCode, { color: colors.textMuted }]}>
                {card.coreConceptCode}
              </Text>
            </View>

            {/* Front: surface form */}
            <View style={styles.cardFront}>
              <Text style={[styles.surfaceForm, { color: colors.text }]}>
                {card.surfaceForm}
              </Text>
              {card.transliteration ? (
                <Text style={[styles.translit, { color: colors.textSecondary }]}>
                  {card.transliteration}
                </Text>
              ) : null}
              {card.ipa ? (
                <Text style={[styles.ipa, { color: colors.textMuted }]}>
                  /{card.ipa}/
                </Text>
              ) : null}
            </View>

            {/* Back: gloss + examples (revealed) */}
            {revealed ? (
              <View style={styles.cardBack}>
                {card.gloss ? (
                  <Text style={[styles.gloss, { color: colors.text }]}>
                    {card.gloss}
                  </Text>
                ) : null}
                {card.grammaticalNote ? (
                  <Text style={[styles.grammarNote, { color: colors.textSecondary }]}>
                    {card.grammaticalNote}
                  </Text>
                ) : null}
                {card.examples && card.examples.length > 0 ? (
                  <View style={styles.examples}>
                    {card.examples.map((ex, i) => (
                      <View key={i} style={styles.exampleItem}>
                        <Text style={[styles.exampleSource, { color: colors.text }]}>
                          {ex.sourceText}
                        </Text>
                        <Text style={[styles.exampleTrans, { color: colors.textSecondary }]}>
                          {ex.translation}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {card.prerequisites.length > 0 ? (
                  <Text style={[styles.deps, { color: colors.textMuted }]}>
                    Prerequisites: {card.prerequisites.join(', ')}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </MobileSurface>
        )}
      </ScrollView>

      {!isComplete && card ? (
        <MobileActionFooter>
          {!revealed ? (
            <MobilePrimaryButton
              variant="primary"
              onPress={() => setRevealed(true)}
            >
              Show answer
            </MobilePrimaryButton>
          ) : (
            <View style={styles.ratingRow}>
              {RATINGS.map((r) => {
                const c = ratingColor(colors, r.colorKey);
                return (
                  <Pressable
                    key={r.value}
                    style={[styles.ratingBtn, { backgroundColor: c }]}
                    onPress={() => handleRate(r.value)}
                  >
                    <Text style={[styles.ratingLabel, { color: colors.textOnBrand }]}>{r.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </MobileActionFooter>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  bodyContent: { padding: 16, gap: 16 },
  cardMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardKind: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardCode: { fontSize: 11, fontFamily: 'monospace' },
  cardFront: { alignItems: 'center', paddingVertical: 32 },
  surfaceForm: { fontSize: 42, fontWeight: '700', textAlign: 'center' },
  translit: { fontSize: 18, marginTop: 8, fontStyle: 'italic' },
  ipa: { fontSize: 14, marginTop: 4, fontFamily: 'monospace' },
  cardBack: { paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.2)', gap: 12 },
  gloss: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  grammarNote: { fontSize: 13, textAlign: 'center', fontStyle: 'italic' },
  examples: { gap: 8, marginTop: 4 },
  exampleItem: { paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: 'rgba(128,128,128,0.3)' },
  exampleSource: { fontSize: 15, fontWeight: '500' },
  exampleTrans: { fontSize: 13, marginTop: 2 },
  deps: { fontSize: 11, marginTop: 4 },
  completeTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  completeBody: { fontSize: 15, lineHeight: 22 },
  ratingRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  ratingBtn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, flex: 1, alignItems: 'center' },
  ratingLabel: { fontSize: 14, fontWeight: '600' },
});
