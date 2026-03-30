use serde::{Deserialize, Serialize};

// ── Setting Type ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SettingType {
    Bool,
    Select,
    Range,
}

impl SettingType {
    pub fn as_str(&self) -> &str {
        match self {
            SettingType::Bool => "bool",
            SettingType::Select => "select",
            SettingType::Range => "range",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "bool" => SettingType::Bool,
            "select" => SettingType::Select,
            "range" => SettingType::Range,
            _ => SettingType::Select,
        }
    }
}

// ── Setting Category ──────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SettingCategory {
    Video,
    Audio,
    System,
    Performance,
}

impl SettingCategory {
    pub fn as_str(&self) -> &str {
        match self {
            SettingCategory::Video => "video",
            SettingCategory::Audio => "audio",
            SettingCategory::System => "system",
            SettingCategory::Performance => "performance",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "video" => SettingCategory::Video,
            "audio" => SettingCategory::Audio,
            "system" => SettingCategory::System,
            "performance" => SettingCategory::Performance,
            _ => SettingCategory::Video,
        }
    }
}

// ── Setting Definition (canonical) ────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingDefinition {
    pub key: String,
    pub display_name: String,
    pub description: String,
    pub setting_type: SettingType,
    /// For Select type — the allowed options.
    pub options: Option<Vec<String>>,
    /// For Range type — min value.
    pub range_min: Option<i32>,
    /// For Range type — max value.
    pub range_max: Option<i32>,
    pub default_value: String,
    pub category: SettingCategory,
    pub sort_order: i32,
    /// If true, the setting cannot be changed by the user (e.g. vsync = false always).
    pub locked: bool,
}

// ── Per-Emulator Setting Value ────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmulatorSettingValue {
    pub emulator_name: String,
    pub setting_key: String,
    pub value: String,
}

// ── Config Writer Info (sent to frontend) ─────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigWriterInfo {
    pub emulator_name: String,
    pub config_format: String,
    pub supported_settings: Vec<String>,
    pub default_config_path: Option<String>,
}

// ── Canonical Setting Keys ────────────────────────────────────────────

pub const SETTING_INTERNAL_RESOLUTION: &str = "internal_resolution";
pub const SETTING_FULLSCREEN: &str = "fullscreen";
pub const SETTING_VSYNC: &str = "vsync";
pub const SETTING_ASPECT_RATIO: &str = "aspect_ratio";
pub const SETTING_SHOW_FPS: &str = "show_fps";
pub const SETTING_SYSTEM_LANGUAGE: &str = "system_language";
pub const SETTING_AUDIO_VOLUME: &str = "audio_volume";
pub const SETTING_FRAME_LIMIT: &str = "frame_limit";
pub const SETTING_FAST_FORWARD_SPEED: &str = "fast_forward_speed";
pub const SETTING_TEXTURE_FILTERING: &str = "texture_filtering";

