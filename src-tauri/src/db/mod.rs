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
        Ok(())
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
}
