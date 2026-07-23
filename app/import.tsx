// app/import.tsx
// Lyrics import — 4-step stepper (paste → metadata → preview → save).
// Privacy notice on step 1. Analysis is "unconfigured" by default; save
// draft works in demo mode.

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobilePrimaryButton,
  MobileActionFooter,
  MobileSectionEyebrow,
  MobileInput,
  MobileSelect,
  MobileAlert,
  MobileStepRail,
} from '../components/MobilePremium';
import { useAppTheme, useToast } from '../context';
import { safeGoBack } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import { useImportDraftStore } from '../stores';
import { useCreateLearningSource } from '../hooks';
import { mediaAnalysisService } from '../services';
import { LyricDraftSchema } from '@shared/types';
import type { SourceType } from '@shared/types';

const STEPS = ['Paste', 'Details', 'Preview', 'Save'];

const LANGUAGE_OPTIONS = [
  { label: 'Russian', value: 'ru' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' },
  { label: 'Italian', value: 'it' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Chinese', value: 'zh' },
  { label: 'English', value: 'en' },
];

export default function ImportScreen() {
  const { colors } = useAppTheme();
  const { showToast } = useToast();
  const draft = useImportDraftStore();
  const createMutation = useCreateLearningSource();
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'checking'>('idle');

  function handleNext() {
    if (draft.step === 0 && !draft.rawText.trim()) {
      draft.setError('Paste at least one line of lyrics to continue.');
      return;
    }
    if (draft.step === 1 && !draft.title.trim()) {
      draft.setError('A title is required.');
      return;
    }
    draft.setError(null);
    draft.setStep((Math.min(draft.step + 1, 3)) as 0 | 1 | 2 | 3);
  }

  function handleBack() {
    if (draft.step === 0) {
      safeGoBack();
      return;
    }
    draft.setStep((draft.step - 1) as 0 | 1 | 2 | 3);
  }

  async function handleSaveDraft() {
    const parsed = LyricDraftSchema.safeParse({
      rawText: draft.rawText,
      title: draft.title,
      artist: draft.artist,
      sourceType: 'lyrics' as SourceType,
      targetLanguage: draft.targetLanguage,
      translationLanguage: draft.translationLanguage,
      notes: draft.notes || undefined,
    });
    if (!parsed.success) {
      draft.setError(parsed.error.issues[0]?.message ?? 'Validation failed.');
      return;
    }
    draft.setSaving(true);
    try {
      await createMutation.mutateAsync(parsed.data);
      showToast('success', 'Draft saved to your library.');
      draft.reset();
      safeGoBack();
    } catch (e) {
      draft.setError('Could not save draft. Please try again.');
    } finally {
      draft.setSaving(false);
    }
  }

  async function handleAnalyze() {
    setAnalysisStatus('checking');
    try {
      const result = await mediaAnalysisService.analyze({
        sourceId: 'preview',
        rawText: draft.rawText,
        targetLanguage: draft.targetLanguage,
        translationLanguage: draft.translationLanguage,
        sourceType: 'lyrics',
      });
      if (result.status === 'unconfigured') {
        showToast('info', 'Analysis is not configured yet. Your draft is still saved as-is.');
      } else {
        showToast('success', 'Analysis complete.');
      }
    } catch {
      showToast('error', 'Analysis failed.');
    } finally {
      setAnalysisStatus('idle');
    }
  }

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: colors.backgroundDeep }]}
      edges={['top', 'bottom']}
    >
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title="Add lyrics" eyebrow="Import" onBack={handleBack} />
      <MobileStepRail step={draft.step + 1} totalSteps={4} />
      <ScrollView
        style={SCREEN_BODY_STYLE}
        contentContainerStyle={styles.bodyContent}
      >
        {draft.error ? (
          <MobileAlert variant="error" message={draft.error} style={{ marginBottom: 12 }} />
        ) : null}

        {draft.step === 0 && (
          <View>
            <MobileSectionEyebrow>Step 1 — Paste lyrics</MobileSectionEyebrow>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Lyrics text
            </Text>
            <TextInput
              style={[styles.lyricsTextarea, {
                color: colors.text,
                backgroundColor: colors.card,
                borderColor: colors.border,
              }]}
              placeholder="Paste lyrics you have the right to use for personal study…"
              placeholderTextColor={colors.textMuted}
              value={draft.rawText}
              onChangeText={(t) => draft.setField('rawText', t)}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
            <MobileAlert
              variant="info"
              message="Paste text you have the right to use for personal study. Your library is private — nothing is shared."
              style={{ marginTop: 12 }}
            />
          </View>
        )}

        {draft.step === 1 && (
          <View>
            <MobileSectionEyebrow>Step 2 — Details</MobileSectionEyebrow>
            <MobileInput
              label="Title"
              placeholder="Song title"
              value={draft.title}
              onChangeText={(t) => draft.setField('title', t)}
            />
            <View style={{ height: 12 }} />
            <MobileInput
              label="Artist (optional)"
              placeholder="Artist name"
              value={draft.artist}
              onChangeText={(t) => draft.setField('artist', t)}
            />
            <View style={{ height: 12 }} />
            <MobileSelect
              label="Target language"
              value={draft.targetLanguage}
              options={LANGUAGE_OPTIONS}
              onValueChange={(v) => draft.setField('targetLanguage', v)}
            />
            <View style={{ height: 12 }} />
            <MobileSelect
              label="Translation language"
              value={draft.translationLanguage}
              options={LANGUAGE_OPTIONS}
              onValueChange={(v) => draft.setField('translationLanguage', v)}
            />
          </View>
        )}

        {draft.step === 2 && (
          <View>
            <MobileSectionEyebrow>Step 3 — Preview</MobileSectionEyebrow>
            <MobileSurface padding={16}>
              <Text style={[styles.previewTitle, { color: colors.text }]}>
                {draft.title || 'Untitled'}
              </Text>
              {draft.artist ? (
                <Text style={[styles.previewMeta, { color: colors.textSecondary }]}>
                  {draft.artist}
                </Text>
              ) : null}
              <Text style={[styles.previewMeta, { color: colors.textMuted }]}>
                {draft.targetLanguage.toUpperCase()} → {draft.translationLanguage.toUpperCase()}
              </Text>
              <View style={styles.previewDivider} />
              <Text style={[styles.previewText, { color: colors.textSecondary }]} numberOfLines={6}>
                {draft.rawText.slice(0, 500)}
                {draft.rawText.length > 500 ? '…' : ''}
              </Text>
            </MobileSurface>
            <Pressable onPress={handleAnalyze} style={styles.analyzeLink}>
              <Text style={[styles.analyzeLinkText, { color: colors.brand }]}>
                {analysisStatus === 'checking' ? 'Checking…' : 'Request analysis'}
              </Text>
            </Pressable>
          </View>
        )}

        {draft.step === 3 && (
          <View>
            <MobileSectionEyebrow>Step 4 — Save</MobileSectionEyebrow>
            <MobileSurface padding={16}>
              <Text style={[styles.saveText, { color: colors.text }]}>
                Ready to save "{draft.title}" to your library.
              </Text>
              <Text style={[styles.saveSubtext, { color: colors.textSecondary }]}>
                The draft will be stored with its exact source text. Analysis
                and card generation can be requested later.
              </Text>
            </MobileSurface>
          </View>
        )}
      </ScrollView>
      <MobileActionFooter>
        {draft.step < 3 ? (
          <MobilePrimaryButton onPress={handleNext}>
            Continue
          </MobilePrimaryButton>
        ) : (
          <MobilePrimaryButton
            onPress={handleSaveDraft}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Saving…' : 'Save draft'}
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
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewMeta: {
    fontSize: 13,
    marginBottom: 2,
  },
  previewDivider: {
    height: 1,
    marginVertical: 12,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 20,
  },
  analyzeLink: {
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  analyzeLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  saveSubtext: {
    fontSize: 13,
    lineHeight: 19,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  lyricsTextarea: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    lineHeight: 22,
  },
});