/// Returns all 10 canonical setting definitions.
pub fn all_setting_definitions() -> Vec<SettingDefinition> {
    vec![
        SettingDefinition {
            key: SETTING_INTERNAL_RESOLUTION.into(),
            display_name: "Internal Resolution".into(),
            description: "Rendering resolution multiplier. Higher values look sharper but require more GPU power.".into(),
            setting_type: SettingType::Select,
            options: Some(vec![
                "native".into(), "2x".into(), "3x".into(), "4x".into(),
                "5x".into(), "6x".into(), "8x".into(),
            ]),
            range_min: None,
            range_max: None,
            default_value: "native".into(),
            category: SettingCategory::Video,
            sort_order: 0,
            locked: false,
        },
        SettingDefinition {
            key: SETTING_FULLSCREEN.into(),
            display_name: "Fullscreen".into(),
            description: "Start games in fullscreen mode.".into(),
            setting_type: SettingType::Bool,
            options: None,
            range_min: None,
            range_max: None,
            default_value: "true".into(),
            category: SettingCategory::Video,
            sort_order: 1,
            locked: false,
        },
        SettingDefinition {
            key: SETTING_VSYNC.into(),
            display_name: "V-Sync".into(),
            description: "Vertical synchronization. ALWAYS OFF — causes input lag. Use external frame limiter instead.".into(),
            setting_type: SettingType::Bool,
            options: None,
            range_min: None,
            range_max: None,
            default_value: "false".into(),
            category: SettingCategory::Video,
            sort_order: 2,
            locked: true, // ← Cannot be changed
        },
        SettingDefinition {
            key: SETTING_ASPECT_RATIO.into(),
            display_name: "Aspect Ratio".into(),
            description: "Display aspect ratio for the emulator window.".into(),
            setting_type: SettingType::Select,
            options: Some(vec![
                "auto".into(), "4:3".into(), "16:9".into(), "stretch".into(),
            ]),
            range_min: None,
            range_max: None,
            default_value: "auto".into(),
            category: SettingCategory::Video,
            sort_order: 3,
            locked: false,
        },
        SettingDefinition {
            key: SETTING_SHOW_FPS.into(),
            display_name: "Show FPS".into(),
            description: "Display frames-per-second counter overlay.".into(),
            setting_type: SettingType::Bool,
            options: None,
            range_min: None,
            range_max: None,
            default_value: "false".into(),
            category: SettingCategory::Video,
            sort_order: 4,
            locked: false,
        },
        SettingDefinition {
            key: SETTING_SYSTEM_LANGUAGE.into(),
            display_name: "System Language".into(),
            description: "Console system language. Affects in-game language for titles that support it.".into(),
            setting_type: SettingType::Select,
            options: Some(vec![
                "English".into(), "Spanish".into(), "French".into(), "German".into(),
                "Italian".into(), "Japanese".into(), "Portuguese".into(), "Chinese".into(),
                "Korean".into(),
            ]),
            range_min: None,
            range_max: None,
            default_value: "English".into(),
            category: SettingCategory::System,
            sort_order: 10,
            locked: false,
        },
        SettingDefinition {
            key: SETTING_AUDIO_VOLUME.into(),
            display_name: "Audio Volume".into(),
            description: "Master audio volume (0-100%).".into(),
            setting_type: SettingType::Range,
            options: None,
            range_min: Some(0),
            range_max: Some(100),
            default_value: "100".into(),
            category: SettingCategory::Audio,
            sort_order: 20,
            locked: false,
        },
        SettingDefinition {
            key: SETTING_FRAME_LIMIT.into(),
            display_name: "Frame Limit".into(),
            description: "Maximum frame rate. 'auto' matches the original console speed.".into(),
            setting_type: SettingType::Select,
            options: Some(vec![
                "auto".into(), "30".into(), "60".into(), "120".into(), "unlimited".into(),
            ]),
            range_min: None,
            range_max: None,
            default_value: "auto".into(),
            category: SettingCategory::Performance,
            sort_order: 30,
            locked: false,
        },
        SettingDefinition {
            key: SETTING_FAST_FORWARD_SPEED.into(),
            display_name: "Fast Forward Speed".into(),
            description: "Speed multiplier when fast-forwarding.".into(),
            setting_type: SettingType::Select,
            options: Some(vec![
                "2x".into(), "3x".into(), "4x".into(), "unlimited".into(),
            ]),
            range_min: None,
            range_max: None,
            default_value: "2x".into(),
            category: SettingCategory::Performance,
            sort_order: 31,
            locked: false,
        },
        SettingDefinition {
            key: SETTING_TEXTURE_FILTERING.into(),
            display_name: "Texture Filtering".into(),
            description: "Texture interpolation method. 'nearest' for sharp pixels, 'linear' for smooth.".into(),
            setting_type: SettingType::Select,
            options: Some(vec!["nearest".into(), "linear".into()]),
            range_min: None,
            range_max: None,
            default_value: "linear".into(),
            category: SettingCategory::Video,
            sort_order: 5,
            locked: false,
        },
    ]
}
