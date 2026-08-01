// app/study.tsx
// KnowAlong adaptive "Build" interaction — the learner assembles Russian
// phrases from word chips. Each chip shows the Russian word + (while still
// being learned) its English gloss, color-coded by grammatical role
// (pronoun=blue, verb=green, noun=orange, particle=gray). The learner taps
// chips in the correct ORDER to build the phrase — actively learning word
// order + decomposition (not just ordering opaque tokens).
//
// Adaptive: the lesson is GENERATED from the learner's per-word mastery
// (utils/knowalong/generateLesson.ts) — warmup with known words → drill issue
// words → introduce 1 new word (i+1). Per-word mastery is tracked globally by
// the chip's Cyrillic `form` (stores/wordMasteryStore.ts); a word's English
// gloss hides once it's been placed correctly 5 times in a row, and a wrong
// tap resets that streak. "Next lesson" regenerates from the latest mastery.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobilePrimaryButton,
  MobileActionFooter,
} from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack, navigateToHome } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import { ROLE_COLOR_KEYS, type WordRole } from '../utils/knowalong/fixtures/learningItems';
import { buildChipsForStep, type Chip } from '../utils/knowalong/fixtures/chips';
import type { LessonStep } from '../utils/knowalong/fixtures/decks';
import { generateAdaptiveLesson } from '../utils/knowalong/generateLesson';
import { shouldShowGloss, summarizeMastery, type MasteryMap } from '../utils/knowalong/mastery';
import { MasterySummaryCard } from '../components/knowalong/MasterySummary';
import { ConfettiEffect } from '../components/Celebration/ConfettiEffect';
import { useStreakStore } from '../stores/streakStore';
import { useWordMasteryStore } from '../stores/wordMasteryStore';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';
import { ITEM_ICONS } from '../utils/knowalong/icons';

function roleColor(colors: ReturnType<typeof useAppTheme>['colors'], role: WordRole): string {
  const key = ROLE_COLOR_KEYS[role];
  if (key === 'brand') return colors.brand;
  if (key === 'textMuted') return colors.textMuted;
  return colors.status[key as 'success' | 'warning'];
}

interface AdaptQuestion {
  step: LessonStep;
  chips: Chip[];
  slotCount: number;
}

/** Build a fresh adaptive lesson (phrases + chips) from current mastery. */
function buildAdaptive(mastery: MasteryMap): AdaptQuestion[] {
  return generateAdaptiveLesson(mastery).map((step) => ({
    step,
    chips: buildChipsForStep(step),
    slotCount: step.words.length,
  }));
}

