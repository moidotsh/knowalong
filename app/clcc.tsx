// app/clcc.tsx
// CLCC landing. Language picker (fr/ru/fa), prior runs by language, generate CTA.
// Realization proposals persist but promotion into concept_realizations is
// deferred for this checkpoint — the generate CTA surfaces this clearly.

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobileSectionEyebrow,
  MobileActionFooter,
  MobilePrimaryButton,
  SegmentedControl,
  EmptyState,
} from '../components/MobilePremium';
import type { Segment } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack, navigateToClccRun } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import {
  useClccRuns,
  useCompanionCredential,
  useStartClccGeneration,
} from '../hooks';
import { CompanionStatusChip } from '../components/knowalong';
import type { CompanionJobStatus } from '../shared/types/knowalong';

type ClccLang = 'fr' | 'ru' | 'fa';

const LANG_LABEL: Record<ClccLang, string> = {
  fr: 'French',
  ru: 'Russian',
  fa: 'Persian / Farsi',
};

function statusColor(status: string, colors: { brand: string; status: { warning: string; error: string } }): string {
  if (status === 'awaiting_review') return colors.brand;
  if (status === 'failed') return colors.status.error;
  return colors.status.warning;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function ClccScreen() {
  const { colors } = useAppTheme();
  const [lang, setLang] = useState<ClccLang>('fr');
  const credentialQuery = useCompanionCredential();
  const runsQuery = useClccRuns(lang);
  const startMutation = useStartClccGeneration();

  const hasCredential = !!credentialQuery.data?.hasCredential;
  const canStart = hasCredential && !startMutation.isPending;
  const runs = runsQuery.data ?? [];

  const langSegments: Segment<ClccLang>[] = [
    { label: 'Français', value: 'fr' },
    { label: 'Русский', value: 'ru' },
    { label: 'فارسی', value: 'fa' },
  ];

  const onStart = () => {
    startMutation.mutate(
      { targetLanguageCode: lang, coreConceptCodes: [] },
      {
        onSuccess: (data) => {
          if (data && typeof data === 'object' && 'status' in data && data.status === 'ok') {
            navigateToClccRun(data.runId);
          }
        },
      },
    );
  };

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: colors.backgroundDeep }]}
      edges={['top', 'bottom']}
    >
      <MobileAtmosphere surface="analytics" />
      <MobileHeader
        title="Internal CLCC research and export tool"
        eyebrow="Internal operator tooling"
        onBack={safeGoBack}
      />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.bodyContent}>
        <View style={styles.statusRow}>
          <CompanionStatusChip />
        </View>

        <MobileSurface padding={14}>
          <Text style={[styles.title, { color: colors.text }]}>
            Internal CLCC research and export tool
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            This temporary operator workflow generates and reviews local
            candidate language-pack data. It does not publish packs, grant
            learner access, or promote candidates into canonical shared
            realizations.
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary, marginTop: 6 }]}>
            Final destination: the separate future KnowAlong Studio
            application. Retained here only for local candidate generation,
            review, and export while the learner-facing source-analysis
            workflow is validated.
          </Text>
        </MobileSurface>

        <MobileSurface padding={14}>
          <Text style={[styles.title, { color: colors.text }]}>
            Generate language realizations
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            For each Core Concept, the companion proposes a language-specific
            realization in {LANG_LABEL[lang]}. Realization proposals are
            reviewable, editable, and exportable. Promotion into the curated
            concept_realizations table is deferred for this checkpoint.
          </Text>
        </MobileSurface>

        <MobileSectionEyebrow>Target language</MobileSectionEyebrow>
        <SegmentedControl
          variant="tabs"
          segments={langSegments}
          value={lang}
          onChange={(v: string) => setLang(v as ClccLang)}
        />

        <View style={{ height: 12 }} />
        <MobileSectionEyebrow>
          Prior CLCC runs for {LANG_LABEL[lang]} ({runs.length})
        </MobileSectionEyebrow>
        {runs.length === 0 ? (
          <EmptyState
            title="No CLCC runs yet"
            message={`Start a generation to populate ${LANG_LABEL[lang]} realizations for review.`}
            compact
          />
        ) : (
          <View style={styles.listGap}>
            {runs.map((run) => {
              const status = (run.status as CompanionJobStatus) ?? 'queued';
              return (
                <Pressable
                  key={run.id}
                  accessibilityRole="button"
                  onPress={() => navigateToClccRun(run.id)}
                >
                  <MobileSurface padding={12}>
                    <View style={styles.runRowTop}>
                      <Text style={[styles.runStatus, { color: statusColor(status, colors) }]}>
                        {String(status).replace(/_/g, ' ')}
                      </Text>
                      <Text style={[styles.runDate, { color: colors.textMuted }]}>
                        {formatTimestamp(run.completedAt ?? run.startedAt ?? run.requestedAt)}
                      </Text>
                    </View>
                    {run.modelLabel ? (
                      <Text style={[styles.runMeta, { color: colors.textSecondary }]}>
                        model: {run.modelLabel}
                      </Text>
                    ) : null}
                  </MobileSurface>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
      <MobileActionFooter>
        <MobilePrimaryButton onPress={onStart} disabled={!canStart}>
          {hasCredential
            ? startMutation.isPending
              ? 'Starting…'
              : `Generate ${LANG_LABEL[lang]} proposals`
            : 'Companion not configured'}
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
    paddingBottom: 100,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
  },
  listGap: {
    gap: 8,
  },
  runRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  runStatus: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  runDate: {
    fontSize: 11,
  },
  runMeta: {
    fontSize: 11,
  },
});
