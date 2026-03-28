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
export type Page = 'library' | 'settings' | 'game-detail';
