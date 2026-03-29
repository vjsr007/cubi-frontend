import { create } from 'zustand';

interface TranslationStore {
  // cache[gameId][locale][field] = translated text
  cache: Record<string, Record<string, Record<string, string>>>;
  // showOriginal[gameId] = true → display original scraped text
  showOriginal: Record<string, boolean>;

  setTranslated: (gameId: string, locale: string, fields: Record<string, string>) => void;
  toggleOriginal: (gameId: string) => void;
  isShowingOriginal: (gameId: string) => boolean;
  hasTranslation: (gameId: string, locale: string) => boolean;
  getTranslated: (gameId: string, locale: string, field: string) => string | null;
}

export const useTranslationStore = create<TranslationStore>((set, get) => ({
  cache: {},
  showOriginal: {},

  setTranslated: (gameId, locale, fields) => {
    set((s) => ({
      cache: {
        ...s.cache,
        [gameId]: {
          ...s.cache[gameId],
          [locale]: fields,
        },
      },
      showOriginal: { ...s.showOriginal, [gameId]: false },
    }));
  },

  toggleOriginal: (gameId) => {
    set((s) => ({
      showOriginal: { ...s.showOriginal, [gameId]: !s.showOriginal[gameId] },
    }));
  },

  isShowingOriginal: (gameId) => !!get().showOriginal[gameId],

  hasTranslation: (gameId, locale) => !!get().cache[gameId]?.[locale],

  getTranslated: (gameId, locale, field) =>
    get().cache[gameId]?.[locale]?.[field] ?? null,
}));
