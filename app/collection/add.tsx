// app/collection/add.tsx
//
// ADD YOUR OWN TEXT (brief §9) — a constrained import. You paste text;
// the demo shows, before saving, exactly how much of it connects to
// passages it can honestly prepare. Anything else stays plain text and
// says so. Nothing leaves the device.

import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobilePrimaryButton } from '../../components/MobilePremium';
import { useAppTheme } from '../../context';
import { theme } from '../../constants';
import { navigateToCollection, navigateToReader } from '../../navigation';
import { useJourneyStore } from '../../stores';
import { SAMPLE_IMPORT_TEXT, getMediaItem, knownLineIndex } from '../../utils/journey';

const MAX_CHARS = 4000;

export default function CollectionAddScreen() {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const store = useJourneyStore();
  const { colors } = useAppTheme();
  const fonts = theme.fonts;
  const score = colors.score;

  // Honest live preview: which pasted lines match fixture passages.
  const preview = useMemo(() => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const known = knownLineIndex();
    const matched = lines.filter((line) => known[line] != null);
    return { lineCount: lines.length, matchedCount: matched.length, matched };
  }, [text]);

  const overLimit = text.length > MAX_CHARS;
  const canSave = preview.lineCount > 0 && !overLimit;

  const onSave = () => {
    if (!canSave) return;
    store.addDraft(text, title.trim() || undefined);
    navigateToCollection();
  };

  // Where a matched line lives, for the "see it in place" link.
  const firstMatchSource = useMemo(() => {
    if (preview.matched.length === 0) return null;
    const known = knownLineIndex();
    const hit = known[preview.matched[0]];
    return hit ? getMediaItem(hit.mediaId) : null;
  }, [preview.matched]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: score.canvas }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={navigateToCollection} accessibilityRole="button" accessibilityLabel="Back to the collection">
          <Text style={[styles.link, { color: score.accent }]}>← Collection</Text>
        </Pressable>

        <View style={styles.head}>
          <Text style={[styles.title, { color: score.ink, fontFamily: fonts.serif }]}>Add your own text</Text>
          <Text style={[styles.note, { color: score.inkSecondary }]}>
            Paste Russian text you actually have — lyrics you can’t paste stay
            out (this demo imports text only, nothing that needs an account or
            a file).
          </Text>
        </View>

        <Text style={[styles.fieldLabel, { color: score.inkTertiary }]}>Name (optional)</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. A verse I wrote down"
          placeholderTextColor={score.inkTertiary}
          maxLength={60}
          style={[styles.input, { backgroundColor: score.paper, borderColor: score.ruleStrong, color: score.ink }]}
        />

        <Text style={[styles.fieldLabel, { color: score.inkTertiary }]}>The text itself</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Paste a few lines…"
          placeholderTextColor={score.inkTertiary}
          multiline
          textAlignVertical="top"
          style={[styles.textArea, { backgroundColor: score.paper, borderColor: score.ruleStrong, color: score.ink, fontFamily: fonts.serif }]}
        />
        <View style={styles.meter}>
          <Text style={[styles.meterText, { color: overLimit ? score.warmNote : score.inkTertiary }]}>
            {text.length}/{MAX_CHARS}
          </Text>
          <Pressable
            onPress={() => setText(SAMPLE_IMPORT_TEXT)}
            accessibilityRole="button"
            accessibilityLabel="Fill in the sample lines"
          >
            <Text style={[styles.link, { color: score.accent }]}>Try the sample lines</Text>
          </Pressable>
        </View>

        {/* Honest preparation preview — before any saving */}
        {preview.lineCount > 0 ? (
          <View style={[styles.previewCard, { backgroundColor: score.paper, borderColor: score.rule }]}>
            <Text style={[styles.previewEyebrow, { color: score.inkTertiary }]}>What the demo can prepare</Text>
            {preview.matchedCount === preview.lineCount ? (
              <Text style={[styles.previewLine, { color: score.accent }]}>
                All {preview.lineCount} {preview.lineCount === 1 ? 'line connects' : 'lines connect'} to practice passages.
              </Text>
            ) : preview.matchedCount === 0 ? (
              <Text style={[styles.previewLine, { color: score.inkSecondary }]}>
                None of these {preview.lineCount === 1 ? 'lines connects' : 'lines connect'} yet — it will be
                saved as plain text, honestly labeled.
              </Text>
            ) : (
              <Text style={[styles.previewLine, { color: score.inkSecondary }]}>
                {preview.matchedCount} of {preview.lineCount} lines connect. The rest stay plain text — the demo
                won’t pretend otherwise.
              </Text>
            )}
            {firstMatchSource ? (
              <Pressable
                onPress={() => navigateToReader(firstMatchSource.id)}
                accessibilityRole="button"
                accessibilityLabel="See the matching passage"
              >
                <Text style={[styles.link, { color: score.accent }]}>See it in “{firstMatchSource.title}” →</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={styles.saveRow}>
          <View style={styles.saveButton}>
            <MobilePrimaryButton onPress={onSave} disabled={!canSave}>
              Save to my collection
            </MobilePrimaryButton>
          </View>
          <Text style={[styles.privacyNote, { color: score.inkTertiary }]}>
            Saved on this device only. No account, no upload.
          </Text>
        </View>
      </ScrollView>
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
    gap: 14,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  link: {
    fontSize: 15,
    lineHeight: 20,
  },
  head: {
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    lineHeight: 26,
    minHeight: 140,
  },
  meter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meterText: {
    fontSize: 12,
    lineHeight: 16,
  },
  previewCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  previewEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  previewLine: {
    fontSize: 14,
    lineHeight: 20,
  },
  saveRow: {
    gap: 8,
    marginTop: 8,
  },
  saveButton: {
    maxWidth: 320,
  },
  privacyNote: {
    fontSize: 12,
    lineHeight: 16,
  },
});
