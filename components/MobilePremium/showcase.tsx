// components/MobilePremium/showcase.tsx
// The design-system showcase. Renders every MobilePremium primitive, plus
// all 7 atmosphere palettes side-by-side, plus demos of the cross-cutting
// Tier 1 + Tier 2 surface (Toast, animation hooks, theme switching). This
// is the most important screen in arqavellum — it's how a consumer sees what
// they're starting from. Visit /dev/premium to see it.
//
// The showcase IS the visual source of truth. If a primitive isn't here,
// it doesn't exist as far as consumers can tell.
//
// The theme is read via `useAppTheme()` — the showcase reacts live to
// light/dark/system preferences. Use the Theme selector at the top to
// flip the whole surface.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sun, Moon, Monitor, Mail, Lock, Eye, EyeOff, Settings, Bell, Info, ChevronRight, Home, Package, TrendingUp, Menu, Search } from '@tamagui/lucide-icons-2';
import { theme, APP_LAYOUT, SCREEN_BODY_STYLE } from '../../constants';
import { useAppTheme, useToast, type ColorSchemePreference } from '../../context';
import {
  useFadeIn,
  useScaleIn,
  usePopIn,
  useAnimatedCounter,
  useShake,
  useTranslateY,
  useContainerVariant,
} from '../../hooks';
// Direct imports from each primitive file (not the barrel). The
// showcase is intentionally NOT re-exported by the MobilePremium
// barrel (see that file's note + docs/contributing.md), so going
// through the barrel here is no longer a cycle — these direct
// imports remain preferable for tree-shaking and to keep the
// showcase's dependency surface explicit.
import { MobileAtmosphere } from './MobileAtmosphere';
import { MobileSurface } from './MobileSurface';
import { MobileHeader } from './MobileHeader';
import { MobileHomeHeader } from './MobileHomeHeader';
import { MobileActionFooter } from './MobileActionFooter';
import { MobilePrimaryButton } from './MobilePrimaryButton';
import { MobileInput } from './MobileInput';
import { MobileAlert } from './MobileAlert';
import { MobileSettingsRow } from './MobileSettingsRow';
import { MobileSectionEyebrow } from './MobileSectionEyebrow';
import { MobileStepper } from './MobileStepper';
import { MobileCheckboxItem } from './MobileCheckboxItem';
import { MobileSelectionList } from './MobileSelectionList';
import { MobileStepRail } from './MobileStepRail';
import { MobileDialog } from './MobileDialog';
import { MobileSelect } from './MobileSelect';
import { MobileNavDrawer } from './MobileNavDrawer';
import type { MobileNavDrawerItem } from './MobileNavDrawer';
import { SkeletonBlock } from './SkeletonBlock';
import { SegmentedControl } from './SegmentedControl';
import { FilterChip } from './FilterChip';
import { FilterChipGroup } from './FilterChipGroup';
import { DisclosureRow } from './DisclosureRow';
import { EmptyState } from './EmptyState';
import { StatCard } from './StatCard';
import { Avatar } from './Avatar';
import { SegmentedProgress } from './SegmentedProgress';
import { OfflineBanner } from './OfflineBanner';
import { CarouselTutorial } from './CarouselTutorial';
import { Wizard } from './Wizard';
import { ProgressRing } from './ProgressRing';
import { MobileSheet } from './MobileSheet';
import { DatePickerField } from './DatePickerField';
import { RevealMask } from './RevealMask';
import { LoadingOverlay } from '../primitives';
import { ActivityGridPreview } from './ActivityGridPreview';
import { CopyForAiButton } from './CopyForAiButton';
import { buildAiPayload } from '../../utils/buildAiPayload';
import { PALETTES, type AtmosphereSurface } from '../premium/shared';

const SURFACES: AtmosphereSurface[] = [
  'auth',
  'setup',
  'training',
  'goal',
  'instructions',
  'privacy',
  'analytics',
];

const PREFERENCE_OPTIONS: ReadonlyArray<{
  value: ColorSchemePreference;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
}> = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

