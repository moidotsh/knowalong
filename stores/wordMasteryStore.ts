// stores/wordMasteryStore.ts
// // d10-exempt: word-mastery store — no loading/error/modal/selection/UI
// state. This store only tracks per-word exposure/correct/streak/mistake
// counts that drive the English-gloss fade + the adaptive generator.
//
// Persisted per-word mastery table. A word's English gloss hides once its
// consecutive-correct streak reaches WORD_FADE_THRESHOLD (see
// utils/knowalong/mastery.ts); a wrong tap resets the streak to 0. The store
// is global by word `form` — both the Study screen and the song-lesson player
// read + write the same table, so mastery crosses surfaces. Mirrors the
// lessonProgressStore persistence pattern (Zustand + persist + zustandStorage).
// Pure read-side helpers (classifyWord, shouldShowGloss, summarizeMastery)
// live in utils/knowalong/mastery.ts.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import zustandStorage from './storage';
import {
  WORD_MASTERY_STORAGE_KEY,
  wordKey,
  type MasteryMap,
  type WordMastery,
} from '../utils/knowalong/mastery';

function emptyWord(): WordMastery {
  return { exposures: 0, correct: 0, streak: 0, mistakes: 0, lastSeenMs: null };
}

export interface WordMasteryState {
  // SECTION: Data
  mastery: MasteryMap;

  // SECTION: Actions
  /** Mark each form as exposed (shown on a chip) — +1 exposures, lastSeenMs now.
   *  Dedupes repeated forms within the call. Idempotency (once-per-step) is the
   *  caller's responsibility (see the exposedRef guard in the chip screens). */
  recordExposure: (forms: string[]) => void;
  /** Correct placement of the word's chip: streak++, correct++. Reaching the
   *  threshold graduates it (gloss hidden). */
  recordCorrect: (form: string) => void;
  /** Wrong tap on the word's slot: streak resets to 0 (gloss re-shows), mistakes++. */
  recordMistake: (form: string) => void;
  resetMastery: () => void;

  // SECTION: Computed
  getMastery: (form: string) => WordMastery;
}

export const useWordMasteryStore = create<WordMasteryState>()(
  persist(
    (set, get) => ({
      // SECTION: Data
      mastery: {},

      // SECTION: Actions
      recordExposure: (forms) => {
        const now = Date.now();
        const keys = Array.from(new Set(forms.map((f) => wordKey(f))));
        set((s) =>
          keys.reduce<MasteryMap>((acc, k) => {
            const prev = acc[k] ?? emptyWord();
            return { ...acc, [k]: { ...prev, exposures: prev.exposures + 1, lastSeenMs: now } };
          }, s.mastery),
        );
      },
      recordCorrect: (form) => {
        const k = wordKey(form);
        set((s) => {
          const prev = s.mastery[k] ?? emptyWord();
          return { mastery: { ...s.mastery, [k]: { ...prev, correct: prev.correct + 1, streak: prev.streak + 1 } } };
        });
      },
      recordMistake: (form) => {
        const k = wordKey(form);
        set((s) => {
          const prev = s.mastery[k] ?? emptyWord();
          return { mastery: { ...s.mastery, [k]: { ...prev, mistakes: prev.mistakes + 1, streak: 0 } } };
        });
      },
      resetMastery: () => {
        set({ mastery: {} });
      },

      // SECTION: Computed
      getMastery: (form) => {
        return get().mastery[wordKey(form)] ?? emptyWord();
      },
    }),
    {
      name: WORD_MASTERY_STORAGE_KEY,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s: WordMasteryState) => ({ mastery: s.mastery }),
    },
  ),
);
