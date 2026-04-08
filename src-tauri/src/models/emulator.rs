use serde::{Deserialize, Serialize};

/// Represents an emulator that can be used for a system.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmulatorChoice {
    /// Name of the emulator (e.g., "RetroArch", "Citra", "Yuzu")
    pub emulator_name: String,
    /// Path where the emulator was detected (if installed)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detected_path: Option<String>,
    /// Whether the emulator is currently installed
    pub is_installed: bool,
}

/// Represents emulator choices available for a specific system.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemEmulatorChoice {
    /// System ID (e.g., "3ds", "switch")
    pub system_id: String,
    /// Human-readable system name (e.g., "Nintendo 3DS", "Nintendo Switch")
    pub system_name: String,
    /// List of emulators that can run this system
    pub available_emulators: Vec<EmulatorChoice>,
    /// Currently selected emulator for this system (if any)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected_emulator: Option<String>,
}
