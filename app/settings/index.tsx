// app/settings/index.tsx
// Settings list. Arqavellum ships the cross-cutting settings rows every
// consumer needs (account identity, theme toggle, sign-out). Domain
// settings (e.g. notification preferences, training config) land in
// consumer-extended surfaces.

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sun, Moon, Monitor, Check } from '@tamagui/lucide-icons-2';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobileSectionEyebrow,
  MobileSettingsRow,
  MobileActionFooter,
  MobilePrimaryButton,
} from '../../components/MobilePremium';
import { useAuth, useAppTheme, type ColorSchemePreference } from '../../context';
import {
  navigateToPremiumShowcase,
  navigateToKnowAlongDemo,
  navigateToCompanionSettings,
} from '../../navigation';
import { SCREEN_BODY_STYLE } from '../../constants';
import { CompanionStatusChip } from '../../components/knowalong';

const PREFERENCE_LABELS: Record<ColorSchemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

const PREFERENCE_ORDER: ColorSchemePreference[] = ['light', 'dark', 'system'];

function PreferenceIcon({ pref, color }: { pref: ColorSchemePreference; color: string }) {
  const size = 18;
  switch (pref) {
    case 'light':
      return <Sun size={size} color={color} />;
    case 'dark':
      return <Moon size={size} color={color} />;
    case 'system':
      return <Monitor size={size} color={color} />;
  }
}

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const { preference, setPreference, colorScheme, colors } = useAppTheme();
  const accent = colors.brand;

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: colors.backgroundDeep }]}
      edges={['top', 'bottom']}
    >
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title="Settings" eyebrow="Account" />
      <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent}>
        <MobileSurface padding={0}>
          <MobileSettingsRow label="Email" value={session?.email ?? '—'} />
          <MobileSettingsRow
            label="Resolved theme"
            value={colorScheme === 'dark' ? 'Dark' : 'Light'}
            isLast
          />
        </MobileSurface>

        <MobileSectionEyebrow>Local analysis</MobileSectionEyebrow>
        <MobileSurface padding={0}>
          <Pressable
            onPress={navigateToCompanionSettings}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.companionRow,
              { borderBottomColor: colors.mobilePremium.hairlineBorder },
              pressed ? { opacity: 0.6 } : null,
            ]}
          >
            <View style={styles.companionRowText}>
              <Text style={[styles.companionRowLabel, { color: colors.text }]}>
                Local companion
              </Text>
              <Text style={[styles.companionRowValue, { color: colors.textSecondary }]}>
                Optional. Paste a token from your local companion to enable
                source analysis and CLCC generation.
              </Text>
            </View>
            <CompanionStatusChip />
          </Pressable>
        </MobileSurface>

        <MobileSectionEyebrow>Appearance</MobileSectionEyebrow>
        <MobileSurface padding={0}>
          {PREFERENCE_ORDER.map((pref, i) => {
            const isActive = preference === pref;
            return (
              <Pressable
                key={pref}
                onPress={() => setPreference(pref)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
                style={({ pressed }) => [
                  styles.preferenceRow,
                  i === PREFERENCE_ORDER.length - 1
                    ? null
                    : {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.mobilePremium.hairlineBorder,
                      },
                  pressed ? { opacity: 0.6 } : null,
                ]}
              >
                <View style={[styles.preferenceIconBox, { backgroundColor: `${accent}10` }]}>
                  <PreferenceIcon pref={pref} color={accent} />
                </View>
                <Text style={[styles.preferenceLabel, { color: colors.text }]}>
                  {PREFERENCE_LABELS[pref]}
                </Text>
                <View
                  style={[
                    styles.preferenceRadio,
                    {
                      borderColor: isActive ? accent : colors.border,
                      backgroundColor: isActive ? accent : 'transparent',
                    },
                  ]}
                >
                  {isActive ? (
                    <Check size={12} color={colors.textOnBrand} strokeWidth={3} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </MobileSurface>

        <MobileSectionEyebrow>Privacy & data</MobileSectionEyebrow>
        <MobileSurface padding={14}>
          <Text style={[styles.privacyTitle, { color: colors.text }]}>
            Your library is private
          </Text>
          <Text style={[styles.privacyBody, { color: colors.textSecondary }]}>
            Only content you paste in lives here. Nothing is shared, published,
            or discoverable. Source text is preserved exactly as you provided it;
            translations and analysis are generated and always labelled.
          </Text>
        </MobileSurface>

        <MobileSectionEyebrow>Reference</MobileSectionEyebrow>
        <MobileSurface padding={0}>
          <MobileSettingsRow
            label="Design System Showcase"
            value="View"
            onPress={navigateToPremiumShowcase}
          />
          <MobileSettingsRow
            label="KnowAlong Demo"
            value="View"
            onPress={navigateToKnowAlongDemo}
          />
          <MobileSettingsRow label="Version" value="0.1.0" isLast />
        </MobileSurface>
      </ScrollView>
      <MobileActionFooter>
        <MobilePrimaryButton onPress={() => void signOut()}>Sign out</MobilePrimaryButton>
      </MobileActionFooter>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  bodyScroll: {
    ...SCREEN_BODY_STYLE,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 60,
  },
  companionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 64,
  },
  companionRowText: {
    flex: 1,
  },
  companionRowLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  companionRowValue: {
    fontSize: 12,
    lineHeight: 16,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 56,
    gap: 12,
  },
  preferenceIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferenceLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  preferenceRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  privacyBody: {
    fontSize: 13,
    lineHeight: 19,
  },
});
