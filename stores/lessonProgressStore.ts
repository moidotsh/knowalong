// stores/lessonProgressStore.ts
// // d10-exempt: lesson-progress store — no loading/error/modal/selection/UI
// state. This store only tracks which lessons the learner has completed.
//
// Persisted per-lesson completion set. Drives the hard sequential unlock
// within a song section (Lesson N locked until Lesson N-1 is completed —
// see utils/knowalong/progress.ts). Mirrors the streakStore persistence
// pattern (Zustand + persist + zustandStorage).

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import zustandStorage from './storage';

export interface LessonProgressState {
  // SECTION: Data
  completedLessonIds: string[];

  // SECTION: Actions
  markLessonComplete: (lessonId: string) => void;
  resetProgress: () => void;

  // SECTION: Computed
  isLessonComplete: (lessonId: string) => boolean;
}

export const useLessonProgressStore = create<LessonProgressState>()(
  persist(
    (set, get) => ({
      // SECTION: Data
      completedLessonIds: [],

      // SECTION: Actions
      markLessonComplete: (lessonId: string) => {
        if (get().completedLessonIds.includes(lessonId)) return;
        set({ completedLessonIds: [...get().completedLessonIds, lessonId] });
      },

      resetProgress: () => {
        set({ completedLessonIds: [] });
      },

      // SECTION: Computed
      isLessonComplete: (lessonId: string) => {
        return get().completedLessonIds.includes(lessonId);
      },
    }),
    {
      name: 'knowalong-lesson-progress-v1',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s: LessonProgressState) => ({ completedLessonIds: s.completedLessonIds }),
    },
  ),
);
