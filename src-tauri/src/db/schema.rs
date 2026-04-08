pub const CREATE_SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS systems (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    extensions TEXT NOT NULL DEFAULT '[]',
    game_count INTEGER NOT NULL DEFAULT 0,
    rom_path TEXT NOT NULL DEFAULT '',
    icon TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    system_id TEXT NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    box_art TEXT,
    description TEXT,
    developer TEXT,
    publisher TEXT,
    year TEXT,
    genre TEXT,
    players INTEGER NOT NULL DEFAULT 1,
    rating REAL NOT NULL DEFAULT 0.0,
    last_played TEXT,
    play_count INTEGER NOT NULL DEFAULT 0,
    favorite INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_games_system_id ON games(system_id);
CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);
CREATE INDEX IF NOT EXISTS idx_games_last_played ON games(last_played);
CREATE INDEX IF NOT EXISTS idx_games_favorite ON games(favorite);

CREATE TABLE IF NOT EXISTS scrapers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    api_key TEXT,
    username TEXT,
    password TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    priority INTEGER NOT NULL DEFAULT 0,
    supports TEXT NOT NULL DEFAULT '[]',
    requires_credentials INTEGER NOT NULL DEFAULT 0,
    credential_hint TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS system_rom_paths (
    system_id TEXT PRIMARY KEY,
    custom_path TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS input_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    controller_type TEXT NOT NULL DEFAULT 'Xbox',
    is_builtin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS input_bindings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id TEXT NOT NULL,
    action TEXT NOT NULL,
    button_index INTEGER NOT NULL DEFAULT -1,
    axis_index INTEGER,
    axis_direction TEXT,
    FOREIGN KEY (profile_id) REFERENCES input_profiles(id) ON DELETE CASCADE,
    UNIQUE(profile_id, action)
);

