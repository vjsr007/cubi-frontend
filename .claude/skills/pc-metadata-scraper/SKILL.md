---
name: pc-metadata-scraper
description: Domain knowledge for the PC game enhanced metadata pipeline — Steam Store API, IGDB, SteamGridDB extended, MobyGames, PCGamingWiki, YouTube/yt-dlp, and the web scraper engine (HTML + headless Chrome via chromiumoxide)
---

# PC Metadata Scraper — Domain Knowledge

## Source Priority Pipeline

When enriching a PC game, sources are tried in this order. Each source only fills **missing** fields (unless overwrite=true):

```
1. Steam Store API      → Steam games only (uses source_id = steam appid)
2. IGDB                 → All PC games (Epic, GOG, EA, Steam)
3. SteamGridDB Extended → Hero / Logo / Background art for all PC games
4. MobyGames            → Fallback if IGDB finds nothing
5. PCGamingWiki         → Always free, stores wiki URL + metacritic
6. YouTube + yt-dlp     → Trailer search + optional local download
7. Web Scraper          → Extracts OG metadata from official site or any URL
```

## Source Details

### Steam Store API
- **Auth:** None required
- **Endpoint:** `https://store.steampowered.com/api/appdetails?appids={appid}&cc=us&l=en`
- **Rate limit:** 1 request per 1.5 seconds (~200 req/5min)
- **Key field:** `source_id` in games table (Steam AppID)
- **Gets:** description, developer, publisher, year, genres, metacritic, tags, website, background, screenshots (up to 5), trailer MP4

### IGDB / Twitch API
- **Auth:** OAuth2 client credentials — POST to `https://id.twitch.tv/oauth2/token`
- **Config fields:** `igdb_client_id`, `igdb_client_secret` in `[pc_metadata]` TOML section
- **Query language:** APIcalypse (POST body, not URL params)
- **Platform filter:** `platforms = (6)` = PC Windows
- **Image URL fix:** Replace `t_thumb` with `t_1080p` and prepend `https:` to IGDB image URLs
- **Token lifetime:** ~60 days, refresh on 401

### SteamGridDB Extended
- **Auth:** Bearer token (existing `steamgriddb_api_key`)
- **New endpoints:**
  - Heroes: `GET https://www.steamgriddb.com/api/v2/heroes/steam/{appid}`
  - Logos: `GET https://www.steamgriddb.com/api/v2/logos/steam/{appid}`
  - Backgrounds: `GET https://www.steamgriddb.com/api/v2/grids/steam/{appid}?dimensions=1920x620`
- **Fallback for non-Steam:** Search by title first, then use SGDB game ID

### MobyGames
- **Auth:** `?api_key={key}` query param
- **Platform ID:** 3 = PC Windows
- **Rate limit:** 1 req/s (free tier)
- **Score range:** 0-5 → normalize to 0.0-1.0

### PCGamingWiki
- **Auth:** None
- **API type:** MediaWiki API (`/w/api.php`)
- **Search:** `action=opensearch&search={title}&limit=3`
- **Infobox data:** `action=cargoquery&tables=Infobox_game&fields=Steam_AppID,Metacritic`
- **Rate limit:** Courtesy 1 req/s

### YouTube
- **Auth:** YouTube Data API v3 key (`youtube_api_key`)
- **Fallback (no key):** Invidious public API at `https://vid.puffyan.us/api/v1/search`
- **Search query format:** `{title} official trailer game`
- **Quota:** 10,000 units/day; search = 100 units → ~100 searches/day free

### yt-dlp
- **Detection:** `which::which("yt-dlp")`
- **Command:** `yt-dlp -f "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]" --merge-output-format mp4 -o {dest} --no-playlist --socket-timeout 30 {url}`
- **Timeout:** 5 minutes via `tokio::time::timeout`
- **Dest:** `media/pc/videos/{sanitized_name}_trailer.mp4`

### Web Scraper Engine
- **HTML scraper:** `reqwest` + `scraper` crate (CSS selectors). Fast, no Chrome needed.
- **Headless scraper:** `chromiumoxide` crate — Chrome DevTools Protocol. For JS-rendered pages.
- **Chrome detection:** `which::which("google-chrome")` / `"chromium"` / `"chrome"`
- **Auto-dispatch:** Try HTML first. If result is empty, retry with headless if Chrome available.
- **Extraction priority:** `og:*` meta tags → `<meta name="description">` → `<h1>` → `<img>`

### DuckDuckGo Search
- **Endpoint:** `https://api.duckduckgo.com/?q={query}&format=json&no_html=1&skip_disambig=1`
- **Auth:** None
- **Fields used:** `AbstractURL`, `Results[].FirstURL`
- **Domain scoring:** +10 for title in domain, -10 for wikipedia/fandom, +3 for known stores

## Media Storage Paths

```
{app_data}/media/pc/
├── box2dfront/     → Cover art (600×900)
├── hero/           → Hero/banner (1920×620)
├── logo/           → Transparent logo PNG
├── background/     → Background wallpaper
├── screenshots/    → In-game screenshots
└── videos/         → Downloaded trailers (MP4)
```

## New Database Fields

Added to `games` table via migration v2:

| Column | Type | Notes |
|---|---|---|
| `hero_art` | TEXT | Local path to hero image |
| `logo` | TEXT | Local path to logo PNG |
| `background_art` | TEXT | Local path to background |
| `screenshots` | TEXT | JSON array of local paths |
| `trailer_url` | TEXT | YouTube or Steam CDN URL |
| `trailer_local` | TEXT | Local path if downloaded via yt-dlp |
| `metacritic_score` | INTEGER | 0-100 |
| `tags` | TEXT | JSON array of genre/tag strings |
| `website` | TEXT | Official game website URL |
| `pcgamingwiki_url` | TEXT | PCGamingWiki page URL |
| `igdb_id` | INTEGER | IGDB game ID |

## Rust Crate Additions

```toml
scraper = "0.20"                                                    # HTML parsing
chromiumoxide = { version = "0.7", features = ["tokio-runtime"] }  # Headless Chrome
url = "2"                                                           # URL manipulation
```

## Configuration (TOML)

New `[pc_metadata]` section in app config:

```toml
[pc_metadata]
igdb_client_id = ""
igdb_client_secret = ""
mobygames_api_key = ""
youtube_api_key = ""
max_screenshots = 5
download_trailers = false
use_headless_browser = false
enabled_sources = ["steam_store", "igdb", "steamgriddb", "pcgamingwiki", "youtube", "web_scraper"]
```

## Common Pitfalls

| Problem | Solution |
|---|---|
| Steam rate limit 429 | Sleep 1500ms between calls, retry once after 5s |
| IGDB token expired | Catch 401, re-authenticate, retry original request once |
| yt-dlp not in PATH | Use `check_pc_scraper_tools` to detect path; pass full path to Command |
| Chrome sandboxing | Always pass `--no-sandbox --disable-dev-shm-usage` flags |
| Title mismatch | Normalize both sides: lowercase, strip "The "/"A ", remove punctuation, trim |
| IGDB image 404 | Always use `https:` prefix (IGDB returns protocol-relative `//images.igdb.com/...`) |
