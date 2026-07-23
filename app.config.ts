// app.config.ts
// KnowAlong is PWA-first; native export is an intentional consumer extension.
// Static export produces `dist/` (the supported default). The native fields
// below (`icon`, `ios`, `android`, `expo-splash-screen` plugin) establish
// configuration-and-asset groundwork for a future consumer native extension;
// placeholder PNGs at `./assets/` and the `ios.bundleIdentifier` value
// `app.knowalong` are starter scaffolding — the consumer replaces them with
// brand artwork and their own iOS bundle ID + Android application ID before
// any native release. Runtime manifest-injection in `app/_layout.tsx`
// remains load-bearing for PWA installability — see
// `docs/architecture/pwa-installability.md`.
import type { ExpoConfig, ConfigContext } from '@expo/config';

const config: ExpoConfig = {
  name: 'knowalong',
  slug: 'knowalong',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  scheme: 'knowalong',
  ios: {
    supportsTablet: true,
    newArchEnabled: true,
    bundleIdentifier: 'app.knowalong',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      // s7-exempt — build-time Expo config; no runtime theme surface available
      backgroundColor: '#FFFFFF',
    },
    edgeToEdgeEnabled: true,
    newArchEnabled: true,
  },
  web: {
    output: 'static',
    bundler: 'metro',
    buildMode: 'production',
    javascriptEnabled: true,
  },
  plugins: [
    'expo-router',
    '@react-native-community/datetimepicker',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        // s7-exempt — build-time Expo config; no runtime theme surface available
        backgroundColor: '#FFFFFF',
        imageWidth: 200,
        resizeMode: 'contain',
      },
    ],
  ],
  extra: {
    router: {},
    eas: {
      projectId: '',
    },
  },
};

export default config;
