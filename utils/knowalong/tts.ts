// utils/knowalong/tts.ts
//
// Text-to-speech with a NEURAL primary engine and an immediate fallback —
// both 100% client-side and free (runs on the learner's device; scales to any
// number of users/words with zero cloud cost).
//
//  - Primary: transformers.js + Xenova/mms-tts-rus, an in-browser neural TTS
//    (ONNX/WASM, VITS). The model + wasm fetch once (cached by the browser)
//    — a large step up from the robotic OS voices that Web Speech uses.
//  - Fallback: the browser Web Speech API, used for the first taps while the
//    neural model is still downloading and if it ever fails to load.
//
// Loading is lazy: the pipeline is created on the first speak() call (a chip
// tap), so the ~60MB model is only fetched when the learner actually uses
// TTS, not for merely opening a screen.
//
// transformers.js is loaded from a CDN at runtime (jsdelivr), NOT bundled.
// Bundling onnxruntime-web through metro — directly, as a type, or by wiring a
// preload hook into a component — breaks the Tamagui static-export
// config-load (see the tamagui-onnxruntime-web-build-conflict memory; piper
// was abandoned because its dist isn't browser-clean). transformers.js's
// published dist/transformers.min.js IS browser-built (HF documents this
// exact CDN import), so loading it via a bundler-hidden dynamic import keeps
// onnxruntime-web out of metro's graph and the build green.
//
// Native (no window) is a no-op. Never throws (S10).

const MODEL_ID = 'Xenova/mms-tts-rus';
const RU_LANG = 'ru-RU';

function isWeb(): boolean {
  return typeof window !== 'undefined';
}

// ── Web Speech (immediate fallback) ────────────────────────────────────

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
// Russian voice if none matches. Platform-dependent.
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
    synth.cancel();
    synth.speak(u);
  } catch {
    // S10
  }
}

// ── transformers.js (neural primary) ───────────────────────────────────
// Local types only — no static import of the package (would pull
// onnxruntime-web into metro's graph and break the Tamagui build).

interface TtsOutput { audio: Float32Array; sampling_rate: number; }
type Synth = (text: string) => Promise<TtsOutput | TtsOutput[]>;
interface TransformersModule {
  pipeline: (task: string, model: string, opts?: Record<string, unknown>) => Promise<Synth>;
  env: { allowLocalModels: boolean; [key: string]: unknown };
}

// Split specifier + new Function so metro/babel static analysis never resolves
// this to the npm package — the module is fetched from the CDN at runtime.
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@huggingface' + '/transformers@3/dist/transformers.min.js';
const importFromCdn = new Function('s', 'return import(s)') as (s: string) => Promise<TransformersModule>;

let synthPromise: Promise<Synth | null> | null = null;
/** Flips true once the neural pipeline has finished initializing. */
let neuralReady = false;

/** Synthesized-audio cache: replays of the same string skip inference and
 *  play instantly. Bounded by the finite corpus (~hundreds of strings), so it
 *  never grows without limit. */
const audioCache = new Map<string, { audio: Float32Array; sampleRate: number }>();

function loadSynth(): Promise<Synth | null> {
  if (!isWeb()) return Promise.resolve(null);
  if (!synthPromise) {
    synthPromise = (async () => {
      try {
        const mod = await importFromCdn(TRANSFORMERS_CDN);
        // We're on a hosted page — load the model from HuggingFace Hub, not a
        // local path (which would 404 / try node fs).
        mod.env.allowLocalModels = false;
        const synth = await mod.pipeline('text-to-speech', MODEL_ID);
        neuralReady = true;
        return synth;
      } catch {
        synthPromise = null; // allow a later retry
        return null;
      }
    })();
  }
  return synthPromise;
}

// ── PCM playback (transformers.js returns Float32 samples) ─────────────

let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
type QueuedClip = { audio: Float32Array; sampleRate: number };
/** Sequential playback queue — rapid taps enqueue instead of cutting the
 *  in-flight clip, so each word is heard in full (no clipping, no overlap). */
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

/** Drain the clip queue sequentially. Only one drain runs at a time; new
 *  playPcm() calls just push and let the running drain pick them up. */
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

async function speakNeural(text: string): Promise<boolean> {
  const cached = audioCache.get(text);
  if (cached) return playPcm(cached.audio, cached.sampleRate);
  const synth = await loadSynth();
  if (!synth) return false;
  try {
    const out = await synth(text);
    const o = Array.isArray(out) ? out[0] : out;
    if (!o?.audio?.length) return false;
    audioCache.set(text, { audio: o.audio, sampleRate: o.sampling_rate });
    return playPcm(o.audio, o.sampling_rate);
  } catch {
    return false;
  }
}

// Warm the neural pipeline after the learner's FIRST interaction anywhere on
// the page — the model + wasm download in the background and the inference
// session spins up, so by the time they tap a chip the synth is hot (no
// on-press fetch). Lives in module scope, NOT wired into a component, so it
// doesn't trip the Tamagui extractor; no-op off-web and during static render.
if (isWeb()) {
  const warm = () => {
    try { window.removeEventListener('pointerdown', warm); } catch { /* S10 */ }
    void loadSynth();
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
  return isWeb() && (neuralReady || getSynth() !== null);
}

/** Vocalize `text` in Russian. Hybrid routing: isolated words (no space) →
 *  Web Speech (correct pronunciation, commercial-safe); multi-word sentences
 *  → neural (natural) with a Web Speech fallback while it warms. No-op off-web
 *  or on empty input. Never throws. */
export function speak(text: string, opts: { lang?: string; rate?: number } = {}): void {
  const trimmed = text?.trim();
  if (!trimmed || !isWeb()) return;
  if (!trimmed.includes(' ')) {
    speakWebSpeech(trimmed, opts);
    return;
  }
  if (neuralReady) {
    void speakNeural(trimmed).then((ok) => {
      if (!ok) speakWebSpeech(trimmed, opts);
    });
    return;
  }
  void loadSynth(); // warm in the background
  speakWebSpeech(trimmed, opts); // immediate fallback while neural loads
}

/** Stop any in-flight speech (neural audio + Web Speech). */
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
 *  empty + already-cached strings; loads the engine first; runs sequentially
 *  so it doesn't spike the single-threaded wasm. Resolves when all are cached
 *  (or skipped/failed). Safe to call with overlapping sets — concurrent dedup
 *  is best-effort (a duplicate synth is harmless). */
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
  const synth = await loadSynth();
  if (!synth) return;
  for (const text of todo) {
    if (audioCache.has(text)) continue; // may have been cached concurrently
    try {
      const out = await synth(text);
      const o = Array.isArray(out) ? out[0] : out;
      if (o?.audio?.length) audioCache.set(text, { audio: o.audio, sampleRate: o.sampling_rate });
    } catch {
      // skip this text; leaves it to synthesize on-demand later
    }
  }
}
