use super::EmulatorExporter;
use crate::models::ButtonBinding;

/// Exporter for RetroArch `retroarch.cfg` input bindings.
///
/// Supports both joypad drivers RetroArch uses:
///  - `"xinput"` — the Windows-native default (used by EmuDeck on Windows)
///  - `"sdl2"`   — SDL2 GameController API (default on Linux/macOS, some Windows setups)
///
/// The two drivers use completely different button indices for the same physical
/// buttons on an Xbox controller, so choosing the correct driver is critical.
pub struct RetroArchExporter {
    /// Joypad driver that RetroArch is configured to use.  Detected at write-time
    /// from the existing `retroarch.cfg`; defaults to `"xinput"` on Windows.
    pub driver: String,
}

impl Default for RetroArchExporter {
    fn default() -> Self {
        #[cfg(target_os = "windows")]
        { Self { driver: "xinput".to_string() } }
        #[cfg(not(target_os = "windows"))]
        { Self { driver: "sdl2".to_string() } }
    }
}

/// Internal representation of a translated button value.
enum RaVal {
    /// Joystick button number  → written as `base_btn = "N"`
    Btn(i32),
    /// Hat direction string    → written as `base_btn = "h0up"` (still uses _btn suffix)
    Hat(&'static str),
    /// Analog axis direction   → written as `base_axis = "+4"`
    Axis(&'static str),
}

impl RetroArchExporter {
    /// RetroArch config key prefix for each canonical action.
    /// NOTE: RetroArch's A/B/X/Y naming follows the Nintendo convention (swapped vs Xbox):
    ///   RA "b" = South face (A on Xbox)   RA "a" = East face  (B on Xbox)
    ///   RA "y" = West face  (X on Xbox)   RA "x" = North face (Y on Xbox)
    fn ra_base(action: &str) -> Option<&'static str> {
        match action {
            "game_a"              => Some("input_player1_b"),
            "game_b"              => Some("input_player1_a"),
            "game_x"              => Some("input_player1_y"),
            "game_y"              => Some("input_player1_x"),
            "game_l1"             => Some("input_player1_l"),
            "game_r1"             => Some("input_player1_r"),
            "game_l2"             => Some("input_player1_l2"),
            "game_r2"             => Some("input_player1_r2"),
            "game_l3"             => Some("input_player1_l3"),
            "game_r3"             => Some("input_player1_r3"),
            "game_start"          => Some("input_player1_start"),
            "game_select"         => Some("input_player1_select"),
            "game_dpad_up"        => Some("input_player1_up"),
            "game_dpad_down"      => Some("input_player1_down"),
            "game_dpad_left"      => Some("input_player1_left"),
            "game_dpad_right"     => Some("input_player1_right"),
            "hotkey_menu"         => Some("input_enable_hotkey"),
            "hotkey_save_state"   => Some("input_save_state"),
            "hotkey_load_state"   => Some("input_load_state"),
            "hotkey_fast_forward" => Some("input_toggle_fast_forward"),
            "hotkey_screenshot"   => Some("input_screenshot"),
            _ => None,
        }
    }

    /// Web Gamepad API → XInput (Windows native driver, RetroArch default on Windows).
    ///
    /// XInput button layout for Xbox controller (verified against RetroArch
    /// joypad autoconfig xinput/* files):
    ///   A=0, B=1, X=2, Y=3, LB=4, RB=5, Start=6, Back=7, L3=8, R3=9
    ///   D-pad: hat (h0up / h0down / h0left / h0right)
    ///   LT = axis +4,  RT = axis +5
    fn webapi_to_xinput(btn: i32) -> RaVal {
        match btn {
            0  => RaVal::Btn(0),         // A (South)
            1  => RaVal::Btn(1),         // B (East)
            2  => RaVal::Btn(2),         // X (West)
            3  => RaVal::Btn(3),         // Y (North)
            4  => RaVal::Btn(4),         // LB
            5  => RaVal::Btn(5),         // RB
            6  => RaVal::Axis("+4"),     // LT (analog trigger)
            7  => RaVal::Axis("+5"),     // RT (analog trigger)
            8  => RaVal::Btn(7),         // Back / Select
            9  => RaVal::Btn(6),         // Start
            10 => RaVal::Btn(8),         // L3
            11 => RaVal::Btn(9),         // R3
            12 => RaVal::Hat("h0up"),    // D-pad Up
            13 => RaVal::Hat("h0down"),  // D-pad Down
            14 => RaVal::Hat("h0left"),  // D-pad Left
            15 => RaVal::Hat("h0right"), // D-pad Right
            n  => RaVal::Btn(n),         // passthrough for custom indices
        }
    }

    /// Web Gamepad API → SDL2 GameController API (Linux/macOS default; some Windows setups).
    ///
    /// SDL2 GameController button layout for Xbox controller (verified against
    /// RetroArch joypad autoconfig sdl2/X360 Controller.cfg):
    ///   A=0, B=1, X=2, Y=3, Back=4, Guide=5, Start=6, L3=7, R3=8, LB=9, RB=10
    ///   D-pad: numeric buttons 11–14  (SDL2 GameController maps dpad as buttons)
    ///   LT = axis +4,  RT = axis +5
    fn webapi_to_sdl2(btn: i32) -> RaVal {
        match btn {
            0  => RaVal::Btn(0),   // A (South)
            1  => RaVal::Btn(1),   // B (East)
            2  => RaVal::Btn(2),   // X (West)
            3  => RaVal::Btn(3),   // Y (North)
            4  => RaVal::Btn(9),   // LB
            5  => RaVal::Btn(10),  // RB
            6  => RaVal::Axis("+4"), // LT (analog trigger)
            7  => RaVal::Axis("+5"), // RT (analog trigger)
            8  => RaVal::Btn(4),   // Back / Select
            9  => RaVal::Btn(6),   // Start
            10 => RaVal::Btn(7),   // L3
            11 => RaVal::Btn(8),   // R3
            12 => RaVal::Btn(11),  // D-pad Up
            13 => RaVal::Btn(12),  // D-pad Down
            14 => RaVal::Btn(13),  // D-pad Left
            15 => RaVal::Btn(14),  // D-pad Right
            n  => RaVal::Btn(n),   // passthrough
        }
    }
}

impl EmulatorExporter for RetroArchExporter {
    fn emulator_name(&self) -> &str { "RetroArch" }
    fn file_extension(&self) -> &str { "cfg" }

