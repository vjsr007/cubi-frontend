import { invoke } from '@tauri-apps/api/core';
import type {
  AppConfig, SystemInfo, GameInfo, ScanResult, GameMedia, SystemMedia,
  ScraperConfig, ScrapeJob, ScrapeResult, EsDECredentials,
  PcImportGame, PcLibraryStatus, SystemEmulatorInfo,
} from '../types';

export const api = {
  // Config
  getConfig: () => invoke<AppConfig>('get_config'),
  setConfig: (config: AppConfig) => invoke<void>('set_config', { config }),
  detectEmudeck: () => invoke<string | null>('detect_emudeck'),
  getConfigPath: () => invoke<string>('get_config_path'),
  setFullscreen: (fullscreen: boolean) => invoke<void>('set_fullscreen', { fullscreen }),

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
  getAllEmulatorInfo: () => invoke<SystemEmulatorInfo[]>('get_all_emulator_info'),

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
  importEsdeCredentials: () => invoke<EsDECredentials>('import_esde_credentials'),

  // PC Games
  detectPcLibs: () => invoke<PcLibraryStatus>('detect_pc_libs'),
  importSteamGames: (sgdbKey?: string) => invoke<PcImportGame[]>('import_steam_games', { sgdbKey }),
  importEpicGames: (sgdbKey?: string) => invoke<PcImportGame[]>('import_epic_games', { sgdbKey }),
  importEaGames: (sgdbKey?: string) => invoke<PcImportGame[]>('import_ea_games', { sgdbKey }),
  importGogGames: (sgdbKey?: string) => invoke<PcImportGame[]>('import_gog_games', { sgdbKey }),
  savePcGames: (games: PcImportGame[]) => invoke<number>('save_pc_games', { games }),
  addPcGame: (
    title: string,
    exePath: string,
    boxArt?: string,
    developer?: string,
    publisher?: string,
    year?: string,
    genre?: string,
  ) => invoke<GameInfo>('add_pc_game', { title, exePath, boxArt, developer, publisher, year, genre }),
  deletePcGame: (gameId: string) => invoke<void>('delete_pc_game', { gameId }),
};
