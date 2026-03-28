import { create } from 'zustand';
import type { Page } from '../types';

interface UiState {
  currentPage: Page;
  selectedGameId: string | null;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info';

  navigateTo: (page: Page, gameId?: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  currentPage: 'library',
  selectedGameId: null,
  toastMessage: null,
  toastType: 'info',

  navigateTo: (page, gameId) =>
    set({ currentPage: page, selectedGameId: gameId ?? null }),

  showToast: (message, type = 'info') => {
    set({ toastMessage: message, toastType: type });
    setTimeout(() => set({ toastMessage: null }), 3500);
  },

  clearToast: () => set({ toastMessage: null }),
}));
