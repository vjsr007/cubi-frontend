import { create } from 'zustand';
import type { Page } from '../types';

interface UiState {
  currentPage: Page;
  previousPage: Page | null;
  selectedGameId: string | null;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info';

  navigateTo: (page: Page, gameId?: string) => void;
  goBack: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  currentPage: 'library',
  previousPage: null,
  selectedGameId: null,
  toastMessage: null,
  toastType: 'info',

  navigateTo: (page, gameId) =>
    set((s) => ({ previousPage: s.currentPage, currentPage: page, selectedGameId: gameId ?? null })),

  goBack: () => {
    const prev = get().previousPage ?? 'library';
    set({ currentPage: prev, previousPage: null, selectedGameId: null });
  },

  showToast: (message, type = 'info') => {
    set({ toastMessage: message, toastType: type });
    setTimeout(() => set({ toastMessage: null }), 3500);
  },

  clearToast: () => set({ toastMessage: null }),
}));

// Expose store for Playwright demo automation
(window as any).__CUBI_UI_STORE__ = useUiStore;
