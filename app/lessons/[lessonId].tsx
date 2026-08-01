// app/lessons/[lessonId].tsx
// Lesson player — the chip-builder sequenced through a lesson's steps.
// Each step: construction intro (if non-obvious) → chip-builder round
// (tap words in order to build the phrase) → solved feedback with
// transliteration + note + context sentence. Completion → context-aware
// "next lesson / back to section" footer.
//
// Per-word mastery is tracked globally by the chip's Cyrillic `form`
// (stores/wordMasteryStore.ts) — the same store the Study screen writes — so
// a word graduated anywhere fades here too. A chip's English gloss hides once
// the word has been placed correctly 5× in a row; a wrong tap on its slot
// resets that streak.

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobilePrimaryButton, MobileActionFooter } from '../../components/MobilePremium';
import { useAppTheme } from '../../context';
import { safeGoBack, navigateToLessons, navigateToLesson, navigateToDeck, navigateToSubDeck } from '../../navigation';
import { SCREEN_BODY_STYLE } from '../../constants';
import { getLesson, getLessonDeck, getLessonSubDeck } from '../../utils/knowalong/fixtures/decks';
import { buildChipsForStep, type Chip } from '../../utils/knowalong/fixtures/chips';
import { shouldShowGloss } from '../../utils/knowalong/mastery';
import { ITEM_ICONS } from '../../utils/knowalong/icons';
import { ConceptIcon } from '../../components/knowalong/ConceptIcon';
import { ConfettiEffect } from '../../components/Celebration/ConfettiEffect';
import { useStreakStore } from '../../stores/streakStore';
import { useLessonProgressStore } from '../../stores/lessonProgressStore';
import { useWordMasteryStore } from '../../stores/wordMasteryStore';

function roleColorKey(role: string): 'brand' | 'success' | 'warning' | 'textMuted' {
  if (role === 'pronoun') return 'brand';
  if (role === 'verb') return 'success';
  if (role === 'noun') return 'warning';
  return 'textMuted';
}

function rc(colors: ReturnType<typeof useAppTheme>['colors'], role: string): string {
  const key = roleColorKey(role);
  if (key === 'brand') return colors.brand;
  if (key === 'textMuted') return colors.textMuted;
  return colors.status[key as 'success' | 'warning'];
}

