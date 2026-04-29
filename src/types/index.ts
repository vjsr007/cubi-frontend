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
  /** Steam Web API key — required for cloud library fetch (REQ-024).
   *  Get yours at https://steamcommunity.com/dev/apikey */
  steam_api_key?: string;
  /** Steam ID or vanity URL — used with steam_api_key for cloud library (REQ-024). */
  steam_id?: string;
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

export type VerificationStatus = 'unverified' | 'ok' | 'file_missing' | 'file_unreadable' | 'emulator_missing' | 'launch_failed';

export interface GamesPage {
  games: GameInfo[];
  total: number;
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
  // PC Enhanced Metadata (REQ-015)
  hero_art?: string;
  logo?: string;
  background_art?: string;
  screenshots?: string[];
  trailer_url?: string;
  trailer_local?: string;
  metacritic_score?: number;
  tags?: string[];
  website?: string;
  pcgamingwiki_url?: string;
  igdb_id?: number;
  // Game verification
  verification_status: VerificationStatus;
  verification_message?: string;
}

export interface GameVerificationResult {
  game_id: string;
  title: string;
  system_id: string;
  status: VerificationStatus;
  message: string;
}

export interface VerificationSummary {
  total: number;
  ok: number;
  file_missing: number;
  file_unreadable: number;
  emulator_missing: number;
  launch_failed: number;
  results: GameVerificationResult[];
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
export type Page = 'library' | 'settings' | 'game-detail' | 'scraper' | 'pc-games' | 'emulator-config' | 'rom-paths' | 'input-mapping' | 'emulator-settings' | 'game-verification' | 'catalog';

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

export type PcGameSource = 'steam' | 'epic' | 'ea' | 'gog' | 'xbox' | 'manual';

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
  /** Whether the game is currently installed locally (REQ-024). */
  installed: boolean;
}

export interface PcLibraryStatus {
  steam_found: boolean;
  steam_path?: string;
  epic_found: boolean;
  ea_found: boolean;
  gog_found: boolean;
  xbox_found: boolean;
}

// ── PC Metadata Scraper (REQ-015) ─────────────────────────────────────

export interface PcMetadataConfig {
  igdb_client_id?: string;
  igdb_client_secret?: string;
  mobygames_api_key?: string;
  youtube_api_key?: string;
  steamgriddb_api_key?: string;
  max_screenshots: number;
  download_trailers: boolean;
  use_headless_browser: boolean;
  enabled_sources: string[];
}

export interface PcToolsStatus {
  ytdlp_available: boolean;
  ytdlp_path?: string;
  chrome_available: boolean;
  chrome_path?: string;
}

export interface PcScrapeResult {
  game_id: string;
  title: string;
  ok: boolean;
  error?: string;
  fields_updated: number;
}

export interface PcScrapeProgress {
  current: number;
  total: number;
  game_title: string;
  source: string;
  done: boolean;
}

export type PcMetadataSource =
  | 'steam_store'
  | 'igdb'
  | 'steamgriddb'
  | 'mobygames'
  | 'pcgamingwiki'
  | 'youtube'
  | 'web_scraper';

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
  manual: string | null;
}

export interface SystemMedia {
  fan_art: string | null;
  wheel: string | null;
  marquee: string | null;
}

// ── Metadata Editor (REQ-018) ────────────────────────────────────────

export interface MediaImportResult {
  saved_path: string;
  media_type: string;
}

export interface YoutubeSearchResult {
  video_id: string;
  title: string;
  url: string;
}

export type EditableMediaType = 'box_art' | 'hero_art' | 'logo' | 'background_art' | 'screenshot' | 'video';

// ── ROM Path Overrides ────────────────────────────────────────────────

export interface SystemDefInfo {
  id: string;
  name: string;
  full_name: string;
  folder_names: string[];
}

export interface RomPathOverride {
  system_id: string;
  custom_path: string;
}

// ── Input Mapping ─────────────────────────────────────────────────────

export type ControllerType = 'Xbox' | 'PlayStation' | 'Nintendo' | 'Custom';

export interface InputProfile {
  id: string;
  name: string;
  controller_type: ControllerType;
  is_builtin: boolean;
  created_at: string;
  updated_at: string;
}

export interface ButtonBinding {
  profile_id: string;
  action: string;
  button_index: number;
  axis_index?: number;
  axis_direction?: string;
}

export interface SystemProfileAssignment {
  system_id: string;
  profile_id: string;
}

export interface ActionInfo {
  name: string;
  category: string; // 'UI' | 'Game' | 'Hotkey'
}

// ── Flash Key Mappings ───────────────────────────────────────────────

export interface FlashKeyMapping {
  game_id: string;
  gamepad_button: number;
  keyboard_key: string;
}

export type LeftStickMode = 'disabled' | 'wasd' | 'arrows';

export interface FlashGameConfig {
  game_id: string;
  left_stick_mode: LeftStickMode;
  right_stick_mouse: boolean;
  mouse_sensitivity: number;
}

// ── Emulator General Settings ─────────────────────────────────────────

export type SettingType = 'bool' | 'select' | 'range';
export type SettingCategory = 'video' | 'audio' | 'system' | 'performance';

export interface SettingDefinition {
  key: string;
  display_name: string;
  description: string;
  setting_type: SettingType;
  options?: string[];
  range_min?: number;
  range_max?: number;
  default_value: string;
  category: SettingCategory;
  sort_order: number;
  locked: boolean;
}

export interface EmulatorSettingValue {
  emulator_name: string;
  setting_key: string;
  value: string;
}

export interface ConfigWriterInfo {
  emulator_name: string;
  config_format: string;
  supported_settings: string[];
  default_config_path?: string;
}

// ── Game Catalog (REQ-022) ────────────────────────────────────────────

export interface CatalogGame {
  id: string;
  system_id: string;
  title: string;
  region: string;
  sha1?: string;
  md5?: string;
  crc32?: string;
  file_size?: number;
  file_name: string;
  dat_name: string;
  owned: boolean;
  owned_game_id?: string;
}

export interface CatalogSync {
  system_id: string;
  dat_name: string;
  dat_version: string;
  entry_count: number;
  last_synced: string;
  source_url?: string;
}

export interface CatalogSystemStats {
  system_id: string;
  system_name: string;
  total: number;
  owned: number;
  missing: number;
  last_synced?: string;
}

export interface CatalogPage {
  games: CatalogGame[];
  total: number;
  page: number;
  page_size: number;
}

export interface CatalogFilter {
  system_id: string;
  status?: 'owned' | 'missing';
  region?: string;
  search?: string;
  page: number;
  page_size: number;
}

export interface CatalogConfig {
  dat_source_url: string;
  auto_sync: boolean;
  download_urls: Record<string, string>;
}

// ── System Wiki ───────────────────────────────────────────────────────

export interface SystemWiki {
  system_id: string;
  manufacturer: string;
  release_year?: number;
  discontinue_year?: number;
  generation?: number;
  media_type: string;
  cpu: string;
  memory: string;
  graphics: string;
  sound: string;
  display: string;
  units_sold: string;
  launch_price: string;
  description: string;
  wikipedia_url: string;
  image_url: string;
  notable_games: string;
  emulators: string;
  updated_at?: string;
}

// ── Multi-Emulator Support (REQ-023) ──────────────────────────────────

export interface EmulatorChoice {
  emulator_name: string;
  detected_path?: string;
  is_installed: boolean;
}

export interface SystemEmulatorChoice {
  system_id: string;
  system_name: string;
  available_emulators: EmulatorChoice[];
  selected_emulator?: string;
}
