// app/listen.tsx
// Listening practice — sound discrimination. Shows IPA/transliteration as
// the "audio" (prototype: no TTS yet), learner picks which Cyrillic word
// matches. Trains the ear to connect sounds to letters.
//
// Night Metro register: the phonetic prompt rides the ledger face (PT Mono
// — IPA and transliteration are pronunciation facts), options are signage.

import React, { useState, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobilePrimaryButton, MobileActionFooter } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack } from '../navigation';
import { SCREEN_BODY_STYLE, theme } from '../constants';
import { LEARNING_ITEMS } from '../utils/knowalong/fixtures/learningItems';

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface ListenRound {
  prompt: string;
  promptType: 'ipa' | 'translit';
  correct: string;
  options: string[];
}

function buildRound(): ListenRound {
  const items = shuffle(LEARNING_ITEMS).slice(0, 4);
  const correct = items[0];
  const useIPA = Math.random() > 0.5 && correct.ipa;
  const prompt = useIPA ? correct.ipa! : correct.transliteration;
  return {
    prompt,
    promptType: useIPA ? 'ipa' : 'translit',
    correct: correct.surfaceForm,
    options: shuffle(items.map((i) => i.surfaceForm)),
  };
}

const TOTAL_ROUNDS = 8;

export default function ListenScreen() {
  const { colors } = useAppTheme();
  const [round, setRound] = useState<ListenRound>(() => buildRound());
  const [roundIdx, setRoundIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const isComplete = roundIdx >= TOTAL_ROUNDS;

  const handleSelect = useCallback((option: string) => {
    if (selected) return;
    setSelected(option);
    if (option === round.correct) setScore((s) => ({ ...s, correct: s.correct + 1 }));
    else setScore((s) => ({ ...s, wrong: s.wrong + 1 }));
  }, [selected, round]);

  const handleNext = useCallback(() => {
    setSelected(null);
    setRoundIdx((i) => i + 1);
    if (roundIdx + 1 < TOTAL_ROUNDS) setRound(buildRound());
  }, [roundIdx]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader title={isComplete ? 'Complete' : `Listen ${roundIdx + 1} / ${TOTAL_ROUNDS}`} eyebrow="Sound discrimination" onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 80 }}>
        {isComplete ? (
          <MobileSurface padding={28}>
            <Text style={[styles.scoreFigure, { color: colors.text }]}>
              {score.correct}/{TOTAL_ROUNDS}
            </Text>
            <Text style={[styles.verdict, { color: colors.textSecondary }]}>
              {score.correct >= TOTAL_ROUNDS * 0.8 ? 'Great ear!' : 'Keep practicing — Russian sounds take time.'}
            </Text>
          </MobileSurface>
        ) : (
          <MobileSurface padding={28}>
            <Text style={[styles.promptLabel, { color: colors.textMuted }]}>
              {round.promptType === 'ipa' ? 'Which word is /…/?' : 'Which word sounds like…?'}
            </Text>
            <Text style={[styles.phoneticPrompt, { color: colors.brand }]}>{round.prompt}</Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>Tap the matching Cyrillic word</Text>

            <View style={styles.optionsRow}>
              {round.options.map((opt) => {
                const isCorrect = opt === round.correct;
                const isSelected = opt === selected;
                let bg = colors.cardAlt;
                let border = colors.cardBorder;
                if (selected) {
                  if (isCorrect) { bg = colors.status.success + '20'; border = colors.status.success; }
                  else if (isSelected) { bg = colors.status.error + '20'; border = colors.status.error; }
                }
                return (
                  <Pressable
                    key={opt}
                    disabled={!!selected}
                    onPress={() => handleSelect(opt)}
                    accessibilityRole="button"
                    accessibilityLabel={opt}
                    style={({ pressed }) => [
                      styles.optionChip,
                      { borderColor: border, backgroundColor: bg, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={[styles.optionText, { color: colors.text }]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>

            {selected ? (
              <View style={{ marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: (selected === round.correct ? colors.status.success : colors.status.error) + '15' }}>
                <Text
                  style={[
                    styles.feedback,
                    { color: selected === round.correct ? colors.status.success : colors.status.error },
                  ]}
                >
                  {selected === round.correct ? '✓ Correct!' : `✗ It's "${round.correct}"`}
                </Text>
              </View>
            ) : null}
          </MobileSurface>
        )}
      </ScrollView>
      {selected && !isComplete ? (
        <MobileActionFooter>
          <MobilePrimaryButton variant="primary" onPress={handleNext}>Next</MobilePrimaryButton>
        </MobileActionFooter>
      ) : isComplete ? (
        <MobileActionFooter>
          <MobilePrimaryButton variant="primary" onPress={() => { setRoundIdx(0); setScore({ correct: 0, wrong: 0 }); setRound(buildRound()); }}>Again</MobilePrimaryButton>
        </MobileActionFooter>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Session score — the working figure, display face at accuracy register.
  scoreFigure: {
    ...theme.typography.mobileFigure,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1,
    textAlign: 'center',
    marginBottom: 8,
  },
  verdict: { ...theme.typography.mobileBody, textAlign: 'center' },
  promptLabel: { ...theme.typography.mobileEyebrow, textTransform: 'uppercase', textAlign: 'center' },
  // IPA / transliteration — the pronunciation ledger. PT Mono carries both
  // (the old inline 'monospace' family never resolved on native).
  phoneticPrompt: {
    fontSize: 38,
    fontWeight: '700',
    lineHeight: 46,
    textAlign: 'center',
    marginTop: 12,
    fontFamily: theme.fonts.mono,
  },
  hint: { ...theme.typography.mobileLedger, textAlign: 'center', marginTop: 8 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 24 },
  optionChip: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 100,
    alignItems: 'center',
  },
  optionText: { fontSize: 20, fontWeight: '700', lineHeight: 26, fontFamily: theme.fonts.display },
  feedback: { ...theme.typography.mobileItemTitle, fontSize: 16, textAlign: 'center' },
});
