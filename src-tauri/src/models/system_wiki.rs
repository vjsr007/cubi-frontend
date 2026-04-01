use serde::{Deserialize, Serialize};

/// Per-system wiki/info data — like a mini encyclopedia entry for each console/platform
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemWiki {
    pub system_id: String,
    pub manufacturer: String,
    pub release_year: Option<u16>,
    pub discontinue_year: Option<u16>,
    pub generation: Option<u8>,
    pub media_type: String,         // "Cartridge", "CD-ROM", "Blu-ray", etc.
    pub cpu: String,
    pub memory: String,             // e.g. "128 KB", "32 MB"
    pub graphics: String,
    pub sound: String,
    pub display: String,            // e.g. "240p", "480i", "720p"
    pub units_sold: String,         // e.g. "61.91 million"
    pub launch_price: String,       // e.g. "$199 USD"
    pub description: String,        // Rich text description / history
    pub wikipedia_url: String,
    pub image_url: String,          // Console photo URL
    pub notable_games: String,      // Comma-separated notable titles
    pub emulators: String,          // Common emulators: "RetroArch, Dolphin"
    pub updated_at: Option<String>,
}

impl Default for SystemWiki {
    fn default() -> Self {
        Self {
            system_id: String::new(),
            manufacturer: String::new(),
            release_year: None,
            discontinue_year: None,
            generation: None,
            media_type: String::new(),
            cpu: String::new(),
            memory: String::new(),
            graphics: String::new(),
            sound: String::new(),
            display: String::new(),
            units_sold: String::new(),
            launch_price: String::new(),
            description: String::new(),
            wikipedia_url: String::new(),
            image_url: String::new(),
            notable_games: String::new(),
            emulators: String::new(),
            updated_at: None,
        }
    }
}
