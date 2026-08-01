// components/knowalong/LessonRound.tsx
//
// The single-step chip-builder interaction, shared by the adaptive Study
// screen and the lesson player. Owns placement state, mode branching
// (build / reverse / cloze), gloss-fade, TTS, and per-mode word-mastery
// recording. The owning shell sequences steps and renders the fixed
// continue footer; this component reports solved-state upward via
// onSolvedChange.
//
// Mount one <LessonRound key={step.itemId} ... /> per active step so placement
// state resets cleanly between steps.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MobileSurface } from '../MobilePremium';
import { useAppTheme } from '../../context';
import type { LessonStep } from '../../utils/knowalong/fixtures/decks';
import { buildChipsForStep, type Chip } from '../../utils/knowalong/fixtures/chips';
import { ROLE_COLOR_KEYS, type WordRole } from '../../utils/knowalong/fixtures/learningItems';
import { shouldShowGloss, type MasteryMap } from '../../utils/knowalong/mastery';
import { speak, isSpeechAvailable } from '../../utils/knowalong/tts';
import { ConceptIcon } from './ConceptIcon';
import { ITEM_ICONS } from '../../utils/knowalong/icons';

type ThemeColors = ReturnType<typeof useAppTheme>['colors'];

function roleColor(colors: ThemeColors, role: WordRole): string {
  const key = ROLE_COLOR_KEYS[role];
  if (key === 'brand') return colors.brand;
  if (key === 'textMuted') return colors.textMuted;
  return colors.status[key as 'success' | 'warning'];
}

export interface LessonRoundProps {
  step: LessonStep;
  mastery: MasteryMap;
  /** Per-word correct (build/cloze key off the placed/answer form; reverse
   *  credits every phrase form on full comprehension). */
  onWordCorrect: (form: string) => void;
  onWordMistake: (form: string) => void;
  /** Item-level mistake (streakStore recordMistake + shell score). */
  onMistake: (itemId: string) => void;
  /** Exposure tick for the step's RU words (fired once on mount). */
  onExposure: (forms: string[]) => void;
  /** Notifies the shell when this step's solved state flips. */
  onSolvedChange: (solved: boolean) => void;
}

