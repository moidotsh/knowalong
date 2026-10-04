// components/MobilePremium/showcase/index.tsx
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
//
// Module map: this index composes the page (sections in render order,
// portal layer, shared state); demos/ holds the interactive demo
// components; styles.ts the shared StyleSheet; data.ts the atmosphere
// surface list + preference chips.

import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, Settings, Bell, Info, ChevronRight, Home, Package, TrendingUp, Search } from '@tamagui/lucide-icons-2';
import { theme, APP_LAYOUT, SCREEN_BODY_STYLE, APP_DISPLAY_NAME } from '../../../constants';
import { useAppTheme } from '../../../context';
// Direct imports from each primitive file (not the barrel). The
// showcase is intentionally NOT re-exported by the MobilePremium
// barrel (see that file's note + docs/contributing.md), so going
// through the barrel here is no longer a cycle — these direct
// imports remain preferable for tree-shaking and to keep the
// showcase's dependency surface explicit.
import { MobileAtmosphere } from '../MobileAtmosphere';
import { InkPanel } from '../InkPanel';
import { MobileSurface } from '../MobileSurface';
import { MobileHeader } from '../MobileHeader';
import { MobileHomeHeader } from '../MobileHomeHeader';
import { MobileActionFooter } from '../MobileActionFooter';
import { MobilePrimaryButton } from '../MobilePrimaryButton';
import { MobileInput } from '../MobileInput';
import { MobileAlert } from '../MobileAlert';
import { MobileSettingsRow } from '../MobileSettingsRow';
import { MobileSectionEyebrow } from '../MobileSectionEyebrow';
import { MobileStepper } from '../MobileStepper';
import { MobileCheckboxItem } from '../MobileCheckboxItem';
import { CheckBox } from '../CheckBox';
import { MobileSelectionList } from '../MobileSelectionList';
import { MobileStepRail } from '../MobileStepRail';
import { MobileDialog } from '../MobileDialog';
import { MobileSelect } from '../MobileSelect';
import { MobileNavDrawer } from '../MobileNavDrawer';
import type { MobileNavDrawerItem } from '../MobileNavDrawer';
import { MobileNavDrawerGlassCap } from '../MobileNavDrawerGlassCap';
import { HamburgerButton } from '../HamburgerButton';
import { SegmentedControl } from '../SegmentedControl';
import { FilterChip } from '../FilterChip';
import { SearchField } from '../SearchField';
import { FilterChipGroup } from '../FilterChipGroup';
import { DisclosureRow } from '../DisclosureRow';
import { EmptyState } from '../EmptyState';
import { Figure } from '../Figure';
import { TallyStrip } from '../TallyStrip';
import { StatCard } from '../StatCard';
import { Avatar } from '../Avatar';
import { SegmentedProgress } from '../SegmentedProgress';
import { OfflineBanner } from '../OfflineBanner';
import { MobileAnnouncementBar } from '../MobileAnnouncementBar';
import { MobileFootnote } from '../MobileFootnote';
import { CarouselTutorial } from '../CarouselTutorial';
import { Wizard } from '../Wizard';
import { ProgressRing } from '../ProgressRing';
import { MobileSheet } from '../MobileSheet';
import { DatePickerField } from '../DatePickerField';
import { RevealMask } from '../RevealMask';
import { LoadingOverlay } from '../../primitives';
import { ActivityGridPreview } from '../ActivityGridPreview';
import { CopyForAiButton } from '../CopyForAiButton';
import { buildAiPayload } from '../../../utils/buildAiPayload';
import { SURFACES } from './data';
import { styles } from './styles';
import { ThemeSelector } from './demos/ThemeSelector';
import { ToastDemo } from './demos/ToastDemo';
import { AnimationDemo } from './demos/AnimationDemo';
import { SkeletonDemo } from './demos/SkeletonDemo';
import { ContainerVariantDemo } from './demos/ContainerVariantDemo';
import { ThemeAxesDemo } from './demos/ThemeAxesDemo';
import { CurtainDemo } from './demos/CurtainDemo';
import { LangDemo } from './demos/LangDemo';
import { AbsorbBarDemo } from './demos/AbsorbBarDemo';
import { TabBarDemo } from './demos/TabBarDemo';
import { ShellHeaderDemo } from './demos/ShellHeaderDemo';


