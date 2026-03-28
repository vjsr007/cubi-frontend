use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
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
    // Remove parenthesized tags like (USA), (E), (J), (Rev 1)
    loop {
        if let Some(start) = result.find('(') {
            if let Some(end_offset) = result[start..].find(')') {
                result.replace_range(start..=start + end_offset, "");
                continue;
            }
        }
        break;
    }
    // Remove bracketed tags like [!], [b1]
    loop {
        if let Some(start) = result.find('[') {
            if let Some(end_offset) = result[start..].find(']') {
                result.replace_range(start..=start + end_offset, "");
                continue;
            }
        }
        break;
    }
    // Replace underscores with spaces, collapse multiple spaces
    let mut cleaned = String::new();
    let mut prev_space = false;
    for ch in result.replace('_', " ").chars() {
        if ch == ' ' {
            if !prev_space {
                cleaned.push(' ');
            }
            prev_space = true;
        } else {
            cleaned.push(ch);
            prev_space = false;
        }
    }
    cleaned.trim().to_string()
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
