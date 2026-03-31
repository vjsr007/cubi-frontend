use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SteamSearchResult {
    pub app_id: u32,
    pub name: String,
    pub icon_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SteamGameData {
    pub steam_app_id: u32,
    pub review_score_desc: Option<String>,
    pub review_positive: u32,
    pub review_negative: u32,
    pub short_description: Option<String>,
    pub categories: Vec<String>,
    pub release_date: Option<String>,
    pub languages: Vec<String>,
    pub requirements_min: Option<String>,
    pub requirements_rec: Option<String>,
    pub dlc_count: u32,
    pub achievements_count: u32,
    pub reviews: Vec<SteamReview>,
    pub store_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SteamReview {
    pub author_name: String,
    pub hours_played: f64,
    pub voted_up: bool,
    pub review_text: String,
    pub timestamp: i64,
}
