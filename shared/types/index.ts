// shared/types/index.ts
// Barrel export for shared types. UI code imports repository-normalized
// types from here (or from a consumer-specific types barrel that re-exports
// from here). Audit-testing-types (T1) blocks UI code from importing raw
// `shared/types` directly when a repository-normalized variant exists.

export * from './api';
export * from './env';
export * from './knowalong';
