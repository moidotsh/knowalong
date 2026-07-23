// shared/types/env.ts
// Shared environment + runtime-context types. Arqavellum's env surface is
// intentionally small — consumers extend this interface with their own
// env-typed keys as they add integrations.

export interface AppEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  NODE_ENV: 'development' | 'production' | 'test';
}

export type AppPlatform = 'ios' | 'android' | 'web';

export interface RuntimeContext {
  platform: AppPlatform;
  isDev: boolean;
  isPWA: boolean;
  isStandaloneDisplay: boolean;
}

export const DEFAULT_RUNTIME_CONTEXT: RuntimeContext = {
  platform: 'web',
  isDev: process.env.NODE_ENV === 'development',
  isPWA: false,
  isStandaloneDisplay: false,
};
