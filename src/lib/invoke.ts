import { invoke } from '@tauri-apps/api/core';
import type {
  AppConfig, SystemInfo, GameInfo, ScanResult, GameMedia, SystemMedia,
  ScraperConfig, ScrapeJob, ScrapeResult, EsDECredentials,
  PcImportGame, PcLibraryStatus, SystemEmulatorInfo,
  SystemDefInfo, RomPathOverride,
  InputProfile, ButtonBinding, SystemProfileAssignment, ActionInfo,
  SettingDefinition, EmulatorSettingValue, ConfigWriterInfo,
  PcMetadataConfig, PcToolsStatus, PcScrapeResult,
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
  getAllGames: () => invoke<GameInfo[]>('get_all_games'),
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
};
