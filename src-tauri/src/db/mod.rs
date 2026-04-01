pub mod schema;

use rusqlite::{Connection, Result as SqlResult};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use crate::models::{GameInfo, GameInfoPatch, SystemInfo, ScraperConfig, default_scrapers};

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(app: &AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        let data_dir = app.path().app_data_dir()?;
        std::fs::create_dir_all(&data_dir)?;
        let db_path = data_dir.join("cubi.db");
        log::info!("Opening database at: {:?}", db_path);
        let conn = Connection::open(&db_path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        let db = Database { conn: Mutex::new(conn) };
        db.initialize()?;
        db.run_migrations()?;
        Ok(db)
    }

    fn initialize(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(schema::CREATE_SCHEMA)?;
        drop(conn);
        let _ = self.run_migrations();
        self.seed_default_scrapers();
        self.seed_default_input_profiles();
        self.seed_emulator_setting_definitions();
        Ok(())
    }

    /// Seed built-in input profiles (Xbox, PlayStation, Nintendo) if none exist
    fn seed_default_input_profiles(&self) {
        crate::services::input_mapping_service::DefaultPresets::seed(self);
    }

    /// Seed all canonical emulator setting definitions
    fn seed_emulator_setting_definitions(&self) {
        crate::services::emulator_settings_service::seed_setting_definitions(self);
    }

    fn run_migrations(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let version: i64 = conn
            .query_row("SELECT version FROM schema_version", [], |r| r.get(0))
            .unwrap_or(1);

        if version < 2 {
            log::info!("Running DB migration v2: PC metadata columns");
            let stmts = [
                "ALTER TABLE games ADD COLUMN hero_art TEXT",
                "ALTER TABLE games ADD COLUMN logo TEXT",
                "ALTER TABLE games ADD COLUMN background_art TEXT",
                "ALTER TABLE games ADD COLUMN screenshots TEXT",
                "ALTER TABLE games ADD COLUMN trailer_url TEXT",
                "ALTER TABLE games ADD COLUMN trailer_local TEXT",
                "ALTER TABLE games ADD COLUMN metacritic_score INTEGER",
                "ALTER TABLE games ADD COLUMN tags TEXT",
                "ALTER TABLE games ADD COLUMN website TEXT",
                "ALTER TABLE games ADD COLUMN pcgamingwiki_url TEXT",
                "ALTER TABLE games ADD COLUMN igdb_id INTEGER",
                "UPDATE schema_version SET version = 2",
            ];
            for stmt in &stmts {
                if let Err(e) = conn.execute_batch(stmt) {
                    if !e.to_string().contains("duplicate column") {
                        log::warn!("Migration v2 stmt (ignored): {} — {}", stmt, e);
                    }
                }
            }
            log::info!("DB migration v2 complete");
        }

        if version < 3 {
            log::info!("Running DB migration v3: Steam integration");
            let stmts = [
                "ALTER TABLE games ADD COLUMN steam_app_id INTEGER",
                "CREATE TABLE IF NOT EXISTS game_steam_data (
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
                )",
                "UPDATE schema_version SET version = 3",
            ];
            for stmt in &stmts {
                if let Err(e) = conn.execute_batch(stmt) {
                    if !e.to_string().contains("duplicate column") {
                        log::warn!("Migration v3 stmt (ignored): {} — {}", stmt, e);
                    }
                }
            }
            log::info!("DB migration v3 complete");
        }

        if version < 4 {
            log::info!("Running DB migration v4: game verification status");
            let stmts = [
                "ALTER TABLE games ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'unverified'",
                "ALTER TABLE games ADD COLUMN verification_message TEXT",
                "UPDATE schema_version SET version = 4",
            ];
            for stmt in &stmts {
                if let Err(e) = conn.execute_batch(stmt) {
                    if !e.to_string().contains("duplicate column") {
                        log::warn!("Migration v4 stmt (ignored): {} — {}", stmt, e);
                    }
                }
            }
            log::info!("DB migration v4 complete");
        }
        Ok(())
    }

    fn seed_default_scrapers(&self) {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM scrapers", [], |r| r.get(0))
            .unwrap_or(0);
        if count == 0 {
            for s in default_scrapers() {
                let supports_json = serde_json::to_string(&s.supports).unwrap_or_default();
                let _ = conn.execute(
                    "INSERT OR IGNORE INTO scrapers
                     (id,name,url,api_key,username,password,enabled,priority,
                      supports,requires_credentials,credential_hint)
                     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
                    rusqlite::params![
                        s.id, s.name, s.url,
                        s.api_key, s.username, s.password,
                        s.enabled as i32, s.priority,
                        supports_json,
                        s.requires_credentials as i32,
                        s.credential_hint,
                    ],
                );
            }
        }
    }

    // ── Scrapers ────────────────────────────────────────────────────────

    pub fn get_scrapers(&self) -> SqlResult<Vec<ScraperConfig>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id,name,url,api_key,username,password,enabled,priority,
                    supports,requires_credentials,credential_hint
             FROM scrapers ORDER BY priority ASC, name ASC"
        )?;
        let rows = stmt.query_map([], |row| {
            let supports_json: String = row.get(8)?;
            let supports: Vec<String> = serde_json::from_str(&supports_json).unwrap_or_default();
            Ok(ScraperConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                url: row.get(2)?,
                api_key: row.get(3)?,
                username: row.get(4)?,
                password: row.get(5)?,
                enabled: row.get::<_, i32>(6)? != 0,
                priority: row.get(7)?,
                supports,
                requires_credentials: row.get::<_, i32>(9)? != 0,
                credential_hint: row.get(10)?,
            })
        })?.collect::<SqlResult<Vec<_>>>()?;
        Ok(rows)
    }

    pub fn upsert_scraper(&self, s: &ScraperConfig) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let supports_json = serde_json::to_string(&s.supports).unwrap_or_default();
        conn.execute(
            "INSERT INTO scrapers
             (id,name,url,api_key,username,password,enabled,priority,
              supports,requires_credentials,credential_hint)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)
             ON CONFLICT(id) DO UPDATE SET
               name=excluded.name, url=excluded.url,
               api_key=excluded.api_key, username=excluded.username,
               password=excluded.password, enabled=excluded.enabled,
               priority=excluded.priority, supports=excluded.supports,
               requires_credentials=excluded.requires_credentials,
               credential_hint=excluded.credential_hint",
            rusqlite::params![
                s.id, s.name, s.url,
                s.api_key, s.username, s.password,
                s.enabled as i32, s.priority,
                supports_json,
                s.requires_credentials as i32,
                s.credential_hint,
            ],
        )?;
        Ok(())
    }

    pub fn delete_scraper(&self, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM scrapers WHERE id = ?1", [id])?;
        Ok(())
    }

    // ── Systems ─────────────────────────────────────────────────────────

    pub fn upsert_system(&self, system: &SystemInfo) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO systems (id, name, full_name, extensions, game_count, rom_path)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               full_name = excluded.full_name,
               extensions = excluded.extensions,
               game_count = excluded.game_count,
               rom_path = excluded.rom_path",
            rusqlite::params![
                system.id,
                system.name,
                system.full_name,
                serde_json::to_string(&system.extensions).unwrap_or_default(),
                system.game_count,
                system.rom_path,
            ],
        )?;
        Ok(())
    }

    pub fn get_systems(&self) -> SqlResult<Vec<SystemInfo>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, full_name, extensions, game_count, rom_path FROM systems ORDER BY name"
        )?;
        let systems = stmt.query_map([], |row| {
            let extensions_json: String = row.get(3)?;
            let extensions: Vec<String> = serde_json::from_str(&extensions_json).unwrap_or_default();
            Ok(SystemInfo {
                id: row.get(0)?,
                name: row.get(1)?,
                full_name: row.get(2)?,
                extensions,
                game_count: row.get(4)?,
                rom_path: row.get(5)?,
                icon: None,
            })
        })?.collect::<SqlResult<Vec<_>>>()?;
        Ok(systems)
    }

    // ── Games ────────────────────────────────────────────────────────────

    fn row_to_game(row: &rusqlite::Row) -> rusqlite::Result<GameInfo> {
        let screenshots_json: Option<String> = row.get(20)?;
        let screenshots = screenshots_json.as_deref()
            .and_then(|j| serde_json::from_str(j).ok());
        let tags_json: Option<String> = row.get(24)?;
        let tags = tags_json.as_deref()
            .and_then(|j| serde_json::from_str(j).ok());
        Ok(GameInfo {
            id: row.get(0)?,
            system_id: row.get(1)?,
            title: row.get(2)?,
            file_path: row.get(3)?,
            file_name: row.get(4)?,
            file_size: row.get::<_, i64>(5)? as u64,
            box_art: row.get(6)?,
            description: row.get(7)?,
            developer: row.get(8)?,
            publisher: row.get(9)?,
            year: row.get(10)?,
            genre: row.get(11)?,
            players: row.get::<_, i64>(12)? as u32,
            rating: row.get(13)?,
            last_played: row.get(14)?,
            play_count: row.get::<_, i64>(15)? as u32,
            favorite: row.get::<_, i32>(16)? != 0,
            hero_art: row.get(17)?,
            logo: row.get(18)?,
            background_art: row.get(19)?,
            screenshots,
            trailer_url: row.get(21)?,
            trailer_local: row.get(22)?,
            metacritic_score: row.get::<_, Option<i64>>(23)?.map(|v| v as i32),
            tags,
            website: row.get(25)?,
            pcgamingwiki_url: row.get(26)?,
            igdb_id: row.get(27)?,
            steam_app_id: row.get::<_, Option<i64>>(28)?.map(|v| v as u32),
            verification_status: crate::models::VerificationStatus::from_str(
                &row.get::<_, String>(29).unwrap_or_else(|_| "unverified".to_string()),
            ),
            verification_message: row.get(30)?,
        })
    }

    const GAME_COLS: &'static str =
        "id, system_id, title, file_path, file_name, file_size,
         box_art, description, developer, publisher, year, genre,
         players, rating, last_played, play_count, favorite,
         hero_art, logo, background_art, screenshots, trailer_url,
         trailer_local, metacritic_score, tags, website, pcgamingwiki_url, igdb_id,
         steam_app_id, verification_status, verification_message";

    pub fn upsert_game(&self, game: &GameInfo) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let screenshots_json = game.screenshots.as_ref()
            .and_then(|v| serde_json::to_string(v).ok());
        let tags_json = game.tags.as_ref()
            .and_then(|v| serde_json::to_string(v).ok());
        conn.execute(
            "INSERT INTO games (
               id, system_id, title, file_path, file_name, file_size,
               box_art, description, developer, publisher, year, genre,
               players, rating, play_count, last_played, favorite,
               hero_art, logo, background_art, screenshots, trailer_url,
               trailer_local, metacritic_score, tags, website,
               pcgamingwiki_url, igdb_id)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,
                     ?18,?19,?20,?21,?22,?23,?24,?25,?26,?27,?28)
             ON CONFLICT(id) DO UPDATE SET
               title=excluded.title, box_art=excluded.box_art,
               description=excluded.description, developer=excluded.developer,
               publisher=excluded.publisher, year=excluded.year,
               genre=excluded.genre, players=excluded.players,
               rating=excluded.rating,
               hero_art=excluded.hero_art, logo=excluded.logo,
               background_art=excluded.background_art,
               screenshots=excluded.screenshots,
               trailer_url=excluded.trailer_url, trailer_local=excluded.trailer_local,
               metacritic_score=excluded.metacritic_score, tags=excluded.tags,
               website=excluded.website, pcgamingwiki_url=excluded.pcgamingwiki_url,
               igdb_id=excluded.igdb_id",
            rusqlite::params![
                game.id, game.system_id, game.title, game.file_path,
                game.file_name, game.file_size as i64,
                game.box_art, game.description, game.developer, game.publisher,
                game.year, game.genre,
                game.players as i64, game.rating,
                game.play_count as i64, game.last_played, game.favorite as i32,
                game.hero_art, game.logo, game.background_art,
                screenshots_json, game.trailer_url, game.trailer_local,
                game.metacritic_score, tags_json, game.website,
                game.pcgamingwiki_url, game.igdb_id,
            ],
        )?;
        Ok(())
    }

    /// Apply partial update — only sets provided fields
    pub fn patch_game(&self, game_id: &str, patch: &GameInfoPatch) -> SqlResult<()> {
        if patch.is_empty() { return Ok(()); }
        let mut sets: Vec<String> = Vec::new();
        let mut values: Vec<rusqlite::types::Value> = Vec::new();
        let mut i = 1usize;

        macro_rules! push {
            ($opt:expr, $col:literal) => {
                if let Some(ref v) = $opt {
                    sets.push(format!(concat!($col, " = ?{}"), i));
                    values.push(rusqlite::types::Value::Text(v.clone()));
                    i += 1;
                }
            };
            (int $opt:expr, $col:literal) => {
                if let Some(v) = $opt {
                    sets.push(format!(concat!($col, " = ?{}"), i));
                    values.push(rusqlite::types::Value::Integer(v as i64));
                    i += 1;
                }
            };
            (real $opt:expr, $col:literal) => {
                if let Some(v) = $opt {
                    sets.push(format!(concat!($col, " = ?{}"), i));
                    values.push(rusqlite::types::Value::Real(v as f64));
                    i += 1;
                }
            };
            (json $opt:expr, $col:literal) => {
                if let Some(ref v) = $opt {
                    if let Ok(json) = serde_json::to_string(v) {
                        sets.push(format!(concat!($col, " = ?{}"), i));
                        values.push(rusqlite::types::Value::Text(json));
                        i += 1;
                    }
                }
            };
        }

        push!(patch.title, "title");
        push!(patch.box_art, "box_art");
        push!(patch.description, "description");
        push!(patch.developer, "developer");
        push!(patch.publisher, "publisher");
        push!(patch.year, "year");
        push!(patch.genre, "genre");
        push!(int patch.players, "players");
        push!(real patch.rating, "rating");
        push!(patch.hero_art, "hero_art");
        push!(patch.logo, "logo");
        push!(patch.background_art, "background_art");
        push!(patch.trailer_url, "trailer_url");
        push!(patch.trailer_local, "trailer_local");
        push!(int patch.metacritic_score, "metacritic_score");
        push!(int patch.igdb_id, "igdb_id");
        push!(patch.website, "website");
        push!(patch.pcgamingwiki_url, "pcgamingwiki_url");
        push!(json patch.screenshots, "screenshots");
        push!(json patch.tags, "tags");
        push!(int patch.steam_app_id, "steam_app_id");

        if sets.is_empty() { return Ok(()); }
        values.push(rusqlite::types::Value::Text(game_id.to_string()));

        let sql = format!("UPDATE games SET {} WHERE id = ?{}", sets.join(", "), i);
        let conn = self.conn.lock().unwrap();
        conn.execute(&sql, rusqlite::params_from_iter(values.iter()))?;
        Ok(())
    }

    pub fn get_games(&self, system_id: &str) -> SqlResult<Vec<GameInfo>> {
        let conn = self.conn.lock().unwrap();
        let sql = format!(
            "SELECT {} FROM games WHERE system_id = ?1 ORDER BY title",
            Self::GAME_COLS
        );
        let mut stmt = conn.prepare(&sql)?;
        let result = stmt.query_map([system_id], Self::row_to_game)?
            .collect::<SqlResult<Vec<_>>>();
        result
    }

    pub fn get_game(&self, game_id: &str) -> SqlResult<Option<GameInfo>> {
        let conn = self.conn.lock().unwrap();
        let sql = format!(
            "SELECT {} FROM games WHERE id = ?1",
            Self::GAME_COLS
        );
        let mut stmt = conn.prepare(&sql)?;
        match stmt.query_row([game_id], Self::row_to_game) {
            Ok(g) => Ok(Some(g)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn get_pc_games(&self) -> SqlResult<Vec<GameInfo>> {
        self.get_games("pc")
    }

    pub fn get_all_games(&self) -> SqlResult<Vec<GameInfo>> {
        let conn = self.conn.lock().unwrap();
        let sql = format!(
            "SELECT {} FROM games ORDER BY title",
            Self::GAME_COLS
        );
        let mut stmt = conn.prepare(&sql)?;
        let result = stmt.query_map([], Self::row_to_game)?
            .collect::<SqlResult<Vec<_>>>();
        result
    }

    pub fn update_play_stats(&self, game_id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE games SET play_count = play_count + 1, last_played = datetime('now') WHERE id = ?1",
            [game_id],
        )?;
        Ok(())
    }

    pub fn delete_game(&self, game_id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM games WHERE id = ?1", [game_id])?;
        Ok(())
    }

    pub fn update_verification_status(
        &self,
        game_id: &str,
        status: &crate::models::VerificationStatus,
        message: Option<&str>,
    ) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE games SET verification_status = ?1, verification_message = ?2 WHERE id = ?3",
            rusqlite::params![status.as_str(), message, game_id],
        )?;
        Ok(())
    }

    pub fn get_games_by_verification(
        &self,
        status: &str,
    ) -> SqlResult<Vec<GameInfo>> {
        let conn = self.conn.lock().unwrap();
        let sql = format!(
            "SELECT {} FROM games WHERE verification_status = ?1 ORDER BY title",
            Self::GAME_COLS
        );
        let mut stmt = conn.prepare(&sql)?;
        let result = stmt.query_map([status], Self::row_to_game)?
            .collect::<SqlResult<Vec<_>>>();
        result
    }

    pub fn update_system_game_count(&self, system_id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE systems SET game_count = (SELECT COUNT(*) FROM games WHERE system_id = ?1) WHERE id = ?1",
            [system_id],
        )?;
        Ok(())
    }

    pub fn toggle_favorite(&self, game_id: &str) -> SqlResult<bool> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE games SET favorite = CASE WHEN favorite = 0 THEN 1 ELSE 0 END WHERE id = ?1",
            [game_id],
        )?;
        let new_val: i32 = conn.query_row(
            "SELECT favorite FROM games WHERE id = ?1",
            [game_id],
            |row| row.get(0),
        )?;
        Ok(new_val != 0)
    }

    // ── System ROM Path Overrides ─────────────────────────────────────

    /// Get all per-system ROM path overrides as HashMap<system_id, custom_path>
    pub fn get_rom_path_overrides(&self) -> SqlResult<std::collections::HashMap<String, String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT system_id, custom_path FROM system_rom_paths"
        )?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?.collect::<SqlResult<Vec<_>>>()?;
        Ok(rows.into_iter().collect())
    }

    /// Set (upsert) a custom ROM path for a specific system
    pub fn set_rom_path_override(&self, system_id: &str, custom_path: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO system_rom_paths (system_id, custom_path)
             VALUES (?1, ?2)
             ON CONFLICT(system_id) DO UPDATE SET custom_path = excluded.custom_path",
            rusqlite::params![system_id, custom_path],
        )?;
        Ok(())
    }

    /// Remove a custom ROM path override for a system (reverts to default)
    pub fn delete_rom_path_override(&self, system_id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM system_rom_paths WHERE system_id = ?1",
            [system_id],
        )?;
        Ok(())
    }

    // ── Input Profiles ────────────────────────────────────────────────

    pub fn get_input_profiles(&self) -> SqlResult<Vec<crate::models::InputProfile>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, controller_type, is_builtin, created_at, updated_at
             FROM input_profiles ORDER BY is_builtin DESC, name ASC"
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(crate::models::InputProfile {
                id: row.get(0)?,
                name: row.get(1)?,
                controller_type: crate::models::ControllerType::from_str(
                    &row.get::<_, String>(2)?
                ),
                is_builtin: row.get::<_, i32>(3)? != 0,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?.collect::<SqlResult<Vec<_>>>()?;
        Ok(rows)
    }

    pub fn get_input_profile(&self, profile_id: &str) -> SqlResult<Option<crate::models::InputProfile>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, controller_type, is_builtin, created_at, updated_at
             FROM input_profiles WHERE id = ?1"
        )?;
        let mut rows = stmt.query_map([profile_id], |row| {
            Ok(crate::models::InputProfile {
                id: row.get(0)?,
                name: row.get(1)?,
                controller_type: crate::models::ControllerType::from_str(
                    &row.get::<_, String>(2)?
                ),
                is_builtin: row.get::<_, i32>(3)? != 0,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?;
        Ok(rows.next().transpose()?)
    }

    pub fn insert_input_profile(&self, profile: &crate::models::InputProfile) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR IGNORE INTO input_profiles (id, name, controller_type, is_builtin, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![
                profile.id,
                profile.name,
                profile.controller_type.as_str(),
                profile.is_builtin as i32,
                profile.created_at,
                profile.updated_at,
            ],
        )?;
        Ok(())
    }

    pub fn update_input_profile_name(&self, profile_id: &str, name: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE input_profiles SET name = ?2, updated_at = datetime('now') WHERE id = ?1",
            rusqlite::params![profile_id, name],
        )?;
        Ok(())
    }

    pub fn delete_input_profile(&self, profile_id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM input_profiles WHERE id = ?1 AND is_builtin = 0", [profile_id])?;
        Ok(())
    }

    // ── Input Bindings ────────────────────────────────────────────────

    pub fn get_profile_bindings(&self, profile_id: &str) -> SqlResult<Vec<crate::models::ButtonBinding>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT profile_id, action, button_index, axis_index, axis_direction
             FROM input_bindings WHERE profile_id = ?1 ORDER BY action ASC"
        )?;
        let rows = stmt.query_map([profile_id], |row| {
            Ok(crate::models::ButtonBinding {
                profile_id: row.get(0)?,
                action: row.get(1)?,
                button_index: row.get(2)?,
                axis_index: row.get(3)?,
                axis_direction: row.get(4)?,
            })
        })?.collect::<SqlResult<Vec<_>>>()?;
        Ok(rows)
    }

    pub fn set_binding(
        &self,
        profile_id: &str,
        action: &str,
        button_index: i32,
        axis_index: Option<i32>,
        axis_direction: Option<&str>,
    ) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO input_bindings (profile_id, action, button_index, axis_index, axis_direction)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(profile_id, action) DO UPDATE SET
               button_index = excluded.button_index,
               axis_index = excluded.axis_index,
               axis_direction = excluded.axis_direction",
            rusqlite::params![profile_id, action, button_index, axis_index, axis_direction],
        )?;
        Ok(())
    }

    pub fn delete_profile_bindings(&self, profile_id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM input_bindings WHERE profile_id = ?1", [profile_id])?;
        Ok(())
    }

    // ── System ↔ Profile Assignments ──────────────────────────────────

    pub fn get_system_profile_assignments(&self) -> SqlResult<Vec<crate::models::SystemProfileAssignment>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT system_id, profile_id FROM system_profile_assignments ORDER BY system_id"
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(crate::models::SystemProfileAssignment {
                system_id: row.get(0)?,
                profile_id: row.get(1)?,
            })
        })?.collect::<SqlResult<Vec<_>>>()?;
        Ok(rows)
    }

    pub fn set_system_profile_assignment(&self, system_id: &str, profile_id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO system_profile_assignments (system_id, profile_id)
             VALUES (?1, ?2)
             ON CONFLICT(system_id) DO UPDATE SET profile_id = excluded.profile_id",
            rusqlite::params![system_id, profile_id],
        )?;
        Ok(())
    }

    pub fn delete_system_profile_assignment(&self, system_id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM system_profile_assignments WHERE system_id = ?1", [system_id])?;
        Ok(())
    }

    // ── Emulator Setting Definitions ──────────────────────────────────

    pub fn upsert_setting_definition(&self, def: &crate::models::SettingDefinition) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let options_json = def.options.as_ref().map(|o| serde_json::to_string(o).unwrap_or_default());
        conn.execute(
            "INSERT INTO emulator_setting_defs
             (key, display_name, description, setting_type, options_json, range_min, range_max,
              default_value, category, sort_order, locked)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)
             ON CONFLICT(key) DO UPDATE SET
               display_name=excluded.display_name, description=excluded.description,
               setting_type=excluded.setting_type, options_json=excluded.options_json,
               range_min=excluded.range_min, range_max=excluded.range_max,
               default_value=excluded.default_value, category=excluded.category,
               sort_order=excluded.sort_order, locked=excluded.locked",
            rusqlite::params![
                def.key,
                def.display_name,
                def.description,
                def.setting_type.as_str(),
                options_json,
                def.range_min,
                def.range_max,
                def.default_value,
                def.category.as_str(),
                def.sort_order,
                def.locked as i32,
            ],
        )?;
        Ok(())
    }

    pub fn get_setting_definitions(&self) -> SqlResult<Vec<crate::models::SettingDefinition>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT key, display_name, description, setting_type, options_json,
                    range_min, range_max, default_value, category, sort_order, locked
             FROM emulator_setting_defs ORDER BY sort_order"
        )?;
        let rows = stmt.query_map([], |row| {
            let options_json: Option<String> = row.get(4)?;
            let options: Option<Vec<String>> = options_json.and_then(|j| serde_json::from_str(&j).ok());
            Ok(crate::models::SettingDefinition {
                key: row.get(0)?,
                display_name: row.get(1)?,
                description: row.get(2)?,
                setting_type: crate::models::SettingType::from_str(&row.get::<_, String>(3)?),
                options,
                range_min: row.get(5)?,
                range_max: row.get(6)?,
                default_value: row.get(7)?,
                category: crate::models::SettingCategory::from_str(&row.get::<_, String>(8)?),
                sort_order: row.get(9)?,
                locked: row.get::<_, i32>(10)? != 0,
            })
        })?.collect::<SqlResult<Vec<_>>>()?;
        Ok(rows)
    }

    // ── Per-Emulator Setting Values ───────────────────────────────────

    pub fn get_emulator_settings(&self, emulator_name: &str) -> SqlResult<Vec<crate::models::EmulatorSettingValue>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT emulator_name, setting_key, value FROM emulator_settings WHERE emulator_name = ?1"
        )?;
        let rows = stmt.query_map([emulator_name], |row| {
            Ok(crate::models::EmulatorSettingValue {
                emulator_name: row.get(0)?,
                setting_key: row.get(1)?,
                value: row.get(2)?,
            })
        })?.collect::<SqlResult<Vec<_>>>()?;
        Ok(rows)
    }

    pub fn get_all_emulator_settings(&self) -> SqlResult<Vec<crate::models::EmulatorSettingValue>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT emulator_name, setting_key, value FROM emulator_settings ORDER BY emulator_name, setting_key"
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(crate::models::EmulatorSettingValue {
                emulator_name: row.get(0)?,
                setting_key: row.get(1)?,
                value: row.get(2)?,
            })
        })?.collect::<SqlResult<Vec<_>>>()?;
        Ok(rows)
    }

    pub fn set_emulator_setting(&self, emulator_name: &str, setting_key: &str, value: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO emulator_settings (emulator_name, setting_key, value)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(emulator_name, setting_key) DO UPDATE SET value = excluded.value",
            rusqlite::params![emulator_name, setting_key, value],
        )?;
        Ok(())
    }

    pub fn delete_emulator_settings(&self, emulator_name: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM emulator_settings WHERE emulator_name = ?1", [emulator_name])?;
        Ok(())
    }

    pub fn delete_emulator_setting(&self, emulator_name: &str, setting_key: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM emulator_settings WHERE emulator_name = ?1 AND setting_key = ?2",
            rusqlite::params![emulator_name, setting_key],
        )?;
        Ok(())
    }

    // ── Steam integration (REQ-021) ────────────────────────────────────────

    pub fn save_steam_data(&self, game_id: &str, data: &crate::models::steam::SteamGameData) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let categories_json = serde_json::to_string(&data.categories).unwrap_or_default();
        let languages_json = serde_json::to_string(&data.languages).unwrap_or_default();
        let reviews_json = serde_json::to_string(&data.reviews).unwrap_or_default();
        conn.execute(
            "INSERT OR REPLACE INTO game_steam_data
             (game_id, steam_app_id, review_score_desc, review_positive, review_negative,
              short_description, categories, release_date, languages,
              requirements_min, requirements_rec, dlc_count, achievements_count,
              reviews_json, fetched_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, datetime('now'))",
            rusqlite::params![
                game_id,
                data.steam_app_id,
                data.review_score_desc,
                data.review_positive,
                data.review_negative,
                data.short_description,
                categories_json,
                data.release_date,
                languages_json,
                data.requirements_min,
                data.requirements_rec,
                data.dlc_count,
                data.achievements_count,
                reviews_json,
            ],
        )?;
        Ok(())
    }

    pub fn get_steam_data(&self, game_id: &str) -> SqlResult<Option<crate::models::steam::SteamGameData>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT steam_app_id, review_score_desc, review_positive, review_negative,
                    short_description, categories, release_date, languages,
                    requirements_min, requirements_rec, dlc_count, achievements_count,
                    reviews_json
             FROM game_steam_data WHERE game_id = ?1"
        )?;
        match stmt.query_row([game_id], |row| {
            let categories_json: Option<String> = row.get(5)?;
            let categories: Vec<String> = categories_json.as_deref()
                .and_then(|j| serde_json::from_str(j).ok())
                .unwrap_or_default();
            let languages_json: Option<String> = row.get(7)?;
            let languages: Vec<String> = languages_json.as_deref()
                .and_then(|j| serde_json::from_str(j).ok())
                .unwrap_or_default();
            let reviews_json_str: Option<String> = row.get(12)?;
            let reviews: Vec<crate::models::steam::SteamReview> = reviews_json_str.as_deref()
                .and_then(|j| serde_json::from_str(j).ok())
                .unwrap_or_default();
            let app_id: u32 = row.get::<_, i64>(0)? as u32;
            Ok(crate::models::steam::SteamGameData {
                steam_app_id: app_id,
                review_score_desc: row.get(1)?,
                review_positive: row.get::<_, i64>(2)? as u32,
                review_negative: row.get::<_, i64>(3)? as u32,
                short_description: row.get(4)?,
                categories,
                release_date: row.get(6)?,
                languages,
                requirements_min: row.get(8)?,
                requirements_rec: row.get(9)?,
                dlc_count: row.get::<_, i64>(10)? as u32,
                achievements_count: row.get::<_, i64>(11)? as u32,
                reviews,
                store_url: format!("https://store.steampowered.com/app/{}", app_id),
            })
        }) {
            Ok(data) => Ok(Some(data)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }
}
