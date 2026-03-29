import { useState } from 'react';
import { useI18nStore } from '../stores/i18nStore';
import { useTranslationStore } from '../stores/translationStore';

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text.trim()) return text;
  const url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Translation API error: ${res.status}`);
  const data = await res.json();
  if (data.responseStatus !== 200) throw new Error(data.responseDetails ?? 'Translation failed');
  return data.responseData?.translatedText ?? text;
}

export interface TranslatableFields {
  description?: string;
  genre?: string;
  developer?: string;
  publisher?: string;
}

export function useTranslate(gameId: string, fields: TranslatableFields) {
  const locale = useI18nStore((s) => s.locale);
  const { setTranslated, toggleOriginal, isShowingOriginal, hasTranslation, getTranslated } =
    useTranslationStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canTranslate = locale !== 'en' && !!gameId;
  const isTranslated = hasTranslation(gameId, locale);
  const showingOriginal = isShowingOriginal(gameId);

  const translate = async () => {
    if (!canTranslate || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const entries = Object.entries(fields).filter(([, v]) => !!v) as [string, string][];
      const results: Record<string, string> = {};
      // Translate all non-empty fields in parallel
      await Promise.all(
        entries.map(async ([key, value]) => {
          try {
            results[key] = await translateText(value, locale);
          } catch {
            results[key] = value; // keep original on individual field failure
          }
        })
      );
      setTranslated(gameId, locale, results);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const getField = (field: keyof TranslatableFields): string | undefined => {
    const original = fields[field];
    if (!isTranslated || showingOriginal) return original;
    return getTranslated(gameId, locale, field) ?? original;
  };

  return {
    translate,
    toggleOriginal: () => toggleOriginal(gameId),
    isLoading,
    error,
    canTranslate,
    isTranslated,
    showingOriginal,
    getField,
  };
}
