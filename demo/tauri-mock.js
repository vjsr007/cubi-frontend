/**
 * CUBI FRONTEND v0.7.0 — Tauri API Mock for Playwright Demo
 * 
 * Injects mock data into window.__TAURI_INTERNALS__ so the app
 * works in a standalone browser for demo recording.
 */

// ============================================================================
// MOCK DATA
// ============================================================================

const SYSTEMS = [
  { id: 'nes',         name: 'NES',           full_name: 'Nintendo Entertainment System',    extensions: ['.nes','.zip'], game_count: 47, rom_path: 'E:\\Emulation\\roms\\nes' },
  { id: 'snes',        name: 'SNES',          full_name: 'Super Nintendo',                   extensions: ['.sfc','.smc'], game_count: 38, rom_path: 'E:\\Emulation\\roms\\snes' },
  { id: 'n64',         name: 'N64',           full_name: 'Nintendo 64',                      extensions: ['.z64','.n64'], game_count: 22, rom_path: 'E:\\Emulation\\roms\\n64' },
  { id: 'gb',          name: 'GB',            full_name: 'Game Boy',                          extensions: ['.gb'],         game_count: 31, rom_path: 'E:\\Emulation\\roms\\gb' },
  { id: 'gba',         name: 'GBA',           full_name: 'Game Boy Advance',                  extensions: ['.gba'],        game_count: 28, rom_path: 'E:\\Emulation\\roms\\gba' },
  { id: 'nds',         name: 'NDS',           full_name: 'Nintendo DS',                       extensions: ['.nds'],        game_count: 19, rom_path: 'E:\\Emulation\\roms\\nds' },
  { id: 'gc',          name: 'GC',            full_name: 'GameCube',                          extensions: ['.iso','.gcz'], game_count: 15, rom_path: 'E:\\Emulation\\roms\\gc' },
  { id: 'wii',         name: 'Wii',           full_name: 'Nintendo Wii',                      extensions: ['.wbfs'],       game_count: 12, rom_path: 'E:\\Emulation\\roms\\wii' },
  { id: 'wiiu',        name: 'Wii U',         full_name: 'Nintendo Wii U',                    extensions: ['.rpx','.wux'], game_count: 6,  rom_path: 'E:\\Emulation\\roms\\wiiu' },
  { id: 'switch',      name: 'Switch',        full_name: 'Nintendo Switch',                   extensions: ['.nsp','.xci'], game_count: 8,  rom_path: 'E:\\Emulation\\roms\\switch' },
  { id: 'genesis',     name: 'Genesis',       full_name: 'Sega Genesis',                      extensions: ['.md','.bin'],  game_count: 35, rom_path: 'E:\\Emulation\\roms\\genesis' },
  { id: 'saturn',      name: 'Saturn',        full_name: 'Sega Saturn',                       extensions: ['.cue','.iso'], game_count: 9,  rom_path: 'E:\\Emulation\\roms\\saturn' },
  { id: 'dreamcast',   name: 'Dreamcast',     full_name: 'Sega Dreamcast',                    extensions: ['.cdi','.gdi'], game_count: 14, rom_path: 'E:\\Emulation\\roms\\dreamcast' },
  { id: 'psx',         name: 'PSX',           full_name: 'PlayStation',                        extensions: ['.cue','.bin'], game_count: 42, rom_path: 'E:\\Emulation\\roms\\psx' },
  { id: 'ps2',         name: 'PS2',           full_name: 'PlayStation 2',                      extensions: ['.iso'],        game_count: 55, rom_path: 'E:\\Emulation\\roms\\ps2' },
  { id: 'ps3',         name: 'PS3',           full_name: 'PlayStation 3',                      extensions: ['.pkg'],        game_count: 6,  rom_path: 'E:\\Emulation\\roms\\ps3' },
  { id: 'psp',         name: 'PSP',           full_name: 'PlayStation Portable',               extensions: ['.iso','.cso'], game_count: 24, rom_path: 'E:\\Emulation\\roms\\psp' },
  { id: 'xbox',        name: 'Xbox',          full_name: 'Microsoft Xbox',                     extensions: ['.iso'],        game_count: 7,  rom_path: 'E:\\Emulation\\roms\\xbox' },
  { id: 'pc',          name: 'PC',            full_name: 'PC Games',                           extensions: ['.exe','.lnk'], game_count: 18, rom_path: '' },
  { id: 'arcade',      name: 'Arcade',        full_name: 'Arcade (MAME)',                      extensions: ['.zip'],        game_count: 120, rom_path: 'E:\\Emulation\\roms\\arcade' },
  { id: 'pcengine',    name: 'PC Engine',     full_name: 'PC Engine / TurboGrafx-16',          extensions: ['.pce'],        game_count: 11, rom_path: 'E:\\Emulation\\roms\\pcengine' },
  { id: 'atari2600',   name: 'Atari 2600',    full_name: 'Atari 2600',                         extensions: ['.a26'],        game_count: 45, rom_path: 'E:\\Emulation\\roms\\atari2600' },
];

