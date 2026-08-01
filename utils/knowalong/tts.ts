// utils/knowalong/tts.ts
//
// Text-to-speech abstraction over the browser Web Speech API. The app is
// PWA-first (static web export), so the browser's built-in speechSynthesis is
// the TTS engine — zero dependencies, zero network, works in `bun run web`.
//
// Availability is keyed on the PRESENCE of `window.speechSynthesis` rather
// than on a Platform check: native React Native has no `window`, so the same
// code is a safe no-op there. When native TTS is wanted later, swap the body
// of speak()/stopSpeaking() to expo-speech behind this same interface — no
// call-site changes needed.
//
// Never throws (S10): TTS is a non-critical enhancement; every access is
// guarded. Call sites use isSpeechAvailable() to decide whether to show a
// replay control.

const RU_LANG = 'ru-RU';

// Minimal ambient shapes — avoids depending on the DOM lib exposing
// SpeechSynthesis types in the RN/Expo tsconfig.
interface SpeechVoice {
  lang: string;
}
interface SpeechSynth {
  speak: (u: unknown) => void;
  cancel: () => void;
  getVoices: () => SpeechVoice[];
}
interface WindowWithSpeech {
  speechSynthesis?: SpeechSynth;
  SpeechSynthesisUtterance?: new (text: string) => unknown;
}

function getSynth(): SpeechSynth | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as WindowWithSpeech;
  const synth = w.speechSynthesis;
  return synth && typeof synth.speak === 'function' ? synth : null;
}

/** True when the current environment can actually vocalize (web + browser
 *  speechSynthesis). Native/non-browser environments return false. */
export function isSpeechAvailable(): boolean {
  return getSynth() !== null;
}

function pickRuVoice(synth: SpeechSynth): SpeechVoice | null {
  try {
    return synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith('ru')) ?? null;
  } catch {
    return null;
  }
}

/** Vocalize `text` in Russian. No-op when unavailable or on empty input. */
export function speak(text: string, opts: { lang?: string; rate?: number } = {}): void {
  const trimmed = text?.trim();
  if (!trimmed) return;
  const synth = getSynth();
  if (!synth) return;
  const w = window as unknown as WindowWithSpeech;
  const Utterance = w.SpeechSynthesisUtterance;
  if (!Utterance) return;
  try {
    const u = new Utterance(trimmed) as unknown as { lang: string; rate: number; voice: SpeechVoice | null };
    u.lang = opts.lang ?? RU_LANG;
    u.rate = opts.rate ?? 0.92;
    const v = pickRuVoice(synth);
    if (v) u.voice = v;
    synth.cancel(); // no queue stacking across rapid taps
    synth.speak(u);
  } catch {
    // S10: never throw — TTS is a non-critical enhancement.
  }
}

/** Stop any in-flight speech (e.g. on unmount / new step). */
export function stopSpeaking(): void {
  const synth = getSynth();
  if (!synth) return;
  try {
    synth.cancel();
  } catch {
    // S10: never throw.
  }
}
