// components/journey/reader/PassageReader.tsx
//
// The Explore reader: the passage, honestly supported. Tap a line for
// its meaning; tap a word for its sheet (meaning, role, pattern note).
// Only prepared lines carry word data — lines without it read as plain
// text and say so. Audio plays when the device offers it and is never
// faked (brief §9).

import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../../context';
import { theme } from '../../../constants';
import { MobileSheet, Pressable } from '../../MobilePremium';
import { getPassageWord, type MediaItem, type PassageLine } from '../../../utils/journey';
import { useAudio } from '../session/ActivityCards';
import { LABEL_TRACKING } from '../tokens';

export interface PassageReaderProps {
  media: MediaItem;
  /** Open this word's sheet on mount (deep link from Notebook). */
  openWordKey?: string | null;
  /** Extra header line under the title (e.g. origin label). */
  showOrigin?: boolean;
}

export function PassageReader({ media, openWordKey, showOrigin = true }: PassageReaderProps) {
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);
  const [sheetWordKey, setSheetWordKey] = useState<string | null>(openWordKey ?? null);
  const { colors } = useAppTheme();
  const fonts = theme.fonts;
  const score = colors.score;
  const audio = useAudio();

  return (
    <View>
      {media.passages.map((passage) => (
        <View key={passage.id} style={styles.passage}>
          <Text style={[styles.passageLabel, { color: score.inkTertiary }]}>
            {media.title} — {passage.label}
          </Text>
          {passage.lines.map((line) => {
            const expanded = expandedLineId === line.id;
            const supported = line.words.length > 0;
            return (
              <View key={line.id} style={styles.lineBlock}>
                <Pressable
                  onPress={() => setExpandedLineId(expanded ? null : line.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Line ${line.ordinal}: ${line.translation}`}
                  accessibilityState={{ expanded }}
                  style={({ pressed }) => [
                    styles.lineCard,
                    { backgroundColor: score.paper, borderColor: score.rule },
                    expanded && { borderColor: score.accent },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  {/* Words (tap a word) or plain text when unsupported. */}
                  {supported ? (
                    <View style={styles.tokenRow}>
                      {line.text.split(/\s+/).map((token, i) => {
                        const clean = token.replace(/[.,!?;:«»"']/g, '');
                        const word = line.words.find((w) => w.form === clean);
                        return (
                          <Pressable
                            key={`${line.id}-w-${i}`}
                            onPress={() => word && setSheetWordKey(word.wordKey)}
                            disabled={!word}
                            accessibilityRole={word ? 'button' : 'text'}
                            accessibilityLabel={word ? `${clean} — ${word.meaning}` : clean}
                            style={({ pressed }) => [pressed && word && { opacity: 0.6 }]}
                          >
                            <Text
                              style={[
                                styles.token,
                                {
                                  color: word ? score.ink : score.inkTertiary,
                                  fontFamily: fonts.serif,
                                },
                              ]}
                            >
                              {token}{' '}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={[styles.token, { color: score.ink, fontFamily: fonts.serif }]}>
                      {line.text}
                    </Text>
                  )}

                  {expanded ? <View style={styles.lineDetail}>
                      <Text style={[styles.lineTranslation, { color: score.inkSecondary }]}>
                        {line.translation}
                      </Text>
                      {line.transliteration ? <Text style={[styles.lineTranslit, { color: score.inkTertiary }]}>
                          {line.transliteration}
                        </Text> : null}
                      {!supported && (
                        <Text style={[styles.unsupportedNote, { color: score.warmNote }]}>
                          This line isn’t prepared word-by-word yet — the
                          meaning is here, the taps aren’t.
                        </Text>
                      )}
                    </View> : null}

                  <View style={styles.lineActions}>
                    <Pressable
                      onPress={() => setExpandedLineId(expanded ? null : line.id)}
                      accessibilityRole="button"
                      accessibilityLabel={expanded ? 'Hide the meaning' : 'Show the meaning'}
                      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                    >
                      <Text style={[styles.lineActionText, { color: score.accentDeep }]}>
                        {expanded ? 'Hide meaning' : 'Meaning'}
                      </Text>
                    </Pressable>
                    {audio.available ? <Pressable
                        onPress={() => audio.play(line.text)}
                        accessibilityRole="button"
                        accessibilityLabel="Play this line"
                        style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                      >
                        <Text style={[styles.lineActionText, { color: score.accentDeep }]}>Listen</Text>
                      </Pressable> : null}
                  </View>
                </Pressable>
              </View>
            );
          })}
          {!audio.available && (
            <Text style={[styles.audioNote, { color: score.inkTertiary }]}>
              Audio isn’t available in this demo — the text stands on its own.
            </Text>
          )}
        </View>
      ))}

      <WordSheet wordKey={sheetWordKey} onOpenChange={(open) => !open && setSheetWordKey(null)} />
    </View>
  );
}

// ── Word sheet ───────────────────────────────────────────────────────────

export function WordSheet({
  wordKey,
  onOpenChange,
}: {
  wordKey: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { colors } = useAppTheme();
  const fonts = theme.fonts;
  const score = colors.score;
  const audio = useAudio();
  const word = wordKey ? getPassageWord(wordKey) : null;

  return (
    <MobileSheet
      open={word != null}
      onOpenChange={onOpenChange}
      title={word?.form ?? 'Word'}
      anchor="bottom"
    >
      {word ? <View style={styles.sheetBody}>
          <View style={styles.sheetHead}>
            <Text style={[styles.sheetForm, { color: score.ink, fontFamily: fonts.serif }]}>
              {word.form}
            </Text>
            {audio.available ? <Pressable
                onPress={() => audio.play(word.form)}
                accessibilityRole="button"
                accessibilityLabel="Play this word"
                style={({ pressed }) => [styles.sheetAudio, { borderColor: score.ruleStrong }, pressed && { opacity: 0.7 }]}
              >
                <Text style={{ color: score.accent, fontSize: 13 }}>▸ Listen</Text>
              </Pressable> : null}
          </View>
          <Text style={[styles.sheetMeaning, { color: score.inkSecondary }]}>{word.meaning}</Text>
          {word.transliteration ? <Text style={[styles.sheetMeta, { color: score.inkTertiary }]}>{word.transliteration}</Text> : null}
          {word.roleLabel ? <Text style={[styles.sheetMeta, { color: score.inkTertiary }]}>A {word.roleLabel}.</Text> : null}
          {word.patternNote ? <View style={[styles.patternBlock, { backgroundColor: score.paperAlt }]}>
              <Text style={[styles.patternText, { color: score.inkSecondary }]}>{word.patternNote}</Text>
            </View> : null}
          {word.familyOf && word.familyOf !== word.wordKey ? <Text style={[styles.familyNote, { color: score.accentDeep }]}>
              Same family as {getPassageWord(word.familyOf)?.form ?? word.familyOf}.
            </Text> : null}
          <Text style={[styles.sheetFootnote, { color: score.inkTertiary }]}>
            From your collection — nothing here is graded.
          </Text>
        </View> : null}
    </MobileSheet>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  passage: { marginBottom: 24 } as const,
  passageLabel: {
    fontSize: 11,
    letterSpacing: LABEL_TRACKING,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 10,
  } as const,
  lineBlock: { marginBottom: 10 } as const,
  lineCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  } as const,
  tokenRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' } as const,
  token: { fontSize: 24, lineHeight: 32 } as const,
  lineDetail: { marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'transparent' } as const,
  lineTranslation: { fontSize: 15, lineHeight: 22, marginTop: 8 } as const,
  lineTranslit: { fontSize: 13, fontStyle: 'italic', marginTop: 3 } as const,
  unsupportedNote: { fontSize: 12, lineHeight: 18, marginTop: 8, fontStyle: 'italic' } as const,
  lineActions: { flexDirection: 'row', gap: 18, marginTop: 12 } as const,
  lineActionText: { fontSize: 13, fontWeight: '600' } as const,
  audioNote: { fontSize: 12, fontStyle: 'italic', marginTop: 6 } as const,
  sheetBody: { paddingHorizontal: 16, paddingBottom: 24 } as const,
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as const,
  sheetForm: { fontSize: 32, lineHeight: 40, fontWeight: '700' } as const,
  sheetAudio: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  } as const,
  sheetMeaning: { fontSize: 17, lineHeight: 24, marginTop: 8 } as const,
  sheetMeta: { fontSize: 14, lineHeight: 20, marginTop: 4 } as const,
  patternBlock: { borderRadius: 10, padding: 12, marginTop: 12 } as const,
  patternText: { fontSize: 14, lineHeight: 21 } as const,
  familyNote: { fontSize: 14, fontWeight: '600', marginTop: 12 } as const,
  sheetFootnote: { fontSize: 12, marginTop: 16 } as const,
});

export default PassageReader;
