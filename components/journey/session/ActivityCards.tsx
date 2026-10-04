// components/journey/session/ActivityCards.tsx
//
// The five activity views the one player renders. Presentational only —
// the session screen owns the state machine (selections, checks,
// outcomes) and the shell owns help/exit. Checks are explicit: nothing
// is judged until the learner presses Check (brief §6).
//
// Audio is honest: a play button appears when the device offers speech
// and the demo hasn't switched it off; otherwise a quiet caption says
// audio isn't available here. Playback is never faked.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../../context';
import { theme } from '../../../constants';
import { Pressable, useReducedMotion } from '../../MobilePremium';
import { isSpeechAvailable, speak } from '../../../utils/knowalong/tts';
import { useJourneyStore } from '../../../stores';
import { getMediaItem } from '../../../utils/journey';
import type {
  MeaningChoiceActivity,
  PassageReturnActivity,
  PhraseBuilderActivity,
  PhraseRevealActivity,
  RecapActivity,
} from '../../../utils/journey';
import { LABEL_TRACKING } from '../tokens';

// ── Shared bits ──────────────────────────────────────────────────────────

function useAudioSimulation(): 'auto' | 'off' {
  return useJourneyStore((s) => s.prefs.audioSimulation);
}

export function useAudio() {
  const prefsAudio = useAudioSimulation();
  return {
    available: isSpeechAvailable() && prefsAudio === 'auto',
    play: (text: string) => speak(text, { lang: 'ru' }),
  };
}

function AudioButton({ text }: { text: string }) {
  const { colors } = useAppTheme();
  const score = colors.score;
  const audio = useAudio();
  if (!audio.available) {
    return (
      <Text style={[styles.audioOff, { color: score.inkTertiary }]}>
        Audio isn’t available in this demo.
      </Text>
    );
  }
  return (
    <Pressable
      onPress={() => audio.play(text)}
      accessibilityRole="button"
      accessibilityLabel="Play the line"
      style={({ pressed }) => [styles.audioButton, { borderColor: score.ruleStrong }, pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.audioGlyph, { color: score.accent }]}>▸</Text>
      <Text style={[styles.audioLabel, { color: score.inkSecondary }]}>Listen</Text>
    </Pressable>
  );
}

function FeedbackLine({
  kind,
  children,
}: {
  kind: 'correct' | 'incorrect' | 'neutral';
  children: React.ReactNode;
}) {
  const { colors } = useAppTheme();
  const score = colors.score;
  const color = kind === 'correct' ? score.accent : kind === 'incorrect' ? score.warmNote : score.inkSecondary;
  const background = kind === 'correct' ? score.accentWash : kind === 'incorrect' ? score.warmWash : 'transparent';
  return (
    <View style={[styles.feedback, { backgroundColor: background }]}>
      <Text style={[styles.feedbackText, { color }]}>
        {kind === 'correct' ? 'Right. ' : kind === 'incorrect' ? 'Not this one. ' : ''}
        {children}
      </Text>
    </View>
  );
}

// ── Phrase reveal (encounter — never scored) ─────────────────────────────

export function PhraseRevealCard({ activity }: { activity: PhraseRevealActivity }) {
  const { colors } = useAppTheme();
  const fonts = theme.fonts;
  const score = colors.score;
  return (
    <View>
      <Text style={[styles.eyebrow, { color: score.inkTertiary }]}>Meet it</Text>
      <Text
        style={[styles.phrase, { color: score.ink, fontFamily: fonts.serif }]}
        accessibilityRole="header"
      >
        {activity.phrase}
      </Text>
      <AudioButton text={activity.phrase} />
      <View style={[styles.meaningBlock, { borderLeftColor: score.accent }]}>
        <Text style={[styles.meaning, { color: score.inkSecondary }]}>{activity.meaning}</Text>
        {activity.transliteration ? <Text style={[styles.transliteration, { color: score.inkTertiary }]}>
            {activity.transliteration}
          </Text> : null}
      </View>
      <View style={[styles.focusBlock, { backgroundColor: score.paperAlt }]}>
        <Text style={[styles.focusEyebrow, { color: score.accentDeep }]}>What to notice</Text>
        <Text style={[styles.focusText, { color: score.inkSecondary }]}>{activity.focus}</Text>
      </View>
    </View>
  );
}

// ── Meaning choice (checked) ─────────────────────────────────────────────

