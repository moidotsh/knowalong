// app/collection/[itemId].tsx
//
// MEDIA DETAIL — one collection item, honestly labeled (brief §9). The
// original pieces say "Original practice text" and mean it; audio says
// when it isn't available; the one purchasable piece shows a demo
// purchase that charges nothing and says so. Sessions for this piece
// open from here too — Collection and Journey are one system.

import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { MobileDialog, MobilePrimaryButton } from '../../components/MobilePremium';
import { DuskArtworkVector } from '../../components/journey';
import { useAppTheme } from '../../context';
import { theme } from '../../constants';
import { navigateToReader, navigateToSession, safeGoBack } from '../../navigation';
import { useJourneyStore } from '../../stores';
import {
  canEnterSession,
  getChapter,
  getChapterSteps,
  getMediaItem,
  getNextPlanForStep,
  RU_JOURNEY,
  type MediaItem,
  type JourneyStep,
} from '../../utils/journey';

export default function CollectionItemScreen() {
  const params = useLocalSearchParams<{ itemId: string }>();
  const itemId = typeof params.itemId === 'string' ? params.itemId : '';
  const media: MediaItem | null = getMediaItem(itemId);

  const store = useJourneyStore();
  const snapshot = useMemo(
    () => store.selectSnapshot(),
    [store.progress, store.language, store.contentRevision],
  );
  const { colors } = useAppTheme();
  const fonts = theme.fonts;
  const score = colors.score;

  const [confirmPurchase, setConfirmPurchase] = useState(false);

  if (!media) {
    return (
      <SafeAreaView style={[styles.missing, { backgroundColor: score.canvas }]} edges={['top', 'bottom']}>
        <Text style={[styles.missingTitle, { color: score.ink }]}>That item isn’t in your collection.</Text>
        <Pressable onPress={safeGoBack} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={[styles.link, { color: score.accent }]}>← Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const entitled = media.access !== 'purchasable' || snapshot.entitledMediaIds.includes(media.id);
  const firstPassage = media.passages[0] ?? null;
  const previewLines = firstPassage?.lines.slice(0, 2) ?? [];

  // The chapter this item unlocks, if any ("Make this my next chapter").
  const unlockingChapter = RU_JOURNEY.chapterIds
    .map((id) => getChapter(id))
    .find((c) => c?.requiresPurchaseOf === media.id) ?? null;

  // Sessions that practice this piece and are open right now (max 2).
  const practiceSteps: Array<{ step: JourneyStep; planId: string; index: number }> = [];
  for (const chapterId of RU_JOURNEY.chapterIds) {
    for (const step of getChapterSteps(chapterId)) {
      if (step.mediaId !== media.id) continue;
      const next = getNextPlanForStep(step, snapshot);
      if (!next || !canEnterSession(next.planId, snapshot).ok) continue;
      practiceSteps.push({ step, planId: next.planId, index: next.index });
      break;
    }
    if (practiceSteps.length >= 2) break;
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: score.canvas }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={safeGoBack} accessibilityRole="button" accessibilityLabel="Back to the collection">
          <Text style={[styles.link, { color: score.accent }]}>← Collection</Text>
        </Pressable>

        {/* Artwork + names */}
        <View style={styles.hero}>
          <View style={[styles.artworkFrame, { borderColor: score.rule }]}>
            <DuskArtworkVector artwork={media.artwork} width="100%" height={150} />
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.kindLabel, { color: score.inkTertiary }]}>
              {media.kind === 'song' ? 'Song' : 'Prose'} · {media.originLabel}
            </Text>
            <Text style={[styles.title, { color: score.ink, fontFamily: fonts.serif }]}>{media.title}</Text>
            {media.subtitle ? (
              <Text style={[styles.subtitle, { color: score.inkSecondary }]}>{media.subtitle}</Text>
            ) : null}
          </View>
        </View>

        {/* Purchase veneer — or the open door */}
        {!entitled ? (
          <View style={[styles.purchaseCard, { backgroundColor: score.paper, borderColor: score.ruleStrong }]}>
            <Text style={[styles.price, { color: score.ink, fontFamily: fonts.serif }]}>
              ${media.priceUsd?.toFixed(2) ?? '2.99'}
            </Text>
            {(media.included ?? []).map((line) => (
              <Text key={line} style={[styles.includedLine, { color: score.inkSecondary }]}>
                · {line}
              </Text>
            ))}
            <View style={styles.buyButton}>
              <MobilePrimaryButton onPress={() => setConfirmPurchase(true)}>
                Buy this chapter’s text
              </MobilePrimaryButton>
            </View>
            <Text style={[styles.demoNote, { color: score.inkTertiary }]}>
              Demo purchase — no charge, nothing is billed.
            </Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <View style={styles.buyButton}>
              <MobilePrimaryButton onPress={() => navigateToReader(media.id)}>
                Explore the passage
              </MobilePrimaryButton>
            </View>
            {unlockingChapter && snapshot.entitledMediaIds.includes(media.id) ? (
              <Pressable
                onPress={() => {
                  store.activateChapter(unlockingChapter.id);
                  safeGoBack();
                }}
                accessibilityRole="button"
                accessibilityLabel="Make this my next chapter"
              >
                <Text style={[styles.link, { color: score.accent }]}>
                  Make this my next chapter → {unlockingChapter.title}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {/* Passage preview — first lines, then the reader */}
        {firstPassage ? (
          <View style={[styles.previewCard, { backgroundColor: score.paper, borderColor: score.rule }]}>
            <Text style={[styles.previewEyebrow, { color: score.inkTertiary }]}>{firstPassage.label}</Text>
            {previewLines.map((line) => (
              <View key={line.id} style={styles.previewLine}>
                <Text style={[styles.previewText, { color: score.ink, fontFamily: fonts.serif }]}>{line.text}</Text>
                <Text style={[styles.previewTranslation, { color: score.inkSecondary }]}>{line.translation}</Text>
              </View>
            ))}
            <Text style={[styles.audioNote, { color: score.inkTertiary }]}>
              Audio isn’t available in this prototype — the reader says so where it matters.
            </Text>
            <Pressable
              onPress={() => navigateToReader(media.id)}
              accessibilityRole="button"
              accessibilityLabel="Read the full passage"
            >
              <Text style={[styles.link, { color: score.accent }]}>Read the full passage →</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Practice entries — the same sessions the Journey opens */}
        {practiceSteps.length > 0 ? (
          <View style={styles.practiceBlock}>
            <Text style={[styles.previewEyebrow, { color: score.inkTertiary }]}>Practice this</Text>
            {practiceSteps.map(({ step, planId, index: sessionIndex }) => (
              <Pressable
                key={step.id}
                onPress={() => navigateToSession(planId)}
                accessibilityRole="button"
                accessibilityLabel={`Practice: ${step.title}`}
                style={({ pressed }) => [
                  styles.practiceRow,
                  { backgroundColor: score.paper, borderColor: score.rule },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.practiceTitle, { color: score.ink }]}>{step.title}</Text>
                <Text style={[styles.practiceMeta, { color: score.inkTertiary }]}>
                  Session {sessionIndex} of {step.sessionPlanIds.length} · about {step.estimatedMinutes ?? 5} min
                </Text>
                <Text style={[styles.practiceArrow, { color: score.accent }]}>→</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <MobileDialog
        open={confirmPurchase}
        onOpenChange={setConfirmPurchase}
        title="Buy “Northern platform”?"
        primaryLabel="Buy for $2.99"
        secondaryLabel="Not now"
        showSecondary
        onPrimary={() => {
          store.purchaseMedia(media.id);
          setConfirmPurchase(false);
        }}
        onSecondary={() => setConfirmPurchase(false)}
      >
        This is a demo purchase — no charge, no account, nothing is billed.
        The chapter’s text unlocks on this device only.
      </MobileDialog>
    </SafeAreaView>
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
    gap: 20,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  link: {
    fontSize: 15,
    lineHeight: 20,
  },
  hero: {
    gap: 14,
  },
  artworkFrame: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  heroText: {
    gap: 4,
  },
  kindLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  purchaseCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  includedLine: {
    fontSize: 14,
    lineHeight: 20,
  },
  buyButton: {
    marginTop: 8,
    maxWidth: 320,
  },
  demoNote: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  actions: {
    gap: 12,
  },
  previewCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  previewEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  previewLine: {
    gap: 2,
  },
  previewText: {
    fontSize: 20,
    lineHeight: 28,
  },
  previewTranslation: {
    fontSize: 13,
    lineHeight: 18,
  },
  audioNote: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  practiceBlock: {
    gap: 10,
  },
  practiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  practiceTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    flexShrink: 1,
  },
  practiceMeta: {
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 'auto',
  },
  practiceArrow: {
    fontSize: 16,
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
