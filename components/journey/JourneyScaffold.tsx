// components/journey/JourneyScaffold.tsx
//
// The experience's layout shell: three primary destinations bottom-nav
// on phones, left rail on desktops; wordmark + language + avatar above;
// at wide windows the screen can render a right panel (brief §14).
// Sessions never mount the scaffold — the player owns the whole screen.

import React, { useState } from 'react';
import { StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, useToast } from '../../context';
import { MobileDialog, MobileSheet, Pressable } from '../MobilePremium';
import { navigateToDevJourney } from '../../navigation';
import { useJourneyStore } from '../../stores';
import { JOURNEY_LAYOUT } from './tokens';
import PrimaryNav, { type PrimaryDestination } from './PrimaryNav';

export interface JourneyScaffoldProps {
  destination: PrimaryDestination;
  children: React.ReactNode;
  /** Right panel for ≥1280px windows (Journey's current-step panel). */
  panel?: React.ReactNode;
}

export function JourneyScaffold({ destination, children, panel }: JourneyScaffoldProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const score = colors.score;
  const { showToast } = useToast();
  const resetDemo = useJourneyStore((s) => s.resetDemo);
  const prefs = useJourneyStore((s) => s.prefs);
  const setAudioSimulation = useJourneyStore((s) => s.setAudioSimulation);
  const setOfflineSimulation = useJourneyStore((s) => s.setOfflineSimulation);

  const [menuVisible, setMenuVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const railMode = width >= 1024;
  const wideShell = width >= 1280;
  const railWidth = wideShell ? JOURNEY_LAYOUT.railWide : JOURNEY_LAYOUT.railNarrow;

  const openMenu = () => setMenuVisible(true);

  const doReset = () => {
    setConfirmReset(false);
    setMenuVisible(false);
    resetDemo();
    showToast('info', 'Demo reset — back to the returning learner.');
  };

  const sheets = (
    <>
      <JourneyMenuSheet
        visible={menuVisible}
        onOpenChange={setMenuVisible}
        onSettings={() => {
          setMenuVisible(false);
          setSettingsOpen(true);
        }}
        onAbout={() => {
          setMenuVisible(false);
          setAboutOpen(true);
        }}
        onReset={() => {
          setMenuVisible(false);
          setConfirmReset(true);
        }}
        onDevScenarios={() => {
          setMenuVisible(false);
          navigateToDevJourney();
        }}
      />
      <SettingsSheet
        visible={settingsOpen}
        onOpenChange={setSettingsOpen}
        audioSimulation={prefs.audioSimulation}
        offlineSimulation={prefs.offlineSimulation}
        onAudioSimulation={setAudioSimulation}
        onOfflineSimulation={setOfflineSimulation}
      />
      <AboutSheet visible={aboutOpen} onOpenChange={setAboutOpen} />
      <MobileDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset the demo?"
        primaryLabel="Reset"
        showSecondary
        secondaryLabel="Keep going"
        onPrimary={doReset}
      >
        This clears only the prototype’s progress on this device — the
        returning learner starts Chapter 02 again. Your other app data is
        untouched.
      </MobileDialog>
    </>
  );

  const topBar = (
    <View
      style={[
        styles.topBar,
        {
          backgroundColor: score.canvas,
          borderBottomColor: score.rule,
          paddingTop: insets.top + 8,
        },
      ]}
    >
      {/* In rail mode the wordmark lives in the left rail — the main
          column's bar carries only the language chip. */}
      {!railMode && (
        <Text style={[styles.wordmark, { color: score.ink }]}>KnowAlong</Text>
      )}
      <View style={styles.topBarRight}>
        <View style={[styles.langChip, { borderColor: score.ruleStrong }]}>
          <Text style={[styles.langChipText, { color: score.inkSecondary }]}>RU</Text>
        </View>
        {!railMode && (
          <Pressable
            onPress={openMenu}
            accessibilityRole="button"
            accessibilityLabel="Your profile and settings"
            style={({ pressed }) => [
              styles.avatarButton,
              { borderColor: score.ruleStrong },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.avatarText, { color: score.accentDeep }]}>K</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  if (railMode) {
    return (
      <View style={[styles.shell, { backgroundColor: score.canvas }]}>
        <View style={styles.railRow}>
          <View style={[styles.railColumn, { width: railWidth }]}>
            <View style={[styles.railWordmark, { paddingTop: insets.top + 12 }]}>
              <Text style={[styles.wordmark, styles.wordmarkRail, { color: score.ink }]}>
                KnowAlong
              </Text>
              <Text style={[styles.railLanguage, { color: score.inkTertiary }]}>Russian</Text>
            </View>
            <View style={styles.railNavWrap}>
              <PrimaryNav active={destination} onAvatarPress={openMenu} variant="rail" />
            </View>
            <View style={styles.railFooter}>
              <Text style={[styles.demoNote, { color: score.inkTertiary }]}>Demo content</Text>
            </View>
          </View>
          <View style={styles.railMainColumn}>
            {topBar}
            <View style={styles.railMainRow}>
              <View style={styles.mainBody}>{children}</View>
              {wideShell && panel != null ? <View
                  style={[
                    styles.panelColumn,
                    {
                      width: JOURNEY_LAYOUT.panelWidth,
                      backgroundColor: score.paper,
                      borderColor: score.rule,
                    },
                  ]}
                >
                  {panel}
                </View> : null}
            </View>
          </View>
        </View>
        {sheets}
      </View>
    );
  }

  return (
    <View style={[styles.shell, { backgroundColor: score.canvas }]}>
      {topBar}
      <View style={styles.mobileColumn}>
        <View style={styles.mainBody}>{children}</View>
        <PrimaryNav
          active={destination}
          onAvatarPress={openMenu}
          variant="bar"
        />
      </View>
      {sheets}
    </View>
  );
}

// ── Avatar menu ──────────────────────────────────────────────────────────

interface MenuSheetProps {
  visible: boolean;
  onOpenChange: (open: boolean) => void;
  onSettings: () => void;
  onAbout: () => void;
  onReset: () => void;
  onDevScenarios: () => void;
}

function JourneyMenuSheet({
  visible,
  onOpenChange,
  onSettings,
  onAbout,
  onReset,
  onDevScenarios,
}: MenuSheetProps) {
  const { colors } = useAppTheme();
  const score = colors.score;
  const { showToast } = useToast();
  return (
    <MobileSheet open={visible} onOpenChange={onOpenChange} title="Your space" anchor="bottom">
      <View style={styles.menuBody}>
        <MenuRow
          label="Profile"
          note="A demo profile — data lives on this device only."
          onPress={() => showToast('info', 'The demo profile stays on this device.')}
        />
        <MenuRow label="Settings" note="Audio and connection simulation." onPress={onSettings} />
        <MenuRow label="Reset demo" note="Back to the returning learner." onPress={onReset} />
        <MenuRow label="About this prototype" note="What is and isn’t real here." onPress={onAbout} />
        <MenuRow
          label="Dev — scenario picker"
          note="Jump between demo learner states."
          onPress={onDevScenarios}
        />
        <Text style={[styles.menuFootnote, { color: score.inkTertiary }]}>
          Demo content — no account, no charge, nothing leaves this device.
        </Text>
      </View>
    </MobileSheet>
  );
}

function MenuRow({
  label,
  note,
  onPress,
}: {
  label: string;
  note: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const score = colors.score;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.menuRow,
        { borderBottomColor: score.rule },
        pressed && { backgroundColor: score.accentWash },
      ]}
    >
      <Text style={[styles.menuRowLabel, { color: score.ink }]}>{label}</Text>
      <Text style={[styles.menuRowNote, { color: score.inkTertiary }]}>{note}</Text>
    </Pressable>
  );
}

// ── Settings sheet ───────────────────────────────────────────────────────

interface SettingsSheetProps {
  visible: boolean;
  onOpenChange: (open: boolean) => void;
  audioSimulation: 'auto' | 'off';
  offlineSimulation: boolean;
  onAudioSimulation: (mode: 'auto' | 'off') => void;
  onOfflineSimulation: (on: boolean) => void;
}

function SettingsSheet({
  visible,
  onOpenChange,
  audioSimulation,
  offlineSimulation,
  onAudioSimulation,
  onOfflineSimulation,
}: SettingsSheetProps) {
  const { colors } = useAppTheme();
  const score = colors.score;
  return (
    <MobileSheet open={visible} onOpenChange={onOpenChange} title="Settings" anchor="bottom">
      <View style={styles.menuBody}>
        <View style={[styles.settingRow, { borderBottomColor: score.rule }]}>
          <View style={styles.settingText}>
            <Text style={[styles.menuRowLabel, { color: score.ink }]}>Audio</Text>
            <Text style={[styles.menuRowNote, { color: score.inkTertiary }]}>
              {audioSimulation === 'off'
                ? 'Off in this demo — the reader says so honestly.'
                : 'Plays when the device supports it; never faked.'}
            </Text>
          </View>
          <Switch
            value={audioSimulation === 'auto'}
            onValueChange={(on) => onAudioSimulation(on ? 'auto' : 'off')}
            trackColor={{ true: score.accent, false: score.ruleStrong }}
          />
        </View>
        <View style={[styles.settingRow, { borderBottomColor: score.rule }]}>
          <View style={styles.settingText}>
            <Text style={[styles.menuRowLabel, { color: score.ink }]}>Offline (simulated)</Text>
            <Text style={[styles.menuRowNote, { color: score.inkTertiary }]}>
              Shows how preparation fails and retries without a connection.
            </Text>
          </View>
          <Switch
            value={offlineSimulation}
            onValueChange={onOfflineSimulation}
            trackColor={{ true: score.accent, false: score.ruleStrong }}
          />
        </View>
      </View>
    </MobileSheet>
  );
}

// ── About sheet ──────────────────────────────────────────────────────────

function AboutSheet({
  visible,
  onOpenChange,
}: {
  visible: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { colors } = useAppTheme();
  const score = colors.score;
  return (
    <MobileSheet
      open={visible}
      onOpenChange={onOpenChange}
      title="About this prototype"
      anchor="bottom"
    >
      <View style={styles.aboutBody}>
        <Text style={[styles.aboutText, { color: score.inkSecondary }]}>
          Every text here is original practice material written for this
          prototype. “City lights”, “Northern platform” and “Last metro home”
          are not real songs or publications, and no real artist is implied.
        </Text>
        <Text style={[styles.aboutText, { color: score.inkSecondary }]}>
          Purchases are a veneer: the $2.99 unlock is labelled “Demo purchase —
          no charge” and nothing is billed. Audio plays only when the device
          offers it and is never faked. Progress, notebook and drafts live in
          this app’s storage on this device.
        </Text>
      </View>
    </MobileSheet>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  shell: { flex: 1 } as const,
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as const,
  wordmark: { fontSize: 17, fontWeight: '700', letterSpacing: 0.2 } as const,
  wordmarkRail: { fontSize: 16 } as const,
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 } as const,
  langChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  } as const,
  langChipText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 } as const,
  avatarButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  avatarText: { fontSize: 14, fontWeight: '700' } as const,
  mobileColumn: { flex: 1, flexDirection: 'column', minHeight: 0 } as const,
  mainBody: { flex: 1, minHeight: 0 } as const,
  railRow: { flex: 1, flexDirection: 'row' } as const,
  railColumn: {
    height: '100%',
  } as const,
  railWordmark: { paddingHorizontal: 16, paddingBottom: 12 } as const,
  railLanguage: { fontSize: 12, marginTop: 2 } as const,
  railNavWrap: { flex: 1 } as const,
  railFooter: { padding: 16 } as const,
  demoNote: { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' } as const,
  railMainColumn: { flex: 1, flexDirection: 'column', minWidth: 0 } as const,
  railMainRow: { flex: 1, flexDirection: 'row', minHeight: 0 } as const,
  panelColumn: {
    height: '100%',
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    paddingHorizontal: 14,
  } as const,
  menuBody: { paddingHorizontal: 16, paddingBottom: 24, gap: 2 } as const,
  menuRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as const,
  menuRowLabel: { fontSize: 16, fontWeight: '600' } as const,
  menuRowNote: { fontSize: 13, marginTop: 2 } as const,
  menuFootnote: { fontSize: 12, marginTop: 12, lineHeight: 18 } as const,
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as const,
  settingText: { flex: 1 } as const,
  aboutBody: { paddingHorizontal: 16, paddingBottom: 24 } as const,
  aboutText: { fontSize: 14, lineHeight: 21, marginBottom: 12 } as const,
});

export default JourneyScaffold;