export interface MeaningChoiceCardProps {
  activity: MeaningChoiceActivity;
  selectedId: string | null;
  checked: boolean;
  onSelect: (optionId: string) => void;
}

export function MeaningChoiceCard({ activity, selectedId, checked, onSelect }: MeaningChoiceCardProps) {
  const { colors } = useAppTheme();
  const fonts = theme.fonts;
  const score = colors.score;
  const selected = activity.options.find((o) => o.id === selectedId) ?? null;
  const isCorrect = checked && selectedId === activity.correctOptionId;

  return (
    <View>
      <Text style={[styles.eyebrow, { color: score.inkTertiary }]}>Check the meaning</Text>
      <Text style={[styles.prompt, { color: score.inkSecondary }]}>{activity.prompt}</Text>
      <Text style={[styles.phrase, styles.phraseMedium, { color: score.ink, fontFamily: fonts.serif }]}>
        {activity.phrase}
      </Text>
      {activity.sourceLineId ? <AudioButton text={activity.phrase} /> : null}

      <View style={styles.options}>
        {activity.options.map((option) => {
          const optionSelected = selectedId === option.id;
          const optionIsCorrect = option.id === activity.correctOptionId;
          const showAsCorrect = checked && optionIsCorrect;
          const showAsWrong = checked && optionSelected && !optionIsCorrect;
          return (
            <Pressable
              key={option.id}
              onPress={() => !checked && onSelect(option.id)}
              disabled={checked}
              accessibilityRole="button"
              accessibilityState={{ selected: optionSelected, disabled: checked }}
              accessibilityLabel={option.text}
              style={({ pressed }) => [
                styles.option,
                { borderColor: score.ruleStrong, backgroundColor: score.paper },
                optionSelected && !checked && { borderColor: score.accent, backgroundColor: score.accentWash },
                showAsCorrect && { borderColor: score.accent, backgroundColor: score.accentWash },
                showAsWrong && { borderColor: score.warmNote, backgroundColor: score.warmWash },
                pressed && !checked && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.optionText, { color: score.ink }]}>{option.text}</Text>
              {showAsCorrect ? <Text style={{ color: score.accent, fontSize: 16 }}>✓</Text> : null}
              {showAsWrong ? <Text style={{ color: score.warmNote, fontSize: 16 }}>·</Text> : null}
            </Pressable>
          );
        })}
      </View>

      {checked ? <FeedbackLine kind={isCorrect ? 'correct' : 'incorrect'}>
          {isCorrect ? activity.explanation : `${selected?.text ?? 'That pick'} doesn’t fit here — look again at the line above.`}
        </FeedbackLine> : null}
    </View>
  );
}

// ── Phrase builder (checked) ─────────────────────────────────────────────

export interface PhraseBuilderCardProps {
  activity: PhraseBuilderActivity;
  /** Chip ids placed in the answer tray, in order. */
  placedIds: string[];
  checked: boolean;
  onPlace: (chipId: string) => void;
  onUnplace: (chipId: string) => void;
}

