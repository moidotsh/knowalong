// context/ThemeContext.tsx
// Theme provider + useAppTheme hook for light/dark mode switching. Night
// Metro is dark-first: the first-run default is 'dark' (the night service
// is the app's identity, not its alt mode). Users can flip to light or
// defer to the OS ('system') via Settings → Appearance; any explicit
// choice persists across sessions via localStorage (web) or
// AsyncStorage (native).
//
// `useAppTheme()` returns the resolved palette — `colors` is the live
// `theme.colors[colorScheme]` object. Components read `colors.*` directly;
// no mode indexing at the call site.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, useColorScheme as useNativeColorScheme } from 'react-native';
import { theme, STORAGE_KEYS, type ColorScheme, type ColorPalette } from '../constants';
import { isWeb, hasWindow } from '../utils/platform';
import { zustandStorage } from '../stores';
import { logger } from '../utils';

const STORAGE_KEY = STORAGE_KEYS.colorScheme;

// The learner journey's first-run scheme. The consumer experience is
// light-first ("warm paper" is the design's initial reference — see the
// `score` register in constants/theme.ts), so the boot paint is the
// daytime paper; dark (the warm-charcoal restatement) and 'system' remain
// opt-in via Settings. Previously the night service booted first.
export const DEFAULT_SCHEME_PREFERENCE: ColorSchemePreference = 'light';

// 'system' lets the user opt back in to OS-level prefers-color-scheme.
// The resolved value is then 'light' | 'dark' based on Appearance API
// (native) or matchMedia (web).
export type ColorSchemePreference = ColorScheme | 'system';

interface ThemeContextValue {
  /** The resolved color scheme — never 'system'. */
  colorScheme: ColorScheme;
  /** True when colorScheme === 'dark'. */
  isDark: boolean;
  /** The user's stored preference ('system' resolves to OS-level). */
  preference: ColorSchemePreference;
  /** Set an explicit preference. Pass 'system' to defer to OS. */
  setPreference: (pref: ColorSchemePreference) => void;
  /** Convenience: toggle between light ↔ dark (skips 'system'). */
  toggleColorScheme: () => void;
  /** The resolved palette (live `theme.colors[colorScheme]`). */
  colors: ColorPalette;
  /** Non-color tokens (spacing, fontSize, etc.) — mode-invariant. */
  spacing: typeof theme.spacing;
  fontSize: typeof theme.fontSize;
  borderRadius: typeof theme.borderRadius;
  typography: typeof theme.typography;
  /** Atmosphere language (`theme.atmosphere`) — mode-invariant. */
  atmosphere: typeof theme.atmosphere;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readSystemScheme(): ColorScheme {
  if (isWeb && hasWindow() && typeof window.matchMedia === 'function') {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } catch {
      return 'light';
    }
  }
  if (!isWeb) {
    try {
      return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }
  return 'light';
}

function resolveScheme(pref: ColorSchemePreference): ColorScheme {
  return pref === 'system' ? readSystemScheme() : pref;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const nativeScheme = useNativeColorScheme();
  // Night Metro boots dark. The stored preference (if any) replaces this
  // at hydration; before that the night service owns the first paint —
  // no light flash for the default visitor.
  const [preference, setPreferenceState] =
    useState<ColorSchemePreference>(DEFAULT_SCHEME_PREFERENCE);
  // Seed from the REAL system scheme, not just RN's useColorScheme — on
  // web it can boot null (no change event ever fires to correct it), so
  // a system-dark first visitor would be stuck in light. matchMedia /
  // Appearance are read directly; the change listener below takes over
  // from there.
  const [systemScheme, setSystemScheme] = useState<ColorScheme>(
    () => (nativeScheme === 'dark' ? 'dark' : readSystemScheme()),
  );
  const [hydrated, setHydrated] = useState(false);

  // Hydrate preference from storage on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await zustandStorage.getItem(STORAGE_KEY);
        if (!cancelled && stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      } catch (err) {
        logger.warn('ui', 'Theme preference load failed', err);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Subscribe to system scheme changes (only relevant when preference === 'system').
  useEffect(() => {
    if (isWeb && hasWindow() && typeof window.matchMedia === 'function') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => setSystemScheme(e.matches ? 'dark' : 'light');
      // R4b: addEventListener/removeEventListener pair.
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
    if (!isWeb) {
      // R4b: subscription/subscription-removal pair.
      const sub = Appearance.addChangeListener(({ colorScheme }) => {
        setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light');
      });
      return () => sub.remove();
    }
    return;
  }, []);

  const colorScheme: ColorScheme =
    preference === 'system' ? systemScheme : preference;

  const setPreference = useCallback((pref: ColorSchemePreference) => {
    setPreferenceState(pref);
    // Fire-and-forget persistence — UI updates immediately.
    void zustandStorage.setItem(STORAGE_KEY, pref).catch((err) => {
      logger.warn('ui', 'Theme preference save failed', err);
    });
  }, []);

  const toggleColorScheme = useCallback(() => {
    setPreference(colorScheme === 'dark' ? 'light' : 'dark');
  }, [colorScheme, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colorScheme,
      isDark: colorScheme === 'dark',
      preference,
      setPreference,
      toggleColorScheme,
      // The two palettes are structurally identical; index by scheme and
      // cast to the canonical `ColorPalette` shape. Consumers see one type.
      colors: theme.colors[colorScheme] as ColorPalette,
      spacing: theme.spacing,
      fontSize: theme.fontSize,
      borderRadius: theme.borderRadius,
      typography: theme.typography,
      atmosphere: theme.atmosphere,
    }),
    // `hydrated` is intentionally NOT in deps — once hydrated, the
    // preference state itself drives the value; including `hydrated`
    // would cause a one-frame flicker of the default before the
    // stored value applied.
    [colorScheme, preference, setPreference, toggleColorScheme],
  );

  // Suppress the unused-var warning for `hydrated` while it's still
  // useful for future devtools / debugging.
  void hydrated;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // s10-exempt: invariant throw for a forgotten provider.
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeProvider;
