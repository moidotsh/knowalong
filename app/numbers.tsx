// app/numbers.tsx
// Number practice — learn to count in Russian. Shows a number (digit),
// learner picks the Russian word. Reversed mode: show the Russian word,
// pick the digit. Covers 0-20 + tens to 100.

import React, { useState, useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobilePrimaryButton, MobileActionFooter } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';

interface Numeral {
  digit: number;
  russian: string;
}

const NUMERALS: Numeral[] = [
  { digit: 0, russian: 'ноль' },
  { digit: 1, russian: 'один' },
  { digit: 2, russian: 'два' },
  { digit: 3, russian: 'три' },
  { digit: 4, russian: 'четыре' },
  { digit: 5, russian: 'пять' },
  { digit: 6, russian: 'шесть' },
  { digit: 7, russian: 'семь' },
  { digit: 8, russian: 'восемь' },
  { digit: 9, russian: 'девять' },
  { digit: 10, russian: 'десять' },
  { digit: 11, russian: 'одиннадцать' },
  { digit: 12, russian: 'двенадцать' },
  { digit: 15, russian: 'пятнадцать' },
  { digit: 20, russian: 'двадцать' },
  { digit: 50, russian: 'пятьдесят' },
  { digit: 100, russian: 'сто' },
];

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TOTAL = 10;

function buildQ() {
  const correct = shuffle(NUMERALS)[0];
  const distractors = shuffle(NUMERALS.filter((n) => n.digit !== correct.digit)).slice(0, 3);
  const options = shuffle([correct, ...distractors]);
  const showDigit = Math.random() > 0.5;
  return {
    correct,
    prompt: showDigit ? String(correct.digit) : correct.russian,
    promptLabel: showDigit ? 'How do you say this number?' : 'What number is this?',
    options: showDigit ? options.map((o) => o.russian) : options.map((o) => String(o.digit)),
    correctIndex: options.indexOf(correct),
    isDigitPrompt: showDigit,
  };
}

export default function NumbersScreen() {
  const { colors } = useAppTheme();
  const [qIdx, setQIdx] = useState(0);
  const [question, setQuestion] = useState(() => buildQ());
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const isComplete = qIdx >= TOTAL;

  const handleSelect = useCallback((idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === question.correctIndex) setScore((s) => ({ ...s, correct: s.correct + 1 }));
    else setScore((s) => ({ ...s, wrong: s.wrong + 1 }));
  }, [selected, question]);

  const handleNext = useCallback(() => {
    setSelected(null);
    setQIdx((i) => { if (i + 1 < TOTAL) setQuestion(buildQ()); return i + 1; });
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader title={isComplete ? 'Complete' : `Numbers ${qIdx + 1} / ${TOTAL}`} eyebrow="Counting in Russian" onBack={safeGoBack} />

      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 80 }}>
        {isComplete ? (
          <MobileSurface padding={28}>
            <Text style={{ fontSize: 32, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
              {score.correct} / {TOTAL}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
              {score.correct >= TOTAL * 0.8 ? 'Great counting!' : 'Keep practicing numbers.'}
            </Text>
          </MobileSurface>
        ) : (
          <MobileSurface padding={28}>
            <Text style={{ fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>
              {question.promptLabel}
            </Text>
            <Text style={{ fontSize: 56, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: 16 }}>
              {question.prompt}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 28 }}>
              {question.options.map((opt, i) => {
                const isCorrect = i === question.correctIndex;
                const isSelected = i === selected;
                let bg = colors.cardAlt;
                let border = colors.cardBorder;
                if (selected !== null) {
                  if (isCorrect) { bg = colors.status.success + '20'; border = colors.status.success; }
                  else if (isSelected) { bg = colors.status.error + '20'; border = colors.status.error; }
                }
                return (
                  <Pressable key={i} disabled={selected !== null} onPress={() => handleSelect(i)}
                    style={{ paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, borderWidth: 2, borderColor: border, backgroundColor: bg, minWidth: 90, alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>

            {selected !== null ? (
              <View style={{ marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: (selected === question.correctIndex ? colors.status.success : colors.status.error) + '15' }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: selected === question.correctIndex ? colors.status.success : colors.status.error, textAlign: 'center' }}>
                  {question.correct.digit} = {question.correct.russian}
                </Text>
              </View>
            ) : null}
          </MobileSurface>
        )}
      </ScrollView>

      {selected !== null && !isComplete ? (
        <MobileActionFooter>
          <MobilePrimaryButton variant="primary" onPress={handleNext}>Next</MobilePrimaryButton>
        </MobileActionFooter>
      ) : isComplete ? (
        <MobileActionFooter>
          <MobilePrimaryButton variant="primary" onPress={() => { setQIdx(0); setScore({ correct: 0, wrong: 0 }); setQuestion(buildQ()); setSelected(null); }}>Again</MobilePrimaryButton>
        </MobileActionFooter>
      ) : null}
    </SafeAreaView>
  );
}