function ThemeSelector() {
  const { colors, preference, setPreference } = useAppTheme();
  return (
    <View style={styles.themeRow}>
      {PREFERENCE_OPTIONS.map(({ value, label, Icon }) => {
        const active = preference === value;
        return (
          <Pressable
            key={value}
            onPress={() => setPreference(value)}
            style={[
              styles.themeChip,
              {
                backgroundColor: active ? colors.brand : colors.card,
                borderColor: active ? colors.brand : colors.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Theme: ${label}`}
          >
            <Icon size={14} color={active ? colors.textOnBrand : colors.textSecondary} />
            <Text
              style={[
                styles.themeChipLabel,
                {
                  color: active ? colors.textOnBrand : colors.textSecondary,
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ToastDemo() {
  const { colors } = useAppTheme();
  const { showToast } = useToast();
  const toastButtons: ReadonlyArray<{ type: 'success' | 'warning' | 'error' | 'info'; label: string }> = [
    { type: 'success', label: 'Success' },
    { type: 'warning', label: 'Warning' },
    { type: 'error', label: 'Error' },
    { type: 'info', label: 'Info' },
  ];
  return (
    <MobileSurface>
      <View style={styles.toastRow}>
        {toastButtons.map(({ type, label }) => (
          <Pressable
            key={type}
            onPress={() => showToast(type, `${label} toast — auto-dismisses in 4s.`)}
            style={[
              styles.toastChip,
              {
                backgroundColor: colors.buttonBackground,
                borderColor: colors.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Show ${label} toast`}
          >
            <Text style={[styles.toastChipLabel, { color: colors.textOnBrand }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </MobileSurface>
  );
}

function AnimationDemo() {
  const { colors } = useAppTheme();
  const fadeIn = useFadeIn({ animateOnMount: false, duration: 600 });
  const scaleIn = useScaleIn({ animateOnMount: false, duration: 600, useSpring: true });
  const popIn = usePopIn({ animateOnMount: false });
  const shake = useShake({ intensity: 8, cycles: 3 });
  const translateY = useTranslateY({ animateOnMount: false, initialValue: 24, duration: 500 });

  const [counterTarget, setCounterTarget] = useState('0');
  const counter = useAnimatedCounter(counterTarget);

  const replay = () => {
    fadeIn.reset();
    scaleIn.reset();
    popIn.reset();
    translateY.reset();
    // Defer one frame so the reset lands before the animation restarts.
    setTimeout(() => {
      fadeIn.fadeIn();
      scaleIn.scaleIn();
      popIn.popIn();
      translateY.animate();
    }, 16);
  };

  const runCounter = () => {
    const next = Math.floor(Math.random() * 1000);
    counter.startCount(
      counterTarget,
      next.toString(),
      (n) => Math.round(n).toString(),
      () => setCounterTarget(next.toString()),
      900,
    );
  };

  return (
    <View>
      <MobileSurface>
        <View style={styles.animGrid}>
          <Animated.View style={[styles.animCard, { backgroundColor: colors.buttonBackground }, fadeIn.style]}>
            <Text style={[styles.animLabel, { color: colors.textOnBrandMuted }]}>useFadeIn</Text>
            <Text style={[styles.animValue, { color: colors.textOnBrand }]}>opacity → 1</Text>
          </Animated.View>
          <Animated.View style={[styles.animCard, { backgroundColor: colors.buttonBackground }, scaleIn.style]}>
            <Text style={[styles.animLabel, { color: colors.textOnBrandMuted }]}>useScaleIn</Text>
            <Text style={[styles.animValue, { color: colors.textOnBrand }]}>spring → 1</Text>
          </Animated.View>
          <Animated.View style={[styles.animCard, { backgroundColor: colors.buttonBackground }, popIn.style]}>
            <Text style={[styles.animLabel, { color: colors.textOnBrandMuted }]}>usePopIn</Text>
            <Text style={[styles.animValue, { color: colors.textOnBrand }]}>overshoot</Text>
          </Animated.View>
          <Animated.View
            style={[styles.animCard, { backgroundColor: colors.buttonBackground }, translateY.style]}
          >
            <Text style={[styles.animLabel, { color: colors.textOnBrandMuted }]}>useTranslateY</Text>
            <Text style={[styles.animValue, { color: colors.textOnBrand }]}>slide ↑</Text>
          </Animated.View>
        </View>
      </MobileSurface>
      <View style={styles.spacer} />
      <MobilePrimaryButton onPress={replay} variant="secondary">
        Replay animations
      </MobilePrimaryButton>
      <View style={styles.spacer} />
      <MobilePrimaryButton onPress={shake.shake} variant="secondary">
        Shake the card below
      </MobilePrimaryButton>
      <View style={styles.spacer} />
      <MobileSurface>
        <Animated.View style={[styles.shakeCard, { backgroundColor: colors.buttonBackground }, shake.style]}>
          <Text style={[styles.animLabel, { color: colors.textOnBrandMuted }]}>useShake</Text>
          <Text style={[styles.animValue, { color: colors.textOnBrand }]}>imperative — call shake() from any handler</Text>
        </Animated.View>
      </MobileSurface>
      <View style={styles.spacer} />
      <Text style={[styles.animLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
        useAnimatedCounter
      </Text>
      <MobileSurface>
        <View style={styles.counterRow}>
          <Text style={[styles.counterValue, { color: colors.brand }]}>
            {counter.displayed}
          </Text>
          <MobilePrimaryButton
            onPress={runCounter}
            variant="secondary"
            style={styles.counterButton}
          >
            Count
          </MobilePrimaryButton>
        </View>
      </MobileSurface>
    </View>
  );
}

/**
 * SkeletonBlock + useShimmer demo. Three variants — a full-width bar, a
 * short bar, and a circular avatar placeholder — plus a stacked avatar+
 * two-line composition. The shimmer pulse is the live useShimmer output;
 * under `prefers-reduced-motion: reduce` the blocks render as flat
 * `colors.cardAlt` rectangles with no animation.
 */
function SkeletonDemo() {
  const { colors } = useAppTheme();
  return (
    <View>
      <MobileSurface>
        <SkeletonBlock height={16} />
        <View style={{ height: 12 }} />
        <SkeletonBlock width="60%" height={16} />
      </MobileSurface>
      <View style={styles.spacer} />
      <MobileSurface>
        <View style={styles.skeletonAvatarRow}>
          <SkeletonBlock width={48} height={48} borderRadius={24} />
          <View style={styles.skeletonAvatarMeta}>
            <SkeletonBlock width="80%" height={14} />
            <View style={{ height: 8 }} />
            <SkeletonBlock width="50%" height={12} />
          </View>
        </View>
      </MobileSurface>
      <Text style={[styles.animLabel, { color: colors.textSecondary, marginTop: 12 }]}>
        useShimmer pulses 1.0 → 0.5 → 1.0 over 1200ms via Animated.loop;
        collapses to a flat placeholder under prefers-reduced-motion: reduce.
      </Text>
    </View>
  );
}

/**
 * useContainerVariant demo: three sample containers at different aspect
 * ratios. Each reports its detected variant ('compact' | 'medium' | 'full').
 */
function ContainerVariantDemo() {
  const { colors } = useAppTheme();
  const refA = useRef(null);
  const refB = useRef(null);
  const refC = useRef(null);
  const a = useContainerVariant(refA, 'default');
  const b = useContainerVariant(refB, 'default');
  const c = useContainerVariant(refC, 'default');

  const samples: Array<{
    label: string;
    ref: React.RefObject<unknown>;
    style: ViewStyle;
    reading: { variant: string; fixedHeight: number; width: number; height: number };
  }> = [
    {
      label: 'wide & short → compact',
      ref: refA,
      style: { width: '100%', height: 28 },
      reading: a,
    },
    {
      label: 'balanced → medium',
      ref: refB,
      style: { width: '66%', height: 56 },
      reading: b,
    },
    {
      label: 'tall & narrow → full',
      ref: refC,
      style: { width: '40%', height: 110 },
      reading: c,
    },
  ];

  return (
    <View>
      <MobileSurface>
        {samples.map((s) => (
          <View key={s.label} style={styles.variantRow}>
            <View
              ref={s.ref as React.RefObject<View>}
              style={[styles.variantProbe, s.style, { backgroundColor: colors.brandMuted }]}
            />
            <View style={styles.variantMeta}>
              <Text style={[styles.bodyText, { color: colors.text }]}>{s.label}</Text>
              <Text style={[styles.animLabel, { color: colors.textSecondary, marginTop: 4 }]}>
                variant: {s.reading.variant} · fixedHeight: {s.reading.fixedHeight}px · measured:{' '}
                {s.reading.width.toFixed(0)}×{s.reading.height.toFixed(0)}
              </Text>
            </View>
          </View>
        ))}
      </MobileSurface>
    </View>
  );
}

export function Showcase() {
  const { colors } = useAppTheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stepperValue, setStepperValue] = useState(5);
  const [checked, setChecked] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>('option-a');
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>(['feature-1']);
  const [inputValue, setInputValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectValue, setSelectValue] = useState('monthly');
  const [segSelection, setSegSelection] = useState<'7d' | '30d' | '90d'>('30d');
  const [segTab, setSegTab] = useState<'summary' | 'details' | 'activity'>('summary');
  const [segDensity, setSegDensity] = useState<'low' | 'med' | 'high'>('med');
  const [radioChip, setRadioChip] = useState<string>('all');
  const [multiChip, setMultiChip] = useState<string[]>(['alpha']);
  const [toggleChip, setToggleChip] = useState<boolean>(true);
  const [disclosureA, setDisclosureA] = useState<boolean>(true);
  const [disclosureB, setDisclosureB] = useState<boolean>(false);
  const [disclosureC, setDisclosureC] = useState<boolean>(false);
  const [wizardStep, setWizardStep] = useState<number>(0);
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);
  const [dateValue, setDateValue] = useState<string | null>('2026-07-19');
  const [revealMasked, setRevealMasked] = useState<boolean>(true);
  const [showLoading, setShowLoading] = useState<boolean>(false);

  // Auto-dismiss the loading overlay demo so visitors can see it mount
  // and dismiss without getting stuck.
  useEffect(() => {
    if (!showLoading) return;
    const t = setTimeout(() => setShowLoading(false), 2200);
    return () => clearTimeout(t);
  }, [showLoading]);

  const drawerItems: MobileNavDrawerItem[] = [
    {
      id: '/',
      label: 'Home',
      icon: <Home size={18} color={colors.text} />,
      onPress: () => {},
    },
    {
      id: '/items',
      label: 'Items',
      icon: <Package size={18} color={colors.text} />,
      onPress: () => {},
    },
    {
      id: '/progress',
      label: 'Progress',
      icon: <TrendingUp size={18} color={colors.text} />,
      badge: 3,
      onPress: () => {},
    },
    {
      id: '/settings',
      label: 'Settings',
      icon: <Settings size={18} color={colors.text} />,
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: colors.backgroundDeep }]}
      edges={['top', 'bottom']}
    >
      <MobileAtmosphere surface="analytics" />
      <ScrollView
        style={SCREEN_BODY_STYLE}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Nav-mode header demo (compact 44px pattern). */}
        <MobileHeader
          title="Showcase"
          accentColor={colors.brand}
          onBack={() => {}}
          onDismiss={() => {}}
        />

        {/* Page-mode header demo (preserved for screens that need a taller headline). */}
        <View style={styles.pageHeaderDemo}>
          <MobileSectionEyebrow flush={false}>Design System</MobileSectionEyebrow>
          <Text style={[theme.typography.mobileTitle, { color: colors.text }]}>
            MobilePremium Kit
          </Text>
          <Text
            style={[
              theme.typography.mobileSubtitle,
              { color: colors.textSecondary, marginTop: 4 },
            ]}
          >
            Every primitive, every palette, every hook — the visual source of truth for arqavellum
            consumers.
          </Text>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Home Header (brand + subtitle row)</MobileSectionEyebrow>
          <MobileHomeHeader
            brand="Showcase"
            subtitle="Welcome back, visitor"
            menuButton={
              <Pressable
                onPress={() => {}}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Open menu"
                style={({ pressed }) => [
                  styles.homeMenuButton,
                  pressed ? { opacity: 0.6 } : null,
                ]}
              >
                <Menu size={22} color={colors.text} />
              </Pressable>
            }
          />
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Theme</MobileSectionEyebrow>
          <ThemeSelector />
        </View>

        <MobileStepRail current={2} total={5} accentColor={colors.brand} />

        <View style={styles.section}>
          <MobileSectionEyebrow>Surfaces</MobileSectionEyebrow>
          <MobileSurface>
            <Text style={[styles.bodyText, { color: colors.text }]}>
              Default MobileSurface — the single material surface per screen. Card base with subtle
              brand tint, hairline inner border, soft glow. Adapts to light/dark automatically.
            </Text>
          </MobileSurface>
          <View style={styles.spacer} />
          <MobileSurface accentColor={colors.status.success}>
            <Text style={[styles.bodyText, { color: colors.text }]}>
              Surface with green accent tint (success surfaces).
            </Text>
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Atmospheres (7 surfaces)</MobileSectionEyebrow>
          {SURFACES.map((surface) => (
            <View key={surface} style={styles.atmosphereRow}>
              <View style={styles.atmosphereContainer}>
                <MobileAtmosphere surface={surface} showVignette={false} />
                <View style={[styles.atmosphereLabel, { backgroundColor: colors.card }]}>
                  <Text
                    style={[
                      styles.bodyText,
                      theme.typography.mobileFieldLabel,
                      { color: colors.text },
                    ]}
                  >
                    {surface}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Buttons</MobileSectionEyebrow>
          <MobilePrimaryButton onPress={() => setDialogOpen(true)}>Open Dialog</MobilePrimaryButton>
          <View style={styles.spacer} />
          <MobilePrimaryButton
            variant="secondary"
            onPress={() => {}}
            icon={<ChevronRight size={16} color={colors.brand} />}
            iconPosition="right"
          >
            Secondary
          </MobilePrimaryButton>
          <View style={styles.spacer} />
          <MobilePrimaryButton variant="ghost" onPress={() => {}}>
            Ghost Action
          </MobilePrimaryButton>
          <View style={styles.spacer} />
          <MobilePrimaryButton onPress={() => {}} loading>
            Loading
          </MobilePrimaryButton>
          <View style={styles.spacer} />
          <MobilePrimaryButton onPress={() => {}} disabled>
            Disabled
          </MobilePrimaryButton>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Inputs</MobileSectionEyebrow>
          <MobileSurface>
            <MobileInput
              label="Email"
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="you@example.com"
              helperText="We&rsquo;ll never share your email."
              keyboardType="email-address"
              autoComplete="email"
              icon={<Mail size={18} color={colors.textColors.muted} />}
            />
            <MobileInput
              label="Password"
              value=""
              onChangeText={() => {}}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              errorText="Password must be at least 8 characters."
              icon={<Lock size={18} color={colors.textColors.muted} />}
              rightIcon={
                showPassword ? (
                  <EyeOff size={18} color={colors.textColors.muted} />
                ) : (
                  <Eye size={18} color={colors.textColors.muted} />
                )
              }
              onRightIconPress={() => setShowPassword((s) => !s)}
              maxLength={64}
            />
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Select (bottom sheet)</MobileSectionEyebrow>
          <MobileSurface>
            <MobileSelect
              label="Billing cycle"
              value={selectValue}
              onValueChange={setSelectValue}
              options={[
                { value: 'monthly', label: 'Monthly', description: 'Billed every month' },
                { value: 'yearly', label: 'Yearly', description: 'Billed every 12 months — save 20%' },
                { value: 'lifetime', label: 'Lifetime', description: 'One-time payment' },
              ]}
            />
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Alerts</MobileSectionEyebrow>
          <MobileAlert type="success" title="Saved" message="3 entries recorded." />
          <View style={styles.spacer} />
          <MobileAlert type="warning" title="Almost there" message="One more field to complete." />
          <View style={styles.spacer} />
          <MobileAlert type="error" title="Network error" message="Couldn&rsquo;t reach the server." />
          <View style={styles.spacer} />
          <MobileAlert type="info" title="Heads up" message="Sync will run when you reconnect." />
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Stepper (long-press to accelerate)</MobileSectionEyebrow>
          <MobileSurface>
            <MobileStepper
              value={stepperValue}
              min={0}
              max={100}
              step={1}
              fastStep={5}
              unitLabel="units"
              onChange={setStepperValue}
            />
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Checkbox</MobileSectionEyebrow>
          <MobileSurface>
            <MobileCheckboxItem
              title="Enable notifications"
              subtitle="Get reminded when something needs your attention."
              checked={checked}
              onToggle={() => setChecked((c) => !c)}
            />
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Selection List (single-select radio)</MobileSectionEyebrow>
          <MobileSurface>
            <MobileSelectionList
              options={[
                { id: 'option-a', label: 'Option A', description: 'First option' },
                { id: 'option-b', label: 'Option B', description: 'Second option' },
              ]}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Selection List (multi-select checkboxes)</MobileSectionEyebrow>
          <MobileSurface>
            <MobileSelectionList
              multiSelect
              options={[
                { id: 'feature-1', label: 'Feature One', description: 'Toggle me' },
                { id: 'feature-2', label: 'Feature Two', description: 'And me' },
                { id: 'feature-3', label: 'Feature Three' },
              ]}
              selectedIds={multiSelectedIds}
              onSelect={(id) =>
                setMultiSelectedIds((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                )
              }
            />
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Settings Rows (iconBox frame)</MobileSectionEyebrow>
          <MobileSurface padding={0}>
            <MobileSettingsRow
              icon={<Settings size={18} color={colors.brand} />}
              title="Account"
              description="user@example.com"
              onPress={() => {}}
            />
            <MobileSettingsRow
              icon={<Bell size={18} color={colors.brand} />}
              title="Notifications"
              onPress={() => {}}
            />
            <MobileSettingsRow
              icon={<Info size={18} color={colors.brand} />}
              title="Version"
              description="1.0.0"
            />
            <MobileSettingsRow
              title="Sign Out"
              onPress={() => {}}
              destructive
              isLast
            />
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Toast (auto-dismissing alerts)</MobileSectionEyebrow>
          <ToastDemo />
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Copy for AI (dev helper)</MobileSectionEyebrow>
          <MobileSurface>
            <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 12 }]}>
              Builds a plain-text payload (app, route, title, timestamp, visible content) and
              copies it to the clipboard. One tap takes the current screen into an AI chat
              without a screenshot.
            </Text>
            <CopyForAiButton
              variant="subtle"
              testID="showcase-copy-for-ai-subtle"
              payload={buildAiPayload({
                appName: 'arqavellum',
                route: '/dev/premium',
                title: 'Showcase',
                contextLabel: 'Design system reference',
                params: { section: 'copy-for-ai' },
                visibleContent: [
                  '- Kit: MobilePremium',
                  '- Atmospheres: 7',
                  '- Hooks: animation + layout + clipboard',
                ].join('\n'),
              })}
            />
            <View style={styles.spacer} />
            <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 12 }]}>
              Ghost variant — for the compact MobileHeader nav-mode row.
            </Text>
            <MobileHeader
              title="Showcase"
              accentColor={colors.brand}
              onBack={() => {}}
              navRightAction={
                <CopyForAiButton
                  testID="showcase-copy-for-ai-ghost"
                  payload={buildAiPayload({
                    appName: 'arqavellum',
                    route: '/dev/premium',
                    title: 'Showcase',
                  })}
                />
              }
            />
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Animation Hooks</MobileSectionEyebrow>
          <AnimationDemo />
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Container Variant (aspect+height)</MobileSectionEyebrow>
          <ContainerVariantDemo />
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Skeleton (loading placeholders)</MobileSectionEyebrow>
          <SkeletonDemo />
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Activity Grid (calendar + matrix)</MobileSectionEyebrow>
          <ActivityGridPreview />
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Nav Drawer (left-side hamburger)</MobileSectionEyebrow>
          <MobileSurface>
            <Text style={[styles.bodyText, { color: colors.text }]}>
              MobileNavDrawer slides in from the left with a glass scrim. Active route is
              highlighted with a 3px brand strip and tinted background. Tapping the scrim
              or any item dismisses the drawer.
            </Text>
          </MobileSurface>
          <View style={styles.spacer} />
          <MobilePrimaryButton onPress={() => setDrawerOpen(true)}>
            Open drawer demo
          </MobilePrimaryButton>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Selection — segmented control</MobileSectionEyebrow>
          <MobileSurface>
            <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 8 }]}>
              variant: &quot;selection&quot; — radiogroup/radio, mutually exclusive value pick
            </Text>
            <SegmentedControl
              variant="selection"
              segments={[
                { label: '7D', value: '7d' },
                { label: '30D', value: '30d' },
                { label: '90D', value: '90d' },
              ]}
              value={segSelection}
              onChange={setSegSelection}
              accessibilityLabel="Analytics period"
            />
            <View style={styles.spacer} />
            <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 8 }]}>
              variant: &quot;tabs&quot; — tablist/tab, switches a content region below
            </Text>
            <SegmentedControl
              variant="tabs"
              segments={[
                { label: 'Summary', value: 'summary' },
                { label: 'Details', value: 'details' },
                { label: 'Activity', value: 'activity' },
              ]}
              value={segTab}
              onChange={setSegTab}
              accessibilityLabel="Detail tabs"
            />
            <View style={styles.spacer} />
            {/* Consumer-owned panel composition. The shell ships tablist/tab
                semantics only — consumer renders the matching panel and
                wires platform-appropriate panel association. RN's
                AccessibilityRole enum does not include `tabpanel`; consumers
                that want explicit panel semantics on web can layer
                aria-role="tabpanel" via a host-level attribute. */}
            <View
              accessibilityLabel={`${segTab} panel`}
              style={[styles.tabPanel, { backgroundColor: colors.cardAlt }]}
            >
              <Text style={[styles.bodyText, { color: colors.text }]}>
                {segTab === 'summary'
                  ? 'Summary panel: 3 entries logged today.'
                  : segTab === 'details'
                    ? 'Details panel: notes recorded against each entry.'
                    : 'Activity panel: last completed 5 days ago.'}
              </Text>
            </View>
            <View style={styles.spacer} />
            <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 8 }]}>
              chromeless variant — no track fill, inline affordance
            </Text>
            <SegmentedControl
              variant="selection"
              chromeless
              segments={[
                { label: 'Low', value: 'low' },
                { label: 'Med', value: 'med' },
                { label: 'High', value: 'high' },
              ]}
              value={segDensity}
              onChange={setSegDensity}
              accessibilityLabel="Density (chromeless)"
            />
            <Text style={[styles.bodyText, { color: colors.textMuted, marginTop: 8, fontSize: 12 }]}>
              Selected density: {segDensity}
            </Text>
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Selection — filter chips</MobileSectionEyebrow>
          <MobileSurface>
            <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 8 }]}>
              Single-select cluster — radio role, checked state
            </Text>
            <FilterChipGroup>
              {['all', 'active', 'archived'].map((c) => (
                <FilterChip
                  key={c}
                  label={c.charAt(0).toUpperCase() + c.slice(1)}
                  selected={radioChip === c}
                  onPress={() => setRadioChip(c)}
                  accessibilityRole="radio"
                  accessibilityLabel={`Filter: ${c}`}
                />
              ))}
            </FilterChipGroup>
            <View style={styles.spacer} />
            <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 8 }]}>
              Multi-select cluster — checkbox role, checked state
            </Text>
            <FilterChipGroup>
              {['alpha', 'beta', 'gamma'].map((c) => (
                <FilterChip
                  key={c}
                  label={c.charAt(0).toUpperCase() + c.slice(1)}
                  selected={multiChip.includes(c)}
                  onPress={() =>
                    setMultiChip((prev) =>
                      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
                    )
                  }
                  accessibilityRole="checkbox"
                  accessibilityLabel={`Toggle ${c}`}
                />
              ))}
            </FilterChipGroup>
            <View style={styles.spacer} />
            <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 8 }]}>
              Standalone toggle — button role, selected state
            </Text>
            <FilterChipGroup>
              <FilterChip
                label={toggleChip ? 'On' : 'Off'}
                selected={toggleChip}
                onPress={() => setToggleChip((v) => !v)}
              />
            </FilterChipGroup>
            <View style={styles.spacer} />
            <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 8 }]}>
              wrap: false inside a consumer-supplied horizontal ScrollView
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <FilterChipGroup wrap={false}>
                {['tag-a', 'tag-b', 'tag-c', 'tag-d', 'tag-e', 'tag-f'].map((t) => (
                  <FilterChip
                    key={t}
                    label={t}
                    selected={false}
                    onPress={() => {}}
                  />
                ))}
              </FilterChipGroup>
            </ScrollView>
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Disclosure (expand/collapse rows)</MobileSectionEyebrow>
          <MobileSurface padding={0}>
            <DisclosureRow
              open={disclosureA}
              onOpenChange={setDisclosureA}
              accessibilityLabel="What is the 490px height budget?"
              header={
                <View>
                  <Text style={[styles.disclosureHeader, { color: colors.text }]}>
                    What is the 490px height budget?
                  </Text>
                </View>
              }
            >
              <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                A load-bearing height constraint for iPhone SE (375×667). The primary
                action of every MobilePremium screen must fit at 490px viewport height
                without scrolling.
              </Text>
            </DisclosureRow>
            <DisclosureRow
              open={disclosureB}
              onOpenChange={setDisclosureB}
              accessibilityLabel="Does the kit ship desktop components?"
              header={
                <View>
                  <Text style={[styles.disclosureHeader, { color: colors.text }]}>
                    Does the kit ship desktop components?
                  </Text>
                </View>
              }
            >
              <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                No. Arqavellum is mobile-only by design. A consumer needing a desktop
                admin surface builds it separately.
              </Text>
            </DisclosureRow>
            <DisclosureRow
              open={disclosureC}
              onOpenChange={setDisclosureC}
              accessibilityLabel="Reduced motion contract"
              header={
                <View>
                  <Text style={[styles.disclosureHeader, { color: colors.text }]}>
                    Reduced motion contract
                  </Text>
                </View>
              }
            >
              <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                v1 ships instant content + chevron rotation. Under prefers-reduced-motion
                the chevron snaps instead of rotating. Height animation is a Batch B
                concern, gated on a Reanimated adoption decision.
              </Text>
            </DisclosureRow>
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Empty state</MobileSectionEyebrow>
          <MobileSurface>
            <EmptyState
              title="No items match your filter"
              message="Try clearing some filters or add a new item to your catalog."
              icon={<Search size={36} color={colors.textSecondary} />}
              action={{
                label: 'Clear filters',
                onPress: () => {},
                variant: 'primary',
              }}
            />
          </MobileSurface>
          <View style={styles.spacer} />
          <MobileSurface>
            <EmptyState title="Nothing here yet" />
          </MobileSurface>
          <View style={styles.spacer} />
          <MobileSurface>
            <EmptyState
              title="No results"
              message="Compact variant for nested card interiors."
              compact
              accessibilityLabel="Compact empty state"
            />
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Stat cards</MobileSectionEyebrow>
          <View style={styles.statRow}>
            <StatCard
              label="Activity"
              value="14"
              subtitle="days"
              variant="accent"
              style={styles.statRowCell}
              accessibilityLabel="Activity: 14 days"
            />
            <StatCard
              label="Entries"
              value="8.2k"
              subtitle="this month"
              style={styles.statRowCell}
              accessibilityLabel="Entries: 8.2k this month"
            />
          </View>
          <View style={styles.spacer} />
          <StatCard
            label="Engagement"
            value="142"
            subtitle="peak score"
            icon={<TrendingUp size={18} color={colors.brand} />}
            variant="outline"
            onPress={() => {}}
            accessibilityLabel="Engagement, 142 peak score, tap for details"
          />
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Avatar (image or initials)</MobileSectionEyebrow>
          <MobileSurface>
            <View style={styles.avatarRow}>
              <Avatar name="Ada Lovelace" presence="online" />
              <Avatar name="Grace Hopper" presence="away" size="lg" />
              <Avatar name="Alan Turing" size="xl" />
              <Avatar name="Bookend" shape="square" />
            </View>
            <View style={styles.spacer} />
            <View style={styles.avatarRow}>
              <Avatar name="Single" size="xs" />
              <Avatar name="Two Word" size="sm" />
              <Avatar name="Lower case" size="md" presence="online" />
              <Avatar name="No Space" size="md" ringColor={colors.status.success} />
            </View>
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Segmented progress</MobileSectionEyebrow>
          <MobileSurface>
            <SegmentedProgress
              segments={[
                { value: 6, max: 8, accessibilityLabel: 'Water' },
                { value: 9.4, max: 10, accessibilityLabel: 'Steps' },
                { value: 3, max: 8, accessibilityLabel: 'Sleep' },
              ]}
              showLabels
            />
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Offline / sync banner</MobileSectionEyebrow>
          <OfflineBanner variant="offline" pendingCount={4} />
          <View style={styles.spacer} />
          <OfflineBanner variant="syncing" />
          <View style={styles.spacer} />
          <OfflineBanner
            variant="sync-failed"
            actionLabel="Retry"
            onAction={() => {}}
          />
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Carousel tutorial (NOT stories)</MobileSectionEyebrow>
          <MobileSurface padding={0}>
            <CarouselTutorial
              slides={[
                {
                  id: 'slide-1',
                  content: (
                    <View style={styles.tutorialSlide}>
                      <Text style={[styles.bodyText, { color: colors.text }]}>
                        Slide one — generic step-through carousel. No autoplay,
                        no tap-zones, no per-slide progress bars.
                      </Text>
                    </View>
                  ),
                  accessibilityLabel: 'Welcome slide',
                },
                {
                  id: 'slide-2',
                  content: (
                    <View style={styles.tutorialSlide}>
                      <Text style={[styles.bodyText, { color: colors.text }]}>
                        Slide two — Crossfade transitions infer direction from
                        the previous index.
                      </Text>
                    </View>
                  ),
                  accessibilityLabel: 'Transition behavior slide',
                },
                {
                  id: 'slide-3',
                  content: (
                    <View style={styles.tutorialSlide}>
                      <Text style={[styles.bodyText, { color: colors.text }]}>
                        Slide three — Done completes the flow. Back is hidden
                        on the first slide.
                      </Text>
                    </View>
                  ),
                  accessibilityLabel: 'Completion slide',
                },
              ]}
              onComplete={() => {}}
            />
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Wizard (thin composition)</MobileSectionEyebrow>
          <MobileSurface padding={0}>
            <Wizard
              currentStep={wizardStep}
              onBack={() => setWizardStep((s) => Math.max(0, s - 1))}
              onContinue={() => setWizardStep((s) => Math.min(2, s + 1))}
              steps={[
                {
                  id: 'wiz-1',
                  eyebrow: 'Step one',
                  title: 'Welcome',
                  content: (
                    <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                      Composed from MobileStepRail + Crossfade + MobileActionFooter.
                      No internal state machine — currentStep is controlled by the caller.
                    </Text>
                  ),
                },
                {
                  id: 'wiz-2',
                  eyebrow: 'Step two',
                  title: 'Configure',
                  content: (
                    <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                      Step content is consumer-owned. Direction is inferred from
                      the previous step index.
                    </Text>
                  ),
                },
                {
                  id: 'wiz-3',
                  eyebrow: 'Step three',
                  title: 'Finish',
                  content: (
                    <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                      On the last step, Continue becomes Finish — the caller
                      decides what Finish actually does.
                    </Text>
                  ),
                },
              ]}
            />
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Progress ring (static v1)</MobileSectionEyebrow>
          <MobileSurface>
            <View style={styles.ringRow}>
              <View style={styles.ringCell}>
                <ProgressRing
                  progress={0.25}
                  size="sm"
                  label={
                    <Text style={[styles.ringLabel, { color: colors.text }]}>25%</Text>
                  }
                />
              </View>
              <View style={styles.ringCell}>
                <ProgressRing
                  progress={0.5}
                  size="md"
                  label={
                    <Text style={[styles.ringLabel, { color: colors.text }]}>50%</Text>
                  }
                />
              </View>
              <View style={styles.ringCell}>
                <ProgressRing
                  progress={0.75}
                  size="lg"
                  label={
                    <Text style={[styles.ringLabelLg, { color: colors.text }]}>75%</Text>
                  }
                />
              </View>
            </View>
            <View style={styles.spacer} />
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              First source use of react-native-svg in arqavellum. No animation in v1 —
              static arc against a cardAlt track.
            </Text>
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Date picker (YYYY-MM-DD in/out)</MobileSectionEyebrow>
          <MobileSurface>
            <DatePickerField
              label="Start date"
              value={dateValue}
              onChange={setDateValue}
              min="2026-01-01"
              max="2026-12-31"
              helperText="Local-date semantics — no UTC drift."
            />
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Reveal mask (visual privacy only)</MobileSectionEyebrow>
          <MobileSurface>
            <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 8 }]}>
              Tap the mask to reveal. NOT encryption, NOT secure — defeats only casual
              over-the-shoulder viewing.
            </Text>
            <View style={styles.revealWrap}>
              <RevealMask
                masked={revealMasked}
                onReveal={() => setRevealMasked(false)}
                accessibilityLabel="Reveal private notes"
              >
                <Text style={[styles.revealText, { color: colors.text }]}>
                  Private: account reference AC-1234. Keep between you and your accountant.
                </Text>
              </RevealMask>
            </View>
            <View style={styles.spacer} />
            <MobilePrimaryButton onPress={() => setRevealMasked(true)} variant="secondary">
              Re-mask
            </MobilePrimaryButton>
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Sheet (bottom or top anchored)</MobileSectionEyebrow>
          <MobileSurface>
            <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 8 }]}>
              Generic sheet — escapes host clipping via the shell portal. Consumer
              supplies children; backdrop, handle, and close affordances ship with the shell.
            </Text>
            <MobilePrimaryButton onPress={() => setSheetOpen(true)}>
              Open bottom sheet
            </MobilePrimaryButton>
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Loading overlay (MobileDialog-composed)</MobileSectionEyebrow>
          <MobileSurface>
            <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 8 }]}>
              Non-dismissable blocking load. Refactored to compose MobileDialog so it
              escapes host clipping and respects the C2/C4 audit boundaries.
            </Text>
            <MobilePrimaryButton onPress={() => setShowLoading(true)}>
              Show overlay
            </MobilePrimaryButton>
          </MobileSurface>
        </View>

        <MobileActionFooter
          primary={{
            onPress: () => setDialogOpen(true),
            children: 'Open Dialog',
          }}
          secondaryLabel="Skip"
          onSecondary={() => {}}
          progressText="Step 3 of 5"
        />
      </ScrollView>

      <MobileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Dialog Title"
        primaryLabel="Confirm"
        onPrimary={() => setDialogOpen(false)}
      >
        <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
          The MobileDialog primitive. Renders a scrim + centered MobileSurface with a compact
          MobileHeader, optional body, and a primary/secondary action pair. Escape-to-close on web,
          backdrop-tap-to-close everywhere.
        </Text>
        <Text
          style={[
            styles.bodyText,
            { color: colors.textMuted, fontSize: 12, marginTop: 8 },
          ]}
        >
          Width contract: card fills the available width (minus the host's
          16px horizontal padding) up to 380pt, centered. On narrow phones
          (iPhone SE @ 320pt) the card spans the full viewport — no extra
          10% gutter — by design.
        </Text>
      </MobileDialog>

      <MobileSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Sheet demo"
        accentColor={colors.brand}
      >
        <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
          The MobileSheet primitive. Generic bottom-anchored sheet hosting arbitrary children.
          Escapes host clipping via the shell portal — the same load-bearing reason as MobileDialog
          and MobileSelect.
        </Text>
      </MobileSheet>

      <LoadingOverlay
        visible={showLoading}
        message="Saving changes"
        subMessage="Indexing entries and updating history."
      />

      <MobileNavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={drawerItems}
        activePathname="/items"
        atmosphere="analytics"
        anchor={APP_LAYOUT.navDrawerAnchor}
        brandPersistence={APP_LAYOUT.navDrawerBrandPersistence}
        header={
          <View>
            <Text style={[theme.typography.mobileEyebrow, { color: colors.textMuted }]}>
              Showcase
            </Text>
            <Text style={[theme.typography.mobileTitle, { color: colors.text, marginTop: 2 }]}>
              MobileNavDrawer
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  pageHeaderDemo: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
  },
  spacer: {
    height: 12,
  },
  skeletonAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonAvatarMeta: {
    flex: 1,
  },
  homeMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  atmosphereRow: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  atmosphereContainer: {
    height: 120,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  atmosphereLabel: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  themeChipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  toastRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toastChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  toastChipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  animGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  animCard: {
    flex: 1,
    minWidth: 100,
    padding: 12,
    borderRadius: 12,
  },
  animLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  animValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  counterButton: {
    width: 'auto',
    alignSelf: 'auto',
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 44,
  },
  counterValue: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  shakeCard: {
    padding: 12,
    borderRadius: 12,
  },
  variantRow: {
    marginBottom: 12,
  },
  variantProbe: {
    borderRadius: 8,
  },
  variantMeta: {
    marginTop: 6,
  },
  tabPanel: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  disclosureHeader: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statRowCell: {
    flex: 1,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  tutorialSlide: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 12,
  },
  ringCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  ringLabelLg: {
    fontSize: 20,
    fontWeight: '700',
  },
  revealWrap: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  revealText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});

export default Showcase;