const GAME_TITLES = {
  nes: ['Super Mario Bros.', 'The Legend of Zelda', 'Mega Man 2', 'Castlevania', 'Metroid', 'Contra', 'Final Fantasy', 'Kirby\'s Adventure', 'DuckTales', 'Punch-Out!!'],
  snes: ['Super Mario World', 'Zelda: A Link to the Past', 'Chrono Trigger', 'Super Metroid', 'Final Fantasy VI', 'Donkey Kong Country', 'Secret of Mana', 'Earthbound'],
  n64: ['Super Mario 64', 'Ocarina of Time', 'GoldenEye 007', 'Mario Kart 64', 'Banjo-Kazooie', 'Star Fox 64', 'Paper Mario'],
  gb: ['Pokemon Red', 'Pokemon Blue', 'Tetris', 'Link\'s Awakening', 'Super Mario Land', 'Kirby\'s Dream Land'],
  gba: ['Pokemon Emerald', 'Metroid Fusion', 'Fire Emblem', 'Golden Sun', 'Advance Wars', 'Castlevania: Aria of Sorrow'],
  psx: ['Final Fantasy VII', 'Metal Gear Solid', 'Castlevania: SotN', 'Crash Bandicoot', 'Tekken 3', 'RE2', 'Spyro', 'Gran Turismo'],
  ps2: ['God of War', 'Shadow of the Colossus', 'Kingdom Hearts', 'FFX', 'MGS3', 'Persona 4', 'GTA San Andreas', 'Devil May Cry 3'],
  genesis: ['Sonic the Hedgehog', 'Streets of Rage 2', 'Gunstar Heroes', 'Phantasy Star IV', 'Shining Force II'],
  dreamcast: ['Sonic Adventure', 'Shenmue', 'Jet Set Radio', 'Soul Calibur', 'Power Stone'],
  gc: ['Metroid Prime', 'Wind Waker', 'Resident Evil 4', 'Tales of Symphonia', 'F-Zero GX'],
  wii: ['Wii Sports', 'Super Mario Galaxy', 'Zelda: Skyward Sword', 'Metroid Prime 3', 'Xenoblade Chronicles'],
  wiiu: ['Super Mario 3D World', 'Splatoon', 'Mario Kart 8', 'Zelda: Breath of the Wild', 'Bayonetta 2', 'Pikmin 3'],
  switch: ['Zelda: TOTK', 'Mario Odyssey', 'Metroid Dread', 'Fire Emblem: Three Houses', 'Xenoblade 3'],
  arcade: ['Street Fighter II', 'Metal Slug', 'King of Fighters \'98', 'Pac-Man', 'Galaga', 'Donkey Kong', 'Space Invaders', 'Bubble Bobble'],
  pc: ['Cyberpunk 2077', 'Elden Ring', 'Baldur\'s Gate 3', 'Hades', 'Celeste', 'Hollow Knight', 'Stardew Valley', 'Disco Elysium'],
};