export function PhraseBuilderCard({
  activity,
  placedIds,
  checked,
  onPlace,
  onUnplace,
}: PhraseBuilderCardProps) {
  const { colors } = useAppTheme();
  const fonts = theme.fonts;
  const reducedMotion = useReducedMotion();
  const score = colors.score;
  const chipById = new Map(activity.chips.map((chip) => [chip.id, chip]));
  const placedChips = placedIds.map((id) => chipById.get(id)).filter((c) => c != null);
  const poolChips = activity.chips.filter((chip) => !placedIds.includes(chip.id));
  const isCorrect =
    checked &&
    placedChips.length === activity.answer.length &&
    placedChips.every((chip, i) => chip?.text === activity.answer[i]);

  return (
    <View>
      <Text style={[styles.eyebrow, { color: score.inkTertiary }]}>Build it</Text>
      <Text style={[styles.prompt, { color: score.inkSecondary }]}>{activity.prompt}</Text>

      {/* Answer tray */}
      <View style={[styles.tray, { borderColor: score.rule, backgroundColor: score.paper }]}>
        {placedChips.length === 0 && (
          <Text style={[styles.trayHint, { color: score.inkTertiary }]}>
            Tap the words below, in order.
          </Text>
        )}
        <View style={styles.chipRow}>
          {placedChips.map((chip, i) => {
            const positionRight = chip?.text === activity.answer[i];
            return (
              <Pressable
                key={chip?.id ?? i}
                onPress={() => !checked && chip && onUnplace(chip.id)}
                disabled={checked}
                accessibilityRole="button"
                accessibilityLabel={`Remove the word ${chip?.text ?? ''}`}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    borderColor: checked
                      ? positionRight
                        ? score.accent
                        : score.warmNote
                      : score.ruleStrong,
                    backgroundColor: checked
                      ? positionRight
                        ? score.accentWash
                        : score.warmWash
                      : score.paper,
                  },
                  pressed && !checked && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.chipText, { color: score.ink }]}>{chip?.text}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Chip pool */}
      <View style={styles.chipRow}>
        {poolChips.map((chip) => (
          <Pressable
            key={chip.id}
            onPress={() => !checked && onPlace(chip.id)}
            disabled={checked}
            accessibilityRole="button"
            accessibilityLabel={`Add the word ${chip.text}`}
            style={({ pressed }) => [
              styles.chip,
              styles.chipPool,
              { borderColor: score.ruleStrong, backgroundColor: score.paperAlt },
              pressed && !checked && reducedMotion !== true && { transform: [{ scale: 0.97 }] },
              pressed && !checked && { opacity: 0.8 },
              checked && { opacity: 0.5 },
            ]}
          >
            <Text style={[styles.chipText, { color: score.ink }]}>{chip.text}</Text>
          </Pressable>
        ))}
      </View>

      {checked ? <FeedbackLine kind={isCorrect ? 'correct' : 'incorrect'}>
          {isCorrect
            ? `«${activity.answer.join(' ')}» — ${activity.translation}`
            : 'Not the order this sentence wants. Rearrange and check again.'}
        </FeedbackLine> : null}
    </View>
  );
}

// ── Passage return (encounter — never scored) ────────────────────────────

