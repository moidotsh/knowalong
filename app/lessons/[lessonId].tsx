// app/lessons/[lessonId].tsx
//
// Lesson player — a thin sequencer over the shared LessonRound component.
// Walks a lesson's steps in order; each step is a build / reverse / cloze
// round owned by LessonRound (mode branching, gloss fade, TTS, per-word
// mastery). Completion → context-aware "next lesson / back to section" footer.
//
// Per-word mastery is global by the chip's Cyrillic `form`
// (stores/wordMasteryStore.ts) — the same store the Study screen writes — so
// a word graduated anywhere fades here too.

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { MobileAtmosphere, MobileHeader, MobilePrimaryButton, MobileActionFooter, MobileSurface } from '../../components/MobilePremium';
import { useAppTheme } from '../../context';
import { safeGoBack, navigateToLessons, navigateToLesson, navigateToDeck, navigateToSubDeck } from '../../navigation';
import { SCREEN_BODY_STYLE } from '../../constants';
import { getLesson, getLessonDeck, getLessonSubDeck } from '../../utils/knowalong/fixtures/decks';
import { prefetchAudio } from '../../utils/knowalong/tts';
import { LessonRound } from '../../components/knowalong/LessonRound';
import { LoadingSpinner } from '../../components/primitives';
import { ConfettiEffect } from '../../components/Celebration/ConfettiEffect';
import { useStreakStore } from '../../stores/streakStore';
import { useLessonProgressStore } from '../../stores/lessonProgressStore';
import { useWordMasteryStore } from '../../stores/wordMasteryStore';

export default function LessonPlayerScreen() {
  const { colors } = useAppTheme();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const lesson = getLesson(lessonId ?? '');
  const deck = lesson ? getLessonDeck(lessonId ?? '') : null;

  const [stepIndex, setStepIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [score, setScore] = useState({ correct: 0, mistakes: 0 });
  const [showConfetti, setShowConfetti] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  // Prefetch only the full sentences (words use Web Speech now). Lighter gate.
  const audioTexts = useMemo(() => (lesson?.steps ?? []).map((s) => s.surfaceForm), [lesson]);

  // Gate the first card behind a spinner until the engine + first ~2 cards'
  // audio are synthesized; prefetch the rest in the background.
  useEffect(() => {
    if (audioTexts.length === 0) { setAudioReady(true); return; }
    let cancelled = false;
    setAudioReady(false);
    const FIRST_BATCH = 8;
    void prefetchAudio(audioTexts.slice(0, FIRST_BATCH)).then(() => {
      if (cancelled) return;
      setAudioReady(true);
      void prefetchAudio(audioTexts.slice(FIRST_BATCH));
    });
    return () => { cancelled = true; };
  }, [audioTexts]);

  const recordMistake = useStreakStore((s) => s.recordMistake);
  const addMasteredConcept = useStreakStore((s) => s.addMasteredConcept);
  const markLessonComplete = useLessonProgressStore((s) => s.markLessonComplete);
  const mastery = useWordMasteryStore((s) => s.mastery);
  const recordExposure = useWordMasteryStore((s) => s.recordExposure);
  const recordWordCorrect = useWordMasteryStore((s) => s.recordCorrect);
  const recordWordMistake = useWordMasteryStore((s) => s.recordMistake);

  const handleSolvedChange = useCallback((s: boolean) => {
    setSolved(s);
  }, []);

  const handleMistake = useCallback((itemId: string) => {
    recordMistake(itemId);
    setScore((s) => ({ ...s, mistakes: s.mistakes + 1 }));
  }, [recordMistake]);

  const handleContinue = useCallback(() => {
    setSolved(false);
    setScore((s) => ({ ...s, correct: s.correct + 1 }));
    if (!lesson) return;
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

  if (!lesson || !deck) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
        <MobileHeader title="Lesson not found" onBack={safeGoBack} />
      </SafeAreaView>
    );
  }

  const subDeck = getLessonSubDeck(lessonId ?? '');
  const subIndex = subDeck ? subDeck.lessons.findIndex((l) => l.id === lesson.id) : -1;
  const nextLesson = subDeck && subIndex >= 0 && subIndex + 1 < subDeck.lessons.length
    ? subDeck.lessons[subIndex + 1]
    : null;

  const step = lesson.steps[stepIndex];
  const isComplete = stepIndex >= lesson.steps.length;
  const progress = ((stepIndex + (solved ? 1 : 0)) / lesson.steps.length) * 100;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader
        title={lesson.title}
        eyebrow={`${deck.title} · ${Math.min(stepIndex + 1, lesson.steps.length)}/${lesson.steps.length}`}
        onBack={safeGoBack}
      />
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: colors.brand }]} />
      </View>

      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 80 }}>
        {isComplete ? (
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
        ) : audioReady ? (
          <LessonRound
            key={step.itemId}
            step={step}
            mastery={mastery}
            onWordCorrect={recordWordCorrect}
            onWordMistake={recordWordMistake}
            onMistake={handleMistake}
            onExposure={recordExposure}
            onSolvedChange={handleSolvedChange}
          />
        ) : (
          <View style={{ padding: 48, alignItems: 'center' }}>
            <LoadingSpinner size="large" color={colors.brand} />
            <Text style={{ marginTop: 12, fontSize: 14, color: colors.textSecondary }}>Loading audio…</Text>
          </View>
        )}
      </ScrollView>

      <ConfettiEffect visible={showConfetti} intensity="intense" />
      {isComplete ? (
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
      ) : (
        <MobileActionFooter>
          {solved ? (
            <MobilePrimaryButton variant="primary" onPress={handleContinue}>
              {stepIndex + 1 >= lesson.steps.length ? 'Finish lesson' : 'Next phrase'}
            </MobilePrimaryButton>
          ) : null}
        </MobileActionFooter>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 4, backgroundColor: 'rgba(128,128,128,0.15)', marginHorizontal: 16 },
  progressBar: { height: '100%', borderRadius: 2 },
});
