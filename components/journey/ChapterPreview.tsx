// components/journey/ChapterPreview.tsx
//
// The "what's next" card: the chapter beyond the active one — its title,
// destination, why it follows, and its artwork. Locked chapters carry
// the demo-purchase entry point instead of a start button.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../context';
import { theme } from '../../constants';
import { MobilePrimaryButton, Pressable } from '../MobilePremium';
import type { Chapter } from '../../utils/journey';
import { getMediaItem } from '../../utils/journey';
import { DuskArtworkVector } from './DuskArtworkVector';
import { LABEL_TRACKING } from './tokens';

export interface ChapterPreviewProps {
  chapter: Chapter;
  locked: boolean;
  /** True when this is the active chapter (preview shows payoff instead). */
  isActive: boolean;
  entitled: boolean;
  onOpen: () => void;
  onPurchase: () => void;
}

export function ChapterPreview({
  chapter,
  locked,
  isActive,
  entitled,
  onOpen,
  onPurchase,
}: ChapterPreviewProps) {
  const { colors } = useAppTheme();
  const fonts = theme.fonts;
  const score = colors.score;
  const media = chapter.mediaId ? getMediaItem(chapter.mediaId) : null;
  const priceLabel =
    media?.priceUsd != null ? `$${media.priceUsd.toFixed(2)}` : null;

  return (
    <View style={[styles.card, { backgroundColor: score.paper, borderColor: score.rule }]}>
      <Text style={[styles.eyebrow, { color: score.inkTertiary }]}>
        {isActive ? 'Your chapter' : `Next — Chapter ${String(chapter.number).padStart(2, '0')}`}
      </Text>
      {media ? <View style={[styles.artworkWrap, { borderColor: score.rule }]}>
          <DuskArtworkVector artwork={media.artwork} style={styles.artwork} />
        </View> : null}
      <Text
        style={[styles.title, { color: score.ink, fontFamily: fonts.serif }]}
        accessibilityRole="header"
      >
        {chapter.title}
      </Text>
      <Text style={[styles.destination, { color: score.inkSecondary }]}>{chapter.destination}</Text>
      {chapter.overlapNote ? <Text style={[styles.overlap, { color: score.inkTertiary }]}>{chapter.overlapNote}</Text> : null}

      {locked && !entitled ? (
        <View style={styles.actionArea}>
          <MobilePrimaryButton onPress={onPurchase} variant="primary" size="sm">
            {priceLabel ? `Unlock this chapter — ${priceLabel}` : 'Unlock this chapter'}
          </MobilePrimaryButton>
          <Text style={[styles.purchaseNote, { color: score.inkTertiary }]}>
            Demo purchase — no charge. Includes “{media?.title}” with its full
            chapter of practice.
          </Text>
        </View>
      ) : (
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={`Open chapter ${chapter.title}`}
          style={({ pressed }) => [styles.openLink, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.openLinkText, { color: score.accentDeep }]}>
            {isActive ? 'Jump to your chapter' : 'Open this chapter'} →
          </Text>
        </Pressable>
      )}
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
  eyebrow: {
    fontSize: 12,
    letterSpacing: LABEL_TRACKING,
    textTransform: 'uppercase',
    fontWeight: '600',
  } as const,
  artworkWrap: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginTop: 12,
    height: 96,
  } as const,
  artwork: { width: '100%', height: '100%' } as const,
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', marginTop: 12 } as const,
  destination: { fontSize: 15, lineHeight: 22, marginTop: 6 } as const,
  overlap: { fontSize: 13, lineHeight: 19, marginTop: 8, fontStyle: 'italic' } as const,
  actionArea: { marginTop: 14 } as const,
  purchaseNote: { fontSize: 12, lineHeight: 18, marginTop: 8 } as const,
  openLink: { marginTop: 14, alignSelf: 'flex-start' } as const,
  openLinkText: { fontSize: 15, fontWeight: '600' } as const,
});

export default ChapterPreview;
