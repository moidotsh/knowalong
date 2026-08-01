// app/study.tsx
// Duolingo-style interactive learning session. Introduces compositional
// phrases incrementally ("я" → "я вижу" → "я вижу море"), not isolated
// infinitives. Each item: present the phrase → learner selects the meaning
// from 4 options → immediate feedback (green/red) → continue. Alternates
// recognize (Russian→English) + produce (English→Russian) modes.

import React, { useState, useCallback } from 'react';
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
import { safeGoBack } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import { buildQuiz, type QuizQuestion } from '../utils/knowalong/fixtures/learningItems';

export default function StudyScreen() {
  const { colors } = useAppTheme();
  const [questions] = useState<QuizQuestion[]>(() => buildQuiz());
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });

  const question = questions[index];
  const total = questions.length;
  const isComplete = index >= total;
  const answered = selected !== null;
  const isCorrect = answered && selected === question?.correctIndex;

  const handleSelect = useCallback((optionIndex: number) => {
    if (answered) return;
    setSelected(optionIndex);
    if (optionIndex === question!.correctIndex) {
      setScore((s) => ({ ...s, correct: s.correct + 1 }));
    } else {
      setScore((s) => ({ ...s, wrong: s.wrong + 1 }));
    }
  }, [answered, question]);

  const handleContinue = useCallback(() => {
    setSelected(null);
    setIndex((i) => i + 1);
  }, []);

  const handleRestart = useCallback(() => {
    setIndex(0);
    setSelected(null);
    setScore({ correct: 0, wrong: 0 });
  }, []);

  const progress = total > 0 ? ((index + (answered ? 1 : 0)) / total) * 100 : 0;

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: colors.backgroundDeep }]} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader
        title={isComplete ? 'Lesson complete' : `Question ${index + 1} / ${total}`}
        eyebrow="Learn Russian"
        onBack={safeGoBack}
      />

      {/* Progress bar */}
      {!isComplete ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: colors.brand }]} />
        </View>
      ) : null}

      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.bodyContent}>
        {isComplete || !question ? (
          <MobileSurface padding={24}>
            <Text style={[styles.completeTitle, { color: colors.text }]}>
              {score.correct} / {total} correct
            </Text>
            <Text style={[styles.completeBody, { color: colors.textSecondary }]}>
              {score.correct === total
                ? 'Perfect! You mastered every phrase.'
                : `${score.wrong} to review. Try again to lock them in.`}
            </Text>
          </MobileSurface>
        ) : (
          <MobileSurface padding={20}>
            {/* Prompt */}
            <Text style={[styles.promptLabel, { color: colors.textMuted }]}>
              {question.mode === 'recognize'
                ? 'What does this mean?'
                : 'How do you say this in Russian?'}
            </Text>
            <Text style={[styles.prompt, { color: colors.text }]}>
              {question.prompt}
            </Text>
            {question.item.transliteration && question.mode === 'recognize' ? (
              <Text style={[styles.promptTranslit, { color: colors.textSecondary }]}>
                {question.item.transliteration}
              </Text>
            ) : null}

            {/* Options */}
            <View style={styles.optionsGrid}>
              {question.options.map((option, i) => {
                const showResult = answered;
                const isThisCorrect = i === question.correctIndex;
                const isThisSelected = i === selected;
                let bg = colors.cardAlt;
                let border = colors.cardBorder;
                if (showResult && isThisCorrect) {
                  bg = colors.status.success + '20';
                  border = colors.status.success;
                } else if (showResult && isThisSelected && !isThisCorrect) {
                  bg = colors.status.error + '20';
                  border = colors.status.error;
                } else if (showResult) {
                  bg = colors.cardAlt;
                  border = colors.cardBorder;
                }
                return (
                  <Pressable
                    key={i}
                    disabled={answered}
                    onPress={() => handleSelect(i)}
                    style={[styles.optionBtn, { backgroundColor: bg, borderColor: border }]}
                  >
                    <Text style={[styles.optionText, { color: colors.text }]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Feedback after answering */}
            {answered ? (
              <View style={[styles.feedback, { backgroundColor: (isCorrect ? colors.status.success : colors.status.error) + '15' }]}>
                <Text style={[styles.feedbackTitle, { color: isCorrect ? colors.status.success : colors.status.error }]}>
                  {isCorrect ? '✓ Correct!' : '✗ Not quite'}
                </Text>
                {!isCorrect ? (
                  <Text style={[styles.feedbackCorrect, { color: colors.textSecondary }]}>
                    "{question.item.surfaceForm}" means "{question.item.meaning}".
                  </Text>
                ) : null}
                {question.item.note ? (
                  <Text style={[styles.feedbackNote, { color: colors.textSecondary }]}>
                    {question.item.note}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </MobileSurface>
        )}
      </ScrollView>

      {/* Footer */}
      {!isComplete && question ? (
        <MobileActionFooter>
          {answered ? (
            <MobilePrimaryButton variant="primary" onPress={handleContinue}>
              {index + 1 >= total ? 'See results' : 'Continue'}
            </MobilePrimaryButton>
          ) : null}
        </MobileActionFooter>
      ) : isComplete ? (
        <MobileActionFooter>
          <MobilePrimaryButton variant="primary" onPress={handleRestart}>
            Try again
          </MobilePrimaryButton>
        </MobileActionFooter>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  progressTrack: { height: 4, backgroundColor: 'rgba(128,128,128,0.15)', marginHorizontal: 16 },
  progressBar: { height: '100%', borderRadius: 2 },
  bodyContent: { padding: 16, gap: 16 },
  promptLabel: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  prompt: { fontSize: 36, fontWeight: '700', textAlign: 'center', paddingVertical: 16 },
  promptTranslit: { fontSize: 16, textAlign: 'center', fontStyle: 'italic', marginBottom: 8 },
  optionsGrid: { gap: 10, marginTop: 16 },
  optionBtn: { paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12, borderWidth: 2 },
  optionText: { fontSize: 17, fontWeight: '500', textAlign: 'center' },
  feedback: { marginTop: 16, padding: 16, borderRadius: 12, gap: 6 },
  feedbackTitle: { fontSize: 16, fontWeight: '700' },
  feedbackCorrect: { fontSize: 14 },
  feedbackNote: { fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  completeTitle: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  completeBody: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