export function PassageReturnCard({ activity }: { activity: PassageReturnActivity }) {
  const { colors } = useAppTheme();
  const fonts = theme.fonts;
  const score = colors.score;
  const media = getMediaItem(activity.mediaId);
  const passage = media?.passages.find((p) => p.id === activity.passageId) ?? null;
  const lines = (passage?.lines ?? []).filter((line) => activity.lineIds.includes(line.id));

  return (
    <View>
      <Text style={[styles.eyebrow, { color: score.inkTertiary }]}>Back to the passage</Text>
      <Text style={[styles.prompt, { color: score.inkSecondary }]}>{activity.note}</Text>
      <View style={[styles.passageCard, { backgroundColor: score.paper, borderColor: score.rule }]}>
        {media ? <Text style={[styles.passageSource, { color: score.inkTertiary }]}>
            {media.title} — {passage?.label}
          </Text> : null}
        {lines.map((line) => {
          const tokens = line.text.split(/\s+/);
          const highlights = new Set(activity.highlightWordKeys);
          return (
            <View key={line.id} style={styles.passageLine}>
              <View style={styles.passageTokens}>
                {tokens.map((token, i) => {
                  const clean = token.replace(/[.,!?;:«»"']/g, '');
                  const word = line.words.find((w) => w.form === clean);
                  const highlighted = word != null && highlights.has(word.wordKey);
                  return (
                    <Text
                      key={`${line.id}-${i}`}
                      style={[
                        styles.passageToken,
                        {
                          color: highlighted ? score.accentDeep : score.ink,
                          fontFamily: fonts.serif,
                          fontWeight: highlighted ? '700' : '400',
                          textDecorationLine: highlighted ? 'underline' : 'none',
                        },
                      ]}
                    >
                      {token}{' '}
                    </Text>
                  );
                })}
              </View>
              <Text style={[styles.passageTranslation, { color: score.inkSecondary }]}>
                {line.translation}
              </Text>
            </View>
          );
        })}
      </View>
      <AudioButton text={lines.map((line) => line.text).join(' ')} />
    </View>
  );
}

// ── Recap (never scored) ─────────────────────────────────────────────────

export interface RecapCardProps {
  activity: RecapActivity;
  /** Honest counts derived from the answers so far. */
  summary: { correct: number; withHelp: number; missed: number };
}

export function RecapCard({ activity, summary }: RecapCardProps) {
  const { colors } = useAppTheme();
  const fonts = theme.fonts;
  const score = colors.score;
  return (
    <View>
      <Text style={[styles.eyebrow, { color: score.inkTertiary }]}>Before you go</Text>
      <Text style={[styles.phrase, styles.phraseMedium, { color: score.ink, fontFamily: fonts.serif }]}>
        That’s the session.
      </Text>
      <View style={[styles.recapBlock, { backgroundColor: score.paper, borderColor: score.rule }]}>
        {activity.practised.map((line, i) => (
          <Text key={i} style={[styles.recapLine, { color: score.inkSecondary }]}>
            · {line}
          </Text>
        ))}
      </View>
      <View style={styles.ledgerRow}>
        <Text style={[styles.ledgerItem, { color: score.accentDeep }]}>
          {summary.correct} recalled
        </Text>
        <Text style={[styles.ledgerItem, { color: score.warmNote }]}>
          {summary.withHelp} with help
        </Text>
        <Text style={[styles.ledgerItem, { color: score.inkTertiary }]}>
          {summary.missed} missed
        </Text>
      </View>
      <Text style={[styles.recapNote, { color: score.inkTertiary }]}>
        Misses aren’t failures — they set when something comes back. Nothing
        here is graded.
      </Text>
      {activity.uncertain ? <Text style={[styles.recapUncertain, { color: score.inkSecondary }]}>{activity.uncertain}</Text> : null}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 12,
    letterSpacing: LABEL_TRACKING,
    textTransform: 'uppercase',
    fontWeight: '600',
  } as const,
  prompt: { fontSize: 16, lineHeight: 23, marginTop: 8 } as const,
  phrase: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '700',
    marginTop: 14,
  } as const,
  phraseMedium: { fontSize: 28, lineHeight: 36 } as const,
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
  } as const,
  audioGlyph: { fontSize: 13 } as const,
  audioLabel: { fontSize: 13, fontWeight: '600' } as const,
  audioOff: { fontSize: 12, marginTop: 12, fontStyle: 'italic' } as const,
  meaningBlock: { borderLeftWidth: 2, paddingLeft: 12, marginTop: 18 } as const,
  meaning: { fontSize: 17, lineHeight: 24 } as const,
  transliteration: { fontSize: 13, marginTop: 4, fontStyle: 'italic' } as const,
  focusBlock: { borderRadius: 10, padding: 14, marginTop: 18 } as const,
  focusEyebrow: {
    fontSize: 11,
    letterSpacing: LABEL_TRACKING,
    textTransform: 'uppercase',
    fontWeight: '700',
  } as const,
  focusText: { fontSize: 15, lineHeight: 22, marginTop: 6 } as const,
  options: { gap: 10, marginTop: 18 } as const,
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  } as const,
  optionText: { fontSize: 16, flex: 1 } as const,
  tray: {
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
    minHeight: 64,
    padding: 10,
    marginTop: 18,
    justifyContent: 'center',
  } as const,
  trayHint: { fontSize: 13, fontStyle: 'italic', textAlign: 'center' } as const,
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 } as const,
  chip: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  } as const,
  chipPool: { marginTop: 14 } as const,
  chipText: { fontSize: 17 } as const,
  passageCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginTop: 14,
  } as const,
  passageSource: {
    fontSize: 11,
    letterSpacing: LABEL_TRACKING / 2,
    textTransform: 'uppercase',
    marginBottom: 10,
    fontWeight: '600',
  } as const,
  passageLine: { marginBottom: 14 } as const,
  passageTokens: { flexDirection: 'row', flexWrap: 'wrap' } as const,
  passageToken: { fontSize: 22, lineHeight: 30 } as const,
  passageTranslation: { fontSize: 14, lineHeight: 20, marginTop: 2 } as const,
  feedback: { borderRadius: 10, padding: 12, marginTop: 16 } as const,
  feedbackText: { fontSize: 15, lineHeight: 22 } as const,
  recapBlock: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginTop: 16,
  } as const,
  recapLine: { fontSize: 15, lineHeight: 23, marginBottom: 6 } as const,
  ledgerRow: { flexDirection: 'row', gap: 16, marginTop: 16 } as const,
  ledgerItem: {
    fontSize: 12,
    letterSpacing: LABEL_TRACKING / 2,
    textTransform: 'uppercase',
    fontWeight: '700',
  } as const,
  recapNote: { fontSize: 13, lineHeight: 19, marginTop: 12 } as const,
  recapUncertain: { fontSize: 14, lineHeight: 21, marginTop: 10, fontStyle: 'italic' } as const,
});
