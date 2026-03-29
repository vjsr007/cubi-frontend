import { invoke } from '@tauri-apps/api/core';
import type { AppConfig, SystemInfo, GameInfo, ScanResult, GameMedia, SystemMedia, ScraperConfig, ScrapeJob, ScrapeResult } from '../types';

export const api = {
  // Config
  getConfig: () => invoke<AppConfig>('get_config'),
  setConfig: (config: AppConfig) => invoke<void>('set_config', { config }),
  detectEmudeck: () => invoke<string | null>('detect_emudeck'),
  getConfigPath: () => invoke<string>('get_config_path'),

  // Library
  getSystems: () => invoke<SystemInfo[]>('get_systems'),
  getGames: (systemId: string) => invoke<GameInfo[]>('get_games', { systemId }),
  getGame: (gameId: string) => invoke<GameInfo | null>('get_game', { gameId }),
  toggleFavorite: (gameId: string) => invoke<boolean>('toggle_favorite', { gameId }),

  // Scanner
  scanLibrary: (dataRoot: string) => invoke<ScanResult>('scan_library', { dataRoot }),

  // Launcher
  launchGame: (gameId: string) => invoke<void>('launch_game', { gameId }),
  getEmulatorStatus: (systemId: string) => invoke<string | null>('get_emulator_status', { systemId }),

  // Media
  getGameMedia: (gameId: string) => invoke<GameMedia>('get_game_media', { gameId }),
  getSystemMedia: (systemId: string) => invoke<SystemMedia>('get_system_media', { systemId }),
  downloadGameMedia: (gameId: string) => invoke<GameMedia>('download_game_media', { gameId }),
  downloadSystemMedia: (systemId: string) => invoke<SystemMedia>('download_system_media', { systemId }),

  // Scrapers
  getScrapers: () => invoke<ScraperConfig[]>('get_scrapers'),
  addScraper: (scraper: ScraperConfig) => invoke<void>('add_scraper', { scraper }),
  updateScraper: (scraper: ScraperConfig) => invoke<void>('update_scraper', { scraper }),
  deleteScraper: (id: string) => invoke<void>('delete_scraper', { id }),
  runScrapeJob: (job: ScrapeJob) => invoke<ScrapeResult>('run_scrape_job', { job }),
  cancelScrapeJob: () => invoke<void>('cancel_scrape_job'),
};