export default function StudyScreen() {
  const { colors } = useAppTheme();
  const mastery = useWordMasteryStore((s) => s.mastery);
  const recordExposure = useWordMasteryStore((s) => s.recordExposure);
  const recordWordCorrect = useWordMasteryStore((s) => s.recordCorrect);
  const recordWordMistake = useWordMasteryStore((s) => s.recordMistake);
  const recordStudySession = useStreakStore((s) => s.recordStudySession);
  const recordMistake = useStreakStore((s) => s.recordMistake);
  const addMasteredConcept = useStreakStore((s) => s.addMasteredConcept);

  const [questions, setQuestions] = useState<AdaptQuestion[]>(() => buildAdaptive(mastery));
  const [index, setIndex] = useState(0);
  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, mistakes: 0 });
  const [showConfetti, setShowConfetti] = useState(false);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exposedRef = useRef<string | null>(null);

  const question = questions[index];
  const total = questions.length;
  const isComplete = index >= total;
  const isSolved = !!question && placedIds.length === question.slotCount;

  // Record exposure (one count per active phrase) when a new question becomes
  // active. Sync effect — R1-safe; exposedRef guards against re-counting.
  useEffect(() => {
    if (question && exposedRef.current !== question.step.itemId) {
      exposedRef.current = question.step.itemId;
      recordExposure(question.step.words.map((w) => w.form));
    }
  }, [question, recordExposure]);

  const showGloss = useCallback((form: string) => shouldShowGloss(mastery[form]), [mastery]);

  const handleTapChip = useCallback((chip: Chip) => {
    if (!question || isSolved || placedIds.includes(chip.id)) return;
    const slot = placedIds.length;
    if (chip.isCorrect && chip.correctPosition === slot) {
      recordWordCorrect(question.step.words[slot].form);
      setPlacedIds((prev) => [...prev, chip.id]);
      if (slot + 1 === question.slotCount) {
        setScore((s) => ({ ...s, correct: s.correct + (wrongId ? 0 : 1) }));
      }
    } else {
      const target = question.step.words[slot]?.form;
      if (target) {
        recordWordMistake(target);
        recordMistake(question.step.itemId);
      }
      setWrongId(chip.id);
      setScore((s) => ({ ...s, mistakes: s.mistakes + 1 }));
      if (wrongTimer.current) clearTimeout(wrongTimer.current);
      wrongTimer.current = setTimeout(() => setWrongId(null), 600);
    }
  }, [question, isSolved, placedIds, wrongId, recordWordCorrect, recordWordMistake, recordMistake]);

  const handleContinue = useCallback(() => {
    setPlacedIds([]);
    setWrongId(null);
    setIndex((i) => {
      if (i + 1 >= total) {
        setShowConfetti(true);
        recordStudySession();
        addMasteredConcept();
        setTimeout(() => setShowConfetti(false), 3500);
      }
      return i + 1;
    });
  }, [total, recordStudySession, addMasteredConcept]);

  const regenerate = useCallback(() => {
    setIndex(0);
    setPlacedIds([]);
    setWrongId(null);
    setScore({ correct: 0, mistakes: 0 });
    exposedRef.current = null;
    setQuestions(buildAdaptive(useWordMasteryStore.getState().mastery));
  }, []);

  const progress = total > 0 ? ((index + (isSolved ? 1 : 0)) / total) * 100 : 0;
  const placedChips = question ? placedIds
    .map((id) => question.chips.find((c) => c.id === id))
    .filter((c): c is Chip => c !== undefined) : [];
  const availableChips = question ? question.chips.filter((c) => !placedIds.includes(c.id)) : [];
  const summary = summarizeMastery(Object.keys(mastery), mastery);

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: colors.backgroundDeep }]} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader
        title={isComplete ? 'Lesson complete' : `Build ${index + 1} / ${total}`}
        eyebrow="Adaptive practice"
        onBack={safeGoBack}
      />

      {!isComplete ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: colors.brand }]} />
        </View>
      ) : null}

      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.bodyContent}>
        {isComplete || !question ? (
          <>
            <MobileSurface padding={24}>
              <Text style={[styles.completeTitle, { color: colors.text }]}>
                {score.correct} / {total} built correctly
              </Text>
              <Text style={[styles.completeBody, { color: colors.textSecondary }]}>
                {score.mistakes === 0
                  ? 'Flawless! No mistakes — every phrase built first try.'
                  : `${score.mistakes} mistake${score.mistakes === 1 ? '' : 's'} along the way. Keep going to lock them in.`}
              </Text>
            </MobileSurface>
            <View style={{ marginTop: 12 }}>
              <MasterySummaryCard summary={summary} />
            </View>
          </>
        ) : (
          <MobileSurface padding={20}>
            {/* Prompt */}
            <Text style={[styles.promptLabel, { color: colors.textMuted }]}>
              Build this in Russian:
            </Text>
            {ITEM_ICONS[question.step.itemId] ? (
              <View style={styles.promptEmojiWrap}><ConceptIcon name={ITEM_ICONS[question.step.itemId] ?? 'star'} size={48} color={colors.brand} /></View>
            ) : null}
            <Text style={[styles.prompt, { color: colors.text }]}>
              {question.step.meaning}
            </Text>

            {/* Answer slots */}
            <View style={styles.slotsRow}>
              {Array.from({ length: question.slotCount }).map((_, slotIdx) => {
                const chip = placedChips[slotIdx];
                if (chip) {
                  const rc = roleColor(colors, chip.role);
                  return (
                    <View key={slotIdx} style={[styles.slotFilled, { borderLeftColor: rc, backgroundColor: rc + '12' }]}>
                      <Text style={[styles.chipForm, { color: colors.text }]}>{chip.form}</Text>
                      {showGloss(chip.form) ? (
                        <Text style={[styles.chipGloss, { color: colors.textMuted }]}>{chip.gloss}</Text>
                      ) : null}
                    </View>
                  );
                }
                return (
                  <View key={slotIdx} style={[styles.slotEmpty, { borderColor: colors.cardBorder }]} />
                );
              })}
            </View>

            {/* Solved feedback */}
            {isSolved ? (
              <View style={[styles.solvedBox, { backgroundColor: colors.status.success + '15' }]}>
                <Text style={[styles.solvedTitle, { color: colors.status.success }]}>
                  ✓ {question.step.surfaceForm}
                </Text>
                {question.step.transliteration ? (
                  <Text style={[styles.solvedTranslit, { color: colors.textSecondary }]}>
                    {question.step.transliteration}
                  </Text>
                ) : null}
                {question.step.note ? (
                  <Text style={[styles.solvedNote, { color: colors.textSecondary }]}>
                    {question.step.note}
                  </Text>
                ) : null}
                {question.step.contextSentence ? (
                  <View style={[styles.contextBox, { borderColor: colors.cardBorder }]}>
                    <Text style={[styles.contextRu, { color: colors.text }]}>
                      {question.step.contextSentence.ru}
                    </Text>
                    <Text style={[styles.contextEn, { color: colors.textSecondary }]}>
                      {question.step.contextSentence.en}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Construction intro (for non-obvious mappings) */}
            {!isSolved && question.step.construction ? (
              <View style={[styles.constructionBox, { backgroundColor: colors.brand + '10', borderColor: colors.brand + '30' }]}>
                <Text style={[styles.constructionIntro, { color: colors.text }]}>
                  {question.step.construction.intro}
                </Text>
                <View style={styles.constructionBreakdown}>
                  {question.step.construction.breakdown.map((part, i) => (
                    <View key={i} style={styles.breakdownRow}>
                      <Text style={[styles.breakdownForm, { color: colors.brand }]}>
                        {part.form}
                      </Text>
                      <Text style={[styles.breakdownArrow, { color: colors.textMuted }]}>
                        =
                      </Text>
                      <Text style={[styles.breakdownLiteral, { color: colors.text }]}>
                        {part.literal}
                      </Text>
                      <Text style={[styles.breakdownNote, { color: colors.textMuted }]}>
                        ({part.note})
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Chip bank */}
            {!isSolved ? (
              <View style={styles.chipBank}>
                <View style={styles.chipBankRow}>
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
                        {showGloss(chip.form) ? (
                          <Text style={[styles.chipGloss, { color: colors.textMuted }]}>{chip.gloss}</Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Legend */}
            {!isSolved ? (
              <View style={styles.legend}>
                {(['pronoun', 'verb', 'noun', 'particle'] as WordRole[]).map((role) => (
                  <View key={role} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: roleColor(colors, role) }]} />
                    <Text style={[styles.legendText, { color: colors.textMuted }]}>{role}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </MobileSurface>
        )}
      </ScrollView>

      {isComplete ? (
        <MobileActionFooter>
          <MobilePrimaryButton variant="primary" onPress={regenerate}>Next lesson</MobilePrimaryButton>
          <MobilePrimaryButton variant="ghost" onPress={() => navigateToHome()}>Back to stream</MobilePrimaryButton>
        </MobileActionFooter>
      ) : question ? (
        <MobileActionFooter>
          {isSolved ? (
            <MobilePrimaryButton variant="primary" onPress={handleContinue}>
              {index + 1 >= total ? 'See results' : 'Continue'}
            </MobilePrimaryButton>
          ) : null}
        </MobileActionFooter>
      ) : null}
      <ConfettiEffect visible={showConfetti} intensity="intense" />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  progressTrack: { height: 4, backgroundColor: 'rgba(128,128,128,0.15)', marginHorizontal: 16 },
  progressBar: { height: '100%', borderRadius: 2 },
  bodyContent: { padding: 16 },
  promptLabel: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  prompt: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  promptEmoji: { fontSize: 48, textAlign: 'center', marginBottom: 4 },
  promptEmojiWrap: { alignItems: 'center', marginBottom: 4 },
  slotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 },
  slotFilled: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderLeftWidth: 4, minWidth: 70, alignItems: 'center' },
  slotEmpty: { width: 70, height: 56, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed' },
  chipForm: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  chipGloss: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  chipBank: { marginTop: 8 },
  chipBankRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 2, borderLeftWidth: 4, minWidth: 70, alignItems: 'center' },
  solvedBox: { marginTop: 16, padding: 16, borderRadius: 12 },
  solvedTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  solvedTranslit: { fontSize: 14, textAlign: 'center', fontStyle: 'italic', marginTop: 4 },
  solvedNote: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, textTransform: 'capitalize' },
  completeTitle: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  completeBody: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  constructionBox: { marginTop: 12, marginBottom: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  constructionIntro: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  constructionBreakdown: { gap: 6 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  breakdownForm: { fontSize: 16, fontWeight: '700' },
  breakdownArrow: { fontSize: 14 },
  breakdownLiteral: { fontSize: 14, fontWeight: '500' },
  breakdownNote: { fontSize: 12, fontStyle: 'italic' },
  contextBox: { marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  contextRu: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  contextEn: { fontSize: 13, textAlign: 'center', marginTop: 4, fontStyle: 'italic' },
});