export function LessonRound({
  step,
  mastery,
  onWordCorrect,
  onWordMistake,
  onMistake,
  onExposure,
  onSolvedChange,
}: LessonRoundProps) {
  const { colors } = useAppTheme();
  const mode = step.mode ?? 'build';

  const chips = useMemo(() => buildChipsForStep(step), [step]);
  const orderedSlots = useMemo(() => chips.filter((c) => c.correctPosition >= 0).length, [chips]);
  const slotCount = mode === 'cloze' ? 1 : orderedSlots;

  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exposedRef = useRef(false);

  const isSolved = placedIds.length === slotCount && slotCount > 0;
  const showGloss = useCallback((form: string) => shouldShowGloss(mastery[form]), [mastery]);

  // Exposure: once per step (keyed remount makes this once per mount).
  useEffect(() => {
    if (exposedRef.current) return;
    exposedRef.current = true;
    onExposure(step.words.map((w) => w.form));
  }, [step, onExposure]);

  // Lift solved-state to the shell (enables the continue footer).
  useEffect(() => {
    onSolvedChange(isSolved);
  }, [isSolved, onSolvedChange]);

  useEffect(() => {
    return () => {
      if (wrongTimer.current) clearTimeout(wrongTimer.current);
    };
  }, []);

  const flashWrong = useCallback((chipId: string) => {
    setWrongId(chipId);
    if (wrongTimer.current) clearTimeout(wrongTimer.current);
    wrongTimer.current = setTimeout(() => setWrongId(null), 600);
  }, []);

  const handleTapChip = useCallback((chip: Chip) => {
    if (isSolved || placedIds.includes(chip.id)) return;

    if (mode === 'cloze') {
      if (chip.isCorrect) {
        setPlacedIds([chip.id]);
        onWordCorrect(step.clozeAnswer ?? '');
        if (isSpeechAvailable()) speak(step.surfaceForm);
      } else {
        onWordMistake(step.clozeAnswer ?? '');
        onMistake(step.itemId);
        flashWrong(chip.id);
      }
      return;
    }

    const slot = placedIds.length;
    if (chip.correctPosition === slot) {
      setPlacedIds((prev) => [...prev, chip.id]);
      if (mode === 'build') {
        onWordCorrect(step.words[slot]?.form ?? '');
        if (slot + 1 === slotCount && isSpeechAvailable()) speak(step.surfaceForm);
        else if (isSpeechAvailable()) speak(chip.form);
      } else {
        // reverse — comprehension credit for every phrase form on full solve.
        if (slot + 1 === slotCount) {
          for (const w of step.words) onWordCorrect(w.form);
          if (isSpeechAvailable()) speak(step.surfaceForm);
        }
      }
    } else {
      if (mode === 'build') {
        const target = step.words[slot]?.form;
        if (target) onWordMistake(target);
      }
      onMistake(step.itemId);
      flashWrong(chip.id);
    }
  }, [mode, isSolved, placedIds, slotCount, step, onWordCorrect, onWordMistake, onMistake, flashWrong]);

  const replay = useCallback(() => {
    if (isSpeechAvailable()) speak(step.surfaceForm);
  }, [step]);

  const placedChips = placedIds
    .map((id) => chips.find((c) => c.id === id))
    .filter((c): c is Chip => c !== undefined);
  const availableChips = chips.filter((c) => !placedIds.includes(c.id));
  const promptLabel =
    mode === 'reverse' ? 'Build this in English:' : mode === 'cloze' ? 'Choose the word that fits:' : 'Build this in Russian:';
  const promptText = mode === 'reverse' ? step.surfaceForm : mode === 'cloze' ? '' : step.meaning;

  return (
    <MobileSurface padding={20}>
      {/* Prompt */}
      <Text style={[styles.promptLabel, { color: colors.textMuted }]}>{promptLabel}</Text>

      {mode === 'cloze' ? (
        <ClozeSentence step={step} solved={isSolved} colors={colors} />
      ) : (
        <View style={styles.promptWrap}>
          {ITEM_ICONS[step.itemId] ? (
            <View style={styles.promptEmojiWrap}>
              <ConceptIcon name={ITEM_ICONS[step.itemId] ?? 'star'} size={40} color={colors.brand} />
            </View>
          ) : null}
          <Text style={[styles.prompt, { color: colors.text }]}>{promptText}</Text>
          {mode === 'reverse' && step.transliteration ? (
            <Text style={[styles.promptTranslit, { color: colors.textMuted }]}>{step.transliteration}</Text>
          ) : null}
        </View>
      )}

      {/* Construction intro (build mode, non-obvious mappings, before solving) */}
      {mode === 'build' && !isSolved && step.construction ? (
        <View style={[styles.constructionBox, { backgroundColor: colors.brand + '10', borderColor: colors.brand + '30' }]}>
          <Text style={[styles.constructionIntro, { color: colors.text }]}>{step.construction.intro}</Text>
          <View style={styles.constructionBreakdown}>
            {step.construction.breakdown.map((part, i) => (
              <View key={i} style={styles.breakdownRow}>
                <Text style={[styles.breakdownForm, { color: colors.brand }]}>{part.form}</Text>
                <Text style={[styles.breakdownArrow, { color: colors.textMuted }]}>=</Text>
                <Text style={[styles.breakdownLiteral, { color: colors.text }]}>{part.literal}</Text>
                <Text style={[styles.breakdownNote, { color: colors.textMuted }]}>({part.note})</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Answer slots (build / reverse) */}
      {mode !== 'cloze' ? (
        <View style={[styles.slotsRow, { marginTop: step.construction && mode === 'build' && !isSolved ? 12 : 20 }]}>
          {Array.from({ length: slotCount }).map((_, slotIdx) => {
            const chip = placedChips[slotIdx];
            if (chip) {
              const rc = roleColor(colors, chip.role);
              return (
                <View key={slotIdx} style={[styles.slotFilled, { borderLeftColor: rc, backgroundColor: rc + '12' }]}>
                  <Text style={[styles.chipForm, { color: colors.text }]}>{chip.form}</Text>
                  {mode === 'build' && showGloss(chip.form) ? (
                    <Text style={[styles.chipGloss, { color: colors.textMuted }]}>{chip.gloss}</Text>
                  ) : null}
                </View>
              );
            }
            return <View key={slotIdx} style={[styles.slotEmpty, { borderColor: colors.cardBorder }]} />;
          })}
        </View>
      ) : null}

      {/* Solved feedback */}
      {isSolved ? (
        <View style={[styles.solvedBox, { backgroundColor: colors.status.success + '15' }]}>
          <View style={styles.solvedHead}>
            <Text style={[styles.solvedTitle, { color: colors.status.success }]}>
              {mode === 'cloze' ? (step.clozeAnswer ?? '') : step.surfaceForm}
            </Text>
            {isSpeechAvailable() ? (
              <Pressable hitSlop={10} onPress={replay} style={styles.replayBtn}>
                <ConceptIcon name="sparkles" size={20} color={colors.status.success} />
              </Pressable>
            ) : null}
          </View>
          {step.transliteration ? (
            <Text style={[styles.solvedTranslit, { color: colors.textSecondary }]}>{step.transliteration}</Text>
          ) : null}
          {step.note ? <Text style={[styles.solvedNote, { color: colors.textSecondary }]}>{step.note}</Text> : null}
          {step.contextSentence ? (
            <View style={[styles.contextBox, { borderColor: colors.cardBorder }]}>
              <Text style={[styles.contextRu, { color: colors.text }]}>{step.contextSentence.ru}</Text>
              <Text style={[styles.contextEn, { color: colors.textSecondary }]}>{step.contextSentence.en}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Chip bank */}
      {!isSolved ? (
        <View style={styles.chipBank}>
          {availableChips.map((chip) => {
            const rc = roleColor(colors, chip.role);
            const isWrong = wrongId === chip.id;
            return (
              <Pressable
                key={chip.id}
                onPress={() => handleTapChip(chip)}
                style={[
                  styles.chip,
                  {
                    borderLeftColor: rc,
                    backgroundColor: isWrong ? colors.status.error + '20' : colors.cardAlt,
                    borderColor: isWrong ? colors.status.error : colors.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.chipForm, { color: colors.text }]}>{chip.form}</Text>
                {mode === 'build' && showGloss(chip.form) ? (
                  <Text style={[styles.chipGloss, { color: colors.textMuted }]}>{chip.gloss}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </MobileSurface>
  );
}

/** Renders the cloze prompt with the gap as an inline blank, filled on solve. */
function ClozeSentence({ step, solved, colors }: { step: LessonStep; solved: boolean; colors: ThemeColors }) {
  const prompt = step.clozePrompt ?? '';
  const idx = prompt.indexOf('___');
  const before = idx >= 0 ? prompt.slice(0, idx) : prompt;
  const after = idx >= 0 ? prompt.slice(idx + 3) : '';
  return (
    <View style={styles.clozeWrap}>
      <Text style={[styles.clozeSentence, { color: colors.text }]}>
        {before}
        {solved ? (
          <Text style={[styles.clozeFilled, { color: colors.status.success }]}>{step.clozeAnswer}</Text>
        ) : (
          <Text style={[styles.clozeBlank, { color: colors.textMuted }]}> _____ </Text>
        )}
        {after}
      </Text>
      {step.clozeMeaning ? (
        <Text style={[styles.clozeMeaning, { color: colors.textSecondary }]}>{step.clozeMeaning}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  promptLabel: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center', marginBottom: 6 },
  promptWrap: { alignItems: 'center' },
  promptEmojiWrap: { marginBottom: 4 },
  prompt: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  promptTranslit: { fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginTop: 4 },
  slotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 },
  slotFilled: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderLeftWidth: 4, minWidth: 70, alignItems: 'center' },
  slotEmpty: { width: 70, height: 56, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed' },
  chipForm: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  chipGloss: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  chipBank: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 2, borderLeftWidth: 4, minWidth: 70, alignItems: 'center' },
  solvedBox: { marginTop: 16, padding: 16, borderRadius: 12 },
  solvedHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  solvedTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  replayBtn: { padding: 4 },
  solvedTranslit: { fontSize: 14, textAlign: 'center', fontStyle: 'italic', marginTop: 4 },
  solvedNote: { fontSize: 13, marginTop: 8, lineHeight: 18, textAlign: 'center' },
  contextBox: { marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  contextRu: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  contextEn: { fontSize: 13, textAlign: 'center', marginTop: 4, fontStyle: 'italic' },
  constructionBox: { marginTop: 12, marginBottom: 0, padding: 14, borderRadius: 12, borderWidth: 1 },
  constructionIntro: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  constructionBreakdown: { gap: 6 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  breakdownForm: { fontSize: 16, fontWeight: '700' },
  breakdownArrow: { fontSize: 14 },
  breakdownLiteral: { fontSize: 14, fontWeight: '500' },
  breakdownNote: { fontSize: 12, fontStyle: 'italic' },
  clozeWrap: { alignItems: 'center', marginBottom: 16 },
  clozeSentence: { fontSize: 24, fontWeight: '700', textAlign: 'center', lineHeight: 34 },
  clozeFilled: { fontWeight: '800' },
  clozeBlank: { fontWeight: '700', letterSpacing: 2 },
  clozeMeaning: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 8 },
});
