// stores/songShelfStore.ts
// // d10-exempt: song-shelf store — persisted learner choices only, no
// loading/error/modal/selection/UI state. Follows the lessonProgressStore
// persistence pattern (Zustand + persist + zustandStorage).
//
// The song-first shell's persistent choices (design doc §1.1–§1.5):
//   • activeSongId        — the song Today centers on (null → Today falls
//                           back to the demo song; the store stays
//                           fixture-free and resolves nothing itself).
//   • archivedSongIds     — §1.1 archived songs kept out of Today and the
//                           active shelf, restorable from Profile.
//   • firstUseDone        — §1.2 "Which song made you want to learn?" has
//                           been answered (or skipped) at least once.
//   • aspiration          — the learner's answer to that first-use question:
//                           the song they want to understand, carried into
//                           the import flow as a pre-filled target.
//   • passagePriorities   — §1.3 step 3: per song, which section ordinal the
//                           learner picked to start from. Client-side only;
//                           informs Today's next-passage pick.
//   • explicitContentOptIn— §1.5 explicit-lyrics songs stay behind an
//                           explicit opt-in; the warning surfaces once, the
//                           choice persists here.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import zustandStorage from './storage';

/** The song the learner named when asked "Which song made you want to learn?" */
export interface SongAspiration {
  title: string;
  artist: string;
}

export interface SongShelfState {
  // SECTION: Data
  activeSongId: string | null;
  archivedSongIds: string[];
  firstUseDone: boolean;
  aspiration: SongAspiration | null;
  /** songId → 1-based section ordinal chosen as the passage priority. */
  passagePriorities: Record<string, number>;
  explicitContentOptIn: boolean;

  // SECTION: Actions
  setActiveSong: (songId: string) => void;
  clearActiveSong: () => void;
  archiveSong: (songId: string) => void;
  restoreSong: (songId: string) => void;
  completeFirstUse: () => void;
  setAspiration: (aspiration: SongAspiration | null) => void;
  setPassagePriority: (songId: string, sectionOrdinal: number) => void;
  optInToExplicitContent: () => void;
  revokeExplicitContentOptIn: () => void;
  resetShelf: () => void;
}

const initialState = {
  activeSongId: null as string | null,
  archivedSongIds: [] as string[],
  firstUseDone: false,
  aspiration: null as SongAspiration | null,
  passagePriorities: {} as Record<string, number>,
  explicitContentOptIn: false,
};

export const useSongShelfStore = create<SongShelfState>()(
  persist(
    (set, get) => ({
      // SECTION: Data
      ...initialState,

      // SECTION: Actions
      setActiveSong: (songId) => set({ activeSongId: songId }),

      clearActiveSong: () => set({ activeSongId: null }),

      archiveSong: (songId) => {
        if (get().archivedSongIds.includes(songId)) return;
        set({
          archivedSongIds: [...get().archivedSongIds, songId],
          // An archived song can't stay Today's centre (§1.1).
          activeSongId: get().activeSongId === songId ? null : get().activeSongId,
        });
      },

      restoreSong: (songId) => {
        set({ archivedSongIds: get().archivedSongIds.filter((id) => id !== songId) });
      },

      completeFirstUse: () => set({ firstUseDone: true }),

      setAspiration: (aspiration) => set({ aspiration }),

      setPassagePriority: (songId, sectionOrdinal) =>
        set({ passagePriorities: { ...get().passagePriorities, [songId]: sectionOrdinal } }),

      optInToExplicitContent: () => set({ explicitContentOptIn: true }),

      revokeExplicitContentOptIn: () => set({ explicitContentOptIn: false }),

      resetShelf: () => set({ ...initialState }),
    }),
    {
      name: 'knowalong-song-shelf-v1',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s: SongShelfState) => ({
        activeSongId: s.activeSongId,
        archivedSongIds: s.archivedSongIds,
        firstUseDone: s.firstUseDone,
        aspiration: s.aspiration,
        passagePriorities: s.passagePriorities,
        explicitContentOptIn: s.explicitContentOptIn,
      }),
    },
  ),
);
