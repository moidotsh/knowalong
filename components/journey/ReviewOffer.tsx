// components/journey/ReviewOffer.tsx
//
// Review lives IN the path, not in a separate mode (brief §5.6): a warm
// card under the current-step panel — "these are ready to revisit" — with
// a bounded action, "Review 5 now" at most.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../context';
import { MobilePrimaryButton, Pressable } from '../MobilePremium';
import type { NotebookEntry } from '../../utils/journey';
import { LABEL_TRACKING } from './tokens';

export interface ReviewOfferProps {
  entries: NotebookEntry[];
  /** Opens the bounded review session. */
  onReview: () => void;
  /** Opens the Notebook (rendered only when provided). */
  onOpenNotebook?: () => void;
  variant?: 'card' | 'inline';
}

export function ReviewOffer({ entries, onReview, onOpenNotebook, variant = 'card' }: ReviewOfferProps) {
  const { colors } = useAppTheme();
  const score = colors.score;
  if (entries.length === 0) return null;

  const names = entries
    .slice(0, 3)
    .map((entry) => entry.word?.lemma ?? entry.wordKey.replace(/^ru:/, ''));
  const rest = entries.length - names.length;

  return (
    <View
      style={[
        styles.card,
        variant === 'inline' && styles.inline,
        { backgroundColor: score.warmWash, borderColor: score.rule },
      ]}
    >
      <Text style={[styles.eyebrow, { color: score.warmNote }]}>Ready to revisit</Text>
      <Text style={[styles.body, { color: score.inkSecondary }]}>
        {names.join(', ')}
        {rest > 0 ? ` and ${rest} more ${rest === 1 ? 'word' : 'words'}` : ''}{' '}
        {entries.length === 1 ? 'is' : 'are'} ready for another look.
      </Text>
      <MobilePrimaryButton onPress={onReview} variant="secondary" size="sm">
        Review {entries.length} now
      </MobilePrimaryButton>
      {onOpenNotebook ? (
        <Pressable
          onPress={onOpenNotebook}
          accessibilityRole="link"
          accessibilityLabel="Open your notebook"
          style={({ pressed }) => [styles.notebookLink, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.notebookLinkText, { color: score.accentDeep }]}>
            See them in your notebook →
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 20,
  } as const,
  inline: { marginHorizontal: 0 } as const,
  eyebrow: {
    fontSize: 12,
    letterSpacing: LABEL_TRACKING,
    textTransform: 'uppercase',
    fontWeight: '700',
  } as const,
  body: { fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 14 } as const,
  notebookLink: { marginTop: 12, alignSelf: 'flex-start' } as const,
  notebookLinkText: { fontSize: 14, fontWeight: '600' } as const,
});

export default ReviewOffer;
