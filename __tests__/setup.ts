import { vi } from 'vitest';

// Import jest-dom with vitest setup - must come after vi import.
import '@testing-library/jest-dom/vitest';

// Define React Native globals expected by utils/logger.ts and several
// hooks/contexts. Vitest's jsdom env does not define __DEV__, so any
// module that references it bare would throw `ReferenceError: __DEV__ is not
// defined` at import time — failing every test that transitively pulls in
// utils/, services/, context/, or stores. `false` mirrors the production code path.
(globalThis as any).__DEV__ = false;

// Mock AsyncStorage.
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
    getAllKeys: vi.fn(() => Promise.resolve([])),
    multiGet: vi.fn(() => Promise.resolve([])),
    multiSet: vi.fn(() => Promise.resolve()),
    multiRemove: vi.fn(() => Promise.resolve()),
  },
}));

// React Native is mocked via resolve.alias → __mocks__/react-native.ts in
// vitest.config.ts. Do NOT add a vi.mock('react-native', ...) here: the two
// would race and the inline factory would shadow the alias-resolved file,
// which is where the host-component forwardRef mocks live (the ones that
// resolve function-style `style` props and stringify accessibilityState).
// Keep this file for the modules that don't have a dedicated __mocks__ file.

// Mock react-native-safe-area-context. Required the moment any test pulls
// in the MobilePremium barrel: MobileNavDrawer imports useSafeAreaInsets,
// and the real package's JS distribution pulls in react-native's Flow-
// syntax index.js, which vitest's transform can't parse. Mock must
// register before the first indirect import resolves.
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: vi.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
  useSafeAreaFrame: vi.fn(() => ({ x: 0, y: 0, width: 1024, height: 768 })),
}));

// Mock expo modules.
vi.mock('expo-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    navigate: vi.fn(),
  })),
  useLocalSearchParams: vi.fn(() => ({})),
  useGlobalSearchParams: vi.fn(() => ({})),
  usePathname: vi.fn(() => '/'),
  Link: 'Link',
  router: {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    navigate: vi.fn(),
  },
  Stack: {
    Screen: 'Screen',
  },
  Tabs: {
    Screen: 'Screen',
  },
}));

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-anon-key',
      },
    },
  },
}));

vi.mock('expo-crypto', () => ({
  digestStringAsync: vi.fn(() => Promise.resolve('hashed-value')),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
  },
  CryptoEncoding: {
    HEX: 'HEX',
  },
}));

vi.mock('expo-haptics', () => ({
  default: {
    impactAsync: vi.fn(),
    notificationAsync: vi.fn(),
    selectionAsync: vi.fn(),
    ImpactFeedbackStyle: {
      Light: 'Light',
      Medium: 'Medium',
      Heavy: 'Heavy',
    },
  },
}));

// Mock expo-secure-store with an in-memory backing Map so credential
// read/write/clear cycles round-trip within a test. The previous no-op
// mock silently swallowed writes, which made any code that relied on
// read-after-write (e.g. utils/companion/credential.ts) untestable.
const secureStoreBacking = new Map<string, string>();
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn((key: string) =>
    Promise.resolve(secureStoreBacking.has(key) ? secureStoreBacking.get(key)! : null),
  ),
  setItemAsync: vi.fn((key: string, value: string) => {
    secureStoreBacking.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: vi.fn((key: string) => {
    secureStoreBacking.delete(key);
    return Promise.resolve();
  }),
  // Test-only reset hook: invoked from beforeEach in credential tests.
  __resetForTests: () => secureStoreBacking.clear(),
}));

// Mock expo-clipboard. Required because the hooks barrel re-exports
// useCopyForAi, which imports expo-clipboard. Without this mock, any
// test that pulls in @hooks/ would try to load expo-modules-core's
// EventEmitter, which vitest's jsdom env can't resolve.
vi.mock('expo-clipboard', () => ({
  setStringAsync: vi.fn(() => Promise.resolve(true)),
  getStringAsync: vi.fn(() => Promise.resolve('')),
}));

// Mock tamagui.
vi.mock('tamagui', () => ({
  View: 'View',
  Text: 'Text',
  XStack: 'XStack',
  YStack: 'YStack',
  ZStack: 'ZStack',
  Spacer: 'Spacer',
  ScrollView: 'ScrollView',
  Input: 'Input',
  TextArea: 'TextArea',
  Button: 'Button',
  Switch: 'Switch',
  Label: 'Label',
  Paragraph: 'Paragraph',
  H1: 'H1',
  H2: 'H2',
  H3: 'H3',
  H4: 'H4',
  H5: 'H5',
  H6: 'H6',
  Spinner: 'Spinner',
  Image: 'Image',
  useTheme: vi.fn(() => ({
    name: 'light',
  })),
  useMedia: vi.fn(() => ({
    sm: false,
    md: true,
    lg: false,
    xl: false,
  })),
  themed: vi.fn((component) => component),
  createTamagui: vi.fn((config) => config),
  config: {},
  TamaguiProvider: ({ children }: { children: React.ReactNode }) => children,
  SizableText: 'SizableText',
  Circle: 'Circle',
  Square: 'Square',
  Stack: 'Stack',
  Theme: 'Theme',
}));

vi.mock('@tamagui/lucide-icons-2', () => ({
  ChevronRight: 'ChevronRight',
  ChevronLeft: 'ChevronLeft',
  ChevronDown: 'ChevronDown',
  ChevronUp: 'ChevronUp',
  Check: 'Check',
  X: 'X',
  Plus: 'Plus',
  Minus: 'Minus',
  Settings: 'Settings',
  User: 'User',
  Home: 'Home',
  Calendar: 'Calendar',
  Clock: 'Clock',
  Info: 'Info',
  AlertCircle: 'AlertCircle',
  HelpCircle: 'HelpCircle',
  Trash: 'Trash',
  Edit: 'Edit',
  Save: 'Save',
  Upload: 'Upload',
  Download: 'Download',
  RefreshCw: 'RefreshCw',
  Eye: 'Eye',
  EyeOff: 'EyeOff',
  Lock: 'Lock',
  Unlock: 'Unlock',
  Sun: 'Sun',
  Moon: 'Moon',
  Monitor: 'Monitor',
  ClipboardCopy: 'ClipboardCopy',
  Menu: 'Menu',
  Bell: 'Bell',
  Mail: 'Mail',
  Search: 'Search',
  Package: 'Package',
  TrendingUp: 'TrendingUp',
}));

// Mock @supabase/supabase-js.
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      recoverSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      setSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    },
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })),
}));

// Global test utilities.
// Class form (not vi.fn().mockImplementation) so `new ResizeObserver(...)` is
// a real constructor call — required by hooks/useContainerQuery.ts. Vitest's
// mock-implementation fn is not constructable in newer V8 under jsdom.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// Mock window.matchMedia.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Suppress console errors in tests unless explicitly asserted.
vi.spyOn(console, 'error').mockImplementation(() => {});
