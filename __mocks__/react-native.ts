// Mock for react-native to avoid Flow syntax issues in vitest.
// Wired via resolve.alias in vitest.config.ts — every `import ... from
// 'react-native'` resolves here. The vi.mock('react-native', ...) in
// __tests__/setup.ts is intentionally omitted: this file is the single
// source of truth for the RN mock surface.
//
// Why host() exists: the previous mock exported string tags ('View',
// 'Pressable', ...) which let React DOM render custom elements but broke
// in two ways that mattered for the MobilePremium test suite:
//   1. `style={({ pressed }) => [...]}` (Pressable's function-style prop)
//      was passed through verbatim — React DOM rejected it with
//      "The `style` prop expects a mapping from style properties to values,
//      not a string" because it stringified the function.
//   2. `accessibilityState={{ expanded: true }}` (an object) never reached
//      the DOM as an attribute, so tests couldn't query it via
//      getAttribute('accessibilitystate') or querySelector.
// host() wraps each host component in a forwardRef that resolves the
// function-style prop with { pressed: false } and stringifies
// accessibilityState as `key:value,...` so tests can query the resulting
// attribute. For touchable types (Pressable, TouchableOpacity, ...),
// onPress/onPressIn/onPressOut/onLongPress are translated to DOM event
// handlers so fireEvent.click and fireEvent.contextMenu work.

import React, { forwardRef } from 'react';

type AnyProps = Record<string, any>;

// Resolve function-style `style` prop. Pressable allows `style` to be a
// function of { pressed: boolean }; we evaluate with pressed:false (the
// rest state). Object and array forms pass through unchanged.
function resolveStyle(style: unknown): unknown {
  if (typeof style === 'function') {
    try {
      return (style as (s: { pressed: boolean }) => unknown)({ pressed: false });
    } catch {
      return undefined;
    }
  }
  return style;
}

// Stringify accessibilityState object as `key:value,key:value` so tests can
// match via getAttribute('accessibilitystate') or querySelector. RN's
// accessibilityState values are primitives (boolean/number), so String()
// is safe.
function stringifyA11yState(state: unknown): string | undefined {
  if (!state || typeof state !== 'object') return undefined;
  const entries = Object.entries(state as Record<string, unknown>);
  if (entries.length === 0) return undefined;
  return entries.map(([k, v]) => `${k}:${String(v)}`).join(',');
}

// Strip and re-flatten RN-specific props to DOM-friendly shapes. Returns
// the remaining props (style resolved, accessibilityState stringified under
// the lowercase DOM attribute name, and boolean a11y props coerced to
// 'true'/'false' strings so React renders them as DOM attributes that
// querySelector can match — without this, `accessibilityElementsHidden`
// (boolean true) never lands as a DOM attribute and tests can't assert it).
function flattenProps(props: AnyProps): AnyProps {
  if (!props) return {};
  const { style, accessibilityState, ...rest } = props;
  const flat: AnyProps = { ...rest };
  const resolvedStyle = resolveStyle(style);
  if (resolvedStyle !== undefined && resolvedStyle !== null) {
    flat.style = resolvedStyle;
  }
  const state = stringifyA11yState(accessibilityState);
  if (state) {
    flat.accessibilitystate = state;
  }
  for (const key of Object.keys(flat)) {
    if (key.startsWith('accessibility') && typeof flat[key] === 'boolean') {
      flat[key] = flat[key] ? 'true' : 'false';
    }
  }
  return flat;
}

// Build a host component mock. `touchable` enables onPress → onClick
// (and related) translation so React Testing Library's fireEvent works.
function host(tagName: string, opts: { touchable?: boolean } = {}) {
  const Component = forwardRef<unknown, AnyProps>((props, ref) => {
    const {
      onPress,
      onPressIn,
      onPressOut,
      onLongPress,
      disabled,
      ...rest
    } = props ?? {};
    const flat = flattenProps(rest);
    const finalProps: AnyProps = { ...flat };
    if (ref !== null && ref !== undefined) {
      finalProps.ref = ref;
    }
    if (disabled === true) {
      finalProps.disabled = true;
    } else if (opts.touchable) {
      if (typeof onPress === 'function') finalProps.onClick = onPress;
      if (typeof onPressIn === 'function') finalProps.onMouseDown = onPressIn;
      if (typeof onPressOut === 'function') finalProps.onMouseUp = onPressOut;
      if (typeof onLongPress === 'function') finalProps.onContextMenu = onLongPress;
    }
    return React.createElement(tagName, finalProps);
  });
  return Component;
}

