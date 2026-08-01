// stores/streakStore.ts
// // d10-exempt: streak tracking store — no loading/error/modal/selection/UI
// state. This store only tracks study dates + derived streak data.
// Persisted study-streak tracking. Records study sessions (date strings) +
// computes streaks, weekly progress, + milestones. No live DB — Zustand +
// AsyncStorage persistence. Adapted from qep-tracker's forgiving streak
// system.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { differenceInDays, subDays, startOfDay } from 'date-fns';
import zustandStorage from './storage';

function todayStr(): string {
  return startOfDay(new Date()).toISOString().split('T')[0];
}

function isSameDay(a: string, b: string): boolean {
  return a === b;
}

export interface StreakResult {
  streak: number;
  daysThisWeek: number;
  weeklyTarget: number;
  weeklyGoalMet: boolean;
  streakAtRisk: boolean;
  pendingStreak: number;
}

export interface StreakState {
  // SECTION: Data
  studyDates: string[];
  conceptsMastered: number;
  lessonsCompleted: number;
  totalSessions: number;
  mistakeCodes: string[];

  // SECTION: Actions
  recordStudySession: () => void;
  addMasteredConcept: () => void;
  recordLessonComplete: () => void;
  recordMistake: (code: string) => void;
  clearMistakes: () => void;

  // SECTION: Computed
  getStreak: (target?: number) => StreakResult;
  hasStudiedToday: () => boolean;
}

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      // SECTION: Data
      studyDates: [],
      conceptsMastered: 0,
      lessonsCompleted: 0,
      totalSessions: 0,
      mistakeCodes: [],

      // SECTION: Actions
      recordStudySession: () => {
        const today = todayStr();
        const dates = get().studyDates;
        if (dates.includes(today)) return;
        set({
          studyDates: [...dates, today].sort(),
          totalSessions: get().totalSessions + 1,
        });
      },

      recordMistake: (code: string) => {
        const existing = get().mistakeCodes;
        if (!existing.includes(code)) {
          set({ mistakeCodes: [...existing, code] });
        }
      },

      clearMistakes: () => {
        set({ mistakeCodes: [] });
      },

      addMasteredConcept: () => {
        set({ conceptsMastered: get().conceptsMastered + 1 });
      },

      recordLessonComplete: () => {
        set({ lessonsCompleted: get().lessonsCompleted + 1 });
      },

      // SECTION: Computed
      getStreak: (target = 5) => {
        const dates = get().studyDates.map((d) => startOfDay(new Date(d)));
        if (dates.length === 0) {
          return {
            streak: 0,
            daysThisWeek: 0,
            weeklyTarget: target,
            weeklyGoalMet: false,
            streakAtRisk: true,
            pendingStreak: 0,
          };
        }

        const today = startOfDay(new Date());
        const sevenDaysAgo = subDays(today, 7);
        const daysThisWeek = dates.filter((d) => d >= sevenDaysAgo && d <= today).length;
        const weeklyGoalMet = daysThisWeek >= target;
        const maxGap = Math.max(1, 8 - target);

        const sortedDates = [...dates].sort((a, b) => b.getTime() - a.getTime());
        const mostRecent = sortedDates[0];
        const daysSinceLast = differenceInDays(today, mostRecent);

        let streak = 0;
        if (daysSinceLast <= maxGap) {
          streak = 1;
          for (let i = 1; i < sortedDates.length; i++) {
            const gap = differenceInDays(sortedDates[i - 1], sortedDates[i]);
            if (gap === 1) {
              streak++;
            } else if (gap <= maxGap && weeklyGoalMet) {
              streak++;
            } else {
              break;
            }
          }
        }

        const streakAtRisk = !weeklyGoalMet || daysSinceLast >= maxGap;
        const pendingStreak = streak === 0 && daysSinceLast > maxGap ? 1 : 0;

        return {
          streak,
          daysThisWeek,
          weeklyTarget: target,
          weeklyGoalMet,
          streakAtRisk,
          pendingStreak,
        };
      },

      hasStudiedToday: () => {
        return get().studyDates.includes(todayStr());
      },
    }),
    {
      name: 'knowalong-streak',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s: StreakState) => ({
        studyDates: s.studyDates,
        conceptsMastered: s.conceptsMastered,
        lessonsCompleted: s.lessonsCompleted,
        totalSessions: s.totalSessions,
        mistakeCodes: s.mistakeCodes,
      }),
    },
  ),
);
