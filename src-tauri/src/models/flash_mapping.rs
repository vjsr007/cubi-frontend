use serde::{Deserialize, Serialize};

// ── Stick / Mouse config per game ────────────────────────────────────

/// Left-stick emulation mode.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LeftStickMode {
    Disabled,
    Wasd,
    Arrows,
}

impl LeftStickMode {
    pub fn as_str(&self) -> &str {
        match self { Self::Disabled => "disabled", Self::Wasd => "wasd", Self::Arrows => "arrows" }
    }
    pub fn from_str(s: &str) -> Self {
        match s { "wasd" => Self::Wasd, "arrows" => Self::Arrows, _ => Self::Disabled }
    }
}

/// Per-game Flash stick & mouse configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlashGameConfig {
    pub game_id: String,
    /// Left stick emulation: disabled / wasd / arrows.
    pub left_stick_mode: LeftStickMode,
    /// Right stick controls the mouse cursor.
    pub right_stick_mouse: bool,
    /// Mouse speed multiplier (1-100, default 50).
    pub mouse_sensitivity: i32,
}

impl FlashGameConfig {
    pub fn default_for(game_id: &str) -> Self {
        Self {
            game_id: game_id.to_string(),
            left_stick_mode: LeftStickMode::Arrows,
            right_stick_mouse: false,
            mouse_sensitivity: 50,
        }
    }
}

// ── Button → Key mappings ────────────────────────────────────────────

/// A single gamepad-button → keyboard-key binding for a Flash game.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlashKeyMapping {
    pub game_id: String,
    /// Standard Gamepad API button index (0-15).
    pub gamepad_button: i32,
    /// Keyboard key name (e.g. "ArrowUp", "z", "Enter", "Space").
    pub keyboard_key: String,
}

/// Standard gamepad button labels for display.
pub fn gamepad_button_label(index: i32) -> &'static str {
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
        10 => "L3",
        11 => "R3",
        12 => "D-Pad Up",
        13 => "D-Pad Down",
        14 => "D-Pad Left",
        15 => "D-Pad Right",
        _  => "Unknown",
    }
}

/// Default key mappings used as a sensible starting point for Flash games.
/// Maps common gamepad buttons to typical Flash game keyboard controls.
pub fn default_flash_mappings(game_id: &str) -> Vec<FlashKeyMapping> {
    vec![
        FlashKeyMapping { game_id: game_id.to_string(), gamepad_button: 12, keyboard_key: "ArrowUp".into() },
        FlashKeyMapping { game_id: game_id.to_string(), gamepad_button: 13, keyboard_key: "ArrowDown".into() },
        FlashKeyMapping { game_id: game_id.to_string(), gamepad_button: 14, keyboard_key: "ArrowLeft".into() },
        FlashKeyMapping { game_id: game_id.to_string(), gamepad_button: 15, keyboard_key: "ArrowRight".into() },
        FlashKeyMapping { game_id: game_id.to_string(), gamepad_button: 0,  keyboard_key: "z".into() },
        FlashKeyMapping { game_id: game_id.to_string(), gamepad_button: 1,  keyboard_key: "x".into() },
        FlashKeyMapping { game_id: game_id.to_string(), gamepad_button: 2,  keyboard_key: "a".into() },
        FlashKeyMapping { game_id: game_id.to_string(), gamepad_button: 3,  keyboard_key: "s".into() },
        FlashKeyMapping { game_id: game_id.to_string(), gamepad_button: 9,  keyboard_key: "Enter".into() },
        FlashKeyMapping { game_id: game_id.to_string(), gamepad_button: 8,  keyboard_key: "Escape".into() },
        FlashKeyMapping { game_id: game_id.to_string(), gamepad_button: 4,  keyboard_key: "q".into() },
        FlashKeyMapping { game_id: game_id.to_string(), gamepad_button: 5,  keyboard_key: "w".into() },
    ]
}
