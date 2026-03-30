use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GameInfo {
    pub id: String,
    pub system_id: String,
    pub title: String,
    pub file_path: String,
    pub file_name: String,
    pub file_size: u64,
    pub box_art: Option<String>,
    pub description: Option<String>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub year: Option<String>,
    pub genre: Option<String>,
    pub players: u32,
    pub rating: f32,
    pub last_played: Option<String>,
    pub play_count: u32,
    pub favorite: bool,
    // PC Enhanced Metadata (TASK-015-01)
    pub hero_art: Option<String>,
    pub logo: Option<String>,
    pub background_art: Option<String>,
    pub screenshots: Option<Vec<String>>,
    pub trailer_url: Option<String>,
    pub trailer_local: Option<String>,
    pub metacritic_score: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub website: Option<String>,
    pub pcgamingwiki_url: Option<String>,
    pub igdb_id: Option<i64>,
}

impl GameInfo {
    pub fn title_from_filename(filename: &str) -> String {
        let name = std::path::Path::new(filename)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or(filename);
        clean_rom_title(name)
    }
}

fn clean_rom_title(input: &str) -> String {
    let mut result = input.to_string();
    loop {
        if let Some(start) = result.find('(') {
            if let Some(end_offset) = result[start..].find(')') {
                result.replace_range(start..=start + end_offset, "");
                continue;
            }
        }
        break;
    }
    loop {
        if let Some(start) = result.find('[') {
            if let Some(end_offset) = result[start..].find(']') {
                result.replace_range(start..=start + end_offset, "");
                continue;
            }
        }
        break;
    }
    let mut cleaned = String::new();
    let mut prev_space = false;
    for ch in result.replace('_', " ").chars() {
        if ch == ' ' {
            if !prev_space { cleaned.push(' '); }
            prev_space = true;
        } else {
            cleaned.push(ch);
            prev_space = false;
        }
    }
    cleaned.trim().to_string()
}

/// Partial update — None means "leave field unchanged"
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct GameInfoPatch {
    pub title: Option<String>,
    pub box_art: Option<String>,
    pub description: Option<String>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub year: Option<String>,
    pub genre: Option<String>,
    pub players: Option<u32>,
    pub rating: Option<f32>,
    pub hero_art: Option<String>,
    pub logo: Option<String>,
    pub background_art: Option<String>,
    pub screenshots: Option<Vec<String>>,
    pub trailer_url: Option<String>,
    pub trailer_local: Option<String>,
    pub metacritic_score: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub website: Option<String>,
    pub pcgamingwiki_url: Option<String>,
    pub igdb_id: Option<i64>,
}

impl GameInfoPatch {
    pub fn is_empty(&self) -> bool {
        self.title.is_none()
            && self.box_art.is_none()
            && self.description.is_none()
            && self.developer.is_none()
            && self.publisher.is_none()
            && self.year.is_none()
            && self.genre.is_none()
            && self.players.is_none()
            && self.rating.is_none()
            && self.hero_art.is_none()
            && self.logo.is_none()
            && self.background_art.is_none()
            && self.screenshots.is_none()
            && self.trailer_url.is_none()
            && self.trailer_local.is_none()
            && self.metacritic_score.is_none()
            && self.tags.is_none()
            && self.website.is_none()
            && self.pcgamingwiki_url.is_none()
            && self.igdb_id.is_none()
    }

    pub fn apply(&self, mut game: GameInfo) -> GameInfo {
        if let Some(v) = &self.title { game.title = v.clone(); }
        if let Some(v) = &self.box_art { game.box_art = Some(v.clone()); }
        if let Some(v) = &self.description { game.description = Some(v.clone()); }
        if let Some(v) = &self.developer { game.developer = Some(v.clone()); }
        if let Some(v) = &self.publisher { game.publisher = Some(v.clone()); }
        if let Some(v) = &self.year { game.year = Some(v.clone()); }
        if let Some(v) = &self.genre { game.genre = Some(v.clone()); }
        if let Some(v) = self.players { game.players = v; }
        if let Some(v) = self.rating { game.rating = v; }
        if let Some(v) = &self.hero_art { game.hero_art = Some(v.clone()); }
        if let Some(v) = &self.logo { game.logo = Some(v.clone()); }
        if let Some(v) = &self.background_art { game.background_art = Some(v.clone()); }
        if let Some(v) = &self.screenshots { game.screenshots = Some(v.clone()); }
        if let Some(v) = &self.trailer_url { game.trailer_url = Some(v.clone()); }
        if let Some(v) = &self.trailer_local { game.trailer_local = Some(v.clone()); }
        if let Some(v) = self.metacritic_score { game.metacritic_score = Some(v); }
        if let Some(v) = &self.tags { game.tags = Some(v.clone()); }
        if let Some(v) = &self.website { game.website = Some(v.clone()); }
        if let Some(v) = &self.pcgamingwiki_url { game.pcgamingwiki_url = Some(v.clone()); }
        if let Some(v) = self.igdb_id { game.igdb_id = Some(v); }
        game
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgress {
    pub total: u32,
    pub current: u32,
    pub current_system: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub systems_found: u32,
    pub games_found: u32,
    pub errors: Vec<String>,
}
