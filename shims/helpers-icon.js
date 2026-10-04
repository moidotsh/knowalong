// shims/helpers-icon.js — the provider-less passthrough for
// @tamagui/helpers-icon's themed() wrapper.
//
// WHY: every @tamagui/lucide-icons-2 icon module wraps its inner
// component in themed(), which resolves Tamagui theme tokens at render —
// and THROWS ("Missing theme.") without a TamaguiProvider mounted. The
// starter ships zero Tamagui components (MobilePremium is hand-rolled
// RN; the shell themes itself via ThemeProvider), so _layout mounts no
// TamaguiProvider and every icon call site passes explicit color+size.
// metro.config.js resolves the exact specifier here, so the whole
// Tamagui runtime (~0.8MB: themes, colors, fonts, the component
// universe) leaves the bundle while icons render identically — the
// inner components are self-sufficient (defaults: color="black",
// size=24, strokeWidth=2).
//
// WANTING TAMAGUI BACK: re-mount TamaguiProvider in app/_layout.tsx
// (provider + `config from '../tamagui.config'`, ~10 lines — see the
// consumer guide), AND remove this redirect — themed() needs its real
// implementation under a provider. Pass explicit color/size at every
// icon call site and this shim is invisible either way.

export const themed = (Component) => Component;
