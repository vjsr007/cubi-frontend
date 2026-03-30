use crate::models::{
    InputProfile, ButtonBinding, ControllerType,
};
use crate::db::Database;
use crate::services::exporters::{self, EmulatorExporter};

// ── Default Preset Factory ──────────────────────────────────────────────────

pub struct DefaultPresets;

impl DefaultPresets {
    /// Seed the 3 built-in profiles + their bindings if they don't already exist.
    pub fn seed(db: &Database) {
        let profiles = db.get_input_profiles().unwrap_or_default();
        if profiles.iter().any(|p| p.is_builtin) {
            return; // Already seeded
        }

        let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

        // Xbox Standard
        let xbox = InputProfile {
            id: "builtin-xbox".into(),
            name: "Xbox Standard".into(),
            controller_type: ControllerType::Xbox,
            is_builtin: true,
            created_at: now.clone(),
            updated_at: now.clone(),
        };
        let _ = db.insert_input_profile(&xbox);
        for b in Self::xbox_bindings("builtin-xbox") {
            let _ = db.set_binding(&b.profile_id, &b.action, b.button_index, b.axis_index, b.axis_direction.as_deref());
        }

        // PlayStation Standard
        let ps = InputProfile {
            id: "builtin-playstation".into(),
            name: "PlayStation Standard".into(),
            controller_type: ControllerType::PlayStation,
            is_builtin: true,
            created_at: now.clone(),
            updated_at: now.clone(),
        };
        let _ = db.insert_input_profile(&ps);
        for b in Self::playstation_bindings("builtin-playstation") {
            let _ = db.set_binding(&b.profile_id, &b.action, b.button_index, b.axis_index, b.axis_direction.as_deref());
        }

        // Nintendo Standard
        let nintendo = InputProfile {
            id: "builtin-nintendo".into(),
            name: "Nintendo Standard".into(),
            controller_type: ControllerType::Nintendo,
            is_builtin: true,
            created_at: now.clone(),
            updated_at: now.clone(),
        };
        let _ = db.insert_input_profile(&nintendo);
        for b in Self::nintendo_bindings("builtin-nintendo") {
            let _ = db.set_binding(&b.profile_id, &b.action, b.button_index, b.axis_index, b.axis_direction.as_deref());
        }
    }

    /// Xbox layout: A=confirm, B=back — Standard Gamepad mapping
    fn xbox_bindings(profile_id: &str) -> Vec<ButtonBinding> {
        let pid = profile_id.to_string();
        vec![
            // UI
            bb(&pid, "ui_confirm",   0),  // A
            bb(&pid, "ui_back",      1),  // B
            bb(&pid, "ui_menu",      9),  // Start
            bb(&pid, "ui_tab_left",  4),  // LB
            bb(&pid, "ui_tab_right", 5),  // RB
            bb(&pid, "ui_up",        12), // D-Up
            bb(&pid, "ui_down",      13), // D-Down
            bb(&pid, "ui_left",      14), // D-Left
            bb(&pid, "ui_right",     15), // D-Right
            bb(&pid, "ui_page_up",   6),  // LT
            bb(&pid, "ui_page_down", 7),  // RT
            // Game (same as physical layout)
            bb(&pid, "game_a",       0),
            bb(&pid, "game_b",       1),
            bb(&pid, "game_x",       2),
            bb(&pid, "game_y",       3),
            bb(&pid, "game_l1",      4),
            bb(&pid, "game_r1",      5),
            bb(&pid, "game_l2",      6),
            bb(&pid, "game_r2",      7),
            bb(&pid, "game_l3",      10),
            bb(&pid, "game_r3",      11),
            bb(&pid, "game_start",   9),
            bb(&pid, "game_select",  8),
            bb(&pid, "game_dpad_up",    12),
            bb(&pid, "game_dpad_down",  13),
            bb(&pid, "game_dpad_left",  14),
            bb(&pid, "game_dpad_right", 15),
            // Hotkeys
            bb(&pid, "hotkey_menu",         8),  // Select
            bb(&pid, "hotkey_save_state",   -1), // Not mapped
            bb(&pid, "hotkey_load_state",   -1),
            bb(&pid, "hotkey_fast_forward", -1),
            bb(&pid, "hotkey_screenshot",   -1),
        ]
    }

