// components/journey/session/SessionShell.tsx
//
// The one player's frame — used by every session kind. No bottom nav, no
// scaffold: the session owns the whole screen (brief §3). Carries the
// quiet ledger (where you are, what it's from), the exit that keeps your
// place, and the help entry that records assistance honestly.

import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../context';
import { theme } from '../../../constants';
import { MobileDialog, MobileSheet, Pressable } from '../../MobilePremium';
import { LABEL_TRACKING } from '../tokens';

export interface SessionShellProps {
  title: string;
  sourceLabel: string;
  /** 1-based position within the session. */
  index: number;
  total: number;
  onExit: () => void;
  helpUsed: boolean;
  /** Side-channel when help opens (the sheet itself is owned here). */
  onOpenHelp?: () => void;
  helpContent?: React.ReactNode;
  children: React.ReactNode;
  /** Sticky Check/Continue area (MobileActionFooter). */
  footer?: React.ReactNode;
}

export function SessionShell({
  title,
  sourceLabel,
  index,
  total,
  onExit,
  helpUsed,
  onOpenHelp,
  helpContent,
  children,
  footer,
}: SessionShellProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const fonts = theme.fonts;
  const score = colors.score;
  const [confirmExit, setConfirmExit] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <View style={[styles.screen, { backgroundColor: score.canvas, paddingTop: insets.top }]}>
      {/* One centered content column — on desktop the player reads as a
          focused sheet, not a full-bleed stretch (brief §14). */}
      <View style={styles.contentColumn}>
        {/* Ledger bar */}
        <View style={[styles.ledger, { borderBottomColor: score.rule }]}>
          <Pressable
            onPress={() => setConfirmExit(true)}
            accessibilityRole="button"
            accessibilityLabel="Leave the session — your place is kept"
            style={({ pressed }) => [styles.exitButton, pressed && { opacity: 0.6 }]}
          >
            <Text style={[styles.exitGlyph, { color: score.inkSecondary }]}>✕</Text>
          </Pressable>
          <View style={styles.ledgerCenter}>
            <Text style={[styles.ledgerTitle, { color: score.ink }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[styles.ledgerSource, { color: score.inkTertiary }]} numberOfLines={1}>
              {sourceLabel}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              onOpenHelp?.();
              setHelpOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Help — what can I do here?"
            style={({ pressed }) => [styles.helpButton, pressed && { opacity: 0.6 }]}
          >
            <Text
              style={[
                styles.helpGlyph,
                { color: helpUsed ? score.warmNote : score.inkSecondary, fontFamily: fonts.serif },
              ]}
            >
              ?
            </Text>
          </Pressable>
        </View>

        {/* Progress rule */}
        <View style={[styles.progressRow, { paddingHorizontal: 20 }]}>
          <Text style={[styles.progressText, { color: score.inkTertiary }]}>
            {index} of {total}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: score.rule }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: score.accent, width: `${Math.round((index / Math.max(total, 1)) * 100)}%` },
              ]}
            />
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>{children}</View>

        {/* The action row never sits on the viewport's last pixel: the
            shell owns the frame, so it insets the caller's footer — side
            padding to match the content rhythm, and the bottom safe area
            (≥16px, the MobileActionFooter law) so Check/Continue keep
            breathing room above the screen's edge. */}
        {footer != null ? (
          <View style={[styles.footerPlate, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {footer}
          </View>
        ) : null}
      </View>

      <MobileDialog
        open={confirmExit}
        onOpenChange={setConfirmExit}
        title="Leave the session?"
        primaryLabel="Keep going"
        showSecondary
        secondaryLabel="Leave, keep my place"
        onSecondary={() => {
          setConfirmExit(false);
          onExit();
        }}
        onPrimary={() => setConfirmExit(false)}
      >
        Your place stays where it is — come back and pick up from the same
        card. Nothing is graded from a half-finished session.
      </MobileDialog>

      <MobileSheet
        open={helpOpen}
        onOpenChange={setHelpOpen}
        title="Help in this session"
        anchor="bottom"
      >
        <View style={styles.helpBody}>
          {helpContent}
          <Text style={[styles.helpNote, { color: score.inkTertiary }]}>
            Using help never counts as recall — the notebook keeps the
            difference honest. Sessions end; nothing here is graded against
            you.
          </Text>
        </View>
      </MobileSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, flexDirection: 'column' } as const,
  // The player's material is a focused column — phones fill it, wide
  // windows center it (no full-bleed stretch on desktop).
  contentColumn: {
    flex: 1,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  } as const,
  ledger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as const,
  exitButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  exitGlyph: { fontSize: 16 } as const,
  ledgerCenter: { flex: 1, alignItems: 'center', minWidth: 0 } as const,
  ledgerTitle: { fontSize: 15, fontWeight: '600' } as const,
  ledgerSource: {
    fontSize: 11,
    letterSpacing: LABEL_TRACKING / 2,
    textTransform: 'uppercase',
    marginTop: 1,
    fontWeight: '600',
  } as const,
  helpButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  helpGlyph: { fontSize: 17, fontWeight: '700' } as const,
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    paddingBottom: 4,
  } as const,
  progressText: {
    fontSize: 11,
    letterSpacing: LABEL_TRACKING,
    textTransform: 'uppercase',
    fontWeight: '600',
  } as const,
  progressTrack: { flex: 1, height: 2, borderRadius: 1, overflow: 'hidden' } as const,
  progressFill: { height: '100%' } as const,
  // The activity cards share the shell's 20px gutter — without it the
  // reveal card's eyebrow and big word sit flush against the phone's edge.
  body: { flex: 1, minHeight: 0, paddingHorizontal: 20 } as const,
  footerPlate: {
    paddingTop: 12,
    paddingHorizontal: 20,
  } as const,
  helpBody: { paddingHorizontal: 16, paddingBottom: 24 } as const,
  helpNote: { fontSize: 13, lineHeight: 19, marginTop: 14 } as const,
});

export default SessionShell;
