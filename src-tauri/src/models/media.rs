use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GameMedia {
    pub box_art: Option<String>,
    pub back_cover: Option<String>,
    pub screenshot: Option<String>,
    pub title_screen: Option<String>,
    pub fan_art: Option<String>,
    pub wheel: Option<String>,
    pub marquee: Option<String>,
    pub mix_image: Option<String>,
    pub video: Option<String>,
    pub manual: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SystemMedia {
    pub fan_art: Option<String>,
    pub wheel: Option<String>,
    pub marquee: Option<String>,
}
