pub mod retroarch;
pub mod dolphin;
pub mod pcsx2;
pub mod duckstation;
pub mod ppsspp;
pub mod rpcs3;
pub mod xemu;
pub mod ryujinx;
pub mod ruffle;

use std::collections::HashMap;

pub use retroarch::RetroArchConfigWriter;
pub use dolphin::DolphinConfigWriter;
pub use pcsx2::Pcsx2ConfigWriter;
pub use duckstation::DuckStationConfigWriter;
pub use ppsspp::PpssppConfigWriter;
pub use rpcs3::Rpcs3ConfigWriter;
pub use xemu::XemuConfigWriter;
pub use ryujinx::RyujinxConfigWriter;
pub use ruffle::RuffleConfigWriter;

/// Strategy trait: each emulator implements this to generate its native config format.
pub trait EmulatorConfigWriter: Send + Sync {
    /// Emulator display name (e.g. "RetroArch").
    fn emulator_name(&self) -> &str;
    /// Config file format extension (e.g. "cfg", "ini", "yml", "json", "toml").
    fn config_format(&self) -> &str;
    /// Which canonical setting keys this emulator supports.
    fn supported_settings(&self) -> Vec<&str>;
    /// Default config file path, if known.
    fn default_config_path(&self) -> Option<String>;
    /// Generate a preview of the config snippet using the given canonical settings.
    fn preview_config(&self, settings: &HashMap<String, String>) -> String;
}
