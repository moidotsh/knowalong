// components/MobilePremium/showcase/data.ts
// Shared showcase data — the 7 atmosphere surfaces looped by the
// Atmospheres section, and the theme-preference chips.
import React from 'react';
import { Sun, Moon, Monitor } from '@tamagui/lucide-icons-2';
import type { AtmosphereSurface } from '../../premium/shared';
import type { ColorSchemePreference } from '../../../context';

export const SURFACES: AtmosphereSurface[] = [
  'auth',
  'setup',
  'training',
  'goal',
  'instructions',
  'privacy',
  'analytics',
];

export const PREFERENCE_OPTIONS: ReadonlyArray<{
  value: ColorSchemePreference;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
}> = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

// The absorb demo's pinned-strip height — shared by the demo component
// and its styles.
export const ABSORB_DEMO_BAR_H = 56;
