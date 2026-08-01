// app/alphabet.tsx
// Cyrillic alphabet practice — letter recognition for day-1 learners who
// can't read Russian yet. Shows a Cyrillic letter, learner picks its
// sound/name from 4 options. Two modes: letters → sounds, sounds → letters.

import React, { useState, useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobilePrimaryButton, MobileActionFooter } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';

interface LetterInfo {
  letter: string;
  sound: string;
  example: string;
  exampleWord: string;
}

const ALPHABET: LetterInfo[] = [
  { letter: 'я', sound: 'ya', example: 'like "ya" in "yard"', exampleWord: 'я (I)' },
  { letter: 'и', sound: 'ee', example: 'like "ee" in "see"', exampleWord: 'идти (to go)' },
  { letter: 'в', sound: 'v', example: 'like "v" in "very"', exampleWord: 'вижу (I see)' },
  { letter: 'ж', sound: 'zh', example: 'like "s" in "pleasure"', exampleWord: 'живу (I live)' },
  { letter: 'н', sound: 'n', example: 'like "n" in "no"', exampleWord: 'не (not)' },
  { letter: 'р', sound: 'r (rolled)', example: 'rolled "r"', exampleWord: 'Россия (Russia)' },
  { letter: 'т', sound: 't', example: 'like "t" in "top"', exampleWord: 'тут (here)' },
  { letter: 'м', sound: 'm', example: 'like "m" in "man"', exampleWord: 'море (sea)' },
  { letter: 'х', sound: 'kh', example: 'like "ch" in "Bach"', exampleWord: 'хочу (I want)' },
  { letter: 'з', sound: 'z', example: 'like "z" in "zoo"', exampleWord: 'знаю (I know)' },
  { letter: 'ы', sound: 'ɨ', example: 'a sound between "i" and "u"', exampleWord: 'ты (you)' },
  { letter: 'ц', sound: 'ts', example: 'like "ts" in "cats"', exampleWord: 'целый (whole)' },
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

function buildQuestion(mode: 'letter-to-sound' | 'sound-to-letter') {
  const correct = shuffle(ALPHABET)[0];
  const distractors = shuffle(ALPHABET.filter((a) => a.letter !== correct.letter)).slice(0, 3);
  const options = shuffle([correct, ...distractors]);
  return {
    mode,
    correct,
    prompt: mode === 'letter-to-sound' ? correct.letter : correct.sound,
    promptLabel: mode === 'letter-to-sound' ? 'Which sound does this letter make?' : 'Which letter makes this sound?',
    options: mode === 'letter-to-sound' ? options.map((o) => o.sound) : options.map((o) => o.letter),
    correctIndex: mode === 'letter-to-sound' ? options.indexOf(correct) : options.indexOf(correct),
  };
}

export default function AlphabetScreen() {
  const { colors } = useAppTheme();
  const [qIndex, setQIndex] = useState(0);
  const [question, setQuestion] = useState(() => buildQuestion(qIndex % 2 === 0 ? 'letter-to-sound' : 'sound-to-letter'));
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const isComplete = qIndex >= TOTAL;

  const handleSelect = useCallback((idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === question.correctIndex) setScore((s) => ({ ...s, correct: s.correct + 1 }));
    else setScore((s) => ({ ...s, wrong: s.wrong + 1 }));
  }, [selected, question]);

  const handleNext = useCallback(() => {
    setSelected(null);
    setQIndex((i) => {
      const next = i + 1;
      if (next < TOTAL) setQuestion(buildQuestion(next % 2 === 0 ? 'letter-to-sound' : 'sound-to-letter'));
      return next;
    });
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader title={isComplete ? 'Complete' : `Alphabet ${qIndex + 1} / ${TOTAL}`} eyebrow="Cyrillic" onBack={safeGoBack} />

      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 80 }}>
        {isComplete ? (
          <MobileSurface padding={28}>
            <Text style={{ fontSize: 32, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
              {score.correct} / {TOTAL}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
              {score.correct >= TOTAL * 0.8 ? 'Great recognition!' : 'Keep practicing the alphabet.'}
            </Text>
          </MobileSurface>
        ) : (
          <MobileSurface padding={28}>
            <Text style={{ fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>
              {question.promptLabel}
            </Text>
            <Text style={{
              fontSize: 56, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: 16,
              fontFamily: question.mode === 'sound-to-letter' ? 'monospace' : 'normal',
            }}>
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
                    style={{ paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, borderWidth: 2, borderColor: border, backgroundColor: bg, minWidth: 80, alignItems: 'center' }}>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, fontFamily: question.mode === 'letter-to-sound' ? 'monospace' : 'normal' }}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>

            {selected !== null ? (
              <View style={{ marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: (selected === question.correctIndex ? colors.status.success : colors.status.error) + '15' }}>
                <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
                  {question.correct.letter} = {question.correct.sound} — {question.correct.example}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 4, fontStyle: 'italic' }}>
                  e.g. {question.correct.exampleWord}
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
          <MobilePrimaryButton variant="primary" onPress={() => { setQIndex(0); setScore({ correct: 0, wrong: 0 }); setQuestion(buildQuestion('letter-to-sound')); setSelected(null); }}>Again</MobilePrimaryButton>
        </MobileActionFooter>
      ) : null}
    </SafeAreaView>
  );
}
