// stores/uiStore.ts
// Cross-cutting UI state. Ephemeral — not persisted. The 5 SECTION
// markers below are load-bearing: audit-state (D10) flags any Zustand
// store missing them. Add domain modal state in consumer-extended stores.

// =============================================================================
// SECTION: Loading
// isLoading / loadingMessage — global loading indicator.
// =============================================================================

// =============================================================================
// SECTION: Error
// error — global error banner content. Cleared on dismiss.
// =============================================================================

// =============================================================================
// SECTION: Modals
// modalVisibility — a Record<string, boolean> so consumers can register
// domain modals without extending the store type. Prefer a typed consumer
// modal store when a domain has more than 2-3 modals; this map is the
// escape hatch for one-off flags.
// =============================================================================

// =============================================================================
// SECTION: Selection
// selectedItem / selectedItems — generic single + multi selection state.
// Consumers typing tighter selection (e.g. `selectedWorkoutId: string |
// null`) should add a domain store and skip this entirely.
// =============================================================================

// =============================================================================
// SECTION: UI
// forceUpdateCounter — bump to trigger re-renders when a value's
// identity doesn't change but its semantic content does (rare).
// isOnlineBannerVisible — surfaced by networkStore when the app is
// offline. Lives here (not in networkStore) because networkStore only
// owns the connectivity boolean; the UI's choice to render a banner
// is a UI concern.
// =============================================================================

import { create } from 'zustand';

interface UIState {
  // SECTION: Loading
  isLoading: boolean;
  loadingMessage: string | null;
  setLoading: (loading: boolean, message?: string | null) => void;

  // SECTION: Error
  error: string | null;
  setError: (error: string | null) => void;

  // SECTION: Modals
  modalVisibility: Record<string, boolean>;
  setModalVisible: (key: string, visible: boolean) => void;

  // SECTION: Selection
  selectedItem: string | null;
  selectedItems: string[];
  setSelectedItem: (id: string | null) => void;
  setSelectedItems: (ids: string[]) => void;
  toggleSelectedItem: (id: string) => void;

  // SECTION: UI
  forceUpdateCounter: number;
  isOnlineBannerVisible: boolean;
  forceUpdate: () => void;
  setOnlineBannerVisible: (visible: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // SECTION: Loading
  isLoading: false,
  loadingMessage: null,
  setLoading: (loading, message = null) =>
    set({ isLoading: loading, loadingMessage: message }),

  // SECTION: Error
  error: null,
  setError: (error) => set({ error }),

  // SECTION: Modals
  modalVisibility: {},
  setModalVisible: (key, visible) =>
    set((state) => ({
      modalVisibility: { ...state.modalVisibility, [key]: visible },
    })),

  // SECTION: Selection
  selectedItem: null,
  selectedItems: [],
  setSelectedItem: (id) => set({ selectedItem: id }),
  setSelectedItems: (ids) => set({ selectedItems: ids }),
  toggleSelectedItem: (id) =>
    set((state) => ({
      selectedItems: state.selectedItems.includes(id)
        ? state.selectedItems.filter((x) => x !== id)
        : [...state.selectedItems, id],
    })),

  // SECTION: UI
  forceUpdateCounter: 0,
  isOnlineBannerVisible: false,
  forceUpdate: () =>
    set((state) => ({ forceUpdateCounter: state.forceUpdateCounter + 1 })),
  setOnlineBannerVisible: (visible) =>
    set({ isOnlineBannerVisible: visible }),
}));

export default useUIStore;
