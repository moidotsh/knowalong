// utils/uuid.ts
// UUID generation wrapper. Uses crypto.randomUUID(), polyfilled by
// expo-crypto on native. Safe to call from any context.

/**
 * Generates a UUID v4 string. Works on both web (native crypto) and
 * native (expo-crypto polyfill).
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
