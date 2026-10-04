// app/onboarding.tsx
// First-time intro: pick language → set daily goal → learn first phrase.
// A 3-step wizard that gets the learner studying immediately.

import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader, MobilePrimaryButton, MobileActionFooter, MobileStepper } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { navigateToHome, navigateToStudy } from '../navigation';
import { SCREEN_BODY_STYLE, theme } from '../constants';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';

const LANGUAGES = [
  { code: 'ru', name: 'Russian', flag: '🇷🇺', sample: 'я' },
  { code: 'fr', name: 'French', flag: '🇫🇷', sample: 'je' },
  { code: 'fa', name: 'Persian', flag: '🇮🇷', sample: 'من' },
];

const DAILY_GOALS = [
  { cards: 5, label: 'Casual', desc: '5 phrases · ~5 min' },
  { cards: 10, label: 'Regular', desc: '10 phrases · ~10 min' },
  { cards: 20, label: 'Serious', desc: '20 phrases · ~20 min' },
];

export default function OnboardingScreen() {
  const { colors } = useAppTheme();
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState('ru');
  const [goal, setGoal] = useState(10);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="auth" />
      <MobileHeader title="Welcome to KnowAlong" eyebrow={`Step ${step + 1} of 3`} />

      <View style={[SCREEN_BODY_STYLE, { paddingHorizontal: 20, paddingTop: 20 }]}>
        {step === 0 ? (
          <MobileSurface padding={24}>
            <Text style={{ ...theme.typography.mobileItemTitle, fontSize: 24, lineHeight: 30, fontFamily: theme.fonts.display, color: colors.text, textAlign: 'center', marginBottom: 8 }}>
              What do you want to learn?
            </Text>
            <Text style={{ ...theme.typography.mobileBody, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
              Pick your target language. You can add more later.
            </Text>
            {LANGUAGES.map((l) => (
              <Pressable
                key={l.code}
                onPress={() => setLang(l.code)}
                accessibilityRole="radio"
                accessibilityState={{ selected: lang === l.code }}
                accessibilityLabel={`Learn ${l.name}`}
                style={({ pressed }) => [{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  padding: 16, borderRadius: 14, borderWidth: 2, marginBottom: 10,
                  borderColor: lang === l.code ? colors.brand : colors.cardBorder,
                  backgroundColor: lang === l.code ? colors.brand + '10' : colors.cardAlt,
                  opacity: pressed ? 0.7 : 1,
                }]}
              >
                <Text style={{ fontSize: 32 }}>{l.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...theme.typography.mobileItemTitle, fontSize: 17, lineHeight: 22, color: colors.text }}>{l.name}</Text>
                  <Text style={{ ...theme.typography.mobileBody, color: colors.textMuted }}>{l.sample}</Text>
                </View>
                {lang === l.code ? <ConceptIcon name="check" size={24} color={colors.brand} /> : null}
              </Pressable>
            ))}
          </MobileSurface>
        ) : step === 1 ? (
          <MobileSurface padding={24}>
            <Text style={{ ...theme.typography.mobileItemTitle, fontSize: 24, lineHeight: 30, fontFamily: theme.fonts.display, color: colors.text, textAlign: 'center', marginBottom: 8 }}>
              What's your daily goal?
            </Text>
            <Text style={{ ...theme.typography.mobileBody, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
              Build a streak by studying consistently.
            </Text>
            {DAILY_GOALS.map((g) => (
              <Pressable
                key={g.cards}
                onPress={() => setGoal(g.cards)}
                accessibilityRole="radio"
                accessibilityState={{ selected: goal === g.cards }}
                accessibilityLabel={`${g.label} — ${g.desc}`}
                style={({ pressed }) => [{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  padding: 16, borderRadius: 14, borderWidth: 2, marginBottom: 10,
                  borderColor: goal === g.cards ? colors.brand : colors.cardBorder,
                  backgroundColor: goal === g.cards ? colors.brand + '10' : colors.cardAlt,
                  opacity: pressed ? 0.7 : 1,
                }]}
              >
                <View>
                  <Text style={{ ...theme.typography.mobileItemTitle, fontSize: 17, lineHeight: 22, color: colors.text }}>{g.label}</Text>
                  <Text style={{ ...theme.typography.mobileLedger, fontSize: 12, lineHeight: 16, color: colors.textMuted }}>{g.desc}</Text>
                </View>
                {goal === g.cards ? <ConceptIcon name="check" size={24} color={colors.brand} /> : null}
              </Pressable>
            ))}
          </MobileSurface>
        ) : (
          <MobileSurface padding={24}>
            <View style={{ alignItems: 'center' }}>
              <ConceptIcon name="user" size={56} color={colors.brand} />
            </View>
            <Text style={{ ...theme.typography.mobileItemTitle, fontSize: 24, lineHeight: 30, fontFamily: theme.fonts.display, color: colors.text, textAlign: 'center', marginTop: 16 }}>
              Your first word: я
            </Text>
            <Text style={{ fontSize: 56, lineHeight: 60, fontWeight: '700', fontFamily: theme.fonts.display, color: colors.text, textAlign: 'center', marginTop: 12 }}>
              я
            </Text>
            <Text style={{ ...theme.typography.mobileBody, color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>
              "ya" — it means "I"
            </Text>
            <Text style={{ ...theme.typography.mobileBody, fontSize: 13, lineHeight: 19, color: colors.textMuted, textAlign: 'center', marginTop: 12 }}>
              That's it. Every Russian sentence starts here. Tap "Start learning" to build your first phrase.
            </Text>
          </MobileSurface>
        )}
      </View>

      <MobileActionFooter>
        {step < 2 ? (
          <MobilePrimaryButton variant="primary" onPress={() => setStep((s) => s + 1)}>Continue</MobilePrimaryButton>
        ) : (
          <>
            <MobilePrimaryButton variant="primary" onPress={() => navigateToStudy()}>Start learning</MobilePrimaryButton>
            <MobilePrimaryButton variant="ghost" onPress={() => navigateToHome()}>Skip for now</MobilePrimaryButton>
          </>
        )}
      </MobileActionFooter>
    </SafeAreaView>
  );
}