export const Platform = {
  OS: 'web',
  select: <T>(obj: Record<string, T>) => obj.web || obj.default,
  Version: '1.0.0',
  isTesting: true,
};

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T) => styles,
  flatten: (style: unknown) => style,
  hairlineWidth: 1,
  absoluteFill: { position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 },
  absoluteFillObject: { position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 },
};

export const Dimensions = {
  get: () => ({ width: 1024, height: 768 }),
  addEventListener: () => ({ remove: () => {} }),
  removeEventListener: () => {},
  set: () => {},
};

export const Alert = {
  alert: () => {},
};

export const Keyboard = {
  dismiss: () => {},
  addListener: () => ({ remove: () => {} }),
  removeListener: () => {},
  dismissAll: () => {},
};

// Host component mocks. Tag names are lowercase so they round-trip cleanly
// through jsdom as custom elements; querySelector('pressable') and similar
// tag-name selectors still work. React 19 renders unknown props as
// attributes on custom elements, so accessibilityRole and accessibilityLabel
// are queryable via [accessibilityrole="..."] and getAttribute('accessibilitylabel').
export const View = host('view');
export const Text = host('text');
export const TextInput = host('textinput');
export const ScrollView = host('scrollview');
export const TouchableOpacity = host('touchableopacity', { touchable: true });
export const TouchableHighlight = host('touchablehighlight', { touchable: true });
export const TouchableWithoutFeedback = host('touchablewithoutfeedback', { touchable: true });
export const Image = host('image');
export const ActivityIndicator = host('activityindicator');
export const Switch = host('switch');
export const Modal = host('modal');
export const FlatList = host('flatlist');
export const SafeAreaView = host('safeareaview');
export const Pressable = host('pressable', { touchable: true });

export const AppState = {
  currentState: 'active',
  addEventListener: () => ({ remove: () => {} }),
  removeEventListener: () => {},
};

export const Appearance = {
  getColorScheme: () => 'light',
  addChangeListener: () => ({ remove: () => {} }),
};

export const StatusBar = {
  setBarStyle: () => {},
  setBackgroundColor: () => {},
  setHidden: () => {},
};

export const NativeModules = {};
export const NativeEventEmitter = class NativeEventEmitter {
  addListener() {
    return { remove: () => {} };
  }
  removeListener() {}
  emit() {}
};

export const Easing = {
  linear: () => () => 0,
  ease: () => () => 0,
  in: (fn: (t: number) => number) => fn,
  out: (fn: (t: number) => number) => fn,
  inOut: (fn: (t: number) => number) => fn,
  bezier: () => () => 0,
};

