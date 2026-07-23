// app/vocabulary/[lemmaId].tsx
// Lemma detail. Lemma + primary gloss + POS. Seen-in source lines.
// Learning state. "forms encountered in your library" — never "complete
// inflection table".

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobileSectionEyebrow,
} from '../../components/MobilePremium';
import { useAppTheme } from '../../context';
import { safeGoBack } from '../../navigation';
import { SCREEN_BODY_STYLE } from '../../constants';
import { vocabularyRepository, throwIfFailed } from '../../utils/supabase/repositories';
import { useCurrentUserId } from '../../hooks';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/react-query';

export default function LemmaDetailScreen() {
  const { lemmaId } = useLocalSearchParams<{ lemmaId: string }>();
  const { colors } = useAppTheme();
  const userId = useCurrentUserId();
  const id = Array.isArray(lemmaId) ? lemmaId[0] : lemmaId;

  const { data } = useQuery({
    queryKey: queryKeys.vocabulary.detail(id),
    queryFn: async () => {
      const result = await vocabularyRepository.findLemmaDetail(id!, userId!);
      return throwIfFailed(result, 'lemmaDetail');
    },
    enabled: !!userId && !!id,
  });

  const { data: sourceLines } = useQuery({
    queryKey: queryKeys.vocabulary.sourceLines(id!),
    queryFn: async () => {
      const result = await vocabularyRepository.findSourceLinesByLemma(id!, userId!);
      return throwIfFailed(result, 'lemmaSourceLines');
    },
    enabled: !!userId && !!id,
  });

  const lemma = data?.lemma;
  const forms = data?.forms ?? [];

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: colors.backgroundDeep }]}
      edges={['top', 'bottom']}
    >
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title={lemma?.normalizedLemma ?? 'Lemma'} eyebrow="Vocabulary" onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.bodyContent}>
        {lemma ? (
          <>
            <MobileSurface padding={16}>
              <Text style={[styles.lemmaHeadword, { color: colors.text }]}>
                {lemma.normalizedLemma}
              </Text>
              <Text style={[styles.lemmaPos, { color: colors.textSecondary }]}>
                {lemma.partOfSpeech}
              </Text>
              {lemma.primaryGloss ? (
                <Text style={[styles.lemmaGloss, { color: colors.text }]}>
                  {lemma.primaryGloss}
                </Text>
              ) : null}
              {lemma.grammaticalGender ? (
                <Text style={[styles.lemmaGrammar, { color: colors.textMuted }]}>
                  Gender: {lemma.grammaticalGender}
                </Text>
              ) : null}
              {lemma.verbAspect ? (
                <Text style={[styles.lemmaGrammar, { color: colors.textMuted }]}>
                  Aspect: {lemma.verbAspect}
                </Text>
              ) : null}
            </MobileSurface>

            {forms.length > 0 ? (
              <>
                <View style={{ height: 16 }} />
                <MobileSectionEyebrow>
                  Forms encountered ({forms.length})
                </MobileSectionEyebrow>
                <MobileSurface padding={14}>
                  {forms.map((f) => (
                    <View key={f.id} style={styles.formRow}>
                      <Text style={[styles.formSurface, { color: colors.text }]}>
                        {f.surfaceForm}
                      </Text>
                      {f.morphologySummary ? (
                        <Text style={[styles.formMorpho, { color: colors.textMuted }]}>
                          {f.morphologySummary}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </MobileSurface>
              </>
            ) : null}

            {(sourceLines?.length ?? 0) > 0 ? (
              <>
                <View style={{ height: 16 }} />
                <MobileSectionEyebrow>Seen in source</MobileSectionEyebrow>
                <MobileSurface padding={14}>
                  {sourceLines!.slice(0, 10).map((line) => (
                    <Text key={line.id} style={[styles.sourceLine, { color: colors.textSecondary }]}>
                      {line.rawText}
                    </Text>
                  ))}
                </MobileSurface>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
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
  lemmaHeadword: {
    fontSize: 24,
    fontWeight: '700',
  },
  lemmaPos: {
    fontSize: 13,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  lemmaGloss: {
    fontSize: 15,
    marginTop: 8,
  },
  lemmaGrammar: {
    fontSize: 13,
    marginTop: 4,
  },
  formRow: {
    paddingVertical: 6,
  },
  formSurface: {
    fontSize: 15,
    fontWeight: '500',
  },
  formMorpho: {
    fontSize: 12,
    marginTop: 2,
  },
  sourceLine: {
    fontSize: 13,
    lineHeight: 19,
    paddingVertical: 4,
    fontStyle: 'italic',
  },
});
