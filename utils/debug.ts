// utils/debug.ts
// Centralized debug logging gated behind `__DEV__`. Production builds
// drop all `debugLog` call sites as dead code, so shipping a `debugLog`
// in a hot path has zero runtime cost.
//
// arqavellum's debug.ts does NOT ship a module whitelist — every consumer
// can pick the gating rule (env var, build flag, per-module toggle) that
// fits their needs. The default is "off in production, on in dev, no
// module filter".
//
// If you need per-module gating, wrap `debugLog` in a thin shim in your
// consumer's utils/ that filters by module name before calling through.

import { logger } from './logger';

/**
 * Log a debug message. In production, this is a no-op (the entire call
 * is dropped as dead code by the bundler). In development, routes through
 * the standard logger under the 'debug' namespace.
 *
 * @param module - Logical module name (e.g. 'auth', 'sync', 'records').
 * @param message - Human-readable message.
 * @param data - Optional structured data; serialised by the logger.
 */
export function debugLog(module: string, message: string, data?: unknown): void {
  if (!__DEV__) return;
  // logger.debug's first arg is a constrained LogContext union; route
  // module-scoped debug logs through the generic 'debug' context and
  // prefix the module name into the message so the trail is preserved.
  logger.debug('debug', `[${module}] ${message}`, data);
}

/**
 * Returns whether debug logging is enabled for a given module. Useful
 * when callers need to gate more expensive operations (e.g. JSON.stringify
 * of large objects) before passing them to `debugLog`.
 */
export function isDebugEnabled(_module: string): boolean {
  return __DEV__;
}
