export interface AppConfig {
  general: GeneralConfig;
  paths: PathsConfig;
  scanner: ScannerConfig;
}

export interface GeneralConfig {
  version: string;
  theme: string;
  language: string;
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
export type Page = 'library' | 'settings' | 'game-detail' | 'scraper';

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