export function Showcase() {
  const { colors } = useAppTheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The drawer demo's surface language — flipped by the segmented control
  // via the component's showcase-only `drawerStyle` override (the theme's
  // drawer.style stays the single consumer declaration point).
  const [demoDrawerStyle, setDemoDrawerStyle] = useState<'sheet' | 'ink'>('sheet');
  // The header pairing follows: on the ink plate the masthead rides it.
  const demoOnPlate = drawerOpen && demoDrawerStyle === 'ink';
  const [stepperValue, setStepperValue] = useState(5);
  const [checked, setChecked] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>('option-a');
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>(['feature-1']);
  const [inputValue, setInputValue] = useState('');
  const [multiNote, setMultiNote] = useState('');
  const [submitValue, setSubmitValue] = useState('');
  const [lastSubmitted, setLastSubmitted] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
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

  // Icons follow the surface: paper on the ink plate, text on the sheet.
  const demoIconColor = demoDrawerStyle === 'ink' ? colors.background : colors.text;
  const drawerItems: MobileNavDrawerItem[] = [
    {
      id: '/',
      label: 'Home',
      icon: <Home size={18} color={demoIconColor} />,
      onPress: () => {},
    },
    {
      id: '/items',
      label: 'Items',
      icon: <Package size={18} color={demoIconColor} />,
      onPress: () => {},
    },
    {
      id: '/progress',
      label: 'Progress',
      icon: <TrendingUp size={18} color={demoIconColor} />,
      badge: 3,
      onPress: () => {},
    },
    {
      id: '/settings',
      label: 'Settings',
      icon: <Settings size={18} color={demoIconColor} />,
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
          <MobileSectionEyebrow>Drawer — sheet vs ink (theme.drawer.style)</MobileSectionEyebrow>
          {/* Live cutout-drawer demo, both surface languages through one
              hamburger. 'sheet' (default): frosted scrim + blur, atmosphere
              body, hairline edge, the iOS slide curve — the glass cap
              completes the cutout. 'ink': the InkPanel plate (print grain +
              full-height brand rule), flat dim scrim, the out-cubic curve,
              and the on-plate masthead — the real header stacks above the
              plate and bleeds to the background color while the subtitle
              and right-side chrome go invisible holding their space. */}
          <SegmentedControl
            variant="selection"
            segments={[
              { label: 'Sheet (default)', value: 'sheet' },
              { label: 'Ink', value: 'ink' },
            ]}
            value={demoDrawerStyle}
            onChange={setDemoDrawerStyle}
            accessibilityLabel="Drawer surface language"
          />
          <View style={styles.spacer} />
          <MobileHomeHeader
            brand="Showcase"
            subtitle="Welcome back, visitor"
            onPlate={demoOnPlate}
            menuButton={
              <HamburgerButton
                isOpen={drawerOpen}
                onPress={() => setDrawerOpen((prev) => !prev)}
                color={demoOnPlate ? colors.background : undefined}
                openLabel="Ouvrir le menu"
                closeLabel="Fermer le menu"
              />
            }
            drawerGlassCap={
              demoDrawerStyle === 'sheet' ? (
                <MobileNavDrawerGlassCap open={drawerOpen} />
              ) : undefined
            }
          />
          <Text style={[styles.bodyText, { color: colors.textSecondary, marginTop: 8 }]}>
            One hamburger, two materials. Sheet slides on the iOS curve under a frosted scrim;
            ink sweeps the plate on the out-cubic with the masthead bleeding onto it — the
            subtitle and any right-side chrome go invisible and hold their space, so nothing
            shifts and nothing straddles the plate&apos;s rule. Consumers set the row face via
            itemLabelStyle (e.g. a ledger mono) and declare the language once in the theme.
          </Text>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>AppShellHeader — the composed one-drawer pattern</MobileSectionEyebrow>
          {/* The home header wired to the cutout drawer, pre-assembled in
              components/composed: brand from APP_DISPLAY_NAME + the
              hamburger + MobileNavDrawer in the APP_LAYOUT defaults, locked
              to the content column. The section above shows the pieces;
              this is the assembly a consumer's home surface mounts. */}
          <ShellHeaderDemo />
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Tab bar — raised center action</MobileSectionEyebrow>
          {/* Bottom chrome for apps whose primary verb deserves a home in
              the thumb arc: four flanking tabs + a raised signal action
              (START/RESUME-style). Active tab = ink label + 2px signal
              notch; `active` runs the resume pulse (ambient, collapsed
              under reduced motion). The bar owns no routing. */}
          <TabBarDemo />
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Theme</MobileSectionEyebrow>
          <ThemeSelector />
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Theme axes — the dialect family</MobileSectionEyebrow>
          <ThemeAxesDemo />
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
          {/* InkPanel — the inverted-surface primitive (theme.drawer.style
              'ink' composes it; any ink-language consumer surface can).
              Text-color plate + print grain + brand edge rule. */}
          <View style={[styles.atmosphereContainer, { height: 88 }]}>
            <InkPanel rule>
              <View style={{ flex: 1, justifyContent: 'center', paddingLeft: 16 }}>
                <Text
                  style={[
                    styles.bodyText,
                    theme.typography.mobileFieldLabel,
                    { color: colors.background },
                  ]}
                >
                  InkPanel (plate + grain + rule)
                </Text>
              </View>
            </InkPanel>
          </View>

          {/* The atmosphere-language override point, demonstrated: the
              theme declares 'aurora' or 'flat' once and every surface
              follows. This row pins the flat read with the explicit
              prop so both styles stay visible under any theme. */}
          <View style={styles.atmosphereRow}>
            <View style={styles.atmosphereContainer}>
              <MobileAtmosphere surface="analytics" showVignette={false} showOrbs={false} />
              <View style={[styles.atmosphereLabel, { backgroundColor: colors.card }]}>
                <Text
                  style={[
                    styles.bodyText,
                    theme.typography.mobileFieldLabel,
                    { color: colors.text },
                  ]}
                >
                  flat (theme.atmosphere.style)
                </Text>
              </View>
            </View>
          </View>
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
            <MobileInput
              label="Quick note"
              value={submitValue}
              onChangeText={setSubmitValue}
              placeholder="Type and press Enter…"
              returnKeyType="send"
              onSubmitEditing={() => {
                const trimmed = submitValue.trim();
                if (trimmed.length === 0) return;
                setLastSubmitted(trimmed);
                setSubmitValue('');
              }}
              helperText={
                lastSubmitted != null ? `Sent: ${lastSubmitted}` : 'Enter submits the field.'
              }
              maxLength={80}
            />
            <MobileInput
              label="Long note (multiline)"
              value={multiNote}
              onChangeText={setMultiNote}
              placeholder="Paste a description — the field grows to four rows and scrolls internally once full…"
              multiline
              numberOfLines={4}
              maxLength={400}
            />
          </MobileSurface>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Search</MobileSectionEyebrow>
          <MobileSurface>
            <SearchField
              value={searchValue}
              onChangeText={setSearchValue}
              placeholder="Search foods, stores, tags…"
            />
            <FilterChipGroup>
              <FilterChip label="Search" selected={searchValue.length > 0} onPress={() => {}} />
              <FilterChip label="Filters" selected={false} onPress={() => {}} />
              <FilterChip label="Add item" selected={false} onPress={() => {}} />
            </FilterChipGroup>
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
            <View style={styles.bareCheckboxRow}>
              <CheckBox checked={checked} />
              <Text style={[styles.bareCheckboxLabel, { color: colors.textColors.tertiary }]}>
                Bare indicator — the row owns the press
              </Text>
            </View>
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
          <MobileSectionEyebrow>Route curtain (theme.transition.style)</MobileSectionEyebrow>
          <CurtainDemo />
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Language toggle (the i18n seam)</MobileSectionEyebrow>
          <LangDemo />
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
                appName: APP_DISPLAY_NAME,
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
                    appName: APP_DISPLAY_NAME,
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
              One row (default) — overflows scroll instead of wrapping
            </Text>
            <FilterChipGroup>
              {['tag-a', 'tag-b', 'tag-c', 'tag-d', 'tag-e', 'tag-f'].map((t) => (
                <FilterChip
                  key={t}
                  label={t}
                  selected={false}
                  onPress={() => {}}
                />
              ))}
            </FilterChipGroup>
            <View style={styles.spacer} />
            <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 8 }]}>
              oneRow: false — chips flex-wrap
            </Text>
            <FilterChipGroup oneRow={false}>
              {['tag-a', 'tag-b', 'tag-c', 'tag-d', 'tag-e', 'tag-f'].map((t) => (
                <FilterChip
                  key={t}
                  label={t}
                  selected={false}
                  onPress={() => {}}
                />
              ))}
            </FilterChipGroup>
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
          <MobileSectionEyebrow rule>Figures — the labeled number, no chrome</MobileSectionEyebrow>
          {/* The figure scale's full ramp on paper: hero for the one
              per screen, display for totals, md for stat rows, sm for
              ledger facts. The unit whispers after the value. */}
          <View style={styles.figureRow}>
            <Figure value="3" unit="d" label="day streak" size="hero" tone="brand" />
          </View>
          <View style={styles.spacer} />
          <View style={styles.figureRow}>
            <Figure value="6,695" unit="kg" label="tonnage" size="display" />
            <View style={styles.figureGap} />
            <Figure value="12" label="sets" align="right" />
          </View>
          <View style={styles.spacer} />
          <View style={styles.figureRow}>
            <Figure value="00:41" label="elapsed" size="sm" />
            <View style={styles.figureGap} />
            <Figure value="6" label="lifts" size="sm" align="center" />
            <View style={styles.figureGap} />
            <Figure value="4,250" unit="kg" label="this week" size="sm" align="right" />
          </View>
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow rule>Tallies — the counting mark (TallyStrip)</MobileSectionEyebrow>
          {/* A sequence as tally strokes: struck marks are done, the
              NEXT mark is the one accent stroke, ghosts are slots
              ahead. Groups of five cross. Decoration by contract — the
              ledger beside it carries the same info as text. */}
          <View style={styles.figureRow}>
            <TallyStrip struck={2} next ghost={2} size="lg" />
          </View>
          <View style={styles.spacer} />
          <View style={styles.figureRow}>
            <TallyStrip struck={5} next ghost={2} size="sm" />
            <View style={styles.figureGap} />
            <TallyStrip struck={3} size="sm" />
            <View style={styles.figureGap} />
            <TallyStrip struck={0} next ghost={4} size="sm" />
          </View>
          <View style={styles.spacer} />
          <View style={styles.figureRow}>
            <TallyStrip struck={7} ghost={1} size="sm" animateLastStrike />
          </View>
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
          <MobileSectionEyebrow>Announcement bar</MobileSectionEyebrow>
          <MobileAnnouncementBar
            message="Pickup Friday 17–19h — details under Visit."
            actionLabel="Details"
            onAction={() => {}}
            onDismiss={() => {}}
          />
          <View style={styles.spacer} />
          <MobileAnnouncementBar
            tone="strong"
            message="Last day — the drop closes tonight at 22:00."
            onDismiss={() => {}}
          />
          <View style={styles.spacer} />
          <MobileFootnote lines={['All prices CAD. Examples shown for layout.', 'Starter shell — replace this fine print.']} />
        </View>

        <View style={styles.section}>
          <MobileSectionEyebrow>Absorbing top bar (web motion)</MobileSectionEyebrow>
          <AbsorbBarDemo />
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
        drawerStyle={demoDrawerStyle}
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

export default Showcase;
