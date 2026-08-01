// app/study.tsx
//
// KnowAlong adaptive "Build" screen — a thin sequencer over the shared
// LessonRound component. The lesson is GENERATED from the learner's per-word
// mastery (utils/knowalong/generateLesson.ts) and now spans the gradient, the
// CLCC concept ladder, and the Svetofor lyrics, mixing build / reverse / cloze
// rounds. Per-word mastery is tracked globally by the chip's Cyrillic `form`
// (stores/wordMasteryStore.ts); a word's English gloss hides once it's been
// placed correctly 5 times in a row, and a wrong tap resets that streak.
// "Next lesson" regenerates from the latest mastery.
//
// This shell owns sequencing + scoring + the mastery summary; LessonRound owns
// the per-step interaction, mode branching, gloss fade, and TTS.

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MobileAtmosphere,
  MobileHeader,
  MobilePrimaryButton,
  MobileActionFooter,
} from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack, navigateToHome } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import type { LessonStep } from '../utils/knowalong/fixtures/decks';
import { generateAdaptiveLesson } from '../utils/knowalong/generateLesson';
import { summarizeMastery } from '../utils/knowalong/mastery';
import { prefetchAudio } from '../utils/knowalong/tts';
import { MasterySummaryCard } from '../components/knowalong/MasterySummary';
import { LoadingSpinner } from '../components/primitives';
import { LessonRound } from '../components/knowalong/LessonRound';
import { ConfettiEffect } from '../components/Celebration/ConfettiEffect';
import { useStreakStore } from '../stores/streakStore';
import { useWordMasteryStore } from '../stores/wordMasteryStore';

export default function StudyScreen() {
  const { colors } = useAppTheme();
  const mastery = useWordMasteryStore((s) => s.mastery);
  const recordExposure = useWordMasteryStore((s) => s.recordExposure);
  const recordWordCorrect = useWordMasteryStore((s) => s.recordCorrect);
  const recordWordMistake = useWordMasteryStore((s) => s.recordMistake);
  const recordStudySession = useStreakStore((s) => s.recordStudySession);
  const recordMistake = useStreakStore((s) => s.recordMistake);
  const addMasteredConcept = useStreakStore((s) => s.addMasteredConcept);

  const [steps, setSteps] = useState<LessonStep[]>(() => generateAdaptiveLesson(mastery));
  const [index, setIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [score, setScore] = useState({ correct: 0, mistakes: 0 });
  const [showConfetti, setShowConfetti] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const stepHadMistake = useRef(false);

  // Prefetch only the full sentences (words use Web Speech now). Lighter gate.
  const audioTexts = useMemo(() => steps.map((s) => s.surfaceForm), [steps]);

  // Gate the first card behind a spinner until the engine + first ~2 cards'
  // audio are synthesized; prefetch the rest in the background while the
  // learner works the first card.
  useEffect(() => {
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

  const step = steps[index];
  const total = steps.length;
  const isComplete = index >= total;

  const handleSolvedChange = useCallback((s: boolean) => {
    setSolved(s);
    if (s && !stepHadMistake.current) {
      setScore((prev) => ({ ...prev, correct: prev.correct + 1 }));
    }
  }, []);

  const handleMistake = useCallback((itemId: string) => {
    stepHadMistake.current = true;
    recordMistake(itemId);
    setScore((prev) => ({ ...prev, mistakes: prev.mistakes + 1 }));
  }, [recordMistake]);

  const handleContinue = useCallback(() => {
    setSolved(false);
    stepHadMistake.current = false;
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
    setSolved(false);
    setScore({ correct: 0, mistakes: 0 });
    stepHadMistake.current = false;
    setSteps(generateAdaptiveLesson(useWordMasteryStore.getState().mastery));
  }, []);

  const progress = total > 0 ? ((index + (solved ? 1 : 0)) / total) * 100 : 0;
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
        {isComplete || !step ? (
          <>
            <View style={[styles.completeCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.completeTitle, { color: colors.text }]}>
                {score.correct} / {total} built correctly
              </Text>
              <Text style={[styles.completeBody, { color: colors.textSecondary }]}>
                {score.mistakes === 0
                  ? 'Flawless! No mistakes — every phrase built first try.'
                  : `${score.mistakes} mistake${score.mistakes === 1 ? '' : 's'} along the way. Keep going to lock them in.`}
              </Text>
            </View>
            <View style={{ marginTop: 12 }}>
              <MasterySummaryCard summary={summary} />
            </View>
          </>
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
          <View style={styles.loadingAudio}>
            <LoadingSpinner size="large" color={colors.brand} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading audio…</Text>
          </View>
        )}
      </ScrollView>

      {isComplete ? (
        <MobileActionFooter>
          <MobilePrimaryButton variant="primary" onPress={regenerate}>Next lesson</MobilePrimaryButton>
          <MobilePrimaryButton variant="ghost" onPress={() => navigateToHome()}>Back to stream</MobilePrimaryButton>
        </MobileActionFooter>
      ) : step ? (
        <MobileActionFooter>
          {solved ? (
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
  completeCard: { borderRadius: 16, padding: 24 },
  completeTitle: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  completeBody: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  loadingAudio: { padding: 48, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
});
