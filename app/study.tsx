// app/study.tsx
// KnowAlong "Build" interaction — the learner assembles Russian phrases from
// word chips. Each chip shows BOTH the Russian word AND its English gloss +
// is color-coded by grammatical role (pronoun=blue, verb=green, noun=orange,
// particle=gray). The learner taps chips in the correct ORDER to build the
// phrase — actively learning word order + decomposition (not just ordering
// opaque tokens like Duolingo).
//
// Compositional gradient: "я" → "я вижу" → "я вижу море" (not isolated
// infinitives). Each phrase BUILDS on earlier ones.

import React, { useState, useCallback, useRef } from 'react';
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
import {
  buildQuiz,
  ROLE_COLOR_KEYS,
  type BuildQuestion,
  type WordChip,
  type WordRole,
} from '../utils/knowalong/fixtures/learningItems';

function roleColor(colors: ReturnType<typeof useAppTheme>['colors'], role: WordRole): string {
  const key = ROLE_COLOR_KEYS[role];
  if (key === 'brand') return colors.brand;
  if (key === 'textMuted') return colors.textMuted;
  return colors.status[key as 'success' | 'warning'];
}

export default function StudyScreen() {
  const { colors } = useAppTheme();
  const [questions] = useState<BuildQuestion[]>(() => buildQuiz());
  const [index, setIndex] = useState(0);
  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, mistakes: 0 });
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const question = questions[index];
  const total = questions.length;
  const isComplete = index >= total;
  const isSolved = question && placedIds.length === question.slotCount;

  const handleTapChip = useCallback((chip: WordChip) => {
    if (isSolved || placedIds.includes(chip.id)) return;
    if (chip.isCorrect && chip.correctPosition === placedIds.length) {
      setPlacedIds((prev) => [...prev, chip.id]);
      if (placedIds.length + 1 === question!.slotCount) {
        setScore((s) => ({ ...s, correct: s.correct + (wrongId ? 0 : 1) }));
      }
    } else {
      setWrongId(chip.id);
      setScore((s) => ({ ...s, mistakes: s.mistakes + 1 }));
      if (wrongTimer.current) clearTimeout(wrongTimer.current);
      wrongTimer.current = setTimeout(() => setWrongId(null), 600);
    }
  }, [isSolved, placedIds, question, wrongId]);

  const handleContinue = useCallback(() => {
    setPlacedIds([]);
    setWrongId(null);
    setIndex((i) => i + 1);
  }, []);

  const handleRestart = useCallback(() => {
    setIndex(0);
    setPlacedIds([]);
    setWrongId(null);
    setScore({ correct: 0, mistakes: 0 });
  }, []);

  const progress = total > 0 ? ((index + (isSolved ? 1 : 0)) / total) * 100 : 0;
  const placedChips = question ? placedIds
    .map((id) => question.chips.find((c) => c.id === id))
    .filter((c): c is WordChip => c !== undefined) : [];
  const availableChips = question ? question.chips.filter((c) => !placedIds.includes(c.id)) : [];

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: colors.backgroundDeep }]} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader
        title={isComplete ? 'Lesson complete' : `Build ${index + 1} / ${total}`}
        eyebrow="Learn Russian"
        onBack={safeGoBack}
      />

      {!isComplete ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: colors.brand }]} />
        </View>
      ) : null}

      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.bodyContent}>
        {isComplete || !question ? (
          <MobileSurface padding={24}>
            <Text style={[styles.completeTitle, { color: colors.text }]}>
              {score.correct} / {total} built correctly
            </Text>
            <Text style={[styles.completeBody, { color: colors.textSecondary }]}>
              {score.mistakes === 0
                ? 'Flawless! No mistakes — every phrase built first try.'
                : `${score.mistakes} mistake${score.mistakes === 1 ? '' : 's'} along the way. Try again to go flawless.`}
            </Text>
          </MobileSurface>
        ) : (
          <MobileSurface padding={20}>
            {/* Prompt */}
            <Text style={[styles.promptLabel, { color: colors.textMuted }]}>
              Build this in Russian:
            </Text>
            {question.item.emoji ? (
              <Text style={styles.promptEmoji}>{question.item.emoji}</Text>
            ) : null}
            <Text style={[styles.prompt, { color: colors.text }]}>
              {question.prompt}
            </Text>

            {/* Answer slots */}
            <View style={styles.slotsRow}>
              {Array.from({ length: question.slotCount }).map((_, slotIdx) => {
                const chip = placedChips[slotIdx];
                if (chip) {
                  const rc = roleColor(colors, chip.role);
                  return (
                    <View key={slotIdx} style={[styles.slotFilled, { borderLeftColor: rc, backgroundColor: rc + '12' }]}>
                      <Text style={[styles.chipForm, { color: colors.text }]}>{chip.form}</Text>
                      <Text style={[styles.chipGloss, { color: colors.textMuted }]}>{chip.gloss}</Text>
                    </View>
                  );
                }
                return (
                  <View key={slotIdx} style={[styles.slotEmpty, { borderColor: colors.cardBorder }]} />
                );
              })}
            </View>

            {/* Solved feedback */}
            {isSolved ? (
              <View style={[styles.solvedBox, { backgroundColor: colors.status.success + '15' }]}>
                <Text style={[styles.solvedTitle, { color: colors.status.success }]}>
                  ✓ {question.item.surfaceForm}
                </Text>
                <Text style={[styles.solvedTranslit, { color: colors.textSecondary }]}>
                  {question.item.transliteration}
                </Text>
                {question.item.note ? (
                  <Text style={[styles.solvedNote, { color: colors.textSecondary }]}>
                    {question.item.note}
                  </Text>
                ) : null}
                {question.item.contextSentence ? (
                  <View style={[styles.contextBox, { borderColor: colors.cardBorder }]}>
                    <Text style={[styles.contextRu, { color: colors.text }]}>
                      {question.item.contextSentence.ru}
                    </Text>
                    <Text style={[styles.contextEn, { color: colors.textSecondary }]}>
                      {question.item.contextSentence.en}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Construction intro (for non-obvious mappings) */}
            {!isSolved && question.item.construction ? (
              <View style={[styles.constructionBox, { backgroundColor: colors.brand + '10', borderColor: colors.brand + '30' }]}>
                <Text style={[styles.constructionIntro, { color: colors.text }]}>
                  {question.item.construction.intro}
                </Text>
                <View style={styles.constructionBreakdown}>
                  {question.item.construction.breakdown.map((part, i) => (
                    <View key={i} style={styles.breakdownRow}>
                      <Text style={[styles.breakdownForm, { color: colors.brand }]}>
                        {part.form}
                      </Text>
                      <Text style={[styles.breakdownArrow, { color: colors.textMuted }]}>
                        =
                      </Text>
                      <Text style={[styles.breakdownLiteral, { color: colors.text }]}>
                        {part.literal}
                      </Text>
                      <Text style={[styles.breakdownNote, { color: colors.textMuted }]}>
                        ({part.note})
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Chip bank */}
            {!isSolved ? (
              <View style={styles.chipBank}>
                <View style={styles.chipBankRow}>
                  {availableChips.map((chip) => {
                    const rc = roleColor(colors, chip.role);
                    const isWrong = wrongId === chip.id;
                    return (
                      <Pressable
                        key={chip.id}
                        onPress={() => handleTapChip(chip)}
                        style={[
                          styles.chip,
                          {
                            borderLeftColor: rc,
                            backgroundColor: isWrong ? colors.status.error + '20' : colors.cardAlt,
                            borderColor: isWrong ? colors.status.error : colors.cardBorder,
                          },
                        ]}
                      >
                        <Text style={[styles.chipForm, { color: colors.text }]}>{chip.form}</Text>
                        <Text style={[styles.chipGloss, { color: colors.textMuted }]}>{chip.gloss}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Legend */}
            {!isSolved ? (
              <View style={styles.legend}>
                {(['pronoun', 'verb', 'noun', 'particle'] as WordRole[]).map((role) => (
                  <View key={role} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: roleColor(colors, role) }]} />
                    <Text style={[styles.legendText, { color: colors.textMuted }]}>{role}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </MobileSurface>
        )}
      </ScrollView>

      {!isComplete && question ? (
        <MobileActionFooter>
          {isSolved ? (
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
  bodyContent: { padding: 16 },
  promptLabel: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  prompt: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  promptEmoji: { fontSize: 48, textAlign: 'center', marginBottom: 4 },
  slotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 },
  slotFilled: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderLeftWidth: 4, minWidth: 70, alignItems: 'center' },
  slotEmpty: { width: 70, height: 56, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed' },
  chipForm: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  chipGloss: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  chipBank: { marginTop: 8 },
  chipBankRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 2, borderLeftWidth: 4, minWidth: 70, alignItems: 'center' },
  solvedBox: { marginTop: 16, padding: 16, borderRadius: 12 },
  solvedTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  solvedTranslit: { fontSize: 14, textAlign: 'center', fontStyle: 'italic', marginTop: 4 },
  solvedNote: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, textTransform: 'capitalize' },
  completeTitle: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  completeBody: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  constructionBox: { marginTop: 12, marginBottom: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  constructionIntro: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  constructionBreakdown: { gap: 6 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  breakdownForm: { fontSize: 16, fontWeight: '700' },
  breakdownArrow: { fontSize: 14 },
  breakdownLiteral: { fontSize: 14, fontWeight: '500' },
  breakdownNote: { fontSize: 12, fontStyle: 'italic' },
  contextBox: { marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  contextRu: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  contextEn: { fontSize: 13, textAlign: 'center', marginTop: 4, fontStyle: 'italic' },
});
