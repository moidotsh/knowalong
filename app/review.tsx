// app/review.tsx
// Review session. Mobile-first card shell. Source cards identify source/
// section. Generated cards reveal "Generated practice" after answer.
// Again/Hard/Good/Easy controls. Scheduling is preview/provisional, not FSRS.

import React, { useState, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobilePrimaryButton,
  MobileActionFooter,
  RevealMask,
} from '../components/MobilePremium';
import { useAppTheme, useToast } from '../context';
import { safeGoBack } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import { useReviewQueue, useRecordReviewAttempt } from '../hooks';
import type { StudyCard, ReviewRating } from '@shared/types';

const RATINGS: { label: string; value: ReviewRating; colorKey: 'error' | 'warning' | 'brand' | 'success' }[] = [
  { label: 'Again', value: 'again', colorKey: 'error' },
  { label: 'Hard', value: 'hard', colorKey: 'warning' },
  { label: 'Good', value: 'good', colorKey: 'brand' },
  { label: 'Easy', value: 'easy', colorKey: 'success' },
];

function ratingColor(colors: ReturnType<typeof useAppTheme>['colors'], key: 'error' | 'warning' | 'brand' | 'success'): string {
  if (key === 'brand') return colors.brand;
  return colors.status[key];
}

export default function ReviewScreen() {
  const { colors } = useAppTheme();
  const { showToast } = useToast();
  const { data: queue } = useReviewQueue();
  const recordAttempt = useRecordReviewAttempt();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const card: StudyCard | undefined = queue?.[index];
  const total = queue?.length ?? 0;
  const isComplete = index >= total;

  const handleRate = useCallback(
    (rating: ReviewRating) => {
      if (!card) return;
      recordAttempt.mutate(
        { cardId: card.id, rating },
        {
          onSuccess: () => {
            setRevealed(false);
            setIndex((i) => i + 1);
          },
          onError: () => {
            showToast('error', 'Could not record review.');
          },
        },
      );
    },
    [card, recordAttempt, showToast],
  );

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: colors.backgroundDeep }]}
      edges={['top', 'bottom']}
    >
      <MobileAtmosphere surface="analytics" />
      <MobileHeader
        title={isComplete ? 'Session complete' : `Review ${index + 1} / ${total}`}
        eyebrow="Practice"
        onBack={safeGoBack}
      />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.bodyContent}>
        {isComplete || !card ? (
          <MobileSurface padding={24}>
            <Text style={[styles.completeTitle, { color: colors.text }]}>
              All done
            </Text>
            <Text style={[styles.completeBody, { color: colors.textSecondary }]}>
              No more cards due. Come back later or add new sources to study.
            </Text>
          </MobileSurface>
        ) : (
          <MobileSurface padding={20}>
            <View style={styles.cardMetaRow}>
              <Text style={[styles.cardKind, { color: colors.textMuted }]}>
                {card.cardKind.replace(/_/g, ' ')}
              </Text>
              {card.generatedContent ? (
                <View style={[styles.genChip, { backgroundColor: colors.brandSoft }]}>
                  <Text style={[styles.genChipText, { color: colors.brand }]}>
                    Generated
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.cardPrompt, { color: colors.text }]}>
              {card.prompt}
            </Text>

            {revealed ? (
              <View style={{ marginTop: 16 }}>
                <RevealMask masked={false}>
                  <View style={styles.answerSection}>
                    <Text style={[styles.answerLabel, { color: colors.textMuted }]}>
                      Answer
                    </Text>
                    <Text style={[styles.answerText, { color: colors.text }]}>
                      {card.answer}
                    </Text>
                    {card.generatedContent ? (
                      <Text style={[styles.genNotice, { color: colors.textMuted }]}>
                        This is generated practice — not quoted source text.
                      </Text>
                    ) : null}
                  </View>
                </RevealMask>
              </View>
            ) : null}

            {!revealed ? (
              <Text style={[styles.hintText, { color: colors.textSecondary, marginTop: 12 }]}>
                Tap "Show answer" when ready.
              </Text>
            ) : null}
          </MobileSurface>
        )}
      </ScrollView>
      <MobileActionFooter>
        {!isComplete && card ? (
          !revealed ? (
            <MobilePrimaryButton onPress={() => setRevealed(true)}>
              Show answer
            </MobilePrimaryButton>
          ) : (
            <View style={styles.ratingRow}>
              {RATINGS.map((r) => (
                <Pressable
                  key={r.value}
                  onPress={() => handleRate(r.value)}
                  disabled={recordAttempt.isPending}
                  style={({ pressed }) => [
                    styles.ratingButton,
                    { backgroundColor: ratingColor(colors, r.colorKey), opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text style={[styles.ratingLabel, { color: colors.textOnBrand }]}>
                    {r.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )
        ) : (
          <MobilePrimaryButton variant="ghost" onPress={safeGoBack}>
            Back to library
          </MobilePrimaryButton>
        )}
      </MobileActionFooter>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 80,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardKind: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  genChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  genChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardPrompt: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  },
  answerSection: {
    padding: 12,
  },
  answerLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  answerText: {
    fontSize: 16,
    lineHeight: 24,
  },
  genNotice: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  hintText: {
    fontSize: 13,
  },
  completeTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  completeBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  ratingButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
