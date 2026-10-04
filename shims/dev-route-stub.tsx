// shims/dev-route-stub.tsx
//
// The production stand-in for app/dev/* routes (the design-system
// showcase). The showcase is the shell's visual source of truth in DEV;
// in production exports it is dev-only surface area — its module graph
// (showcase, calendar, date pickers) has no place in a shipped bundle.
// metro.config.js resolves app/dev/* module paths to this stub when
// dev surfaces are disabled, so the route still registers (and still
// exports its HTML file) while rendering nothing and pulling nothing.
//
// Dev surfaces are ON when NODE_ENV !== 'production' (expo start), or
// when EXPO_PUBLIC_DEV_SURFACES=1 is set explicitly on a production
// build.

export default function DevRouteStub() {
  return null;
}
