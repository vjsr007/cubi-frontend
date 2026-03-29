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
";
