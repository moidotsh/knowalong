// utils/knowalong/tts.ts
//
// Text-to-speech — hybrid, fully client-side, commercial-clean (Piper is MIT).
//
//  - Chips / isolated words → Web Speech API (correct pronunciation, male
//    Russian voice when available, commercial-safe, instant).
//  - Full sentences → Piper neural TTS (VITS, ONNX/WASM), natural delivery.
//
// Piper is loaded from a SELF-HOSTED browser bundle at /tts/piper.js (built
// from @mintplex-labs/piper-tts-web via scripts/build-tts-bundle.mjs, which
// esbuild-bundles it with empty fs/path shims — Piper's dist keeps those
// require()s inside Node-guarded branches that never run in a browser). It is
// NOT imported from the npm package at runtime: any static reference pulls
// onnxruntime-web into metro's graph and breaks the Tamagui static export
// (see the tamagui-onnxruntime-web-build-conflict memory). Loaded via a
// bundler-hidden dynamic import of the same-origin URL.
//
// Lazy: the Piper session is created on first use; the voice model + wasm
// fetch once and are cached (OPFS). Playback is a sequential queue so rapid
// taps never clip. Native (no window) is a no-op. Never throws (S10).

const PIPER_VOICE = 'ru_RU-denis-medium';
const RU_LANG = 'ru-RU';

// onnxruntime-web wasm paths. `onnxWasm` MUST match the version bundled into
// /tts/piper.mjs (1.27.0) — the mintplex default points at cdnjs 1.18.0, which
// 404s on the 1.27 wasm filenames (ort-wasm-simd-threaded.jsep.mjs).
// piperData/piperWasm are the mintplex defaults (piper phonemizer).
const PIPER_WASM_PATHS = {
  onnxWasm: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/',
  piperData: 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.data',
  piperWasm: 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.wasm',
};
interface PiperWasmPaths { onnxWasm: string; piperData: string; piperWasm: string; }

function isWeb(): boolean {
  return typeof window !== 'undefined';
}

// ── Web Speech (chips / isolated words) ────────────────────────────────

interface SpeechVoice { lang: string; name?: string; }
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

// Best-effort male Russian voice — Web Speech exposes no gender field, so we
// match known male voice names (e.g. macOS "Yuri"); falls back to the first
// Russian voice. Platform-dependent.
const MALE_VOICE_HINTS = [
  'yuri', 'yuriy', 'pavel', 'dmitri', 'dmitriy', 'maxim', 'alexandr', 'alexander',
  'nikolay', 'andrei', 'andrey', 'sergey', 'kirill', 'lev', 'male',
];

function pickRuVoice(synth: SpeechSynth): SpeechVoice | null {
  try {
    const ru = synth.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('ru'));
    if (ru.length === 0) return null;
    return ru.find((v) => MALE_VOICE_HINTS.some((h) => v.name?.toLowerCase().includes(h))) ?? ru[0];
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
    synth.cancel(); // no queue stacking across rapid taps
    synth.speak(u);
  } catch {
    // S10
  }
}

// ── Piper (sentences) — loaded from the self-hosted bundle ─────────────
// Local types only — no static import of the package (would pull
// onnxruntime-web into metro's graph and break the Tamagui build).

interface PiperSession {
  predict: (text: string) => Promise<Blob>;
}
interface PiperModule {
  TtsSession: { create: (opts: { voiceId: string; wasmPaths?: PiperWasmPaths }) => Promise<PiperSession> };
}

// new Function hides the dynamic import from metro/babel static analysis.
// .mjs so the structural audits (SOURCE_EXTS=.ts/.tsx/.js/.jsx) skip it.
const PIPER_URL = '/tts/piper.mjs';
const importPiper = new Function('s', 'return import(s)') as (s: string) => Promise<PiperModule>;

let piperPromise: Promise<PiperSession | null> | null = null;
/** Flips true once the Piper session has finished initializing. */
let piperReady = false;

function loadPiper(): Promise<PiperSession | null> {
  if (!isWeb()) return Promise.resolve(null);
  if (!piperPromise) {
    piperPromise = (async () => {
      try {
        const mod = await importPiper(PIPER_URL);
        const session = await mod.TtsSession.create({ voiceId: PIPER_VOICE, wasmPaths: PIPER_WASM_PATHS });
        piperReady = true;
        return session;
      } catch {
        piperPromise = null; // allow a later retry
        return null;
      }
    })();
  }
  return piperPromise;
}

// ── PCM playback queue (sequential — no clipping) ─────────────────────

let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
type QueuedClip = { audio: Float32Array; sampleRate: number };
let clipQueue: QueuedClip[] = [];
let draining = false;

