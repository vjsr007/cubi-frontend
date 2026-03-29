import { create } from 'zustand';
import type { LocaleStrings } from '../i18n';
import { en } from '../i18n/locales/en';
import { es } from '../i18n/locales/es';
import { fr } from '../i18n/locales/fr';
import { de } from '../i18n/locales/de';
import { pt } from '../i18n/locales/pt';
import { ja } from '../i18n/locales/ja';

const LOCALES: Record<string, LocaleStrings> = { en, es, fr, de, pt, ja };

function lookup(obj: Record<string, unknown>, key: string): string {
  const parts = key.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return key;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === 'string' ? cur : key;
}

interface I18nState {
  locale: string;
  setLocale: (code: string) => void;
  t: (key: string) => string;
}

export const useI18nStore = create<I18nState>((set, get) => ({
  locale: 'en',

  setLocale: (code: string) => {
    const valid = LOCALES[code] ? code : 'en';
    set({ locale: valid });
  },

  t: (key: string): string => {
    const { locale } = get();
    const strings = LOCALES[locale] ?? en;
    const result = lookup(strings as unknown as Record<string, unknown>, key);
    // Fallback to English if key missing in current locale
    if (result === key && locale !== 'en') {
      return lookup(en as unknown as Record<string, unknown>, key);
    }
    return result;
  },
}));
