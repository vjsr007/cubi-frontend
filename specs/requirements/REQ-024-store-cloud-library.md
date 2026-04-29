---
id: REQ-024
title: "Store Cloud Library — Show Owned & Available-to-Install Games"
status: DRAFT
author: "architect"
created: 2026-04-28
updated: 2026-04-28
priority: P2
tags: [backend, pc, steam, epic, gog, xbox, ui, api]
---

# REQ-024: Store Cloud Library — Show Owned & Available-to-Install Games

## Summary
Extend the PC Games section to show not only locally-installed games but also games the user **owns in the cloud** (purchased but not yet installed). For Steam this means querying `IPlayerService/GetOwnedGames` on the Steam Web API. For Epic, GOG, and Xbox Game Pass the app authenticates via OAuth tokens stored locally by each launcher. Games not installed show an "Install" badge and can be launched by opening the respective store's install page.

## User Stories
- **As a** Steam user, **I want** to see all my purchased Steam games in Cubi — installed and not installed — **so that** I can decide what to install without opening Steam.
- **As a** Epic Games user, **I want** my full Epic library visible in Cubi, **so that** I have a single place to browse all my PC games.
- **As a** GOG user, **I want** Cubi to show my GOG purchases, **so that** I can launch installers directly from the library view.
- **As a** Xbox Game Pass subscriber, **I want** to browse all available Game Pass titles in Cubi, **so that** I can discover and install games without leaving the app.
- **As a** user, **I want** unavailable (uninstalled) games to look visually distinct, **so that** I don't accidentally try to launch something that needs to be installed first.

## Functional Requirements

### Steam
1. **FR-1**: Add a SteamID field to the PC settings (numeric 64-bit Steam ID or vanity URL).
2. **FR-2**: Use `IPlayerService/GetOwnedGames?steamid=…&include_appinfo=1` (Steam Web API, requires API key) to fetch the full owned games list.
3. **FR-3**: Cross-reference owned games against locally-installed `appmanifest_*.acf` files to determine installed vs not-installed status.
4. **FR-4**: Uninstalled Steam games launch `steam://install/<appid>` to open the Steam install dialog.

### Epic Games
5. **FR-5**: Read Epic's local OAuth token from `%LOCALAPPDATA%\EpicGamesLauncher\Saved\Config\Windows\GameUserSettings.ini` or the launcher's credentials store — no separate login required.
6. **FR-6**: Call `https://launcher-public-service-prod06.ol.epicgames.com/launcher/api/public/assets/v2/...` with the local access token to retrieve owned entitlements.
7. **FR-7**: Uninstalled Epic games launch `com.epicgames.launcher://apps/<namespaceId>?action=install`.

### GOG Galaxy
8. **FR-8**: Read GOG Galaxy's local auth token from its SQLite credentials database (`%LOCALAPPDATA%\GOG.com\Galaxy\storage\galaxy-2.0.db`).
9. **FR-9**: Use `https://embed.gog.com/user/data/games` (GOG API) to list owned game IDs; resolve details via `https://www.gog.com/account/gameDetails/<id>.json`.
10. **FR-10**: Uninstalled GOG games open `goggalaxy://openGameView/<productId>`.

### Xbox Game Pass
11. **FR-11**: Query the Xbox catalog for titles currently in the user's active Game Pass subscription using the Xbox APIs.
12. **FR-12**: Detect installed Xbox titles by checking the `C:\XboxGames\` directory and UWP package registry.
13. **FR-13**: Uninstalled Xbox Game Pass titles open `ms-windows-store://pdp/?productid=<id>`.

### Shared / UI
14. **FR-14**: The `PcGamesPage` tab for each store shows a `NOT INSTALLED` badge on games that are owned but not present locally.
15. **FR-15**: The badge style follows the existing design system (color-coded, 12px uppercase).
16. **FR-16**: Cloud-fetched game lists are cached locally (SQLite) for 24 hours to avoid rate-limiting.
17. **FR-17**: A manual "Refresh library" button forces a re-fetch bypassing the cache.
18. **FR-18**: If API credentials are unavailable or the request fails, the UI falls back gracefully to showing only locally-detected games (current behavior).

## Non-Functional Requirements
1. **NFR-1**: Performance — Cloud library fetch (Steam/Epic/GOG/Xbox) must complete in <10 s on a stable internet connection; cached reads must complete in <500 ms.
2. **NFR-2**: Privacy — API keys and OAuth tokens are stored only in the app's config (local TOML), never logged or transmitted to third parties.
3. **NFR-3**: Security — HTTPS for all API calls; tokens stored with same permissions as the existing config file.
4. **NFR-4**: Graceful degradation — ALL store features continue to work (installed-only mode) when API keys / tokens are absent or invalid.
5. **NFR-5**: Rate limiting — Respect each API's rate limits; exponential backoff on 429 responses.

## Acceptance Criteria
- [ ] Steam: entering a Steam Web API key + SteamID fetches the owned-game list and shows uninstalled games with a `NOT INSTALLED` badge.
- [ ] Epic: local OAuth token is detected and used automatically with no user login step inside Cubi.
- [ ] GOG: local auth token is read from Galaxy's SQLite DB and owned games list is displayed.
- [ ] Xbox: Game Pass catalog shown and installed titles detected from UWP packages.
- [ ] Clicking an uninstalled game opens the correct store protocol URL (`steam://install/…`, `com.epicgames.launcher://…`, etc.).
- [ ] Cache is written to SQLite on successful fetch; subsequent loads within 24 h use the cache.
- [ ] "Refresh library" button clears the cache entry and re-fetches.
- [ ] No crash or error visible if API key / token is missing — the section shows only locally-detected games.
- [ ] All existing import functionality (scan installed, save_pc_games) continues to work unchanged.

## Dependencies
- Depends on: REQ-022 (PC games base, already implemented), Steam Web API key (user-provided), Epic/GOG local OAuth tokens (auto-detected)
- Blocked by: none

## Out of Scope
- In-app purchase / checkout flow
- Downloading / installing games from within Cubi (just launches the store's own install dialog)
- Managing subscriptions or account management
- Game sharing or family library visibility
- Linux / macOS store path detection (Windows-first; Linux deferred to future REQ)

## Open Questions
- [ ] Should Xbox Game Pass integration target the catalog-wide list or only tiles the user has previously downloaded?
- [ ] For Epic, should we surface free games the user claimed via the weekly promotion?

## References
- Steam Web API: https://partner.steamgames.com/doc/webapi/IPlayerService#GetOwnedGames
- Epic Games Launcher local credentials: community-documented at heroicgameslauncher/heroic-games-launcher
- GOG Galaxy API: https://gogapidocs.readthedocs.io/en/latest/
- Xbox Store API: https://docs.microsoft.com/en-us/gaming/gdk/_content/gc/live-service-configuration/live-locating-an-app-in-the-store
