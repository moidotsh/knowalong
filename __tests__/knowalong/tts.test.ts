// __tests__/knowalong/tts.test.ts
// Light tests for the TTS abstraction — it must never throw and must report
// availability as a boolean. (jsdom has no speechSynthesis, so availability is
// expected to be false here; the web browser path is exercised end-to-end.)

import { describe, it, expect } from 'vitest';
import { speak, stopSpeaking, isSpeechAvailable } from '../../utils/knowalong/tts';

describe('isSpeechAvailable', () => {
  it('returns a boolean without throwing', () => {
    expect(typeof isSpeechAvailable()).toBe('boolean');
  });
});

describe('speak / stopSpeaking', () => {
  it('never throws on empty input', () => {
    expect(() => speak('')).not.toThrow();
    expect(() => speak('   ')).not.toThrow();
  });

  it('never throws on real input (no-op where speechSynthesis is absent)', () => {
    expect(() => speak('я вижу море')).not.toThrow();
    expect(() => stopSpeaking()).not.toThrow();
  });
});