CREATE TABLE IF NOT EXISTS system_profile_assignments (
    system_id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES input_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS emulator_setting_defs (
    key TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    setting_type TEXT NOT NULL,
    options_json TEXT,
    range_min INTEGER,
    range_max INTEGER,
    default_value TEXT NOT NULL,
    category TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    locked INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS emulator_settings (
    emulator_name TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (emulator_name, setting_key)
);

CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
);
INSERT OR IGNORE INTO schema_version VALUES (1);
";

/// Migration v2: PC enhanced metadata columns
pub const MIGRATION_V2: &str = "
ALTER TABLE games ADD COLUMN hero_art TEXT;
ALTER TABLE games ADD COLUMN logo TEXT;
ALTER TABLE games ADD COLUMN background_art TEXT;
ALTER TABLE games ADD COLUMN screenshots TEXT;
ALTER TABLE games ADD COLUMN trailer_url TEXT;
ALTER TABLE games ADD COLUMN trailer_local TEXT;
ALTER TABLE games ADD COLUMN metacritic_score INTEGER;
ALTER TABLE games ADD COLUMN tags TEXT;
ALTER TABLE games ADD COLUMN website TEXT;
ALTER TABLE games ADD COLUMN pcgamingwiki_url TEXT;
ALTER TABLE games ADD COLUMN igdb_id INTEGER;
UPDATE schema_version SET version = 2;
";

/// Migration v4: Game verification status
pub const MIGRATION_V4: &str = "
ALTER TABLE games ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE games ADD COLUMN verification_message TEXT;
UPDATE schema_version SET version = 4;
";

/// Migration v3: Steam integration (REQ-021)
pub const MIGRATION_V3: &str = "
ALTER TABLE games ADD COLUMN steam_app_id INTEGER;
CREATE TABLE IF NOT EXISTS game_steam_data (
    game_id TEXT PRIMARY KEY,
    steam_app_id INTEGER NOT NULL,
    review_score_desc TEXT,
    review_positive INTEGER DEFAULT 0,
    review_negative INTEGER DEFAULT 0,
    short_description TEXT,
    categories TEXT,
    release_date TEXT,
    languages TEXT,
    requirements_min TEXT,
    requirements_rec TEXT,
    dlc_count INTEGER DEFAULT 0,
    achievements_count INTEGER DEFAULT 0,
    reviews_json TEXT,
    fetched_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);
UPDATE schema_version SET version = 3;
";

/// Migration v5: Game Catalog Database (REQ-022)
pub const MIGRATION_V5: &str = "
CREATE TABLE IF NOT EXISTS catalog_games (
    id TEXT PRIMARY KEY,
    system_id TEXT NOT NULL,
    title TEXT NOT NULL,
    region TEXT NOT NULL DEFAULT '',
    sha1 TEXT,
    md5 TEXT,
    crc32 TEXT,
    file_size INTEGER,
    file_name TEXT NOT NULL,
    dat_name TEXT NOT NULL,
    owned INTEGER NOT NULL DEFAULT 0,
    owned_game_id TEXT,
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_catalog_system ON catalog_games(system_id);
CREATE INDEX IF NOT EXISTS idx_catalog_sha1 ON catalog_games(sha1);
CREATE INDEX IF NOT EXISTS idx_catalog_title ON catalog_games(title);
CREATE INDEX IF NOT EXISTS idx_catalog_owned ON catalog_games(system_id, owned);
CREATE INDEX IF NOT EXISTS idx_catalog_region ON catalog_games(system_id, region);

CREATE TABLE IF NOT EXISTS catalog_sync (
    system_id TEXT NOT NULL,
    dat_name TEXT NOT NULL,
    dat_version TEXT NOT NULL DEFAULT '',
    entry_count INTEGER NOT NULL DEFAULT 0,
    last_synced TEXT DEFAULT (datetime('now')),
    source_url TEXT,
    PRIMARY KEY (system_id, dat_name)
);

UPDATE schema_version SET version = 5;
";

/// Migration v6: System Wiki (encyclopedia per system)
pub const MIGRATION_V6: &str = "
CREATE TABLE IF NOT EXISTS system_wiki (
    system_id TEXT PRIMARY KEY,
    manufacturer TEXT NOT NULL DEFAULT '',
    release_year INTEGER,
    discontinue_year INTEGER,
    generation INTEGER,
    media_type TEXT NOT NULL DEFAULT '',
    cpu TEXT NOT NULL DEFAULT '',
    memory TEXT NOT NULL DEFAULT '',
    graphics TEXT NOT NULL DEFAULT '',
    sound TEXT NOT NULL DEFAULT '',
    display TEXT NOT NULL DEFAULT '',
    units_sold TEXT NOT NULL DEFAULT '',
    launch_price TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    wikipedia_url TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    notable_games TEXT NOT NULL DEFAULT '',
    emulators TEXT NOT NULL DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now'))
);

UPDATE schema_version SET version = 6;
";

/// Migration v8: Per-game Flash key mappings + stick/mouse config
pub const MIGRATION_V8: &str = "
CREATE TABLE IF NOT EXISTS flash_key_mappings (
    game_id TEXT NOT NULL,
    gamepad_button INTEGER NOT NULL,
    keyboard_key TEXT NOT NULL,
    PRIMARY KEY (game_id, gamepad_button),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS flash_game_config (
    game_id TEXT PRIMARY KEY,
    left_stick_mode TEXT NOT NULL DEFAULT 'disabled',
    right_stick_mouse INTEGER NOT NULL DEFAULT 0,
    mouse_sensitivity INTEGER NOT NULL DEFAULT 50,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);
UPDATE schema_version SET version = 8;
";

/// Migration v9: Per-game emulator override (REQ-023 extension)
pub const MIGRATION_V9: &str = "
CREATE TABLE IF NOT EXISTS game_emulator_overrides (
    game_id TEXT PRIMARY KEY,
    selected_emulator TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

UPDATE schema_version SET version = 9;
";

/// Migration v7: Multi-emulator per-system support (REQ-023)
pub const MIGRATION_V7: &str = "
CREATE TABLE IF NOT EXISTS emulator_preferences (
    system_id TEXT PRIMARY KEY,
    selected_emulator TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
);

UPDATE schema_version SET version = 7;
";
