// app/import.tsx
// Lyrics import — the lawful paste-to-pack route (design doc §1.2, §1.3).
// Two honest ways in: the included demo song, or lyrics the learner pastes
// themselves (a streaming link is never offered — the app can't read one).
// Each step is honest about what happens: validation errors name the exact
// line (§1.5), language is inferred then CONFIRMED (never imposed), the
// segmentation preview shows the passages analysis will find, and saving
// stores the exact pasted text — analysis runs afterwards, with the song
// showing its real Preparing state until passages are ready.

import React, { useEffect, useMemo, useState } from 'react';
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
  MobileCheckboxItem,
} from '../components/MobilePremium';
import { useAppTheme, useToast } from '../context';
import { safeGoBack, navigateToSong } from '../navigation';
import { SCREEN_BODY_STYLE, theme } from '../constants';
import { useImportDraftStore, useSongShelfStore } from '../stores';
import { useCreateLearningSource } from '../hooks';
import { LyricDraftSchema } from '@shared/types';
import type { SourceType } from '@shared/types';
import { validateLyricDraft } from '../utils/knowalong/song/validateLyricDraft';
import { detectLanguageHint } from '../utils/knowalong/song/scriptDetect';
import { segmentLyrics } from '../utils/knowalong/song/segmentLyrics';

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
  const [startSegment, setStartSegment] = useState<number | null>(null);

  const aspiration = useSongShelfStore((s) => s.aspiration);
  const explicitOptIn = useSongShelfStore((s) => s.explicitContentOptIn);
  const optInToExplicitContent = useSongShelfStore((s) => s.optInToExplicitContent);
  const revokeExplicitContentOptIn = useSongShelfStore((s) => s.revokeExplicitContentOptIn);
  const setPassagePriority = useSongShelfStore((s) => s.setPassagePriority);

  // §1.2 — if the learner answered Today's question with a title/artist,
  // the form starts from their words (editable, never assumed final).
  useEffect(() => {
    if (!draft.title && aspiration?.title) draft.setField('title', aspiration.title);
    if (!draft.artist && aspiration?.artist) draft.setField('artist', aspiration.artist);
    // Run once on mount — after that the learner's own edits win.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // §1.3 — validation, language hint, segmentation: all derived, all shown
  // honestly, none of them rewriting the text.
  const issues = useMemo(() => validateLyricDraft(draft.rawText), [draft.rawText]);
  const blocking = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const langHint = useMemo(() => detectLanguageHint(draft.rawText), [draft.rawText]);
  const segmentation = useMemo(
    () => (draft.rawText.trim() ? segmentLyrics(draft.rawText) : null),
    [draft.rawText],
  );

  function handleNext() {
    if (draft.step === 0) {
      if (!draft.rawText.trim()) {
        draft.setError('Paste at least one line of lyrics to continue.');
        return;
      }
      if (blocking.length > 0) {
        draft.setError(blocking[0].message);
        return;
      }
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
    draft.setError(null);
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
      const created = await createMutation.mutateAsync(parsed.data);
      // The learner's "start here" pick rides along; it becomes the song's
      // passage priority once analysis maps its sections (client-side only).
      if (startSegment !== null) setPassagePriority(created.id, startSegment + 1);
      showToast('success', 'Saved. The song is on your shelf — passages open for reading while analysis prepares practice.');
      draft.reset();
      navigateToSong(created.id);
    } catch (e) {
      draft.setError('Could not save draft. Please try again.');
    } finally {
      draft.setSaving(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: colors.backgroundDeep }]}
      edges={['top', 'bottom']}
    >
      <MobileAtmosphere surface="setup" />
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
            {/* §1.5 — issues name the exact physical line, honestly. */}
            {blocking.map((issue, i) => (
              <MobileAlert key={`e${i}`} variant="error" message={issue.message} style={{ marginTop: 10 }} />
            ))}
            {warnings.map((issue, i) => (
              <MobileAlert key={`w${i}`} variant="warning" message={issue.message} style={{ marginTop: 10 }} />
            ))}
            {/* §1.2 — two lawful entry routes; no streaming link offered.
                The "catalogue" is the included demo song only (M1: no lyric
                catalogue, no third-party fetching — ever). */}
            <MobileAlert
              variant="info"
              message="Two lawful ways in: start with the included demo song, or paste lyrics you have the right to use for personal study. Your text stays on this device — nothing uploads until you save."
              style={{ marginTop: 12 }}
            />
            {langHint.note ? (
              <Text style={[styles.hintNote, { color: colors.textMuted }]}>{langHint.note}</Text>
            ) : null}
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
            {/* §1.3 — inferred, then confirmed: never silently switched. */}
            {langHint.suggested && langHint.suggested !== draft.targetLanguage ? (
              <Pressable
                onPress={() => draft.setField('targetLanguage', langHint.suggested!)}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, alignSelf: 'flex-start', marginTop: 8 }]}
              >
                <Text style={{ fontFamily: theme.fonts.mono, fontSize: 12, color: colors.brand }}>
                  USE DETECTED LANGUAGE ({langHint.suggested.toUpperCase()}) →
                </Text>
              </Pressable>
            ) : null}
            <View style={{ height: 12 }} />
            <MobileSelect
              label="Explanation language"
              value={draft.translationLanguage}
              options={LANGUAGE_OPTIONS}
              onValueChange={(v) => draft.setField('translationLanguage', v)}
            />
            {/* §1.3 — register/dialect honesty up front. */}
            <MobileAlert
              variant="info"
              message="Songs bend language — slang, dialect, poetry. Analysis marks register and difficulty as display hints only; practice is never gated on them."
              style={{ marginTop: 12 }}
            />
            {/* §1.2 — explicit content is declared, warned, and revocable. */}
            <View style={{ marginTop: 12 }}>
              <MobileCheckboxItem
                title="This song carries explicit lyrics"
                subtitle="Explicit passages stay readable, but their practice stays hidden until you opt in. You can change this later in Profile → Content."
                checked={explicitOptIn}
                onToggle={() => (explicitOptIn ? revokeExplicitContentOptIn() : optInToExplicitContent())}
              />
            </View>
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
            {/* §1.3 — the passages analysis will find, and your starting pick. */}
            {segmentation ? (
              <>
                <Text style={[styles.segHeading, { color: colors.textSecondary }]}>
                  {segmentation.segments.length} {segmentation.segments.length === 1 ? 'passage' : 'passages'} detected
                  {segmentation.removedLabels.length > 0
                    ? ` · ${segmentation.removedLabels.length} stanza ${segmentation.removedLabels.length === 1 ? 'label' : 'labels'} read as structure`
                    : ''}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {segmentation.segments.map((seg, i) => {
                    const picked = startSegment === i;
                    return (
                      <Pressable
                        key={i}
                        onPress={() => setStartSegment(picked ? null : i)}
                        style={({ pressed }) => [{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: picked ? colors.brand : colors.border,
                          backgroundColor: picked ? colors.brandSoft : colors.card,
                          opacity: pressed ? 0.8 : 1,
                        }]}
                      >
                        <Text style={[styles.segChip, { color: picked ? colors.brand : colors.textSecondary }]}>
                          {picked ? '✓ ' : ''}{seg.label ?? `Section ${i + 1}`} · {seg.lines.length} lines
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {startSegment !== null ? (
                  <Text style={[styles.hintNote, { color: colors.textMuted }]}>
                    We will point Today at this passage once the song is analyzed.
                  </Text>
                ) : null}
              </>
            ) : null}
            {/* §1.3 — processing consent: what analysis does, and when. */}
            <MobileAlert
              variant="info"
              message="When you save: your exact text is stored privately. Analysis runs on this device to build practice passages — until it finishes, the song reads fine and shows its honest Preparing state. Nothing is shared."
              style={{ marginTop: 14 }}
            />
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
                Your draft is stored with its exact source text — analysis never
                rewrites it. {startSegment !== null ? `Today will start from ${segmentation?.segments[startSegment]?.label ?? `section ${startSegment + 1}`}. ` : ''}Practice
                arrives per passage as analysis completes.
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
    ...theme.typography.mobileItemTitle,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 4,
  },
  previewMeta: {
    ...theme.typography.mobileLedger,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
  previewDivider: {
    height: 1,
    marginVertical: 12,
  },
  previewText: {
    ...theme.typography.mobileBody,
    fontSize: 14,
    lineHeight: 22,
  },
  segHeading: {
    ...theme.typography.mobileEyebrow,
    marginTop: 16,
  },
  segChip: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
  },
  hintNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 10,
  },
  saveText: {
    ...theme.typography.mobileItemTitle,
    marginBottom: 8,
  },
  saveSubtext: {
    ...theme.typography.mobileBody,
    fontSize: 13,
    lineHeight: 19,
  },
  fieldLabel: {
    ...theme.typography.mobileEyebrow,
    marginBottom: 6,
  },
  lyricsTextarea: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: theme.fonts.mono,
  },
});
