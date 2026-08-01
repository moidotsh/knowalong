// app/daily.tsx
// Daily challenge — 5 phrases selected from the gradient, timed.
// A quick high-intensity burst. Prototype: shuffles 5 items from the
// fixture + reuses the chip-builder pattern inline.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobilePrimaryButton, MobileActionFooter } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import { LEARNING_ITEMS, ROLE_COLOR_KEYS, type WordRole, type LearningItem } from '../utils/knowalong/fixtures/learningItems';
import { ITEM_ICONS } from '../utils/knowalong/icons';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';
import { ConfettiEffect } from '../components/Celebration/ConfettiEffect';

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DAILY_ITEMS = shuffle(LEARNING_ITEMS).slice(0, 5);
const CHALLENGE_SECONDS = 120;

export default function DailyChallengeScreen() {
  const { colors } = useAppTheme();
  const [index, setIndex] = useState(0);
  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, mistakes: 0 });
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_SECONDS);
  const [showConfetti, setShowConfetti] = useState(false);
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const item = DAILY_ITEMS[index];
  const total = DAILY_ITEMS.length;
  const isComplete = index >= total;
  const isTimeUp = timeLeft <= 0;
  const isOver = isComplete || isTimeUp;
  const isSolved = item && placedIds.length === item.words.length;

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleTapWord = useCallback((wordIdx: number) => {
    if (isSolved || !item) return;
    const expected = item.words[placedIds.length];
    if (wordIdx === placedIds.length) {
      setPlacedIds((prev) => [...prev, `${wordIdx}`]);
      if (placedIds.length + 1 === item.words.length) setScore((s) => ({ ...s, correct: s.correct + 1 }));
    } else {
      setWrongId(`${wordIdx}`);
      setScore((s) => ({ ...s, mistakes: s.mistakes + 1 }));
      if (wrongTimer.current) clearTimeout(wrongTimer.current);
      wrongTimer.current = setTimeout(() => setWrongId(null), 600);
    }
  }, [isSolved, item, placedIds.length]);

  const handleContinue = useCallback(() => {
    setPlacedIds([]);
    setWrongId(null);
    setIndex((i) => {
      if (i + 1 >= total) {
        setShowConfetti(true);
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeout(() => setShowConfetti(false), 3500);
      }
      return i + 1;
    });
  }, [total]);

  const handleRestart = useCallback(() => {
    setIndex(0); setPlacedIds([]); setWrongId(null);
    setScore({ correct: 0, mistakes: 0 });
    setTimeLeft(CHALLENGE_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
  }, []);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  const timeColor = timeLeft <= 30 ? colors.status.error : timeLeft <= 60 ? colors.status.warning : colors.textSecondary;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader
        title={isOver ? 'Challenge complete' : `Daily · ${index + 1}/${total}`}
        eyebrow="⚡ Speed Round"
        onBack={safeGoBack}
      />

      {!isOver ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: timeColor }}>{timeStr}</Text>
          <View style={{ height: 4, flex: 1, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.15)' }}>
            <View style={{ height: '100%', width: `${(timeLeft / CHALLENGE_SECONDS) * 100}%`, backgroundColor: timeColor, borderRadius: 2 }} />
          </View>
        </View>
      ) : null}

      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8 }}>
        {isOver || !item ? (
          <MobileSurface padding={24}>
            <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 8 }}>{isTimeUp && !isComplete ? '⏰' : '🎉'}</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
              {score.correct} / {total} correct
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
              {isTimeUp && !isComplete ? 'Time ran out! ' : ''}{score.mistakes} mistake{score.mistakes === 1 ? '' : 's'}. Time: {CHALLENGE_SECONDS - timeLeft}s.
            </Text>
          </MobileSurface>
        ) : (
          <MobileSurface padding={20}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <ConceptIcon name={ITEM_ICONS[item.id] ?? 'star'} size={40} color={colors.brand} />
            </View>
            <Text style={{ fontSize: 13, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>
              Build: {item.meaning}
            </Text>

            {/* Slots */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16, marginBottom: 16 }}>
              {item.words.map((_, slotIdx) => {
                const isFilled = slotIdx < placedIds.length;
                return (
                  <View key={slotIdx} style={{
                    width: 70, height: 50, borderRadius: 10,
                    borderWidth: 2, borderStyle: isFilled ? 'solid' : 'dashed',
                    borderColor: isFilled ? colors.brand + '60' : colors.cardBorder,
                    backgroundColor: isFilled ? colors.brand + '10' : 'transparent',
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    {isFilled ? (
                      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{item.words[slotIdx].form}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>

            {/* Shuffled words */}
            {!isSolved ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {shuffle(item.words.map((w, i) => ({ ...w, originalIdx: i }))).map((w, displayIdx) => {
                  const isPlaced = placedIds.includes(`${w.originalIdx}`);
                  const isWrong = wrongId === `${w.originalIdx}`;
                  const rc = ROLE_COLOR_KEYS[w.role] === 'brand' ? colors.brand : colors.status[ROLE_COLOR_KEYS[w.role] as 'success' | 'warning'];
                  return (
                    <Pressable
                      key={displayIdx}
                      disabled={isPlaced}
                      onPress={() => handleTapWord(w.originalIdx)}
                      style={{
                        paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10,
                        borderWidth: 2, borderLeftWidth: 4, borderLeftColor: rc,
                        borderColor: isWrong ? colors.status.error : colors.cardBorder,
                        backgroundColor: isWrong ? colors.status.error + '20' : isPlaced ? colors.cardAlt + '60' : colors.cardAlt,
                        opacity: isPlaced ? 0.3 : 1, minWidth: 70, alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{w.form}</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>{w.gloss}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={{ padding: 14, borderRadius: 12, backgroundColor: colors.status.success + '15' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.status.success, textAlign: 'center' }}>✓ {item.surfaceForm}</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 2, fontStyle: 'italic' }}>{item.transliteration}</Text>
              </View>
            )}
          </MobileSurface>
        )}
      </ScrollView>

      <ConfettiEffect visible={showConfetti} intensity="intense" />

      {!isOver && isSolved ? (
        <MobileActionFooter>
          <MobilePrimaryButton variant="primary" onPress={handleContinue}>Next</MobilePrimaryButton>
        </MobileActionFooter>
      ) : isOver ? (
        <MobileActionFooter>
          <MobilePrimaryButton variant="primary" onPress={handleRestart}>Try again</MobilePrimaryButton>
        </MobileActionFooter>
      ) : null}
    </SafeAreaView>
  );
}
