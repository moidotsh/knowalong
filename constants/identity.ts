// constants/identity.ts
// Centralized product strings for KnowAlong. Keeping the name, slug, scheme,
// bundle id, and storage prefix in one const avoids the per-file drift that
// turns a rename into a hunt across package.json / app.config.ts / app.json /
// manifest.json / _layout.tsx / context / stores. Touch points pull from here
// or from this file's literal values (build configs can't always import TS).
//
// This file holds the operating identity only — the palette (constants/theme.ts)
// is inherited unchanged from the starter shell and is not overridden here.

export const IDENTITY = {
  name: 'KnowAlong',
  slug: 'knowalong',
  scheme: 'knowalong',
  bundleId: 'app.knowalong',
  storagePrefix: 'knowalong',
  tagline: 'Study language through media you love.',
  privacySummary: 'Your library is private. Only content you paste in lives here.',
} as const;

export type KnowAlongIdentity = typeof IDENTITY;
