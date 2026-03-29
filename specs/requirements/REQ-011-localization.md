# REQ-011 — Localization & Metadata Translation

## Summary
Add multi-language support to the UI and on-demand translation of game metadata (descriptions, genres, etc.) with the ability to revert to the original scraped text.

## Requirements

### R1 — UI Localization
- All visible UI strings must be externalized into locale files
- Supported languages: English (en), Spanish (es), French (fr), German (de), Portuguese (pt), Japanese (ja)
- Language setting persisted in `config.general.language` (already in config model)
- Language switcher available in Settings → General section
- Locale activates immediately without app restart
- **Localization is always handled in the frontend** — no Rust changes needed

### R2 — Metadata Translation
- Game metadata fields (description, genre, developer, publisher) can be translated on demand
- Translation triggered by a "Translate" button in the game detail view
- Uses MyMemory free API (no API key required): `https://api.mymemory.translated.net/get`
- Translated results cached in frontend store (per gameId + locale)
- Translations are only fetched for the current language — if language is `en`, no translation needed

### R3 — Revert to Original
- A "Show Original" toggle button appears after a translation has been applied
- Toggling shows the original scraped text
- Original text is always preserved in the game store (never overwritten)
- Per-game toggle state (can have some games showing translated, others original)

### R4 — Fallback Behavior
- If translation API fails, show original text silently with a toast error
- If a locale key is missing, fall back to English
- If language is English, translation button is hidden (already in source language)
