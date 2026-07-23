// stores/importDraftStore.ts
// Ephemeral 4-step stepper state for the lyrics import flow:
//   paste → metadata → preview → save.
// Not persisted — intentionally resets on reload. The 5 SECTION markers
// below are load-bearing: audit-state (D10) flags any Zustand store
// missing them.

// =============================================================================
// SECTION: Loading
// isSaving — true while the create-draft mutation is in flight.
// =============================================================================

// =============================================================================
// SECTION: Error
// error — validation or save error surfaced to the UI. Cleared on dismiss.
// =============================================================================

// =============================================================================
// SECTION: Modals
// (No modal state — the import flow is a full-screen stepper, not modals.)
// =============================================================================

// =============================================================================
// SECTION: Selection
// (No selection state — the stepper is linear, not selection-driven.)
// =============================================================================

// =============================================================================
// SECTION: UI
// step — current step index (0=paste, 1=metadata, 2=preview, 3=save).
// rawText, title, artist, targetLanguage, translationLanguage, notes —
// the draft form fields accumulated across steps.
// completedStep — highest step the user has reached (for stepper display).
// =============================================================================

import { create } from 'zustand';

export type ImportStep = 0 | 1 | 2 | 3;

interface ImportDraftState {
  // SECTION: Loading
  isSaving: boolean;
  setSaving: (saving: boolean) => void;

  // SECTION: Error
  error: string | null;
  setError: (error: string | null) => void;

  // SECTION: Modals
  // (intentionally empty)

  // SECTION: Selection
  // (intentionally empty)

  // SECTION: UI
  step: ImportStep;
  completedStep: number;
  rawText: string;
  title: string;
  artist: string;
  targetLanguage: string;
  translationLanguage: string;
  notes: string;
  setStep: (step: ImportStep) => void;
  setField: <K extends keyof Pick<
    ImportDraftState,
    'rawText' | 'title' | 'artist' | 'targetLanguage' | 'translationLanguage' | 'notes'
  >>(key: K, value: string) => void;
  reset: () => void;
}

const initialDraft = {
  step: 0 as ImportStep,
  completedStep: -1,
  rawText: '',
  title: '',
  artist: '',
  targetLanguage: 'ru',
  translationLanguage: 'en',
  notes: '',
};

export const useImportDraftStore = create<ImportDraftState>((set) => ({
  // SECTION: Loading
  isSaving: false,
  setSaving: (saving) => set({ isSaving: saving }),

  // SECTION: Error
  error: null,
  setError: (error) => set({ error }),

  // SECTION: Modals
  // (intentionally empty)

  // SECTION: Selection
  // (intentionally empty)

  // SECTION: UI
  ...initialDraft,
  setStep: (step) =>
    set((state) => ({
      step,
      completedStep: Math.max(state.completedStep, step),
    })),
  setField: (key, value) => set({ [key]: value } as Pick<ImportDraftState, typeof key>),
  reset: () => set({ ...initialDraft, isSaving: false, error: null }),
}));

export default useImportDraftStore;
