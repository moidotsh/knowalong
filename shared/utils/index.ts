// shared/utils/index.ts
// Barrel for shared utilities — domain-agnostic helpers that don't own a
// more specific home. Currently re-exports the formatters (UUID + date)
// and the user-agent parser; extend as new shared utilities land.

export * from './formatters';
export * from './user-agent';