function makeGames(systemId, titles) {
  return (titles || ['Game 1', 'Game 2', 'Game 3']).map((title, i) => ({
    id: `${systemId}-${i + 1}`,
    system_id: systemId,
    title: title,
    file_path: `E:\\Emulation\\roms\\${systemId}\\${title.replace(/[^a-zA-Z0-9]/g, '_')}.rom`,
    file_name: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.rom`,
    file_size: 1024 * 1024 * (Math.floor(Math.random() * 500) + 10),
    description: `${title} is a classic ${systemId.toUpperCase()} game loved by millions of players worldwide.`,
    developer: ['Nintendo', 'Capcom', 'Konami', 'Square', 'Sega', 'SNK', 'Namco'][i % 7],
    publisher: ['Nintendo', 'Capcom', 'Konami', 'Square Enix', 'Sega', 'SNK', 'Bandai Namco'][i % 7],
    year: String(1985 + Math.floor(Math.random() * 35)),
    genre: ['Action', 'RPG', 'Platformer', 'Fighting', 'Adventure', 'Puzzle', 'Racing', 'Shooter'][i % 8],
    players: [1, 2, 4][i % 3],
    rating: Math.round((3 + Math.random() * 2) * 10) / 10,
    play_count: Math.floor(Math.random() * 50),
    favorite: i < 2,
    tags: ['retro', 'classic'],
  }));
}

// Pre-generate all games
const ALL_GAMES = [];
for (const sys of SYSTEMS) {
  const titles = GAME_TITLES[sys.id];
  const games = makeGames(sys.id, titles);
  ALL_GAMES.push(...games);
}

const EMULATOR_INFO = [
  { system_id: 'nes',       system_name: 'NES',       emulator_name: 'RetroArch', detected_path: 'C:\\emudeck\\Emulators\\RetroArch\\retroarch.exe', is_retroarch: true, default_core: 'mesen' },
  { system_id: 'snes',      system_name: 'SNES',      emulator_name: 'RetroArch', detected_path: 'C:\\emudeck\\Emulators\\RetroArch\\retroarch.exe', is_retroarch: true, default_core: 'snes9x' },
  { system_id: 'n64',       system_name: 'N64',       emulator_name: 'RetroArch', detected_path: 'C:\\emudeck\\Emulators\\RetroArch\\retroarch.exe', is_retroarch: true, default_core: 'mupen64plus_next' },
  { system_id: 'gb',        system_name: 'Game Boy',   emulator_name: 'RetroArch', detected_path: 'C:\\emudeck\\Emulators\\RetroArch\\retroarch.exe', is_retroarch: true, default_core: 'gambatte' },
  { system_id: 'gba',       system_name: 'GBA',        emulator_name: 'RetroArch', detected_path: 'C:\\emudeck\\Emulators\\RetroArch\\retroarch.exe', is_retroarch: true, default_core: 'mgba' },
  { system_id: 'psx',       system_name: 'PlayStation', emulator_name: 'DuckStation', detected_path: 'C:\\emudeck\\Emulators\\DuckStation\\duckstation.exe', is_retroarch: false },
  { system_id: 'ps2',       system_name: 'PS2',        emulator_name: 'PCSX2',     detected_path: 'C:\\emudeck\\Emulators\\PCSX2\\pcsx2.exe',         is_retroarch: false },
  { system_id: 'ps3',       system_name: 'PS3',        emulator_name: 'RPCS3',     detected_path: 'C:\\emudeck\\Emulators\\RPCS3\\rpcs3.exe',         is_retroarch: false },
  { system_id: 'gc',        system_name: 'GameCube',   emulator_name: 'Dolphin',   detected_path: 'C:\\emudeck\\Emulators\\Dolphin\\Dolphin.exe',     is_retroarch: false },
  { system_id: 'wii',       system_name: 'Wii',        emulator_name: 'Dolphin',   detected_path: 'C:\\emudeck\\Emulators\\Dolphin\\Dolphin.exe',     is_retroarch: false },
  { system_id: 'wiiu',      system_name: 'Wii U',      emulator_name: 'Cemu',      detected_path: 'C:\\emudeck\\Emulators\\Cemu\\Cemu.exe',           is_retroarch: false },
  { system_id: 'switch',    system_name: 'Switch',     emulator_name: 'Ryujinx',   detected_path: 'C:\\emudeck\\Emulators\\Ryujinx\\Ryujinx.exe',     is_retroarch: false },
  { system_id: 'genesis',   system_name: 'Genesis',    emulator_name: 'RetroArch', detected_path: 'C:\\emudeck\\Emulators\\RetroArch\\retroarch.exe', is_retroarch: true, default_core: 'genesis_plus_gx' },
  { system_id: 'dreamcast', system_name: 'Dreamcast',  emulator_name: 'RetroArch', detected_path: 'C:\\emudeck\\Emulators\\RetroArch\\retroarch.exe', is_retroarch: true, default_core: 'flycast' },
  { system_id: 'psp',       system_name: 'PSP',        emulator_name: 'PPSSPP',    detected_path: 'C:\\emudeck\\Emulators\\PPSSPP\\PPSSPPWindows64.exe', is_retroarch: false },
  { system_id: 'nds',       system_name: 'NDS',        emulator_name: 'melonDS',   detected_path: 'C:\\emudeck\\Emulators\\melonDS\\melonDS.exe',     is_retroarch: false },
  { system_id: 'arcade',    system_name: 'Arcade',     emulator_name: 'RetroArch', detected_path: 'C:\\emudeck\\Emulators\\RetroArch\\retroarch.exe', is_retroarch: true, default_core: 'fbneo' },
];

const SCRAPERS = [
  { id: 's1', name: 'ScreenScraper',  url: 'https://screenscraper.fr',     enabled: true,  priority: 1, supports: ['metadata','boxart','screenshot','video'], requires_credentials: true, credential_hint: 'screenscraper.fr account' },
  { id: 's2', name: 'TheGamesDB',     url: 'https://thegamesdb.net',       enabled: true,  priority: 2, supports: ['metadata','boxart','fanart'],             requires_credentials: true, credential_hint: 'API key from thegamesdb.net' },
  { id: 's3', name: 'IGDB',           url: 'https://igdb.com',             enabled: true,  priority: 3, supports: ['metadata','screenshot','cover'],           requires_credentials: true, credential_hint: 'Twitch client ID & secret' },
  { id: 's4', name: 'SteamGridDB',    url: 'https://steamgriddb.com',      enabled: true,  priority: 4, supports: ['boxart','hero','logo','icon','grid'],      requires_credentials: true, credential_hint: 'API key from steamgriddb.com' },
  { id: 's5', name: 'MobyGames',      url: 'https://mobygames.com',        enabled: false, priority: 5, supports: ['metadata','screenshot','cover'],           requires_credentials: true, credential_hint: 'API key from mobygames.com' },
];

const INPUT_PROFILES = [
  { id: 'default-xbox', name: 'Xbox Default',       controller_type: 'Xbox',        is_builtin: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'default-ps',   name: 'PlayStation Default', controller_type: 'PlayStation', is_builtin: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'default-ns',   name: 'Nintendo Default',    controller_type: 'Nintendo',    is_builtin: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'custom-1',     name: 'My ROG Ally Config',  controller_type: 'Xbox',        is_builtin: false, created_at: '2024-06-15', updated_at: '2025-01-10' },
];

const SETTING_DEFS = [
  { key: 'resolution',     display_name: 'Internal Resolution',  description: 'Upscale multiplier',           setting_type: 'select', options: ['1x','2x','3x','4x','5x','6x','8x'], default_value: '2x',   category: 'video',       sort_order: 1, locked: false },
  { key: 'fps_limit',      display_name: 'FPS Limit',            description: 'Frame rate limit',             setting_type: 'select', options: ['30','60','120','Unlimited'],           default_value: '60',   category: 'performance', sort_order: 2, locked: false },
  { key: 'aspect_ratio',   display_name: 'Aspect Ratio',         description: 'Display aspect ratio',         setting_type: 'select', options: ['Auto','4:3','16:9','16:10'],           default_value: 'Auto', category: 'video',       sort_order: 3, locked: false },
  { key: 'vsync',          display_name: 'VSync',                description: 'Vertical sync',                setting_type: 'bool',   default_value: 'true',                                                  category: 'video',       sort_order: 4, locked: false },
  { key: 'audio_latency',  display_name: 'Audio Latency',        description: 'Audio buffer size in ms',      setting_type: 'range',  range_min: 16, range_max: 256,                   default_value: '64',   category: 'audio',       sort_order: 5, locked: false },
  { key: 'shader',         display_name: 'Video Shader',         description: 'Post-processing shader',       setting_type: 'select', options: ['None','CRT-Royale','CRT-Geom','LCD'], default_value: 'None', category: 'video',       sort_order: 6, locked: false },
];

const SYSTEM_DEFS = SYSTEMS.map(s => ({
  id: s.id,
  name: s.name,
  full_name: s.full_name,
  folder_names: [s.id],
}));

const CONFIG = {
  general: { version: '0.7.0', theme: 'default', language: 'en', fullscreen: false },
  paths: { data_root: 'E:\\Emulation', emudeck_path: 'C:\\Users\\vjsan\\AppData\\Roaming\\emudeck\\Emulators' },
  scanner: { auto_scan: true, hash_roms: false },
  emulators: {},
};

// ============================================================================
// MOCK INVOKE HANDLER
// ============================================================================

function mockInvoke(cmd, args) {
  switch (cmd) {
    // Config
    case 'get_config':           return CONFIG;
    case 'set_config':           Object.assign(CONFIG, args?.config || {}); return null;
    case 'detect_emudeck':       return 'C:\\Users\\vjsan\\AppData\\Roaming\\emudeck\\Emulators';
    case 'get_config_path':      return 'C:\\Users\\vjsan\\AppData\\Roaming\\dev.cubi.frontend\\config.toml';
    case 'set_fullscreen':       return null;

    // Library
    case 'get_systems':          return SYSTEMS;
    case 'get_games':            return ALL_GAMES.filter(g => g.system_id === args?.systemId);
    case 'get_all_games':        return ALL_GAMES;
    case 'get_game':             return ALL_GAMES.find(g => g.id === args?.gameId) || null;
    case 'toggle_favorite':      { const g = ALL_GAMES.find(x => x.id === args?.gameId); if (g) g.favorite = !g.favorite; return g?.favorite ?? false; }

    // Scanner
    case 'scan_library':         return { systems_found: SYSTEMS.length, games_found: ALL_GAMES.length, duration_ms: 1250 };

    // Launcher
    case 'launch_game':          return null;
    case 'get_emulator_status':  return 'ready';
    case 'get_all_emulator_info': return EMULATOR_INFO;

    // Media — return empty/null (no actual files in browser)
    case 'get_game_media':       return { box_art: null, back_cover: null, screenshot: null, title_screen: null, fan_art: null, wheel: null, marquee: null, mix_image: null, video: null };
    case 'get_system_media':     return {};
    case 'download_game_media':  return {};
    case 'download_system_media': return {};

    // Scrapers
    case 'get_scrapers':         return SCRAPERS;
    case 'add_scraper':          return null;
    case 'update_scraper':       return null;
    case 'delete_scraper':       return null;
    case 'import_esde_credentials': return { screenscraper_username: '', screenscraper_password: '', thegamesdb_api_key: '' };

    // PC Games
    case 'detect_pc_libs':       return { steam_found: true, steam_path: 'C:\\Program Files (x86)\\Steam', epic_found: true, ea_found: false, gog_found: true };

    // ROM Path Overrides
    case 'get_system_registry_list': return SYSTEM_DEFS;
    case 'get_rom_path_overrides':   return [];
    case 'set_rom_path_override':    return null;
    case 'delete_rom_path_override': return null;

    // Input Mapping
    case 'get_input_profiles':       return INPUT_PROFILES;
    case 'get_input_profile':        return INPUT_PROFILES.find(p => p.id === args?.profileId) || null;
    case 'get_profile_bindings':     return [];
    case 'get_system_profile_assignments': return [];
    case 'get_all_actions':          return [
      { name: 'confirm',  display_name: 'Confirm / Select',  category: 'navigation' },
      { name: 'back',     display_name: 'Back / Cancel',     category: 'navigation' },
      { name: 'up',       display_name: 'Navigate Up',       category: 'navigation' },
      { name: 'down',     display_name: 'Navigate Down',     category: 'navigation' },
      { name: 'left',     display_name: 'Navigate Left',     category: 'navigation' },
      { name: 'right',    display_name: 'Navigate Right',    category: 'navigation' },
      { name: 'launch',   display_name: 'Launch Game',       category: 'game' },
      { name: 'favorite', display_name: 'Toggle Favorite',   category: 'game' },
      { name: 'prev_sys', display_name: 'Previous System',   category: 'library' },
      { name: 'next_sys', display_name: 'Next System',       category: 'library' },
    ];
    case 'get_retroarch_cfg_path':   return { path: 'C:\\emudeck\\Emulators\\RetroArch\\retroarch.cfg', exists: true };

    // Emulator Settings
    case 'get_setting_definitions':    return SETTING_DEFS;
    case 'get_config_writers_info':    return [
      { emulator: 'RetroArch', config_path: 'C:\\emudeck\\Emulators\\RetroArch\\retroarch.cfg', writable: true },
      { emulator: 'PCSX2',     config_path: 'C:\\emudeck\\Emulators\\PCSX2\\inis\\PCSX2.ini',   writable: true },
      { emulator: 'Dolphin',   config_path: 'C:\\emudeck\\Emulators\\Dolphin\\User\\Config\\Dolphin.ini', writable: true },
    ];
    case 'get_emulator_settings':      return [];
    case 'get_all_emulator_settings':  return [];
    case 'preview_emulator_config':    return '# RetroArch Configuration\nvideo_fullscreen = "true"\nvideo_vsync = "true"\naudio_latency = 64\n';

    // PC Metadata
    case 'check_pc_scraper_tools':     return { yt_dlp: true, chromium: false };
    case 'get_pc_metadata_config':     return { steam_api_key: '', igdb_client_id: '', igdb_secret: '', sgdb_api_key: '', mobygames_key: '' };

    // Metadata Editor
    case 'update_game_metadata':       return ALL_GAMES.find(g => g.id === args?.gameId) || null;
    case 'search_youtube':             return [
      { title: args?.query + ' - Gameplay Trailer', url: 'https://youtube.com/watch?v=demo1', thumbnail: '', duration: '3:24', channel: 'GameTrailers' },
      { title: args?.query + ' - Full Walkthrough', url: 'https://youtube.com/watch?v=demo2', thumbnail: '', duration: '45:10', channel: 'GamingHQ' },
    ];

    // Steam
    case 'search_steam_games':         return [
      { app_id: 1245620, name: 'Elden Ring',       header_image: '' },
      { app_id: 1091500, name: 'Cyberpunk 2077',   header_image: '' },
    ];

    default:
      console.warn('[MOCK] Unhandled invoke:', cmd, args);
      return null;
  }
}

// ============================================================================
// INJECT TAURI MOCK
// ============================================================================

// Mock the Tauri IPC internals
window.__TAURI_INTERNALS__ = {
  invoke: (cmd, args) => {
    return new Promise((resolve) => {
      // Small delay to simulate IPC
      setTimeout(() => {
        try {
          const result = mockInvoke(cmd, args);
          resolve(result);
        } catch (e) {
          console.error('[MOCK] Error in', cmd, e);
          resolve(null);
        }
      }, 10);
    });
  },
  metadata: {
    currentWebview: { label: 'main' },
    currentWindow: { label: 'main' },
    windows: [{ label: 'main' }],
    webviews: [{ label: 'main', windowLabel: 'main' }],
  },
  convertFileSrc: (path) => path,
  transformCallback: (cb) => {
    const id = Math.random();
    window[`_${id}`] = cb;
    return id;
  },
};

// Also mock the plugin:shell open function
window.__TAURI_PLUGIN_INTERNALS__ = {};

console.log('[MOCK] Tauri API mock injected — ' + SYSTEMS.length + ' systems, ' + ALL_GAMES.length + ' games');
