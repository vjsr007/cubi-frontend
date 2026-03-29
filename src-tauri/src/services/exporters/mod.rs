pub mod retroarch;
pub mod dolphin;
pub mod pcsx2;
pub mod duckstation;
pub mod generic_json;

use crate::models::ButtonBinding;

// ── Strategy trait ──────────────────────────────────────────────────────────

/// Strategy pattern: each emulator implements this to convert our canonical
/// bindings into its own config-file format.
pub trait EmulatorExporter: Send + Sync {
    /// Human-readable name of the target emulator.
    fn emulator_name(&self) -> &str;
    /// File extension for the config file (e.g. "cfg", "ini", "json").
    fn file_extension(&self) -> &str;
    /// Convert bindings → emulator-specific config string.
    fn export(&self, bindings: &[ButtonBinding]) -> String;
}

// Re-export concrete exporters for convenience
pub use retroarch::RetroArchExporter;
pub use dolphin::DolphinExporter;
pub use pcsx2::Pcsx2Exporter;
pub use duckstation::DuckStationExporter;
pub use generic_json::GenericJsonExporter;
