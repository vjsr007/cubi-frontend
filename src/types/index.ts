export interface EmulatorOverride {
  /** Custom path to the emulator executable. */
  exe_path?: string;
  /** Custom launch args with {rom} placeholder. */
  extra_args?: string;
  /** RetroArch core name or path override. */
  core?: string;
}

export interface SystemEmulatorInfo {
  system_id: string;
  system_name: string;
  emulator_name: string;
  detected_path?: string;
  is_retroarch: boolean;
  default_core?: string;
  // user overrides
  exe_path?: string;
  extra_args?: string;
  core?: string;
}

export interface AppConfig {
  general: GeneralConfig;
  paths: PathsConfig;
  scanner: ScannerConfig;
  /** Per-system emulator overrides keyed by system_id. */
  emulators: Record<string, EmulatorOverride>;
}

export interface GeneralConfig {
  version: string;
  theme: string;
  language: string;
  fullscreen: boolean;
  /** SteamGridDB API key — enables cover art for Epic, EA, GOG games.
   *  Get yours at https://www.steamgriddb.com/profile/preferences/api */
  steamgriddb_api_key?: string;
}

export interface PathsConfig {
  data_root: string;
  emudeck_path: string;
}

export interface ScannerConfig {
  auto_scan: boolean;
  hash_roms: boolean;
}

export interface SystemInfo {
  id: string;
  name: string;
  full_name: string;
  extensions: string[];
  game_count: number;
  rom_path: string;
  icon?: string;
}

export interface GameInfo {
  id: string;
  system_id: string;
  title: string;
  file_path: string;
  file_name: string;
  file_size: number;
  box_art?: string;
  description?: string;
  developer?: string;
  publisher?: string;
  year?: string;
  genre?: string;
  players: number;
  rating: number;
  last_played?: string;
  play_count: number;
  favorite: boolean;
}

export interface ScanProgress {
  total: number;
  current: number;
  current_system: string;
  status: string;
}

export interface ScanResult {
  systems_found: number;
  games_found: number;
  errors: string[];
}

export type SortField = 'title' | 'last_played' | 'play_count' | 'rating' | 'year';
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';
export type Page = 'library' | 'settings' | 'game-detail' | 'scraper' | 'pc-games' | 'emulator-config';

export interface ScraperConfig {
  id: string;
  name: string;
  url: string;
  api_key?: string;
  username?: string;
  password?: string;
  enabled: boolean;
  priority: number;
  supports: string[];
  requires_credentials: boolean;
  credential_hint?: string;
}

export type ScrapeFilter = 'all' | 'images_only' | 'videos_only' | 'metadata_only' | 'missing_only';

export interface ScrapeJob {
  scraper_id: string;
  system_id?: string;
  game_ids?: string[];
  filter: ScrapeFilter;
  overwrite: boolean;
}

export interface ScrapeProgress {
  total: number;
  current: number;
  game_title: string;
  status: string;
  errors: string[];
  done: boolean;
}

export interface ScrapeResult {
  scraped: number;
  skipped: number;
  errors: number;
  messages: string[];
}

export interface EsDECredentials {
  screenscraper_username: string | null;
  screenscraper_password: string | null;
  active_scraper: string | null;
}

// ── PC Games ──────────────────────────────────────────────────────────

export type PcGameSource = 'steam' | 'epic' | 'ea' | 'gog' | 'manual';

export interface PcImportGame {
  title: string;
  /** Exe path or protocol URL */
  file_path: string;
  file_size: number;
  developer?: string;
  publisher?: string;
  source: PcGameSource;
  source_id: string;
  install_path?: string;
  box_art?: string;
}

export interface PcLibraryStatus {
  steam_found: boolean;
  steam_path?: string;
  epic_found: boolean;
  ea_found: boolean;
  gog_found: boolean;
}

export interface GameMedia {
  box_art: string | null;
  back_cover: string | null;
  screenshot: string | null;
  title_screen: string | null;
  fan_art: string | null;
  wheel: string | null;
  marquee: string | null;
  mix_image: string | null;
  video: string | null;
}

export interface SystemMedia {
  fan_art: string | null;
  wheel: string | null;
  marquee: string | null;
}
