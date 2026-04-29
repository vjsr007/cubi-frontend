import { invoke } from '@tauri-apps/api/core';
import type {
  AppConfig, SystemInfo, GameInfo, GamesPage, ScanResult, GameMedia, SystemMedia,
  ScraperConfig, ScrapeJob, ScrapeResult, EsDECredentials,
  PcImportGame, PcLibraryStatus, SystemEmulatorInfo,
  SystemDefInfo, RomPathOverride,
  InputProfile, ButtonBinding, SystemProfileAssignment, ActionInfo,
  SettingDefinition, EmulatorSettingValue, ConfigWriterInfo,
  PcMetadataConfig, PcToolsStatus, PcScrapeResult,
  MediaImportResult, YoutubeSearchResult,
  CatalogSystemStats, CatalogPage, CatalogFilter, CatalogSync, CatalogConfig,
  SystemWiki, FlashKeyMapping, FlashGameConfig,
} from '../types';
import type { GameInfoPatch } from '../types/editor';
import type { SteamSearchResult, SteamGameData } from '../types/steam';

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
  getAllGames: () => invoke<GameInfo[]>('get_all_games'),
  getGamesPage: (systemId: string, offset: number, limit: number) =>
    invoke<GamesPage>('get_games_page', { systemId, offset, limit }),
  getAllGamesPage: (offset: number, limit: number) =>
    invoke<GamesPage>('get_all_games_page', { offset, limit }),
  getGame: (gameId: string) => invoke<GameInfo | null>('get_game', { gameId }),
  toggleFavorite: (gameId: string) => invoke<boolean>('toggle_favorite', { gameId }),

  // Scanner
  scanLibrary: (dataRoot: string) => invoke<ScanResult>('scan_library', { dataRoot }),
  scanSystem: (dataRoot: string, systemId: string) => invoke<ScanResult>('scan_system', { dataRoot, systemId }),

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
  importSteamGames: (sgdbKey?: string, steamId?: string, steamApiKey?: string, forceRefresh?: boolean) =>
    invoke<PcImportGame[]>('import_steam_games', { sgdbKey, steamId, steamApiKey, forceRefresh }),
  importEpicGames: (sgdbKey?: string, forceRefresh?: boolean) =>
    invoke<PcImportGame[]>('import_epic_games', { sgdbKey, forceRefresh }),
  importEaGames: (sgdbKey?: string) => invoke<PcImportGame[]>('import_ea_games', { sgdbKey }),
  importGogGames: (sgdbKey?: string, forceRefresh?: boolean) =>
    invoke<PcImportGame[]>('import_gog_games', { sgdbKey, forceRefresh }),
  importXboxGames: (sgdbKey?: string, forceRefresh?: boolean) =>
    invoke<PcImportGame[]>('import_xbox_games', { sgdbKey, forceRefresh }),
  clearPcCloudCache: (store?: string) => invoke<void>('clear_pc_cloud_cache', { store }),
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

  // ROM Path Overrides
  getSystemRegistryList: () => invoke<SystemDefInfo[]>('get_system_registry_list'),
  getRomPathOverrides: () => invoke<RomPathOverride[]>('get_rom_path_overrides'),
  setRomPathOverride: (systemId: string, customPath: string) =>
    invoke<void>('set_rom_path_override', { systemId, customPath }),
  deleteRomPathOverride: (systemId: string) =>
    invoke<void>('delete_rom_path_override', { systemId }),

  // Input Mapping
  getInputProfiles: () => invoke<InputProfile[]>('get_input_profiles'),
  getInputProfile: (profileId: string) => invoke<InputProfile | null>('get_input_profile', { profileId }),
  createInputProfile: (name: string, controllerType: string, baseProfileId?: string) =>
    invoke<InputProfile>('create_input_profile', { name, controllerType, baseProfileId }),
  updateInputProfile: (profileId: string, name: string) =>
    invoke<void>('update_input_profile', { profileId, name }),
  deleteInputProfile: (profileId: string) =>
    invoke<void>('delete_input_profile', { profileId }),
  getProfileBindings: (profileId: string) =>
    invoke<ButtonBinding[]>('get_profile_bindings', { profileId }),
  setBinding: (profileId: string, action: string, buttonIndex: number, axisIndex?: number, axisDirection?: string) =>
    invoke<void>('set_binding', { profileId, action, buttonIndex, axisIndex, axisDirection }),
  resetProfileBindings: (profileId: string) =>
    invoke<void>('reset_profile_bindings', { profileId }),
  getSystemProfileAssignments: () =>
    invoke<SystemProfileAssignment[]>('get_system_profile_assignments'),
  setSystemProfileAssignment: (systemId: string, profileId: string) =>
    invoke<void>('set_system_profile_assignment', { systemId, profileId }),
  deleteSystemProfileAssignment: (systemId: string) =>
    invoke<void>('delete_system_profile_assignment', { systemId }),
  assignProfileToAllSystems: (profileId: string) =>
    invoke<number>('assign_profile_to_all_systems', { profileId }),
  exportProfileForEmulator: (profileId: string, emulatorName: string) =>
    invoke<string>('export_profile_for_emulator', { profileId, emulatorName }),
  writeProfileToRetroarch: (profileId: string) =>
    invoke<string>('write_profile_to_retroarch', { profileId }),
  writeProfileToEmulator: (profileId: string, emulatorName: string) =>
    invoke<string>('write_profile_to_emulator', { profileId, emulatorName }),
  getRetroarchCfgPath: () =>
    invoke<{ path: string; exists: boolean }>('get_retroarch_cfg_path'),
  resetRetroarchInput: () =>
    invoke<string>('reset_retroarch_input'),
  getAllActions: () => invoke<ActionInfo[]>('get_all_actions'),
  getButtonLabel: (buttonIndex: number) => invoke<string>('get_button_label', { buttonIndex }),

  // Emulator General Settings
  getSettingDefinitions: () => invoke<SettingDefinition[]>('get_setting_definitions'),
  getConfigWritersInfo: () => invoke<ConfigWriterInfo[]>('get_config_writers_info'),
  getEmulatorSettings: (emulatorName: string) =>
    invoke<EmulatorSettingValue[]>('get_emulator_settings', { emulatorName }),
  getAllEmulatorSettings: () =>
    invoke<EmulatorSettingValue[]>('get_all_emulator_settings'),
  setEmulatorSetting: (emulatorName: string, settingKey: string, value: string) =>
    invoke<void>('set_emulator_setting', { emulatorName, settingKey, value }),
  resetEmulatorSettings: (emulatorName: string) =>
    invoke<void>('reset_emulator_settings', { emulatorName }),
  previewEmulatorConfig: (emulatorName: string) =>
    invoke<string>('preview_emulator_config', { emulatorName }),

  // PC Metadata Scraper (REQ-015)
  checkPcScraperTools: () => invoke<PcToolsStatus>('check_pc_scraper_tools'),
  getPcMetadataConfig: () => invoke<PcMetadataConfig>('get_pc_metadata_config'),
  savePcMetadataConfig: (pcMetadata: PcMetadataConfig) => invoke<void>('save_pc_metadata_config', { pcMetadata }),
  scrapeSinglePcGame: (gameId: string) => invoke<PcScrapeResult>('scrape_single_pc_game', { gameId }),
  runPcMetadataJob: (gameIds?: string[]) => invoke<PcScrapeResult[]>('run_pc_metadata_job', { gameIds }),

  // Metadata Editor (REQ-018)
  updateGameMetadata: (gameId: string, patch: GameInfoPatch) =>
    invoke<GameInfo>('update_game_metadata', { gameId, patch }),
  importMediaFile: (gameId: string, sourcePath: string, mediaType: string) =>
    invoke<MediaImportResult>('import_media_file', { gameId, sourcePath, mediaType }),
  importMediaUrl: (gameId: string, url: string, mediaType: string) =>
    invoke<MediaImportResult>('import_media_url', { gameId, url, mediaType }),
  deleteGameMedia: (gameId: string, mediaType: string) =>
    invoke<void>('delete_game_media', { gameId, mediaType }),
  searchYoutube: (query: string) =>
    invoke<YoutubeSearchResult[]>('search_youtube', { query }),
  downloadYoutubeVideo: (gameId: string, youtubeUrl: string) =>
    invoke<MediaImportResult>('download_youtube_video', { gameId, youtubeUrl }),

  // Steam integration (REQ-021)
  searchSteamGames: (query: string) =>
    invoke<SteamSearchResult[]>('search_steam_games', { query }),
  linkSteamGame: (gameId: string, steamAppId: number) =>
    invoke<SteamGameData>('link_steam_game', { gameId, steamAppId }),
  fetchSteamData: (gameId: string) =>
    invoke<SteamGameData | null>('fetch_steam_data', { gameId }),
  refreshSteamData: (gameId: string) =>
    invoke<SteamGameData>('refresh_steam_data', { gameId }),

  // Game Catalog (REQ-022)
  getCatalogStats: () => invoke<CatalogSystemStats[]>('get_catalog_stats'),
  getCatalogGames: (filter: CatalogFilter) => invoke<CatalogPage>('get_catalog_games', { filter }),
  importDatFile: (systemId: string, filePath: string) =>
    invoke<CatalogSync>('import_dat_file', { systemId, filePath }),
  syncCatalog: (systemId: string, url?: string) =>
    invoke<CatalogSync>('sync_catalog', { systemId, url }),
  getDefaultDatUrls: () => invoke<Record<string, string>>('get_default_dat_urls'),
  refreshCatalogOwnership: (systemId?: string) =>
    invoke<number>('refresh_catalog_ownership', { systemId }),
  getCatalogConfig: () => invoke<CatalogConfig>('get_catalog_config'),
  setCatalogDownloadUrl: (systemId: string, url: string) =>
    invoke<void>('set_catalog_download_url', { systemId, url }),

  // System Wiki
  getSystemWiki: (systemId: string) =>
    invoke<SystemWiki | null>('get_system_wiki', { systemId }),
  getAllSystemWiki: () =>
    invoke<SystemWiki[]>('get_all_system_wiki'),
  updateSystemWiki: (wiki: SystemWiki) =>
    invoke<void>('update_system_wiki', { wiki }),
  resetSystemWiki: () =>
    invoke<number>('reset_system_wiki'),

  // Flash Key Mappings
  getFlashKeyMappings: (gameId: string) =>
    invoke<FlashKeyMapping[]>('get_flash_key_mappings', { gameId }),
  setFlashKeyMapping: (gameId: string, gamepadButton: number, keyboardKey: string) =>
    invoke<void>('set_flash_key_mapping', { gameId, gamepadButton, keyboardKey }),
  deleteFlashKeyMapping: (gameId: string, gamepadButton: number) =>
    invoke<void>('delete_flash_key_mapping', { gameId, gamepadButton }),
  resetFlashKeyMappings: (gameId: string) =>
    invoke<FlashKeyMapping[]>('reset_flash_key_mappings', { gameId }),
  getDefaultFlashMappings: (gameId: string) =>
    invoke<FlashKeyMapping[]>('get_default_flash_mappings', { gameId }),
  getFlashButtonLabel: (buttonIndex: number) =>
    invoke<string>('get_flash_button_label', { buttonIndex }),
  getFlashGameConfig: (gameId: string) =>
    invoke<FlashGameConfig>('get_flash_game_config', { gameId }),
  setFlashGameConfig: (gameId: string, leftStickMode: string, rightStickMouse: boolean, mouseSensitivity: number) =>
    invoke<void>('set_flash_game_config', { gameId, leftStickMode, rightStickMouse, mouseSensitivity }),

  // Game Emulator Overrides (per-game emulator selection)
  setGameEmulatorOverride: (gameId: string, emulatorName: string) =>
    invoke<void>('set_game_emulator_override', { gameId, emulatorName }),
  getGameEmulatorOverride: (gameId: string) =>
    invoke<string | null>('get_game_emulator_override', { gameId }),
  deleteGameEmulatorOverride: (gameId: string) =>
    invoke<void>('delete_game_emulator_override', { gameId }),
};
