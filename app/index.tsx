// app/index.tsx
// Library — the post-auth home route. Lists the user's learning sources
// (title, artist, target language, processing status, readiness). Strong
// empty state with "Add lyrics" CTA. Primary action: import new lyrics.

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobilePrimaryButton,
  MobileActionFooter,
  MobileSectionEyebrow,
  EmptyState,
  SkeletonBlock,
} from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { navigateToImport, navigateToSource, navigateToSettings } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import { useLearningSources, useSourceReadiness } from '../hooks';
import type { LearningSource, ReadinessResult } from '@shared/types';

function ReadinessBadge({ result }: { result: ReadinessResult | undefined }) {
  const { colors } = useAppTheme();
  if (!result) {
    return <Text style={[styles.metaText, { color: colors.textMuted }]}>…</Text>;
  }
  if (result.kind === 'not-assessed') {
    return <Text style={[styles.metaText, { color: colors.textMuted }]}>Not assessed</Text>;
  }
  return (
    <Text style={[styles.metaText, { color: colors.brand, fontWeight: '600' }]}>
      {result.score}% ready
    </Text>
  );
}

function SourceLibraryCard({ source }: { source: LearningSource }) {
  const { colors } = useAppTheme();
  const readiness = useSourceReadiness(source.id);
  return (
    <Pressable onPress={() => navigateToSource(source.id)} style={styles.sourceCard}>
      <MobileSurface padding={16}>
        <View style={styles.sourceCardHeader}>
          <Text style={[styles.sourceTitle, { color: colors.text }]} numberOfLines={2}>
            {source.title}
          </Text>
          <View style={[styles.langChip, { backgroundColor: colors.brandSoft }]}>
            <Text style={[styles.langChipText, { color: colors.brand }]}>
              {source.targetLanguage.toUpperCase()}
            </Text>
          </View>
        </View>
        {source.artist ? (
          <Text style={[styles.sourceArtist, { color: colors.textSecondary }]} numberOfLines={1}>
            {source.artist}
          </Text>
        ) : null}
        <View style={styles.sourceMetaRow}>
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {source.processingStatus}
          </Text>
          <ReadinessBadge result={readiness.data} />
        </View>
      </MobileSurface>
    </Pressable>
  );
}

export default function LibraryScreen() {
  const { colors } = useAppTheme();
  const { data: sources, isLoading } = useLearningSources();

  const hasSources = (sources?.length ?? 0) > 0;

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: colors.backgroundDeep }]}
      edges={['top', 'bottom']}
    >
      <MobileAtmosphere surface="analytics" />
      <MobileHeader
        title="Your study library"
        eyebrow="KnowAlong"
        rightAction={
          <Pressable onPress={navigateToSettings} hitSlop={8}>
            <Text style={[styles.settingsLink, { color: colors.brand }]}>Settings</Text>
          </Pressable>
        }
      />
      <ScrollView
        style={SCREEN_BODY_STYLE}
        contentContainerStyle={styles.bodyContent}
      >
        {isLoading && !hasSources ? (
          <View style={{ gap: 12 }}>
            <SkeletonBlock height={100} borderRadius={14} />
            <SkeletonBlock height={100} borderRadius={14} />
          </View>
        ) : !hasSources ? (
          <EmptyState
            title="No sources yet"
            message="Paste lyrics or text you have the right to use for personal study. Your library is private."
            action={{ label: 'Add lyrics', onPress: navigateToImport }}
          />
        ) : (
          <>
            <MobileSectionEyebrow>Sources ({sources!.length})</MobileSectionEyebrow>
            <View style={{ gap: 12 }}>
              {sources!.map((source) => (
                <SourceLibraryCard key={source.id} source={source} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
      <MobileActionFooter>
        <MobilePrimaryButton onPress={navigateToImport}>
          Add lyrics
        </MobilePrimaryButton>
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
  sourceCard: { borderRadius: 14 },
  sourceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  sourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    lineHeight: 22,
  },
  sourceArtist: {
    fontSize: 13,
    marginBottom: 8,
  },
  sourceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  langChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  langChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaText: {
    fontSize: 12,
  },
  settingsLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
