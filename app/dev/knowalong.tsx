// app/dev/knowalong.tsx
// KnowAlong-specific demo surface (separate from dev/premium.tsx, which
// stays generic). Shows the demo source, cards, concepts, and the analysis
// fixture. Linked from settings, not from user surfaces.

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobileSectionEyebrow,
  MobilePrimaryButton,
  MobileActionFooter,
} from '../../components/MobilePremium';
import { useAppTheme } from '../../context';
import { safeGoBack } from '../../navigation';
import { SCREEN_BODY_STYLE, theme } from '../../constants';
import { Rollsign, LineMap, StationRow, type LineMapStation } from '../../components/knowalong';
import { useLearningSources, useLearningSource, useSourceSections } from '../../hooks';
import { resetDemoState } from '../../utils/supabase/repositories';

// The Night Metro demo line — one stop per service state, the second
// stop "current" so the ring + lit dot read on the demo plate.
const DEMO_LINE: LineMapStation[] = [
  { id: 'privet', title: 'Приветствие', meta: 'greeting · known', state: 'known' },
  { id: 'svetofor', title: 'Светофор', meta: 'traffic light · learning', state: 'seen', current: true },
  { id: 'vokzal', title: 'Вокзал', meta: 'station · needs work', state: 'new' },
  { id: 'topor', title: 'Топор', meta: 'axe · locked', state: 'locked' },
];

export default function KnowAlongDemoScreen() {
  const { colors } = useAppTheme();
  const { data: sources } = useLearningSources();
  const firstSource = sources?.[0] ?? null;
  const { data: sourceDetail } = useLearningSource(firstSource?.id ?? null);
  const { data: sectionsData } = useSourceSections(firstSource?.id ?? null);

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: colors.backgroundDeep }]}
      edges={['top', 'bottom']}
    >
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title="KnowAlong Demo" eyebrow="Dev" onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.bodyContent}>
        <MobileSectionEyebrow>Night Metro</MobileSectionEyebrow>
        <Text style={[styles.sectionNote, { color: colors.textSecondary }]}>
          The design language's signature components — the destination
          blind, the line map, the station row.
        </Text>
        <View style={{ height: 10 }} />
        <Rollsign
          destination="Винительный падеж"
          eyebrow="Line 02 · Cases"
          meta="Next stop"
          testID="demo-rollsign-lg"
        />
        <View style={{ height: 10 }} />
        <Rollsign
          destination="Светофор"
          eyebrow="Line 01 · Core"
          size="md"
          testID="demo-rollsign-md"
        />
        <View style={{ height: 12 }} />
        <MobileSurface padding={16}>
          <LineMap stations={DEMO_LINE} lineLabel="Line 01 · Core" testID="demo-linemap" />
        </MobileSurface>
        <View style={{ height: 12 }} />
        <MobileSurface padding={6}>
          <StationRow
            title="Светофор"
            meta="Deck · 24 words"
            state="seen"
            current
            testID="demo-station-row"
            right={<Text style={[styles.demoRight, { color: colors.brand }]}>24</Text>}
          />
          <StationRow
            title="Магазин"
            meta="Deck · 18 words"
            state="locked"
            testID="demo-station-row-locked"
            right={<Text style={[styles.demoRight, { color: colors.textMuted }]}>18</Text>}
          />
        </MobileSurface>

        <View style={{ height: 16 }} />
        <MobileSectionEyebrow>Demo source</MobileSectionEyebrow>
        <MobileSurface padding={16}>
          {sourceDetail ? (
            <>
              <Text style={[styles.demoTitle, { color: colors.text }]}>
                {sourceDetail.title}
              </Text>
              <Text style={[styles.demoMeta, { color: colors.textSecondary }]}>
                {sourceDetail.artist} · {sourceDetail.targetLanguage.toUpperCase()}
              </Text>
              <Text style={[styles.demoMeta, { color: colors.textMuted }]}>
                Status: {sourceDetail.processingStatus}
              </Text>
            </>
          ) : (
            <Text style={[styles.demoMeta, { color: colors.textMuted }]}>
              No demo source loaded.
            </Text>
          )}
        </MobileSurface>

        {sectionsData && (sectionsData.sections.length > 0 || sectionsData.lines.length > 0) ? (
          <>
            <View style={{ height: 16 }} />
            <MobileSectionEyebrow>
              Sections ({sectionsData.sections.length}) · Lines ({sectionsData.lines.length})
            </MobileSectionEyebrow>
            <MobileSurface padding={14}>
              {sectionsData.sections.map((s) => (
                <Text key={s.id} style={[styles.lineItem, { color: colors.textSecondary }]}>
                  {s.sectionType}
                  {s.label ? ` — ${s.label}` : ''}
                </Text>
              ))}
              <View style={{ height: 8 }} />
              {sectionsData.lines.slice(0, 8).map((l) => (
                <Text key={l.id} style={[styles.sourceLine, { color: colors.text }]}>
                  {l.rawText}
                </Text>
              ))}
            </MobileSurface>
          </>
        ) : null}

        <View style={{ height: 16 }} />
        <MobileSectionEyebrow>Reset</MobileSectionEyebrow>
        <MobileSurface padding={14}>
          <Text style={[styles.demoMeta, { color: colors.textSecondary, marginBottom: 8 }]}>
            Reset the in-session demo state back to the seed fixtures.
          </Text>
          <MobilePrimaryButton
            variant="ghost"
            onPress={() => {
              resetDemoState();
            }}
          >
            Reset demo data
          </MobilePrimaryButton>
        </MobileSurface>
      </ScrollView>
      <MobileActionFooter>
        <MobilePrimaryButton variant="ghost" onPress={safeGoBack}>
          Back
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
  sectionNote: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  demoRight: {
    ...theme.typography.mobileLedger,
    fontWeight: '700',
  },
  demoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  demoMeta: {
    fontSize: 13,
    marginBottom: 2,
  },
  lineItem: {
    fontSize: 13,
    paddingVertical: 3,
    fontWeight: '500',
  },
  sourceLine: {
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 2,
  },
});
