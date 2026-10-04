// components/journey/PrimaryNav.tsx
//
// The three primary destinations — Journey, Collection, Notebook — plus
// the avatar. Bottom bar on phone/tablet, left rail on desktop (brief
// §3). Tab movement uses the replace-semantics switchers in
// NavigationHelper; sessions never render this nav at all.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../context';
import { Pressable } from '../MobilePremium';
import {
  NavigationPath,
  switchToCollection,
  switchToJourney,
  switchToNotebook,
} from '../../navigation';
import { LABEL_TRACKING } from './tokens';

export type PrimaryDestination = 'journey' | 'collection' | 'notebook';

export interface PrimaryNavProps {
  active: PrimaryDestination;
  /** Avatar press — opens the profile/settings sheet (owner of placement). */
  onAvatarPress: () => void;
  /** 'bar' (bottom, phone) or 'rail' (left, desktop). */
  variant: 'bar' | 'rail';
}

const DESTINATIONS: Array<{
  key: PrimaryDestination;
  path: NavigationPath;
  label: string;
  glyph: string;
  switch: () => void;
}> = [
  { key: 'journey', path: NavigationPath.JOURNEY, label: 'Journey', glyph: '𝄞', switch: switchToJourney },
  { key: 'collection', path: NavigationPath.COLLECTION, label: 'Collection', glyph: '❏', switch: switchToCollection },
  { key: 'notebook', path: NavigationPath.NOTEBOOK, label: 'Notebook', glyph: '✎', switch: switchToNotebook },
];

export function PrimaryNav({ active, onAvatarPress, variant }: PrimaryNavProps) {
  const { colors } = useAppTheme();
  const score = colors.score;
  const rail = variant === 'rail';

  return (
    <View
      style={[
        rail ? styles.rail : styles.bar,
        rail
          ? { backgroundColor: score.canvas, borderRightColor: score.rule }
          : { backgroundColor: score.paper, borderTopColor: score.rule },
      ]}
      accessibilityRole="tablist"
    >
      {DESTINATIONS.map((destination) => {
        const isActive = destination.key === active;
        return (
          <Pressable
            key={destination.key}
            onPress={destination.switch}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={destination.label}
            style={({ pressed }) => [
              rail ? styles.railItem : styles.barItem,
              rail && isActive && { backgroundColor: score.accentWash },
              pressed && { opacity: 0.7 },
            ]}
          >
            {rail ? (
              <View style={styles.railItemInner}>
                <Text
                  style={[
                    styles.railGlyph,
                    { color: isActive ? score.accent : score.inkSecondary },
                  ]}
                >
                  {destination.glyph}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.railLabel,
                    { color: isActive ? score.ink : score.inkSecondary },
                  ]}
                >
                  {destination.label}
                </Text>
                {isActive ? <View
                    style={[
                      styles.railIndicator,
                      { backgroundColor: score.accent },
                    ]}
                  /> : null}
              </View>
            ) : (
              <View style={styles.barItemInner}>
                <Text
                  style={[
                    styles.barGlyph,
                    { color: isActive ? score.accent : score.inkTertiary },
                  ]}
                >
                  {destination.glyph}
                </Text>
                <Text
                  style={[
                    styles.barLabel,
                    { color: isActive ? score.ink : score.inkTertiary },
                  ]}
                >
                  {destination.label}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}

      {/* Avatar — the profile/settings entry (brief §3: behind the avatar). */}
      <Pressable
        onPress={onAvatarPress}
        accessibilityRole="button"
        accessibilityLabel="Your profile and settings"
        style={({ pressed }) => [
          styles.avatar,
          rail && styles.avatarRail,
          { borderColor: score.ruleStrong },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={[styles.avatarText, { color: score.accentDeep }]}>K</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 6,
    paddingTop: 6,
  } as const,
  barItem: { flex: 1, alignItems: 'center', justifyContent: 'center' } as const,
  barItemInner: { alignItems: 'center', gap: 2 } as const,
  barGlyph: { fontSize: 20, lineHeight: 24 } as const,
  barLabel: {
    fontSize: 11,
    letterSpacing: LABEL_TRACKING / 2,
    fontWeight: '600',
  } as const,
  rail: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 2,
    paddingTop: 8,
    paddingRight: 8,
    borderRightWidth: StyleSheet.hairlineWidth,
  } as const,
  railItem: { borderRadius: 8 } as const,
  railItemInner: {
    // Icon + label share one row in the rail — the stacked look belongs to
    // the phone's bottom bar only.
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 10,
    position: 'relative',
  } as const,
  railGlyph: { fontSize: 15, lineHeight: 20 } as const,
  railLabel: { fontSize: 14, fontWeight: '600' } as const,
  railIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 2,
    borderRadius: 1,
  } as const,
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 6,
    backgroundColor: 'transparent',
  } as const,
  avatarRail: { marginTop: 12, alignSelf: 'flex-start', marginLeft: 12 } as const,
  avatarText: { fontSize: 14, fontWeight: '700' } as const,
});

export default PrimaryNav;
