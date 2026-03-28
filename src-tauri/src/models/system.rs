use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub id: String,
    pub name: String,
    pub full_name: String,
    pub extensions: Vec<String>,
    pub game_count: u32,
    pub rom_path: String,
    pub icon: Option<String>,
}

/// Static system definition used during scanning
#[derive(Debug, Clone)]
pub struct SystemDef {
    pub id: &'static str,
    pub name: &'static str,
    pub full_name: &'static str,
    pub extensions: &'static [&'static str],
    pub folder_names: &'static [&'static str],
}

pub fn get_system_registry() -> Vec<SystemDef> {
    vec![
        SystemDef {
            id: "nes",
            name: "NES",
            full_name: "Nintendo Entertainment System",
            extensions: &["nes", "fds", "unf", "zip", "7z"],
            folder_names: &["nes", "famicom", "nintendo"],
        },
        SystemDef {
            id: "snes",
            name: "SNES",
            full_name: "Super Nintendo Entertainment System",
            extensions: &["sfc", "smc", "fig", "bs", "zip", "7z"],
            folder_names: &["snes", "supernes", "supernintendo", "superfamicom"],
        },
        SystemDef {
            id: "n64",
            name: "N64",
            full_name: "Nintendo 64",
            extensions: &["n64", "z64", "v64", "zip", "7z"],
            folder_names: &["n64", "nintendo64"],
        },
        SystemDef {
            id: "gb",
            name: "Game Boy",
            full_name: "Nintendo Game Boy",
            extensions: &["gb", "sgb", "zip", "7z"],
            folder_names: &["gb", "gameboy"],
        },
        SystemDef {
            id: "gbc",
            name: "GBC",
            full_name: "Nintendo Game Boy Color",
            extensions: &["gbc", "zip", "7z"],
            folder_names: &["gbc", "gameboycolor"],
        },
        SystemDef {
            id: "gba",
            name: "GBA",
            full_name: "Nintendo Game Boy Advance",
            extensions: &["gba", "zip", "7z"],
            folder_names: &["gba", "gameboyadvance"],
        },
        SystemDef {
            id: "nds",
            name: "Nintendo DS",
            full_name: "Nintendo DS",
            extensions: &["nds", "zip", "7z"],
            folder_names: &["nds", "nintendods", "ds"],
        },
        SystemDef {
            id: "gamecube",
            name: "GameCube",
            full_name: "Nintendo GameCube",
            extensions: &["iso", "rvz", "gcz", "wbfs", "ciso"],
            folder_names: &["gamecube", "gc", "ngc"],
        },
        SystemDef {
            id: "wii",
            name: "Wii",
            full_name: "Nintendo Wii",
            extensions: &["iso", "rvz", "gcz", "wbfs", "ciso", "wad"],
            folder_names: &["wii"],
        },
        SystemDef {
            id: "wiiu",
            name: "Wii U",
            full_name: "Nintendo Wii U",
            extensions: &["rpx", "wud", "wux", "iso"],
            folder_names: &["wiiu", "wii-u"],
        },
        SystemDef {
            id: "switch",
            name: "Switch",
            full_name: "Nintendo Switch",
            extensions: &["nsp", "xci", "nro"],
            folder_names: &["switch", "nswitch"],
        },
        SystemDef {
            id: "ps1",
            name: "PS1",
            full_name: "Sony PlayStation",
            extensions: &["cue", "bin", "iso", "chd", "pbp", "mds", "mdf"],
            folder_names: &["ps1", "psx", "playstation", "playstation1"],
        },
        SystemDef {
            id: "ps2",
            name: "PS2",
            full_name: "Sony PlayStation 2",
            extensions: &["iso", "chd", "cso", "gz"],
            folder_names: &["ps2", "playstation2"],
        },
        SystemDef {
            id: "ps3",
            name: "PS3",
            full_name: "Sony PlayStation 3",
            extensions: &["iso", "pkg"],
            folder_names: &["ps3", "playstation3"],
        },
        SystemDef {
            id: "psp",
            name: "PSP",
            full_name: "Sony PlayStation Portable",
            extensions: &["iso", "cso", "pbp", "chd"],
            folder_names: &["psp", "playstationportable"],
        },
        SystemDef {
            id: "genesis",
            name: "Genesis",
            full_name: "Sega Genesis / Mega Drive",
            extensions: &["md", "bin", "gen", "smd", "zip", "7z"],
            folder_names: &["genesis", "megadrive", "sega-genesis", "sega-megadrive"],
        },
        SystemDef {
            id: "mastersystem",
            name: "Master System",
            full_name: "Sega Master System",
            extensions: &["sms", "zip", "7z"],
            folder_names: &["mastersystem", "sms"],
        },
        SystemDef {
            id: "saturn",
            name: "Saturn",
            full_name: "Sega Saturn",
            extensions: &["cue", "iso", "mdf", "chd"],
            folder_names: &["saturn", "segasaturn"],
        },
        SystemDef {
            id: "dreamcast",
            name: "Dreamcast",
            full_name: "Sega Dreamcast",
            extensions: &["cdi", "iso", "chd", "gdi"],
            folder_names: &["dreamcast", "dc"],
        },
        SystemDef {
            id: "xbox",
            name: "Xbox",
            full_name: "Microsoft Xbox",
            extensions: &["iso", "xbe"],
            folder_names: &["xbox"],
        },
        SystemDef {
            id: "arcade",
            name: "Arcade",
            full_name: "Arcade (MAME)",
            extensions: &["zip", "7z", "chd"],
            folder_names: &["arcade", "mame", "fba"],
        },
    ]
}
