# DES-011 — Localization & Metadata Translation

## Architecture

### 1. Locale Files — `src/i18n/locales/{lang}.ts`
Static TypeScript const objects. Shape defined by `LocaleStrings` type in `src/i18n/index.ts`.
Languages: `en`, `es`, `fr`, `de`, `pt`, `ja`.

### 2. i18n Store — `src/stores/i18nStore.ts`
Zustand store:
```ts
interface I18nState {
  locale: string;                        // active locale code
  setLocale: (code: string) => void;
  t: (key: string) => string;            // dot-notation lookup with en fallback
}
```
`t('settings.title')` traverses the nested locale object.
Synced from config on app load via `AppShell`.

### 3. Metadata Translation — `src/hooks/useTranslate.ts`
```ts
// Calls MyMemory API: GET https://api.mymemory.translated.net/get?q=...&langpair=en|{locale}
function translateText(text: string, targetLang: string): Promise<string>
```
Translation cache in `src/stores/translationStore.ts`:
```ts
interface TranslationStore {
  cache: Record<string, Record<string, string>>;  // gameId -> { fieldKey -> translated }
  showOriginal: Record<string, boolean>;           // gameId -> bool
  setTranslated(gameId, fields): void;
  toggleOriginal(gameId): void;
  isShowingOriginal(gameId): boolean;
}
```

### 4. Settings UI
Language selector in Settings → General section:
- Row of flag+label buttons, one per supported language
- Clicking saves `config.general.language` immediately and calls `setLocale()`

### 5. GameDetailPage Changes
- "Translate" button (globe icon) next to description heading — hidden when locale is `en`
- While translating: spinner replaces button
- After translation: button changes to "Original" toggle
- Translation applies to: `description`, `genre`, `developer`, `publisher`

### 6. AppShell Init
On config load, call `setLocale(config.general.language)`.

## Data Flow
```
config.general.language
    └─> i18nStore.locale
            └─> t('key') used in all components
            └─> useTranslate decides whether to show translate button
                    └─> MyMemory API → translationStore.cache
                            └─> GameDetailPage renders translated or original
```

## Supported Languages
| Code | Name | Native |
|------|------|--------|
| en | English | English |
| es | Spanish | Español |
| fr | French | Français |
| de | German | Deutsch |
| pt | Portuguese | Português |
| ja | Japanese | 日本語 |

## Tasks
- TASK-011-01: Locale files + i18nStore
- TASK-011-02: AppShell init + SettingsPage language switcher
- TASK-011-03: translationStore + useTranslate hook (MyMemory)
- TASK-011-04: GameDetailPage translate/revert button
- TASK-011-05: Apply t() to HyperSpin + common components
