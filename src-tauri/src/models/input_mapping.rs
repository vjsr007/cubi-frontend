use serde::{Deserialize, Serialize};

// ── Controller type ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ControllerType {
    Xbox,
    PlayStation,
    Nintendo,
    Custom,
}

impl ControllerType {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Xbox => "Xbox",
            Self::PlayStation => "PlayStation",
            Self::Nintendo => "Nintendo",
            Self::Custom => "Custom",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "Xbox" => Self::Xbox,
            "PlayStation" => Self::PlayStation,
            "Nintendo" => Self::Nintendo,
            _ => Self::Custom,
        }
    }
}

// ── Input profile ───────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputProfile {
    pub id: String,
    pub name: String,
    pub controller_type: ControllerType,
    pub is_builtin: bool,
    pub created_at: String,
    pub updated_at: String,
}

// ── Button binding ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ButtonBinding {
    pub profile_id: String,
    pub action: String,
    pub button_index: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub axis_index: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub axis_direction: Option<String>,
}

// ── System ↔ profile assignment ─────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemProfileAssignment {
    pub system_id: String,
    pub profile_id: String,
}

// ── Canonical action lists ──────────────────────────────────────────────────

pub const UI_ACTIONS: &[&str] = &[
    "ui_confirm", "ui_back", "ui_menu",
    "ui_tab_left", "ui_tab_right",
    "ui_up", "ui_down", "ui_left", "ui_right",
    "ui_page_up", "ui_page_down",
];

pub const GAME_ACTIONS: &[&str] = &[
    "game_a", "game_b", "game_x", "game_y",
    "game_l1", "game_r1", "game_l2", "game_r2",
    "game_l3", "game_r3",
    "game_start", "game_select",
    "game_dpad_up", "game_dpad_down", "game_dpad_left", "game_dpad_right",
];

pub const HOTKEY_ACTIONS: &[&str] = &[
    "hotkey_menu", "hotkey_save_state", "hotkey_load_state",
    "hotkey_fast_forward", "hotkey_screenshot",
];

/// All canonical actions combined.
pub fn all_actions() -> Vec<&'static str> {
    let mut v: Vec<&str> = Vec::new();
    v.extend_from_slice(UI_ACTIONS);
    v.extend_from_slice(GAME_ACTIONS);
    v.extend_from_slice(HOTKEY_ACTIONS);
    v
}

// ── Standard Gamepad button names (index → label) ───────────────────────────

pub fn button_label(index: i32) -> &'static str {
    match index {
        0  => "A / Cross",
        1  => "B / Circle",
        2  => "X / Square",
        3  => "Y / Triangle",
        4  => "LB / L1",
        5  => "RB / R1",
        6  => "LT / L2",
        7  => "RT / R2",
        8  => "Select / Back",
        9  => "Start / Menu",
        10 => "L3 (Stick Click)",
        11 => "R3 (Stick Click)",
        12 => "D-Pad Up",
        13 => "D-Pad Down",
        14 => "D-Pad Left",
        15 => "D-Pad Right",
        16 => "Home / Guide",
        _  => "Unknown",
    }
}