    /// PlayStation layout: Cross(0)=confirm, Circle(1)=back
    fn playstation_bindings(profile_id: &str) -> Vec<ButtonBinding> {
        let pid = profile_id.to_string();
        vec![
            // UI — Cross=confirm, Circle=back (western style)
            bb(&pid, "ui_confirm",   0),  // Cross
            bb(&pid, "ui_back",      1),  // Circle
            bb(&pid, "ui_menu",      9),  // Options
            bb(&pid, "ui_tab_left",  4),  // L1
            bb(&pid, "ui_tab_right", 5),  // R1
            bb(&pid, "ui_up",        12),
            bb(&pid, "ui_down",      13),
            bb(&pid, "ui_left",      14),
            bb(&pid, "ui_right",     15),
            bb(&pid, "ui_page_up",   6),  // L2
            bb(&pid, "ui_page_down", 7),  // R2
            // Game
            bb(&pid, "game_a",       0),  // Cross
            bb(&pid, "game_b",       1),  // Circle
            bb(&pid, "game_x",       2),  // Square
            bb(&pid, "game_y",       3),  // Triangle
            bb(&pid, "game_l1",      4),
            bb(&pid, "game_r1",      5),
            bb(&pid, "game_l2",      6),
            bb(&pid, "game_r2",      7),
            bb(&pid, "game_l3",      10),
            bb(&pid, "game_r3",      11),
            bb(&pid, "game_start",   9),
            bb(&pid, "game_select",  8),
            bb(&pid, "game_dpad_up",    12),
            bb(&pid, "game_dpad_down",  13),
            bb(&pid, "game_dpad_left",  14),
            bb(&pid, "game_dpad_right", 15),
            // Hotkeys
            bb(&pid, "hotkey_menu",         8),
            bb(&pid, "hotkey_save_state",   -1),
            bb(&pid, "hotkey_load_state",   -1),
            bb(&pid, "hotkey_fast_forward", -1),
            bb(&pid, "hotkey_screenshot",   -1),
        ]
    }

    /// Nintendo layout: B(0)=confirm, A(1)=back (swapped from Xbox)
    fn nintendo_bindings(profile_id: &str) -> Vec<ButtonBinding> {
        let pid = profile_id.to_string();
        vec![
            // UI — B(East)=confirm, A(South)=back (Nintendo convention: right=confirm)
            bb(&pid, "ui_confirm",   1),  // B (East)
            bb(&pid, "ui_back",      0),  // A (South)
            bb(&pid, "ui_menu",      9),  // +
            bb(&pid, "ui_tab_left",  4),  // L
            bb(&pid, "ui_tab_right", 5),  // R
            bb(&pid, "ui_up",        12),
            bb(&pid, "ui_down",      13),
            bb(&pid, "ui_left",      14),
            bb(&pid, "ui_right",     15),
            bb(&pid, "ui_page_up",   6),  // ZL
            bb(&pid, "ui_page_down", 7),  // ZR
            // Game — Swapped: physical East=A, physical South=B
            bb(&pid, "game_a",       1),  // East = A
            bb(&pid, "game_b",       0),  // South = B
            bb(&pid, "game_x",       3),  // North = X
            bb(&pid, "game_y",       2),  // West = Y
            bb(&pid, "game_l1",      4),
            bb(&pid, "game_r1",      5),
            bb(&pid, "game_l2",      6),
            bb(&pid, "game_r2",      7),
            bb(&pid, "game_l3",      10),
            bb(&pid, "game_r3",      11),
            bb(&pid, "game_start",   9),
            bb(&pid, "game_select",  8),
            bb(&pid, "game_dpad_up",    12),
            bb(&pid, "game_dpad_down",  13),
            bb(&pid, "game_dpad_left",  14),
            bb(&pid, "game_dpad_right", 15),
            // Hotkeys
            bb(&pid, "hotkey_menu",         8),
            bb(&pid, "hotkey_save_state",   -1),
            bb(&pid, "hotkey_load_state",   -1),
            bb(&pid, "hotkey_fast_forward", -1),
            bb(&pid, "hotkey_screenshot",   -1),
        ]
    }

    /// Get default bindings for a given controller type (used for reset-to-default).
    pub fn default_bindings_for(controller_type: &ControllerType, profile_id: &str) -> Vec<ButtonBinding> {
        match controller_type {
            ControllerType::Xbox    | ControllerType::Custom => Self::xbox_bindings(profile_id),
            ControllerType::PlayStation => Self::playstation_bindings(profile_id),
            ControllerType::Nintendo   => Self::nintendo_bindings(profile_id),
        }
    }
}

/// Helper: create a simple button binding (no axis).
fn bb(profile_id: &str, action: &str, button_index: i32) -> ButtonBinding {
    ButtonBinding {
        profile_id: profile_id.to_string(),
        action: action.to_string(),
        button_index,
        axis_index: None,
        axis_direction: None,
    }
}

// ── Export orchestration ────────────────────────────────────────────────────

/// Get the correct exporter strategy for the given emulator name.
pub fn get_exporter(emulator_name: &str) -> Box<dyn EmulatorExporter> {
    match emulator_name.to_lowercase().as_str() {
        "retroarch"   => Box::new(exporters::RetroArchExporter::default()),
        "dolphin"     => Box::new(exporters::DolphinExporter),
        "pcsx2"       => Box::new(exporters::Pcsx2Exporter),
        "duckstation" => Box::new(exporters::DuckStationExporter),
        _             => Box::new(exporters::GenericJsonExporter),
    }
}
