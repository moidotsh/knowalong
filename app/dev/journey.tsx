// app/dev/journey.tsx
//
// Dev-only scenario picker (brief §14) — loads a named demo state and
// jumps to the Journey. Each scenario is a real store state, not a
// mockup: applying one rewrites the persisted demo progress exactly as
// a learner would have earned it. Linked from dev surfaces only.

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MobileAtmosphere,
  MobileHeader,
  MobilePrimaryButton,
  MobileSectionEyebrow,
  MobileSurface,
} from '../../components/MobilePremium';
import { useAppTheme } from '../../context';
import { safeGoBack, switchToJourney } from '../../navigation';
import { SCREEN_BODY_STYLE, theme } from '../../constants';
import { JOURNEY_SCENARIOS, useJourneyStore, type JourneyScenario } from '../../stores';

/** Plain-language description of what each scenario sets up. */
const SCENARIO_NOTES: Record<JourneyScenario, string> = {
  returning: 'A learner a few steps in — City lights partly done, review still ahead.',
  fresh: 'First visit. Onboarding not yet done, so the welcome doors show.',
  'review-due': 'свет and вижу are past their refresh day — the review offer is live.',
  'resumed-session': 'A session pinned mid-step — resume from where it left off.',
  'completed-chapter': 'Chapters 01–02 finished; Beyond the passage is current.',
  preparing: 'A pasted draft mid-preparation, with stage labels counting up.',
  partial: 'A pasted draft whose lines only partly matched the fixture.',
  error: 'A draft whose preparation failed — retry is offered, nothing faked.',
  offline: 'Offline simulation on — new preparation will fail honestly.',
  'no-audio': 'Audio simulation off — the honest "no audio available" state.',
  'demo-purchase': 'Northern platform already entitled — Chapter 04 unlocked.',
};

export default function DevJourneyScreen() {
  const { colors } = useAppTheme();
  const store = useJourneyStore();
  const score = colors.score;
  const fonts = theme.fonts;

  const applyScenario = (scenario: JourneyScenario) => {
    store.applyScenario(scenario);
    switchToJourney();
  };

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: colors.backgroundDeep }]}
      edges={['top', 'bottom']}
    >
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title="Journey scenarios" eyebrow="Dev" onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.bodyContent}>
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          Each scenario rewrites the persisted demo state — the same fields a
          real learner would fill by practicing. Demo content: no account, no
          charge, nothing leaves this device.
        </Text>
        <View style={{ height: 14 }} />

        <MobileSectionEyebrow>Scenarios</MobileSectionEyebrow>
        <MobileSurface padding={6}>
          {JOURNEY_SCENARIOS.map((scenario) => {
            const current = store.scenario === scenario;
            return (
              <Pressable
                key={scenario}
                onPress={() => applyScenario(scenario)}
                accessibilityRole="button"
                accessibilityLabel={`Load scenario: ${scenario}`}
                style={[
                  styles.row,
                  current && { backgroundColor: score.accentWash },
                ]}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: score.ink }]}>
                    {scenario}
                    {current ? '  ·loaded' : ''}
                  </Text>
                  <Text style={[styles.rowNote, { color: score.inkSecondary }]}>
                    {SCENARIO_NOTES[scenario]}
                  </Text>
                </View>
                <Text style={[styles.rowChevron, { color: score.accent }]}>→</Text>
              </Pressable>
            );
          })}
        </MobileSurface>

        <View style={{ height: 16 }} />
        <MobileSectionEyebrow>Reset</MobileSectionEyebrow>
        <MobileSurface padding={14}>
          <Text style={[styles.note, { color: colors.textSecondary, marginBottom: 10 }]}>
            Return the demo to the default returning learner. Pinned sessions,
            purchases, and drafts all reset with it.
          </Text>
          <MobilePrimaryButton
            variant="ghost"
            onPress={() => applyScenario('returning')}
          >
            Reset demo
          </MobilePrimaryButton>
        </MobileSurface>

        <View style={{ height: 12 }} />
        <Text style={[styles.footNote, { color: score.inkTertiary, fontFamily: fonts.serif }]}>
          Scenario data is content-derived and honest — no simulated
          completions you did not walk through.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 80,
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
  },
  rowText: {
    flex: 1,
    paddingRight: 10,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  rowNote: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  rowChevron: {
    fontSize: 15,
    fontWeight: '600',
  },
  footNote: {
    fontSize: 12.5,
    lineHeight: 17,
    textAlign: 'center',
  },
});