export default function LessonPlayerScreen() {
  const { colors } = useAppTheme();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const lesson = getLesson(lessonId ?? '');
  const deck = lesson ? getLessonDeck(lessonId ?? '') : null;

  const [stepIndex, setStepIndex] = useState(0);
  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, mistakes: 0 });
  const [showConfetti, setShowConfetti] = useState(false);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exposedRef = useRef<string | null>(null);

  const recordMistake = useStreakStore((s) => s.recordMistake);
  const addMasteredConcept = useStreakStore((s) => s.addMasteredConcept);
  const markLessonComplete = useLessonProgressStore((s) => s.markLessonComplete);
  const mastery = useWordMasteryStore((s) => s.mastery);
  const recordExposure = useWordMasteryStore((s) => s.recordExposure);
  const recordWordCorrect = useWordMasteryStore((s) => s.recordCorrect);
  const recordWordMistake = useWordMasteryStore((s) => s.recordMistake);

  // Hooks must run before the early return. The active step for exposure is
  // resolved defensively from the lesson (possibly null) here.
  const exposedStep = lesson?.steps[stepIndex];
  useEffect(() => {
    if (exposedStep && exposedRef.current !== exposedStep.itemId) {
      exposedRef.current = exposedStep.itemId;
      recordExposure(exposedStep.words.map((w) => w.form));
    }
  }, [exposedStep, recordExposure]);

  const showGloss = useCallback((form: string) => shouldShowGloss(mastery[form]), [mastery]);

  if (!lesson || !deck) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
        <MobileHeader title="Lesson not found" onBack={safeGoBack} />
      </SafeAreaView>
    );
  }

  // Context for the completion footer: which section this lesson sits in,
  // and the next lesson to offer (song decks only — flat decks go back to
  // the deck overview).
  const subDeck = getLessonSubDeck(lessonId ?? '');
  const subIndex = subDeck ? subDeck.lessons.findIndex((l) => l.id === lesson.id) : -1;
  const nextLesson = subDeck && subIndex >= 0 && subIndex + 1 < subDeck.lessons.length
    ? subDeck.lessons[subIndex + 1]
    : null;

  const step = lesson.steps[stepIndex];
  const isComplete = stepIndex >= lesson.steps.length;
  const isSolved = !!step && placedIds.length === step.words.length;
  const chips = useMemo(() => (step ? buildChipsForStep(step) : []), [step]);

  const handleTapChip = useCallback((chip: Chip) => {
    if (!step || isSolved || placedIds.includes(chip.id)) return;
    const slot = placedIds.length;
    if (chip.correctPosition === slot) {
      recordWordCorrect(step.words[slot].form);
      setPlacedIds((prev) => [...prev, chip.id]);
    } else {
      const target = step.words[slot]?.form;
      if (target) {
        recordWordMistake(target);
        recordMistake(step.itemId);
      }
      setWrongId(chip.id);
      setScore((s) => ({ ...s, mistakes: s.mistakes + 1 }));
      if (wrongTimer.current) clearTimeout(wrongTimer.current);
      wrongTimer.current = setTimeout(() => setWrongId(null), 600);
    }
  }, [step, isSolved, placedIds, recordWordCorrect, recordWordMistake, recordMistake]);

  const handleContinue = useCallback(() => {
    setPlacedIds([]);
    setWrongId(null);
    setScore((s) => ({ ...s, correct: s.correct + 1 }));
    setStepIndex((i) => {
      if (i + 1 >= lesson.steps.length) {
        setShowConfetti(true);
        addMasteredConcept();
        markLessonComplete(lesson.id);
        setTimeout(() => setShowConfetti(false), 3500);
      }
      return i + 1;
    });
  }, [lesson, addMasteredConcept, markLessonComplete]);

  if (isComplete) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
        <MobileAtmosphere surface="analytics" />
        <MobileHeader title="Lesson complete" eyebrow={lesson.title} onBack={safeGoBack} />
        <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <MobileSurface padding={28}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
              {lesson.steps.length} phrases built
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
              {score.mistakes === 0 ? 'Flawless — no mistakes!' : `${score.mistakes} mistake${score.mistakes === 1 ? '' : 's'} along the way.`}
            </Text>
            {lesson.steps.map((s, i) => (
              <Text key={i} style={{ fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center', marginTop: 6 }}>
                {s.surfaceForm}
              </Text>
            ))}
          </MobileSurface>
        </ScrollView>
        <ConfettiEffect visible={showConfetti} intensity="intense" />
        <MobileActionFooter>
          {subDeck ? (
            <>
              {nextLesson ? (
                <MobilePrimaryButton variant="primary" onPress={() => navigateToLesson(nextLesson.id)}>
                  Next: {nextLesson.title}
                </MobilePrimaryButton>
              ) : null}
              <MobilePrimaryButton variant="ghost" onPress={() => navigateToSubDeck(deck.id, subDeck.id)}>
                Back to {subDeck.label}
              </MobilePrimaryButton>
            </>
          ) : (
            <>
              <MobilePrimaryButton variant="primary" onPress={() => navigateToDeck(deck.id)}>
                Back to {deck.title}
              </MobilePrimaryButton>
              <MobilePrimaryButton variant="ghost" onPress={() => navigateToLessons()}>More lessons</MobilePrimaryButton>
            </>
          )}
        </MobileActionFooter>
      </SafeAreaView>
    );
  }

  const progress = ((stepIndex + (isSolved ? 1 : 0)) / lesson.steps.length) * 100;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader
        title={lesson.title}
        eyebrow={`${deck.title} · ${stepIndex + 1}/${lesson.steps.length}`}
        onBack={safeGoBack}
      />
      <View style={{ height: 4, backgroundColor: 'rgba(128,128,128,0.15)', marginHorizontal: 16 }}>
        <View style={{ height: '100%', width: `${progress}%`, backgroundColor: colors.brand, borderRadius: 2 }} />
      </View>

      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 80 }}>
        <MobileSurface padding={20}>
          {/* Prompt */}
          <Text style={{ fontSize: 13, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>
            Build this in Russian:
          </Text>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: 6 }}>
            {step.meaning}
          </Text>

          {/* Construction intro */}
          {step.construction ? (
            <View style={{ marginTop: 12, padding: 14, borderRadius: 12, backgroundColor: colors.brand + '08', borderWidth: 1, borderColor: colors.brand + '25' }}>
              <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>{step.construction.intro}</Text>
              <View style={{ marginTop: 10, gap: 4 }}>
                {step.construction.breakdown.map((part, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.brand }}>{part.form}</Text>
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>=</Text>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{part.literal}</Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, fontStyle: 'italic' }}>({part.note})</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Answer slots */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20 }}>
            {step.words.map((_, slotIdx) => {
              const placed = slotIdx < placedIds.length;
              const w = step.words[slotIdx];
              const color = rc(colors, w.role);
              return (
                <View key={slotIdx} style={{
                  minWidth: 70, minHeight: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
                  borderWidth: 2, borderStyle: placed ? 'solid' : 'dashed',
                  borderColor: placed ? color + '40' : colors.cardBorder,
                  backgroundColor: placed ? color + '10' : 'transparent',
                  paddingVertical: 10, paddingHorizontal: 14,
                }}>
                  {placed ? (
                    <>
                      <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>{w.form}</Text>
                      {showGloss(w.form) ? (
                        <Text style={{ fontSize: 10, color: colors.textMuted }}>{w.gloss}</Text>
                      ) : null}
                    </>
                  ) : null}
                </View>
              );
            })}
          </View>

          {/* Solved feedback */}
          {isSolved ? (
            <View style={{ marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: colors.status.success + '12' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.status.success, textAlign: 'center' }}>
                {step.surfaceForm}
              </Text>
              {step.transliteration ? (
                <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 2, fontStyle: 'italic' }}>
                  {step.transliteration}
                </Text>
              ) : null}
              {step.contextSentence ? (
                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.cardBorder }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, textAlign: 'center' }}>{step.contextSentence.ru}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 2, fontStyle: 'italic' }}>{step.contextSentence.en}</Text>
                </View>
              ) : null}
              {step.note ? (
                <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 8 }}>{step.note}</Text>
              ) : null}
            </View>
          ) : null}

          {/* Chip bank */}
          {!isSolved ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20 }}>
              {chips.map((chip) => {
                const isPlaced = placedIds.includes(chip.id);
                const isWrong = wrongId === chip.id;
                const color = rc(colors, chip.role);
                return (
                  <Pressable
                    key={chip.id}
                    disabled={isPlaced}
                    onPress={() => handleTapChip(chip)}
                    style={{
                      paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10,
                      borderWidth: 2, borderLeftWidth: 4, borderLeftColor: color,
                      borderColor: isWrong ? colors.status.error : colors.cardBorder,
                      backgroundColor: isWrong ? colors.status.error + '20' : isPlaced ? color + '08' : colors.cardAlt,
                      opacity: isPlaced ? 0.3 : 1, minWidth: 70, alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{chip.form}</Text>
                    {showGloss(chip.form) ? (
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>{chip.gloss}</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </MobileSurface>
      </ScrollView>

      <MobileActionFooter>
        {isSolved ? (
          <MobilePrimaryButton variant="primary" onPress={handleContinue}>
            {stepIndex + 1 >= lesson.steps.length ? 'Finish lesson' : 'Next phrase'}
          </MobilePrimaryButton>
        ) : null}
      </MobileActionFooter>
    </SafeAreaView>
  );
}
