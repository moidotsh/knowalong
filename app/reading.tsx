// app/reading.tsx
// Sentence reading — passive input mode. Shows a complete Russian sentence
// using learned phrases. The learner taps any word to see its meaning
// (tooltip-style). Different from chip-builder (active production) — this
// is comprehension.

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobilePrimaryButton, MobileActionFooter } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';
import { LEARNING_ITEMS, type LearningItem } from '../utils/knowalong/fixtures/learningItems';
import { ITEM_ICONS } from '../utils/knowalong/icons';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';

interface ReadingPassage {
  title: string;
  emoji: string;
  sentences: Array<{
    words: Array<{ text: string; gloss?: string; conceptId?: string }>;
    translation: string;
  }>;
}

const PASSAGES: ReadingPassage[] = [
  {
    title: 'A Day at the Sea',
    emoji: '🌊',
    sentences: [
      {
        words: [
          { text: 'Я', gloss: 'I', conceptId: '1' },
          { text: 'вижу', gloss: 'see', conceptId: '2' },
          { text: 'море', gloss: 'sea', conceptId: '9' },
          { text: '.', gloss: '.' },
        ],
        translation: 'I see the sea.',
      },
      {
        words: [
          { text: 'Мне', gloss: 'to me', conceptId: '7' },
          { text: 'нравится', gloss: 'is pleasing', conceptId: '7' },
          { text: 'этот', gloss: 'this' },
          { text: 'мир', gloss: 'world' },
          { text: '.', gloss: '.' },
        ],
        translation: 'I like this world.',
      },
      {
        words: [
          { text: 'Я', gloss: 'I', conceptId: '1' },
          { text: 'хочу', gloss: 'want', conceptId: '4' },
          { text: 'жить', gloss: 'to live', conceptId: '6' },
          { text: 'здесь', gloss: 'here' },
          { text: '.', gloss: '.' },
        ],
        translation: 'I want to live here.',
      },
    ],
  },
  {
    title: 'Morning Routine',
    emoji: '🍵',
    sentences: [
      {
        words: [
          { text: 'Я', gloss: 'I', conceptId: '1' },
          { text: 'не', gloss: 'not', conceptId: '8' },
          { text: 'знаю', gloss: 'know', conceptId: '3' },
          { text: ',', gloss: ',' },
          { text: 'куда', gloss: 'where' },
          { text: 'иду', gloss: 'I go', conceptId: '5' },
          { text: '.', gloss: '.' },
        ],
        translation: "I don't know where I'm going.",
      },
      {
        words: [
          { text: 'Но', gloss: 'but' },
          { text: 'я', gloss: 'I', conceptId: '1' },
          { text: 'хочу', gloss: 'want', conceptId: '4' },
          { text: 'чай', gloss: 'tea', conceptId: '10' },
          { text: '.', gloss: '.' },
        ],
        translation: 'But I want tea.',
      },
    ],
  },
];

export default function ReadingScreen() {
  const { colors } = useAppTheme();
  const [passageIdx, setPassageIdx] = useState(0);
  const [tappedWord, setTappedWord] = useState<string | null>(null);
  const [tappedGloss, setTappedGloss] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);

  const passage = PASSAGES[passageIdx];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title={passage.title} eyebrow={`Reading ${passageIdx + 1} / ${PASSAGES.length}`} onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 80 }}>

        <MobileSurface padding={24}>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16, textAlign: 'center' }}>
            Tap any word to see its meaning.
          </Text>

          {passage.sentences.map((sentence, sIdx) => (
            <View key={sIdx} style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 22, lineHeight: 36, color: colors.text }}>
                {sentence.words.map((word, wIdx) => (
                  <Text key={wIdx}>
                    <Text
                      style={{
                        color: word.gloss && word.gloss !== '.' && word.gloss !== ',' ? colors.text : colors.textMuted,
                        backgroundColor: tappedWord === `${sIdx}-${wIdx}` ? colors.brand + '20' : 'transparent',
                        fontWeight: tappedWord === `${sIdx}-${wIdx}` ? '700' : '400',
                      }}
                      onPress={() => {
                        if (word.gloss && word.gloss !== '.' && word.gloss !== ',') {
                          setTappedWord(`${sIdx}-${wIdx}`);
                          setTappedGloss(word.gloss);
                        }
                      }}
                    >
                      {word.text}{' '}
                    </Text>
                  </Text>
                ))}
              </Text>
              {showTranslation ? (
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' }}>
                  {sentence.translation}
                </Text>
              ) : null}
            </View>
          ))}
        </MobileSurface>

        {/* Tapped word gloss */}
        {tappedGloss ? (
          <View style={{ marginTop: 8 }}>
            <MobileSurface padding={14}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ConceptIcon name="check" size={20} color={colors.brand} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{tappedGloss}</Text>
              </View>
            </MobileSurface>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Pressable onPress={() => setShowTranslation(!showTranslation)} style={{ flex: 1 }}>
            <MobileSurface padding={12}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.brand, textAlign: 'center' }}>
                {showTranslation ? 'Hide translations' : 'Show translations'}
              </Text>
            </MobileSurface>
          </Pressable>
        </View>

      </ScrollView>

      <MobileActionFooter>
        {passageIdx + 1 < PASSAGES.length ? (
          <MobilePrimaryButton variant="primary" onPress={() => { setPassageIdx((i) => i + 1); setTappedWord(null); setTappedGloss(null); setShowTranslation(false); }}>
            Next passage
          </MobilePrimaryButton>
        ) : (
          <MobilePrimaryButton variant="primary" onPress={() => { setPassageIdx(0); setTappedWord(null); setTappedGloss(null); setShowTranslation(false); }}>
            Start over
          </MobilePrimaryButton>
        )}
      </MobileActionFooter>
    </SafeAreaView>
  );
}
