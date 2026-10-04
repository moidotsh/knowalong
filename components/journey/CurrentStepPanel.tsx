// components/journey/CurrentStepPanel.tsx
//
// "Where you are" — the current step's panel. Sits in the right column
// of wide desktops and as a card at the top of phones (brief §5.4: the
// current-step panel is visible within the first screenful, ≤420px from
// the top on phones).

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../context';
import { theme } from '../../constants';
import { MobilePrimaryButton, Pressable } from '../MobilePremium';
import type { StepView } from '../../utils/journey';
import { LABEL_TRACKING } from './tokens';

export interface CurrentStepPanelProps {
  view: StepView;
  chapterTitle: string;
  /** Navigates to the session for the step's next plan. */
  onStart: (planId: string) => void;
  /** Navigates to the step's media in the Collection (when it has one). */
  onOpenMedia?: () => void;
  mediaTitle?: string | null;
}

export function CurrentStepPanel({
  view,
  chapterTitle,
  onStart,
  onOpenMedia,
  mediaTitle,
}: CurrentStepPanelProps) {
  const { colors } = useAppTheme();
  const fonts = theme.fonts;
  const score = colors.score;
  const resume = view.resumePlanId != null;
  const planId = view.nextPlanId;

  return (
    <View style={[styles.card, { backgroundColor: score.paper, borderColor: score.rule }]}>
      <View style={styles.eyebrowRow}>
        <View style={[styles.eyebrowDot, { backgroundColor: score.accent }]} />
        <Text style={[styles.eyebrow, { color: score.accent }]}>Now</Text>
      </View>
      <Text style={[styles.chapterLabel, { color: score.inkTertiary }]}>{chapterTitle}</Text>
      <Text
        style={[styles.title, { color: score.ink, fontFamily: fonts.serif }]}
        accessibilityRole="header"
      >
        {view.step.title}
      </Text>
      <Text style={[styles.purpose, { color: score.inkSecondary }]}>{view.step.purpose}</Text>

      <Text style={[styles.sessionLedger, { color: score.inkTertiary }]}>
        Session {view.nextPlanIndex} of {view.planCount}
        {mediaTitle && view.step.mediaId ? ` · from ${mediaTitle}` : ''}
      </Text>

      {planId != null && (
        <MobilePrimaryButton onPress={() => onStart(planId)} variant="primary">
          {resume ? 'Resume session' : 'Start session'}
        </MobilePrimaryButton>
      )}

      {onOpenMedia && view.step.mediaId != null ? <Pressable
          onPress={onOpenMedia}
          accessibilityRole="link"
          accessibilityLabel={`Open ${mediaTitle ?? 'the passage'} in your collection`}
          style={({ pressed }) => [styles.mediaLink, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.mediaLinkText, { color: score.accentDeep }]}>
            Open the passage in your collection →
          </Text>
        </Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
  } as const,
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 } as const,
  eyebrowDot: { width: 6, height: 6, borderRadius: 3 } as const,
  eyebrow: {
    fontSize: 12,
    letterSpacing: LABEL_TRACKING,
    textTransform: 'uppercase',
    fontWeight: '700',
  } as const,
  chapterLabel: {
    fontSize: 12,
    letterSpacing: LABEL_TRACKING,
    textTransform: 'uppercase',
    marginTop: 10,
    fontWeight: '600',
  } as const,
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700', marginTop: 4 } as const,
  purpose: { fontSize: 15, lineHeight: 22, marginTop: 8 } as const,
  sessionLedger: {
    fontSize: 11,
    letterSpacing: LABEL_TRACKING / 2,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 14,
    fontWeight: '600',
  } as const,
  mediaLink: { marginTop: 12, alignSelf: 'flex-start' } as const,
  mediaLinkText: { fontSize: 14, fontWeight: '600' } as const,
});

export default CurrentStepPanel;
