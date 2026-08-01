// app/match.tsx
// Speed match — rapid-fire pairing. 4 Russian words on the left, 4 English
// meanings on the right. Tap a word, tap its meaning → if correct, both
// disappear. Clear all 4 to advance. Timed for competitiveness.

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobilePrimaryButton, MobileActionFooter } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import { LEARNING_ITEMS } from '../utils/knowalong/fixtures/learningItems';

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PAIR_COUNT = 4;
const TOTAL_ROUNDS = 5;

function buildRound() {
  const items = shuffle(LEARNING_ITEMS).slice(0, PAIR_COUNT);
  return {
    pairs: items.map((i) => ({ surfaceForm: i.surfaceForm, meaning: i.meaning, id: i.id })),
    leftOrder: shuffle(items.map((i) => i.surfaceForm)),
    rightOrder: shuffle(items.map((i) => i.meaning)),
  };
}

export default function MatchScreen() {
  const { colors } = useAppTheme();
  const [roundIdx, setRoundIdx] = useState(0);
  const [roundData, setRoundData] = useState(() => buildRound());
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrongPair, setWrongPair] = useState<{ left: string; right: string } | null>(null);
  const [score, setScore] = useState({ correct: 0, mistakes: 0 });
  const [time, setTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isComplete = roundIdx >= TOTAL_ROUNDS;
  const roundDone = matched.length === PAIR_COUNT;

  useEffect(() => {
    timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleLeftTap = useCallback((word: string) => {
    if (matched.includes(word)) return;
    setSelectedLeft(word);
  }, [matched]);

  const handleRightTap = useCallback((meaning: string) => {
    if (!selectedLeft || matched.includes(selectedLeft)) return;
    const isCorrect = roundData.pairs.find((p) => p.surfaceForm === selectedLeft)?.meaning === meaning;
    if (isCorrect) {
      setMatched((m) => [...m, selectedLeft]);
      setSelectedLeft(null);
      setScore((s) => ({ ...s, correct: s.correct + 1 }));
    } else {
      setWrongPair({ left: selectedLeft, right: meaning });
      setScore((s) => ({ ...s, mistakes: s.mistakes + 1 }));
      setTimeout(() => { setWrongPair(null); setSelectedLeft(null); }, 600);
    }
  }, [selectedLeft, matched, roundData]);

  const handleNextRound = useCallback(() => {
    setMatched([]);
    setSelectedLeft(null);
    setRoundIdx((i) => i + 1);
    if (roundIdx + 1 < TOTAL_ROUNDS) setRoundData(buildRound());
  }, [roundIdx]);

  const mins = Math.floor(time / 60);
  const secs = time % 60;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader title={isComplete ? 'Complete' : `Match ${roundIdx + 1} / ${TOTAL_ROUNDS}`} eyebrow="Speed round" onBack={safeGoBack} />
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.brand }}>{mins}:{secs.toString().padStart(2, '0')}</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted }}>·</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>{matched.length}/{PAIR_COUNT} matched</Text>
      </View>

      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 80 }}>
        {isComplete ? (
          <MobileSurface padding={28}>
            <Text style={{ fontSize: 32, fontWeight: '700', color: colors.text, textAlign: 'center' }}>{score.correct} matched</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
              {score.mistakes} mistakes · {mins}:{secs.toString().padStart(2, '0')} total
            </Text>
          </MobileSurface>
        ) : (
          <MobileSurface padding={20}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              {/* Left column: Russian */}
              <View style={{ flex: 1, gap: 10 }}>
                {roundData.leftOrder.map((word) => {
                  const isMatched = matched.includes(word);
                  const isSelected = selectedLeft === word;
                  const isWrong = wrongPair?.left === word;
                  return (
                    <Pressable key={word} disabled={isMatched} onPress={() => handleLeftTap(word)}
                      style={{
                        paddingVertical: 14, borderRadius: 12, borderWidth: 2, alignItems: 'center',
                        borderColor: isWrong ? colors.status.error : isSelected ? colors.brand : colors.cardBorder,
                        backgroundColor: isMatched ? colors.status.success + '15' : isWrong ? colors.status.error + '15' : isSelected ? colors.brand + '12' : colors.cardAlt,
                        opacity: isMatched ? 0.3 : 1,
                      }}>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, opacity: isMatched ? 0.4 : 1 }}>{word}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Right column: English */}
              <View style={{ flex: 1, gap: 10 }}>
                {roundData.rightOrder.map((meaning) => {
                  const matchingWord = roundData.pairs.find((p) => p.meaning === meaning)?.surfaceForm;
                  const isMatched = matchingWord ? matched.includes(matchingWord) : false;
                  const isWrong = wrongPair?.right === meaning;
                  return (
                    <Pressable key={meaning} disabled={isMatched || !selectedLeft} onPress={() => handleRightTap(meaning)}
                      style={{
                        paddingVertical: 14, borderRadius: 12, borderWidth: 2, alignItems: 'center',
                        borderColor: isWrong ? colors.status.error : isMatched ? colors.status.success : colors.cardBorder,
                        backgroundColor: isMatched ? colors.status.success + '15' : isWrong ? colors.status.error + '15' : colors.cardAlt,
                        opacity: isMatched ? 0.3 : 1,
                      }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, opacity: isMatched ? 0.4 : 1 }}>{meaning}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {roundDone ? (
              <View style={{ marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: colors.status.success + '15' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.status.success, textAlign: 'center' }}>✓ All matched!</Text>
              </View>
            ) : null}
          </MobileSurface>
        )}
      </ScrollView>

      {roundDone && !isComplete ? (
        <MobileActionFooter>
          <MobilePrimaryButton variant="primary" onPress={handleNextRound}>Next round</MobilePrimaryButton>
        </MobileActionFooter>
      ) : isComplete ? (
        <MobileActionFooter>
          <MobilePrimaryButton variant="primary" onPress={() => { setRoundIdx(0); setScore({ correct: 0, mistakes: 0 }); setTime(0); setRoundData(buildRound()); setMatched([]); }}>Again</MobilePrimaryButton>
        </MobileActionFooter>
      ) : null}
    </SafeAreaView>
  );
}
