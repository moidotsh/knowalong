// navigation/routeMetadata.ts
// Shell-level scaffolding for per-route "Copy for AI" metadata. Consumers
// override the registry with their own route titles + context labels.
//
// The shell ships an EMPTY registry by design. Arqavellum has no domain
// routes to describe; consumers replace this file's
// `ROUTE_AI_METADATA` map with their own entries in the same change window
// that wires `<CopyForAiButton>` into their screens.
//
// Path-keyed, not enum-keyed, so the registry stays decoupled from
// `navigation/NavigationHelper.tsx`'s `NavigationPath` enum (which differs
// per consumer). Keys are the leading path segments expo-router reports
// via `usePathname()` (e.g. `'analytics'`, `'workout-detail'`, `''` for
// index).
//
// Lookup falls back through progressively shorter path prefixes so a
// nested route like `'/dev/premium'` inherits from `'/dev'` if only the
// parent has a registered entry. The fallback is conservative — it never
// synthesises a title from the pathname.

export interface AiRouteMeta {
  /** Optional human-readable title for the route. */
  title?: string;
  /** Optional "how I got here" / eyebrow label for the route. */
  contextLabel?: string;
}

/**
 * Route → AI-metadata map. Empty in the shell; consumers fill this in.
 * Keys are pathname strings, normalised to a leading-slash-less form
 * (e.g. `'/analytics'` → `'analytics'`). The root index is `''`.
 */
const ROUTE_AI_METADATA: Record<string, AiRouteMeta> = {};

function normaliseKey(pathname: string): string {
  if (typeof pathname !== 'string') return '';
  const trimmed = pathname.trim();
  if (trimmed === '' || trimmed === '/') return '';
  return trimmed.replace(/^\//, '');
}

/**
 * Look up AI metadata for a pathname. Falls back through progressively
 * shorter path prefixes (so `'/dev/premium'` inherits `'/dev'` if only
 * the parent is registered). Returns an empty object when nothing
 * matches — callers should treat every field as optional.
 */
export function getAiRouteMetadata(pathname: string): AiRouteMeta {
  const key = normaliseKey(pathname);
  if (key === '') return ROUTE_AI_METADATA[''] ?? {};
  const segments = key.split('/');
  for (let i = segments.length; i > 0; i -= 1) {
    const candidate = segments.slice(0, i).join('/');
    const entry = ROUTE_AI_METADATA[candidate];
    if (entry) return entry;
  }
  return ROUTE_AI_METADATA[''] ?? {};
}
