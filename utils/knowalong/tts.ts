// utils/knowalong/tts.ts
//
// Text-to-speech with a NEURAL primary engine and an immediate fallback:
//
//  - Primary: Piper (in-browser, ONNX/WASM). Free + offline-capable: the
//    Russian voice model is fetched once (cached in OPFS) — a large step up
//    from the robotic OS voices that Web Speech uses.
//  - Fallback: the browser Web Speech API, used for the first taps while the
//    Piper model is still downloading and if Piper ever fails to load.
//
// Loading is lazy: the Piper session is created on the first speak() call
// (from a chip tap), so the ~60MB model is only fetched when the learner
// actually uses TTS, not for merely opening a screen. Dispatch is synchronous
// — Piper runs async when ready, else Web Speech speaks immediately and Piper
// warms in the background; once ready, speech upgrades to the neural voice.
//
// Piper is loaded from a CDN at runtime (see PIPER_CDN), NOT imported from the
// npm package. Any static reference to the package (even a type import) makes
// metro resolve onnxruntime-web into the bundle graph, which breaks the
// Tamagui static-export config-load; and importing the loader into a component
// tree trips the Tamagui extractor. The package is referenced ONLY via the
// runtime-assembled CDN URL (types are declared locally below).
//
// Native (no window) is a no-op. Never throws (S10).

const PIPER_VOICE = 'ru_RU-irina-medium';
const RU_LANG = 'ru-RU';

interface PiperSession {
  predict: (text: string) => Promise<Blob>;
}
interface PiperModule {
  TtsSession: { create: (opts: { voiceId: string }) => Promise<PiperSession> };
}

function isWeb(): boolean {
  return typeof window !== 'undefined';
}

interface SpeechVoice { lang: string; }
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
  if (!isWeb()) return null;
  const w = window as unknown as WindowWithSpeech;
  const synth = w.speechSynthesis;
  return synth && typeof synth.speak === 'function' ? synth : null;
}

function pickRuVoice(synth: SpeechSynth): SpeechVoice | null {
  try {
    return synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith('ru')) ?? null;
  } catch {
    return null;
  }
}

function speakWebSpeech(text: string, opts: { lang?: string; rate?: number }): void {
  const synth = getSynth();
  if (!synth) return;
  const w = window as unknown as WindowWithSpeech;
  const Utterance = w.SpeechSynthesisUtterance;
  if (!Utterance) return;
  try {
    const u = new Utterance(text) as unknown as { lang: string; rate: number; voice: SpeechVoice | null };
    u.lang = opts.lang ?? RU_LANG;
    u.rate = opts.rate ?? 0.92;
    const v = pickRuVoice(synth);
    if (v) u.voice = v;
    synth.cancel();
    synth.speak(u);
  } catch {
    // S10
  }
}

const PIPER_CDN = 'https://esm.sh/@realtimex' + '/piper-tts-web@1.1.1';
const importFromCdn = new Function('s', 'return import(s)') as (s: string) => Promise<PiperModule>;

let piperPromise: Promise<PiperSession | null> | null = null;
let piperReady = false;
let currentAudio: HTMLAudioElement | null = null;

function loadPiper(): Promise<PiperSession | null> {
  if (!isWeb()) return Promise.resolve(null);
  if (!piperPromise) {
    piperPromise = (async () => {
      try {
        const mod = await importFromCdn(PIPER_CDN);
        const session = await mod.TtsSession.create({ voiceId: PIPER_VOICE });
        piperReady = true;
        return session;
      } catch {
        piperPromise = null;
        return null;
      }
    })();
  }
  return piperPromise;
}

async function speakPiper(text: string): Promise<boolean> {
  const session = await loadPiper();
  if (!session) return false;
  try {
    const blob = await session.predict(text);
    stopAudio();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playbackRate = 1;
    currentAudio = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
    };
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

function stopAudio(): void {
  if (currentAudio) {
    try { currentAudio.pause(); } catch { /* S10 */ }
    currentAudio = null;
  }
}

export function isSpeechAvailable(): boolean {
  return isWeb() && (piperReady || getSynth() !== null);
}

export function speak(text: string, opts: { lang?: string; rate?: number } = {}): void {
  const trimmed = text?.trim();
  if (!trimmed || !isWeb()) return;
  if (piperReady) {
    void speakPiper(trimmed).then((ok) => { if (!ok) speakWebSpeech(trimmed, opts); });
    return;
  }
  void loadPiper();
  speakWebSpeech(trimmed, opts);
}

export function stopSpeaking(): void {
  stopAudio();
  const synth = getSynth();
  if (synth) { try { synth.cancel(); } catch { /* S10 */ } }
}
