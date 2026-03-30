pub mod schema;

use rusqlite::{Connection, Result as SqlResult};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use crate::models::{GameInfo, SystemInfo, ScraperConfig, default_scrapers};

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
        Ok(db)
    }

    fn initialize(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(schema::CREATE_SCHEMA)?;
        drop(conn);
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

    /// Seed default scrapers if the table is empty
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
                     (id, name, url, api_key, username, password, enabled, priority,
                      supports, requires_credentials, credential_hint)
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

    pub fn upsert_game(&self, game: &GameInfo) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO games (id, system_id, title, file_path, file_name, file_size,
              box_art, description, developer, publisher, year, genre, players, rating,
              play_count, last_played, favorite)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)
             ON CONFLICT(id) DO UPDATE SET
               title = excluded.title,
               box_art = excluded.box_art,
               description = excluded.description,
               developer = excluded.developer,
               publisher = excluded.publisher,
               year = excluded.year,
               genre = excluded.genre,
               players = excluded.players,
               rating = excluded.rating",
            rusqlite::params![
                game.id,
                game.system_id,
                game.title,
                game.file_path,
                game.file_name,
                game.file_size,
                game.box_art,
                game.description,
                game.developer,
                game.publisher,
                game.year,
                game.genre,
                game.players,
                game.rating,
                game.play_count,
                game.last_played,
                game.favorite as i32,
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

    pub fn get_games(&self, system_id: &str) -> SqlResult<Vec<GameInfo>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, system_id, title, file_path, file_name, file_size,
              box_art, description, developer, publisher, year, genre,
              players, rating, last_played, play_count, favorite
             FROM games WHERE system_id = ?1 ORDER BY title"
        )?;
        let games = stmt.query_map([system_id], |row| {
            Ok(GameInfo {
                id: row.get(0)?,
                system_id: row.get(1)?,
                title: row.get(2)?,
                file_path: row.get(3)?,
                file_name: row.get(4)?,
                file_size: row.get(5)?,
                box_art: row.get(6)?,
                description: row.get(7)?,
                developer: row.get(8)?,
                publisher: row.get(9)?,
                year: row.get(10)?,
                genre: row.get(11)?,
                players: row.get(12)?,
                rating: row.get(13)?,
                last_played: row.get(14)?,
                play_count: row.get(15)?,
                favorite: row.get::<_, i32>(16)? != 0,
            })
        })?.collect::<SqlResult<Vec<_>>>()?;
        Ok(games)
    }

    pub fn get_game(&self, game_id: &str) -> SqlResult<Option<GameInfo>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, system_id, title, file_path, file_name, file_size,
              box_art, description, developer, publisher, year, genre,
              players, rating, last_played, play_count, favorite
             FROM games WHERE id = ?1"
        )?;
        let result = stmt.query_row([game_id], |row| {
            Ok(GameInfo {
                id: row.get(0)?,
                system_id: row.get(1)?,
                title: row.get(2)?,
                file_path: row.get(3)?,
                file_name: row.get(4)?,
                file_size: row.get(5)?,
                box_art: row.get(6)?,
                description: row.get(7)?,
                developer: row.get(8)?,
                publisher: row.get(9)?,
                year: row.get(10)?,
                genre: row.get(11)?,
                players: row.get(12)?,
                rating: row.get(13)?,
                last_played: row.get(14)?,
                play_count: row.get(15)?,
                favorite: row.get::<_, i32>(16)? != 0,
            })
        });
        match result {
            Ok(game) => Ok(Some(game)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
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
}
