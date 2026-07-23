// components/MobilePremium/Wizard.tsx
//
// Thin composition helper for multi-step forms / flows. Assembles the four
// canonical wizard regions from existing primitives:
//
//   ┌──────────────────────────────────────┐
//   │ MobileStepRail                       │  ← progress (current/total)
//   ├──────────────────────────────────────┤
//   │ step.eyebrow (optional)              │  ← step eyebrow
//   │ step.title                           │  ← step title
//   │ <Crossfade index={step.id}>          │  ← step content (transition)
//   │   step.content                         │
//   │ </Crossfade>                          │
//   ├──────────────────────────────────────┤
//   │ MobileActionFooter                    │  ← Back + Continue
//   │   progressText="Step X of Y"          │
//   └──────────────────────────────────────┘
//
// The wizard is CONTROLLED — the caller owns currentStep. There is no
// internal state machine, no routing, no persistence, no onboarding domain
// model. The caller decides what onBack / onContinue do (typically state
// updates + conditional navigation). The wizard renders whatever step is
// at steps[currentStep].
//
// Direction inference: the wizard tracks the previous currentStep in a ref
// and forwards 'forward' / 'backward' to Crossfade so the slide direction
// matches the user's intent.
//
// Why no MobileHeader here: the consumer's screen typically wraps the
// wizard in its own MobileHeader (with onBack being a screen-level nav
// back, distinct from the wizard's Back which goes to the previous step).
// Embedding MobileHeader here would force a second header. Consumers who
// want the header inside the wizard can compose it themselves and skip
// this primitive.

import React, { useRef } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme, MOBILE_CONTENT_WIDTH_STYLE } from '../../constants';
import { useAppTheme } from '../../context';
import { Crossfade } from '../premium/shared';
import { MobileStepRail } from './MobileStepRail';
import { MobileActionFooter } from './MobileActionFooter';
import type { MobilePrimaryButtonProps } from './MobilePrimaryButton';

export interface WizardStep {
  /** Stable id for the step (used as the Crossfade key). */
  id: string;
  /** Optional small uppercase eyebrow above the title. */
  eyebrow?: string;
  /** Optional step title. */
  title?: string;
  /** Step content. Consumer-owned — typically a form region. */
  content: React.ReactNode;
}

export interface WizardProps {
  /** Ordered list of steps. */
  steps: readonly WizardStep[];
  /** Active step index (0-indexed). CONTROLLED — caller owns this. */
  currentStep: number;
  /** Back handler. Caller typically decrements; first-step handling is the caller's responsibility. */
  onBack: () => void;
  /** Continue handler. Caller typically increments; on the last step, caller typically finalizes. */
  onContinue: () => void;
  /** Disable Continue (e.g. while a step's input is invalid). Default true. */
  canContinue?: boolean;
  /** Override the Continue label (default "Continue"; "Finish" on the last step). */
  continueLabel?: string;
  /** Override the Back label (default "Back"). */
  backLabel?: string;
  /** Override the brand accent color. */
  accentColor?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const EYEBROW_STYLE = {
  fontSize: theme.typography.mobileEyebrow.fontSize,
  fontWeight: theme.typography.mobileEyebrow.fontWeight as any,
  lineHeight: theme.typography.mobileEyebrow.lineHeight,
  letterSpacing: theme.typography.mobileEyebrow.letterSpacing,
} as const;

const TITLE_STYLE = {
  fontSize: theme.typography.mobileTitle.fontSize,
  fontWeight: theme.typography.mobileTitle.fontWeight as any,
  lineHeight: theme.typography.mobileTitle.lineHeight,
  letterSpacing: theme.typography.mobileTitle.letterSpacing,
} as const;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function Wizard({
  steps,
  currentStep,
  onBack,
  onContinue,
  canContinue = true,
  continueLabel,
  backLabel = 'Back',
  accentColor,
  testID,
  style,
}: WizardProps) {
  const { colors } = useAppTheme();
  const total = steps.length;
  const prevStepRef = useRef(currentStep);
  // Track the previous step on each render so Crossfade direction is correct.
  const prevStep = prevStepRef.current;
  if (prevStep !== currentStep) {
    prevStepRef.current = currentStep;
  }

  if (total === 0) {
    return null;
  }

  const safeStep = clamp(currentStep, 0, total - 1);
  const isFirst = safeStep === 0;
  const isLast = safeStep === total - 1;
  const activeStep = steps[safeStep];

  const direction: 'forward' | 'backward' =
    safeStep >= prevStep ? 'forward' : 'backward';

  const primary: MobilePrimaryButtonProps = {
    children: continueLabel ?? (isLast ? 'Finish' : 'Continue'),
    onPress: onContinue,
    disabled: !canContinue,
    accentColor,
  };

  return (
    <View testID={testID} style={[styles.shell, style]}>
      <MobileStepRail
        current={safeStep}
        total={total}
        accentColor={accentColor}
      />

      <View style={styles.headerArea}>
        {activeStep.eyebrow ? (
          <Text style={[EYEBROW_STYLE, { color: colors.textSecondary }]}>
            {activeStep.eyebrow}
          </Text>
        ) : null}
        {activeStep.title ? (
          <Text
            style={[
              TITLE_STYLE,
              { color: colors.text, marginTop: activeStep.eyebrow ? 4 : 0 },
            ]}
          >
            {activeStep.title}
          </Text>
        ) : null}
      </View>

      <View style={styles.contentArea}>
        <Crossfade index={activeStep.id} direction={direction}>
          {activeStep.content}
        </Crossfade>
      </View>

      <MobileActionFooter
        primary={primary}
        secondaryLabel={isFirst ? undefined : backLabel}
        onSecondary={isFirst ? undefined : onBack}
        progressText={`Step ${safeStep + 1} of ${total}`}
        accentColor={accentColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    ...MOBILE_CONTENT_WIDTH_STYLE,
    flexDirection: 'column',
  },
  headerArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  contentArea: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flex: 1,
  },
});

export default Wizard;