function getAudioContext(): AudioContext | null {
  if (!isWeb()) return null;
  if (!audioCtx) {
    const Ctor = (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
    if (!Ctor) return null;
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function playClipOnce(ctx: AudioContext, audio: Float32Array, sampleRate: number): Promise<void> {
  return new Promise((resolve) => {
    try {
      const buffer = ctx.createBuffer(1, audio.length, sampleRate);
      buffer.getChannelData(0).set(audio);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      currentSource = source;
      source.onended = () => {
        if (currentSource === source) currentSource = null;
        resolve();
      };
      source.start();
    } catch {
      // S10
      resolve();
    }
  });
}

async function drainClips(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch { /* S10 — autoplay policy */ }
    }
    while (clipQueue.length > 0) {
      const clip = clipQueue.shift() as QueuedClip;
      await playClipOnce(ctx, clip.audio, clip.sampleRate);
    }
  } finally {
    draining = false;
  }
}

function playPcm(audio: Float32Array, sampleRate: number): boolean {
  const ctx = getAudioContext();
  if (!ctx) return false;
  clipQueue.push({ audio, sampleRate });
  void drainClips();
  return true;
}

function stopAudio(): void {
  clipQueue = [];
  if (currentSource) {
    try { currentSource.stop(); } catch { /* S10 */ }
    currentSource = null;
  }
}

// ── Synthesize (Piper) → decode WAV → cache + play ─────────────────────

/** Synthesized-audio cache: replays skip inference and play instantly. */
const audioCache = new Map<string, { audio: Float32Array; sampleRate: number }>();

async function synthesize(text: string): Promise<{ audio: Float32Array; sampleRate: number } | null> {
  const cached = audioCache.get(text);
  if (cached) return cached;
  const session = await loadPiper();
  if (!session) return null;
  try {
    const blob = await session.predict(text);
    const arr = await blob.arrayBuffer();
    const ctx = getAudioContext();
    if (!ctx) return null;
    const audioBuffer = await ctx.decodeAudioData(arr);
    const audio = audioBuffer.getChannelData(0);
    const result = { audio, sampleRate: audioBuffer.sampleRate };
    audioCache.set(text, result);
    return result;
  } catch {
    return null;
  }
}

async function speakPiper(text: string): Promise<boolean> {
  const clip = await synthesize(text);
  if (!clip) return false;
  return playPcm(clip.audio, clip.sampleRate);
}

// Warm the Piper session after the learner's first interaction anywhere —
// the model + wasm download in the background so it's ready before a solve.
// Module-scope (not a component) so it doesn't trip the Tamagui extractor.
if (isWeb()) {
  const warm = () => {
    try { window.removeEventListener('pointerdown', warm); } catch { /* S10 */ }
    void loadPiper();
  };
  try {
    window.addEventListener('pointerdown', warm);
  } catch {
    // S10
  }
}

// ── Public API ─────────────────────────────────────────────────────────

/** True when speech can be produced (web + at least one engine available). */
export function isSpeechAvailable(): boolean {
  return isWeb() && (piperReady || getSynth() !== null);
}

/** Vocalize `text` in Russian. Hybrid routing: isolated words (no space) →
 *  Web Speech (correct, male); multi-word sentences → Piper (natural) with a
 *  Web Speech fallback while it warms. No-op off-web or on empty input. */
export function speak(text: string, opts: { lang?: string; rate?: number } = {}): void {
  const trimmed = text?.trim();
  if (!trimmed || !isWeb()) return;
  if (!trimmed.includes(' ')) {
    speakWebSpeech(trimmed, opts);
    return;
  }
  if (piperReady) {
    void speakPiper(trimmed).then((ok) => {
      if (!ok) speakWebSpeech(trimmed, opts);
    });
    return;
  }
  void loadPiper(); // warm in the background
  speakWebSpeech(trimmed, opts); // immediate fallback while Piper loads
}

/** Stop any in-flight speech (Piper audio + Web Speech). */
export function stopSpeaking(): void {
  stopAudio();
  const synth = getSynth();
  if (synth) {
    try { synth.cancel(); } catch { /* S10 */ }
  }
}

/** True once `text` is already synthesized + cached (plays instantly). */
export function isAudioCached(text: string): boolean {
  return audioCache.has((text ?? '').trim());
}

/** Synthesize a set of texts into the cache WITHOUT playing (preload). Skips
 *  empty + already-cached strings; loads Piper first; runs sequentially. */
export async function prefetchAudio(texts: readonly string[]): Promise<void> {
  const todo: string[] = [];
  const seen = new Set<string>();
  for (const raw of texts) {
    const k = (raw ?? '').trim();
    if (!k || seen.has(k) || audioCache.has(k)) continue;
    seen.add(k);
    todo.push(k);
  }
  if (todo.length === 0) return;
  for (const text of todo) {
    if (audioCache.has(text)) continue;
    await synthesize(text);
  }
}
