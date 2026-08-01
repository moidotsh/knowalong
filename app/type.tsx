// app/type.tsx
// Typing practice — pure recall + spelling. Show the English meaning,
// the learner TYPES the Russian. Prototype: compare against the surface
// form + transliteration (accept either). Hardest mode — no chips to
// pick from, no ordering hint.

import React, { useState, useCallback } from 'react';
import { ScrollView, Text, View, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobilePrimaryButton, MobileActionFooter } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import { LEARNING_ITEMS } from '../utils/knowalong/fixtures/learningItems';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';
import { ITEM_ICONS } from '../utils/knowalong/icons';

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ITEMS = shuffle(LEARNING_ITEMS).slice(0, 8);

export default function TypeScreen() {
  const { colors } = useAppTheme();
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState<null | 'correct' | 'wrong'>(null);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });

  const item = ITEMS[index];
  const isComplete = index >= ITEMS.length;

  const handleCheck = useCallback(() => {
    if (!item || !input.trim()) return;
    const normalized = input.trim().toLowerCase();
    const target = item.surfaceForm.toLowerCase();
    const translit = item.transliteration.toLowerCase().replace(/['']/g, '');
    const isCorrect = normalized === target || normalized === translit;
    setChecked(isCorrect ? 'correct' : 'wrong');
    setScore((s) => ({ ...s, [isCorrect ? 'correct' : 'wrong']: s[isCorrect ? 'correct' : 'wrong'] + 1 }));
  }, [item, input]);

  const handleNext = useCallback(() => {
    setInput('');
    setChecked(null);
    setIndex((i) => i + 1);
  }, []);

  if (isComplete) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
        <MobileAtmosphere surface="analytics" />
        <MobileHeader title="Complete" onBack={safeGoBack} />
        <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 40 }}>
          <MobileSurface padding={28}>
            <Text style={{ fontSize: 32, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
              {score.correct} / {ITEMS.length}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
              {score.correct === ITEMS.length ? 'Flawless spelling!' : `${score.wrong} to review.`}
            </Text>
          </MobileSurface>
        </ScrollView>
        <MobileActionFooter>
          <MobilePrimaryButton variant="primary" onPress={() => { setIndex(0); setScore({ correct: 0, wrong: 0 }); }}>Again</MobilePrimaryButton>
        </MobileActionFooter>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />
      <MobileHeader title={`Type ${index + 1} / ${ITEMS.length}`} eyebrow="Spelling practice" onBack={safeGoBack} />
      <View style={{ height: 4, backgroundColor: 'rgba(128,128,128,0.15)', marginHorizontal: 16 }}>
        <View style={{ height: '100%', width: `${(index / ITEMS.length) * 100}%`, backgroundColor: colors.brand, borderRadius: 2 }} />
      </View>

      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24 }}>
        <MobileSurface padding={28}>
          <Text style={{ fontSize: 13, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>
            Type this in Russian:
          </Text>
          {ITEM_ICONS[item.id] ? (
            <View style={{ alignItems: 'center', marginTop: 12 }}><ConceptIcon name={ITEM_ICONS[item.id]} size={40} color={colors.brand} /></View>
          ) : null}
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: 12 }}>
            {item.meaning}
          </Text>

          {/* Input */}
          <TextInput
            value={input}
            onChangeText={setInput}
            editable={!checked}
            placeholder="Type the Russian..."
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              marginTop: 24, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12,
              borderWidth: 2,
              borderColor: checked === 'correct' ? colors.status.success : checked === 'wrong' ? colors.status.error : colors.cardBorder,
              backgroundColor: colors.cardAlt,
              fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center',
            }}
          />

          {/* Result */}
          {checked === 'correct' ? (
            <View style={{ marginTop: 12, padding: 14, borderRadius: 12, backgroundColor: colors.status.success + '15' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.status.success, textAlign: 'center' }}>✓ Correct!</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>
                {item.surfaceForm} · {item.transliteration}
              </Text>
            </View>
          ) : checked === 'wrong' ? (
            <View style={{ marginTop: 12, padding: 14, borderRadius: 12, backgroundColor: colors.status.error + '15' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.status.error, textAlign: 'center' }}>✗ "{item.surfaceForm}"</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 4, fontStyle: 'italic' }}>
                {item.transliteration}
              </Text>
            </View>
          ) : null}

          {/* Hint */}
          {!checked ? (
            <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 12 }}>
              Accepts Cyrillic or transliteration
            </Text>
          ) : null}
        </MobileSurface>
      </ScrollView>

      <MobileActionFooter>
        {!checked ? (
          <MobilePrimaryButton variant="primary" onPress={handleCheck}>Check answer</MobilePrimaryButton>
        ) : (
          <MobilePrimaryButton variant="primary" onPress={handleNext}>Next</MobilePrimaryButton>
        )}
      </MobileActionFooter>
    </SafeAreaView>
  );
}
