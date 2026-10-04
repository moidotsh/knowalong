// app/collection.tsx
//
// COLLECTION (brief §9) — the shelf of everything saved: the original
// practice pieces with honest origin labels, the one purchasable chapter
// text, and your own pasted drafts with their true preparation state.
// Saved ≠ learned; this screen never blurs that.

import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  JourneyScaffold,
  DuskArtworkVector,
} from '../components/journey';
import { useAppTheme } from '../context';
import { theme } from '../constants';
import { navigateToCollectionAdd, navigateToCollectionItem } from '../navigation';
import { useJourneyStore, type DraftItem } from '../stores';
import { MEDIA_ORDER, getMediaItem } from '../utils/journey';

const PREPARATION_STAGES = [
  'Reading the passage',
  'Finding a good place to start',
  'Preparing your practice',
];

const STATUS_NOTES: Record<DraftItem['status'], string> = {
  draft: 'Saved. Not prepared — words aren’t recognized yet.',
  preparing: 'Reading your text…',
  ready: 'Ready — every line connects to your collection.',
  partial: 'Partly prepared — some lines connect, the rest stay plain text.',
  failed: 'Preparation didn’t finish. Nothing was lost.',
};

export default function CollectionScreen() {
  const store = useJourneyStore();
  const snapshot = useJourneyStore((s) => s.progress[s.language]);
  const { colors } = useAppTheme();
  const fonts = theme.fonts;
  const score = colors.score;

  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);

  // Drive the simulated preparation one stage at a time. Each preparing
  // draft ticks forward; offline (simulated) fails at the reading stage.
  useEffect(() => {
    const preparing = store.drafts.filter((d) => d.status === 'preparing');
    if (preparing.length === 0) return;
    const timers = preparing.map((d) =>
      setTimeout(() => store.advancePreparation(d.id), 900),
    );
    return () => timers.forEach(clearTimeout);
  }, [store.drafts, store.advancePreparation]);

  const entitled = (mediaId: string) =>
    snapshot?.entitledMediaIds.includes(mediaId) ?? false;

  const renderDraft = (draft: DraftItem) => {
    const expanded = expandedDraftId === draft.id;
    return (
      <View key={draft.id} style={[styles.draftCard, { backgroundColor: score.paper, borderColor: score.rule }]}>
        <Pressable
          onPress={() => setExpandedDraftId(expanded ? null : draft.id)}
          accessibilityRole="button"
          accessibilityLabel={`${draft.title}, ${draft.lineCount} lines`}
          accessibilityState={{ expanded }}
        >
          <Text style={[styles.draftTitle, { color: score.ink, fontFamily: fonts.serif }]}>{draft.title}</Text>
          <Text style={[styles.draftMeta, { color: score.inkTertiary }]}>
            Saved {draft.createdAtDay} · {draft.lineCount} {draft.lineCount === 1 ? 'line' : 'lines'}
          </Text>
          {expanded ? (
            <View style={[styles.draftText, { backgroundColor: score.canvas }]}>
              {draft.text
                .split(/\r?\n/)
                .filter((l) => l.trim().length > 0)
                .map((line, i) => (
                  <Text key={`${draft.id}-l-${i}`} style={[styles.draftLine, { color: score.ink, fontFamily: fonts.serif }]}>
                    {line}
                  </Text>
                ))}
            </View>
          ) : null}
        </Pressable>

        <Text
          style={[
            styles.draftStatus,
            { color: draft.status === 'failed' ? score.warmNote : draft.status === 'ready' ? score.accent : score.inkSecondary },
          ]}
        >
          {draft.status === 'preparing'
            ? `${PREPARATION_STAGES[Math.min(draft.stage, 2)]}…`
            : STATUS_NOTES[draft.status]}
        </Text>
        {draft.status === 'partial' ? (
          <Text style={[styles.draftPartial, { color: score.inkSecondary }]}>
            {draft.matchedLineIds.length} of {draft.lineCount} {draft.matchedLineIds.length === 1 ? 'line connects' : 'lines connect'} to passages you can practice.
          </Text>
        ) : null}

        <View style={styles.draftActions}>
          {draft.status === 'draft' ? (
            <Pressable
              onPress={() => store.startPreparation(draft.id)}
              accessibilityRole="button"
              accessibilityLabel="Prepare this text"
            >
              <Text style={[styles.action, { color: score.accent }]}>Prepare</Text>
            </Pressable>
          ) : null}
          {draft.status === 'preparing' ? (
            <Pressable
              onPress={() => store.cancelPreparation(draft.id)}
              accessibilityRole="button"
              accessibilityLabel="Cancel preparation"
            >
              <Text style={[styles.action, { color: score.inkSecondary }]}>Cancel</Text>
            </Pressable>
          ) : null}
          {draft.status === 'failed' ? (
            <Pressable
              onPress={() => store.retryPreparation(draft.id)}
              accessibilityRole="button"
              accessibilityLabel="Try preparation again"
            >
              <Text style={[styles.action, { color: score.accent }]}>Try again</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => store.removeDraft(draft.id)}
            accessibilityRole="button"
            accessibilityLabel="Remove this draft"
          >
            <Text style={[styles.action, { color: score.inkTertiary }]}>Remove</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <JourneyScaffold destination="collection">
      <ScrollView style={styles.body} contentContainerStyle={[styles.bodyContent, { paddingBottom: 40 + 72 }]}>
        <View style={styles.pageHead}>
          <Text style={[styles.pageTitle, { color: score.ink, fontFamily: fonts.serif }]}>Your Collection</Text>
          <Text style={[styles.pageNote, { color: score.inkSecondary }]}>
            Everything here is what it says it is — saved is not learned.
          </Text>
        </View>

        {/* The shelf — original practice pieces */}
        {MEDIA_ORDER.map((mediaId) => {
          const media = getMediaItem(mediaId);
          if (!media) return null;
          const locked = !entitled(media.id);
          return (
            <Pressable
              key={media.id}
              onPress={() => navigateToCollectionItem(media.id)}
              accessibilityRole="button"
              accessibilityLabel={`${media.title}${locked ? ', available with a demo purchase' : ''}`}
              style={({ pressed }) => [
                styles.shelfCard,
                { backgroundColor: score.paper, borderColor: score.rule },
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={[styles.thumbFrame, { borderColor: score.rule, opacity: locked ? 0.45 : 1 }]}>
                <DuskArtworkVector artwork={media.artwork} width={96} height={60} />
              </View>
              <View style={styles.shelfText}>
                <Text style={[styles.shelfTitle, { color: score.ink, fontFamily: fonts.serif }]}>{media.title}</Text>
                <Text style={[styles.shelfOrigin, { color: score.inkTertiary }]}>
                  {media.kind === 'song' ? 'Song' : 'Prose'} · {media.originLabel}
                </Text>
                {locked ? (
                  <Text style={[styles.shelfLocked, { color: score.warmNote }]}>
                    ${media.priceUsd?.toFixed(2) ?? '2.99'} — demo purchase, no charge
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.shelfArrow, { color: score.accent }]}>→</Text>
            </Pressable>
          );
        })}

        {/* Your own saved texts */}
        <View style={styles.draftsHead}>
          <Text style={[styles.sectionTitle, { color: score.ink, fontFamily: fonts.serif }]}>Your own texts</Text>
          <Pressable
            onPress={navigateToCollectionAdd}
            accessibilityRole="button"
            accessibilityLabel="Add your own text"
          >
            <Text style={[styles.action, { color: score.accent }]}>+ Add your own</Text>
          </Pressable>
        </View>
        {store.drafts.length === 0 ? (
          <Text style={[styles.emptyDrafts, { color: score.inkTertiary }]}>
            Nothing saved yet. Paste any Russian text — the demo prepares what
            it honestly can, and tells you what it couldn’t.
          </Text>
        ) : (
          store.drafts.map(renderDraft)
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
    // Wide windows center the shelf instead of stretching it.
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
  shelfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    gap: 14,
  },
  thumbFrame: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  shelfText: {
    flex: 1,
    gap: 2,
  },
  shelfTitle: {
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 25,
  },
  shelfOrigin: {
    fontSize: 12,
    lineHeight: 16,
  },
  shelfLocked: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  shelfArrow: {
    fontSize: 16,
  },
  draftsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 27,
  },
  action: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  emptyDrafts: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  draftCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  draftTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  draftMeta: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  draftText: {
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    gap: 4,
  },
  draftLine: {
    fontSize: 17,
    lineHeight: 24,
  },
  draftStatus: {
    fontSize: 13,
    lineHeight: 18,
  },
  draftPartial: {
    fontSize: 13,
    lineHeight: 18,
  },
  draftActions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 2,
  },
});
