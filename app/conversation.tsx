// app/conversation.tsx
// Conversation practice — the step FROM passive building TO active use.
// The app asks a question in Russian; the learner assembles their answer
// from chips. Prototype: a fixed set of Q&A pairs derived from the
// learning items.

import React, { useState, useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobilePrimaryButton, MobileActionFooter } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import { LEARNING_ITEMS, ROLE_COLOR_KEYS, type WordRole } from '../utils/knowalong/fixtures/learningItems';
import { ConfettiEffect } from '../components/Celebration/ConfettiEffect';

interface ConversationTurn {
  id: string;
  question: { ru: string; en: string };
  answer: { ru: string; en: string };
  answerWords: Array<{ form: string; gloss: string; role: WordRole }>;
}

const TURNS: ConversationTurn[] = [
  {
    id: '1',
    question: { ru: 'Что ты видишь?', en: 'What do you see?' },
    answer: { ru: 'Я вижу море.', en: 'I see the sea.' },
    answerWords: [
      { form: 'я', gloss: 'I', role: 'pronoun' },
      { form: 'вижу', gloss: 'see', role: 'verb' },
      { form: 'море', gloss: 'sea', role: 'noun' },
    ],
  },
  {
    id: '2',
    question: { ru: 'Что ты хочешь?', en: 'What do you want?' },
    answer: { ru: 'Я хочу чай.', en: 'I want tea.' },
    answerWords: [
      { form: 'я', gloss: 'I', role: 'pronoun' },
      { form: 'хочу', gloss: 'want', role: 'verb' },
      { form: 'чай', gloss: 'tea', role: 'noun' },
    ],
  },
  {
    id: '3',
    question: { ru: 'Где ты живёшь?', en: 'Where do you live?' },
    answer: { ru: 'Я живу здесь.', en: 'I live here.' },
    answerWords: [
      { form: 'я', gloss: 'I', role: 'pronoun' },
      { form: 'живу', gloss: 'live', role: 'verb' },
    ],
  },
];

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ConversationScreen() {
  const { colors } = useAppTheme();
  const [turnIndex, setTurnIndex] = useState(0);
  const [placedCount, setPlacedCount] = useState(0);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const turn = TURNS[turnIndex];
  const isComplete = turnIndex >= TURNS.length;
  const isSolved = placedCount === turn?.answerWords.length;

  // Distractors from other items
  const distractors = shuffle(LEARNING_ITEMS.flatMap((i) => i.words))
    .filter((w) => !turn?.answerWords.some((aw) => aw.form === w.form))
    .slice(0, 3);
  const allChips = shuffle([...(turn?.answerWords ?? []), ...distractors]);

  const handleTap = useCallback((chipIdx: number) => {
    if (isSolved) return;
    const chip = allChips[chipIdx];
    const expected = turn.answerWords[placedCount];
    if (chip.form === expected.form) {
      setPlacedCount((c) => c + 1);
      if (placedCount + 1 === turn.answerWords.length) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2500);
      }
    } else {
      setWrongIdx(chipIdx);
      setTimeout(() => setWrongIdx(null), 600);
    }
  }, [isSolved, allChips, turn, placedCount]);

  if (isComplete) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
        <MobileAtmosphere surface="analytics" />
        <MobileHeader title="Conversation complete" onBack={safeGoBack} />
        <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 40 }}>
          <MobileSurface padding={24}>
            <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>✓</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
              {TURNS.length} conversations completed
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
              You answered real questions in Russian!
            </Text>
          </MobileSurface>
        </ScrollView>
        <MobileActionFooter>
          <MobilePrimaryButton variant="primary" onPress={() => { setTurnIndex(0); setPlacedCount(0); }}>Again</MobilePrimaryButton>
        </MobileActionFooter>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader title={`Conversation ${turnIndex + 1} / ${TURNS.length}`} eyebrow="Practice" onBack={safeGoBack} />

      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12 }}>
        {/* Question */}
        <MobileSurface padding={20}>
          <Text style={{ fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            They ask:
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 8 }}>
            {turn.question.ru}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' }}>
            {turn.question.en}
          </Text>
        </MobileSurface>

        {/* Answer area */}
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Your answer:
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {turn.answerWords.map((_, slotIdx) => {
              const filled = slotIdx < placedCount;
              const w = turn.answerWords[slotIdx];
              const rc = ROLE_COLOR_KEYS[w.role] === 'brand' ? colors.brand : colors.status[ROLE_COLOR_KEYS[w.role] as 'success' | 'warning'];
              return (
                <View key={slotIdx} style={{
                  paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10,
                  borderWidth: 2, borderLeftWidth: 4, borderLeftColor: rc,
                  borderColor: filled ? rc + '40' : colors.cardBorder,
                  backgroundColor: filled ? rc + '12' : 'transparent',
                  minWidth: 70, alignItems: 'center',
                  borderStyle: filled ? 'solid' : 'dashed',
                }}>
                  {filled ? (
                    <>
                      <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{w.form}</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>{w.gloss}</Text>
                    </>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        {/* Chip bank */}
        {!isSolved ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20 }}>
            {allChips.map((chip, i) => {
              const isUsed = (() => {
                let used = 0;
                for (let j = 0; j < placedCount; j++) {
                  if (turn.answerWords[j].form === chip.form) used++;
                }
                // Count how many of this chip's form appear before this index
                let beforeThis = 0;
                for (let j = 0; j < i; j++) {
                  if (allChips[j].form === chip.form) beforeThis++;
                }
                return beforeThis < used;
              })();
              if (isUsed) return null;
              const rc = ROLE_COLOR_KEYS[chip.role] === 'brand' ? colors.brand : colors.status[ROLE_COLOR_KEYS[chip.role] as 'success' | 'warning'];
              const isWrong = wrongIdx === i;
              return (
                <Pressable
                  key={i}
                  onPress={() => handleTap(i)}
                  style={{
                    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10,
                    borderWidth: 2, borderLeftWidth: 4, borderLeftColor: rc,
                    borderColor: isWrong ? colors.status.error : colors.cardBorder,
                    backgroundColor: isWrong ? colors.status.error + '20' : colors.cardAlt,
                    minWidth: 70, alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{chip.form}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{chip.gloss}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={{ marginTop: 20, padding: 16, borderRadius: 12, backgroundColor: colors.status.success + '15' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.status.success, textAlign: 'center' }}>
              ✓ {turn.answer.ru}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>
              {turn.answer.en}
            </Text>
          </View>
        )}
      </ScrollView>

      <ConfettiEffect visible={showConfetti} intensity="normal" />

      {isSolved ? (
        <MobileActionFooter>
          <MobilePrimaryButton variant="primary" onPress={() => {
            setPlacedCount(0);
            setWrongIdx(null);
            setTurnIndex((i) => i + 1);
          }}>
            {turnIndex + 1 >= TURNS.length ? 'See results' : 'Next question'}
          </MobilePrimaryButton>
        </MobileActionFooter>
      ) : null}
    </SafeAreaView>
  );
}