// Animated mock. The composables (timing/spring/decay/parallel/sequence)
// synchronously invoke their start callback with { finished: true } so
// useEffect-driven animations complete during the render commit phase —
// required by DisclosureRow where useEffect triggers Animated.timing on
// open/close. host() is reused for Animated.View/Text/Image/ScrollView
// so the same accessibilityState + function-style handling applies.
export const Animated = {
  View: host('animated-view'),
  Text: host('animated-text'),
  Image: host('animated-image'),
  ScrollView: host('animated-scrollview'),
  createAnimatedComponent: (component: unknown) => component,
  delay: () => ({
    start: (cb?: (result: { finished: boolean }) => void) => {
      if (cb) cb({ finished: true });
    },
    stop: () => {},
    reset: () => {},
  }),
  timing: () => ({
    start: (cb?: (result: { finished: boolean }) => void) => {
      if (cb) cb({ finished: true });
    },
    stop: () => {},
    reset: () => {},
  }),
  spring: () => ({
    start: (cb?: (result: { finished: boolean }) => void) => {
      if (cb) cb({ finished: true });
    },
    stop: () => {},
    reset: () => {},
  }),
  decay: () => ({
    start: (cb?: (result: { finished: boolean }) => void) => {
      if (cb) cb({ finished: true });
    },
    stop: () => {},
    reset: () => {},
  }),
  parallel: () => ({
    start: (cb?: (result: { finished: boolean }) => void) => {
      if (cb) cb({ finished: true });
    },
    stop: () => {},
    reset: () => {},
  }),
  sequence: () => ({
    start: (cb?: (result: { finished: boolean }) => void) => {
      if (cb) cb({ finished: true });
    },
    stop: () => {},
    reset: () => {},
  }),
  loop: () => ({
    start: () => {},
    stop: () => {},
    reset: () => {},
  }),
  Value: class AnimatedValue {
    value: number;
    constructor(value: number) {
      this.value = value;
    }
    setValue(_v: number) {}
    setOffset(_o: number) {}
    flattenOffset() {}
    extractOffset() {}
    addListener(_cb: (value: number) => void) {
      return '';
    }
    removeListener(_id: string) {}
    removeAllListeners() {}
    stopAnimation(_cb?: (value: number) => void) {}
    stopAnimations(_cb?: (value: number) => void) {}
    resetAnimation(_cb?: (value: number) => void) {}
    interpolate(_opts: unknown) {
      return 0;
    }
  },
  ValueXY: class AnimatedValueXY {
    x: number = 0;
    y: number = 0;
    constructor() {}
    getLayout() {
      return {};
    }
    getTranslateTransform() {
      return [];
    }
    setValue(_v: { x: number; y: number }) {}
    setOffset(_o: { x: number; y: number }) {}
    flattenOffset() {}
    extractOffset() {}
    stopAnimation(_cb?: (value: { x: number; y: number }) => void) {}
    resetAnimation(_cb?: (value: { x: number; y: number }) => void) {}
    addListener(_cb: (value: { x: number; y: number }) => void) {
      return '';
    }
    removeListener(_id: string) {}
  },
};

export const useWindowDimensions = () => ({ width: 1024, height: 768 });

export const PixelRatio = {
  get: () => 2,
  getFontScale: () => 1,
  getPixelSizeForLayoutSize: (size: number) => size * 2,
  roundToNearestPixel: (size: number) => size,
};

export const I18nManager = {
  isRTL: false,
  allowRTL: () => {},
  forceRTL: () => {},
  swapLeftAndRightInRTL: () => {},
};

export const InteractionManager = {
  runAfterInteractions: () => ({
    then: (cb: () => void) => {
      cb();
      return { cancel: () => {} };
    },
    cancel: () => {},
    done: () => {},
  }),
  createInteractionHandle: () => 1,
  clearInteractionHandle: () => {},
  setDeadline: () => {},
};

export const LayoutAnimation = {
  configureNext: () => {},
  create: () => {},
  Types: { easeInEaseOut: 'easeInEaseOut', linear: 'linear', spring: 'spring' },
  Properties: { opacity: 'opacity', scaleX: 'scaleX', scaleY: 'scaleY' },
};

export const Linking = {
  openURL: () => Promise.resolve(),
  canOpenURL: () => Promise.resolve(true),
  getInitialURL: () => Promise.resolve(null),
  sendIntent: () => Promise.resolve(),
};

export const AsyncStorage = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
  clear: () => Promise.resolve(),
  getAllKeys: () => Promise.resolve([]),
  multiGet: () => Promise.resolve([]),
  multiSet: () => Promise.resolve(),
  multiRemove: () => Promise.resolve(),
};

export const AppRegistry = {
  registerComponent: () => {},
  runApplication: () => {},
  unmountApplicationComponentAtRootTag: () => {},
};

export const DeviceEventEmitter = {
  addListener: () => ({ remove: () => {} }),
  emit: () => {},
  removeListener: () => {},
  removeAllListeners: () => {},
};

export const useColorScheme = () => ({ colorScheme: 'light' as const });

export default {
  Platform,
  StyleSheet,
  Dimensions,
  Alert,
  Keyboard,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  TouchableHighlight,
  TouchableWithoutFeedback,
  Image,
  ActivityIndicator,
  Switch,
  Modal,
  FlatList,
  SafeAreaView,
  Pressable,
  AppState,
  Appearance,
  StatusBar,
  NativeModules,
  NativeEventEmitter,
  Easing,
  Animated,
  useWindowDimensions,
  PixelRatio,
  I18nManager,
  InteractionManager,
  LayoutAnimation,
  Linking,
  AsyncStorage,
  AppRegistry,
  DeviceEventEmitter,
  useColorScheme,
};
