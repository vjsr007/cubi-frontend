use std::collections::HashMap;
use std::path::Path;
use quick_xml::events::Event;
use quick_xml::Reader;

/// Metadata parsed from a single <game> entry in gamelist.xml
#[derive(Debug, Default)]
pub struct GamelistEntry {
    pub path: String,
    pub name: Option<String>,
    pub desc: Option<String>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub genre: Option<String>,
    pub players: Option<String>,
    pub rating: Option<String>,
    pub releasedate: Option<String>,
    pub play_count: Option<String>,
    pub last_played: Option<String>,
}

/// Parse gamelist.xml and return a map of ROM filename -> metadata.
/// The key is the file_name portion of the <path> element (e.g., "Game Name (USA).zip").
pub fn parse_gamelist(gamelist_path: &Path) -> HashMap<String, GamelistEntry> {
    let mut result = HashMap::new();

    let content = match std::fs::read_to_string(gamelist_path) {
        Ok(c) => c,
        Err(e) => {
            log::debug!("Could not read gamelist.xml at {:?}: {}", gamelist_path, e);
            return result;
        }
    };

    let mut reader = Reader::from_str(&content);
    reader.config_mut().trim_text(true);

    let mut in_game = false;
    let mut current_entry = GamelistEntry::default();
    let mut current_tag = String::new();
    let mut buf_text = String::new();

    loop {
        match reader.read_event() {
            Ok(Event::Start(ref e)) => {
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                if tag == "game" {
                    in_game = true;
                    current_entry = GamelistEntry::default();
                } else if in_game {
                    current_tag = tag;
                    buf_text.clear();
                }
            }
            Ok(Event::Text(ref e)) => {
                if in_game && !current_tag.is_empty() {
                    if let Ok(text) = e.unescape() {
                        buf_text.push_str(&text);
                    }
                }
            }
            Ok(Event::End(ref e)) => {
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                if tag == "game" {
                    in_game = false;
                    // Extract the filename from the path (e.g., "./Game.zip" -> "Game.zip")
                    if !current_entry.path.is_empty() {
                        let file_name = Path::new(&current_entry.path)
                            .file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or(&current_entry.path)
                            .to_string();
                        result.insert(file_name, current_entry);
                    }
                    current_entry = GamelistEntry::default();
                } else if in_game && !current_tag.is_empty() {
                    let text = buf_text.trim().to_string();
                    if !text.is_empty() {
                        match current_tag.as_str() {
                            "path" => current_entry.path = text,
                            "name" => current_entry.name = Some(text),
                            "desc" => current_entry.desc = Some(text),
                            "developer" => current_entry.developer = Some(text),
                            "publisher" => current_entry.publisher = Some(text),
                            "genre" => current_entry.genre = Some(text),
                            "players" => current_entry.players = Some(text),
                            "rating" => current_entry.rating = Some(text),
                            "releasedate" => current_entry.releasedate = Some(text),
                            "playcount" => current_entry.play_count = Some(text),
                            "lastplayed" => current_entry.last_played = Some(text),
                            _ => {}
                        }
                    }
                    current_tag.clear();
                    buf_text.clear();
                }
            }
            Ok(Event::Empty(ref e)) => {
                // Handle self-closing tags like <releasedate/>
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                if tag == "game" {
                    // Edge case: empty <game/> element, ignore
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => {
                log::warn!("Error parsing gamelist.xml at {:?}: {}", gamelist_path, e);
                break;
            }
            _ => {}
        }
    }

    log::info!(
        "Parsed {} entries from {:?}",
        result.len(),
        gamelist_path
    );
    result
}

/// Parse the releasedate field (format: "19940101T000000" or "19940101") into a year string
pub fn extract_year(releasedate: &str) -> Option<String> {
    let clean = releasedate.trim();
    if clean.len() >= 4 {
        let year = &clean[..4];
        if year.chars().all(|c| c.is_ascii_digit()) && year != "0000" {
            return Some(year.to_string());
        }
    }
    None
}

/// Parse players string ("1-2", "1", "2") into a count
pub fn parse_players(players_str: &str) -> u32 {
    let trimmed = players_str.trim();
    // Handle "1-2" format — take max
    if let Some(pos) = trimmed.find('-') {
        trimmed[pos + 1..].trim().parse::<u32>().unwrap_or(1)
    } else {
        trimmed.parse::<u32>().unwrap_or(1)
    }
}

/// Parse rating string (e.g., "7", "0.75", "85") into 0.0-1.0 float
pub fn parse_rating(rating_str: &str) -> f32 {
    let val: f32 = rating_str.trim().parse().unwrap_or(0.0);
    if val > 1.0 {
        // Assume 0-100 scale or 0-10 scale
        if val > 10.0 { val / 100.0 } else { val / 10.0 }
    } else {
        val
    }
}