    fn export(&self, bindings: &[ButtonBinding]) -> String {
        let mut lines = Vec::new();
        lines.push("# RetroArch input config — generated by Cubi Frontend".to_string());
        lines.push(format!("# Generated: {}", chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")));
        lines.push(String::new());
        lines.push(format!("input_joypad_driver = \"{}\"", self.driver));
        lines.push(r#"input_player1_joypad_index = "0""#.to_string());
        // Disable RetroArch's autoconfig system so our manual bindings are not
        // silently overwritten when the controller is connected at startup.
        lines.push(r#"input_autoconfig_enable = "false""#.to_string());
        lines.push(String::new());

        let translate: fn(i32) -> RaVal = if self.driver == "sdl2" {
            Self::webapi_to_sdl2
        } else {
            Self::webapi_to_xinput
        };

        for b in bindings {
            if b.button_index < 0 { continue; }  // unbound
            if let Some(base) = Self::ra_base(&b.action) {
                match translate(b.button_index) {
                    RaVal::Btn(n)  => lines.push(format!("{}_btn = \"{}\"",  base, n)),
                    RaVal::Hat(s)  => lines.push(format!("{}_btn = \"{}\"",  base, s)),
                    RaVal::Axis(v) => lines.push(format!("{}_axis = \"{}\"", base, v)),
                }
            }
        }
        lines.push(String::new());
        lines.join("\n")
    }
}
