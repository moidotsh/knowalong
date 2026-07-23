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
import { SCREEN_BODY_STYLE } from '../../constants';
import { useLearningSources, useLearningSource, useSourceSections } from '../../hooks';
import { resetDemoState } from '../../utils/supabase/repositories';

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
