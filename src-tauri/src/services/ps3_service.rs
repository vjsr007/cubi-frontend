/// PS3 game detection utilities.
///
/// PS3 games are stored as directory trees, not single files:
///   roms/ps3/
///     Game Title.ps3/          ← game root (folder with optional .ps3 ext)
///       PS3_GAME/
///         PARAM.SFO            ← binary file containing the game title
///         USRDIR/
///           EBOOT.BIN          ← main executable
///       PS3_UPDATE/
///       PS3_DISC.SFB
///
/// Some PSN-downloaded titles have a flat layout:
///   roms/ps3/
///     BLUS30001/
///       PARAM.SFO
///       EBOOT.BIN
///
/// PARAM.SFO binary format (little-endian):
///   [0..4]   Magic: 00 50 53 46 ('\0PSF')
///   [4..8]   Version (typically 0x00000101)
///   [8..12]  Key table offset
///   [12..16] Data table offset
///   [16..20] Entry count
///   Then `count` × 16-byte index entries:
///     [0..2]  key_offset (u16)
///     [2]     alignment  (u8)
///     [3]     data_type  (u8: 0x04 = integer, 0x02 = raw bytes, 0x04|0x200 = utf-8 string)
///     [4..8]  data_len   (u32, actual byte length)
///     [8..12] data_max   (u32, padded size)
///     [12..16] data_offset (u32, offset from data table start)
use std::path::{Path, PathBuf};

const SFO_MAGIC: &[u8; 4] = b"\x00PSF";
const SFO_TYPE_UTF8: u8 = 0x02; // data_type & 0x0F

/// Parse a PARAM.SFO file and return the value of the given key (e.g. "TITLE").
pub fn parse_sfo_key(sfo_path: &Path, target_key: &str) -> Option<String> {
    let data = std::fs::read(sfo_path).ok()?;
    if data.len() < 20 || &data[0..4] != SFO_MAGIC {
        return None;
    }

    let key_table_offset = u32::from_le_bytes(data[8..12].try_into().ok()?) as usize;
    let data_table_offset = u32::from_le_bytes(data[12..16].try_into().ok()?) as usize;
    let entry_count = u32::from_le_bytes(data[16..20].try_into().ok()?) as usize;

    for i in 0..entry_count {
        let entry_base = 20 + i * 16;
        if entry_base + 16 > data.len() {
            break;
        }
        let key_offset = u16::from_le_bytes(data[entry_base..entry_base + 2].try_into().ok()?) as usize;
        let data_type = data[entry_base + 3];
        let data_len = u32::from_le_bytes(data[entry_base + 4..entry_base + 8].try_into().ok()?) as usize;
        let data_offset = u32::from_le_bytes(data[entry_base + 12..entry_base + 16].try_into().ok()?) as usize;

        // Read key string (null-terminated)
        let key_abs = key_table_offset + key_offset;
        let key_end = data[key_abs..].iter().position(|&b| b == 0).map(|p| key_abs + p)?;
        let key = std::str::from_utf8(&data[key_abs..key_end]).ok()?;

        if key != target_key {
            continue;
        }

        // Only handle UTF-8 strings (type & 0x0F == 2)
        if data_type & 0x0F != SFO_TYPE_UTF8 {
            continue;
        }

        let val_abs = data_table_offset + data_offset;
        let val_end = val_abs + data_len;
        if val_end > data.len() {
            break;
        }
        // Strip null terminator if present
        let raw = &data[val_abs..val_end];
        let trimmed = raw.split(|&b| b == 0).next().unwrap_or(raw);
        return String::from_utf8(trimmed.to_vec()).ok();
    }
    None
}

/// Find a PARAM.SFO file starting from `eboot_path` and looking upward/sibling paths.
///
/// Checks in this order:
///   1. Same directory as EBOOT.BIN  (flat PSN layout)
///   2. Parent directory             (PS3_GAME/PARAM.SFO when inside USRDIR)
///   3. Grandparent/PS3_GAME/PARAM.SFO  (game_root/PS3_GAME/PARAM.SFO)
pub fn find_param_sfo(eboot_path: &Path) -> Option<PathBuf> {
    let candidates = [
        // Same dir (flat PSN layout: BLUS30001/EBOOT.BIN + BLUS30001/PARAM.SFO)
        eboot_path.parent().map(|p| p.join("PARAM.SFO")),
        // Parent dir (PS3_GAME/USRDIR/EBOOT.BIN → PS3_GAME/PARAM.SFO)
        eboot_path.parent().and_then(|p| p.parent()).map(|p| p.join("PARAM.SFO")),
        // Grandparent/PS3_GAME (game_root/PS3_GAME/USRDIR/EBOOT.BIN → grandparent/PS3_GAME/PARAM.SFO)
        eboot_path
            .parent()
            .and_then(|p| p.parent())
            .and_then(|p| p.parent())
            .map(|p| p.join("PS3_GAME").join("PARAM.SFO")),
    ];

    for candidate in &candidates {
        if let Some(ref path) = candidate {
            if path.exists() {
                return Some(path.clone());
            }
        }
    }
    None
}

/// Extract the game title from a PARAM.SFO near an EBOOT.BIN.
///
/// Returns `None` if no PARAM.SFO is found or the title field is missing.
pub fn title_from_eboot(eboot_path: &Path) -> Option<String> {
    let sfo = find_param_sfo(eboot_path)?;
    parse_sfo_key(&sfo, "TITLE")
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
}

/// Derive a human-readable game title from a PS3 game directory name.
///
/// Strips the `.ps3` extension if present and replaces underscores/hyphens with spaces.
/// E.g. "Uncharted_2.ps3" → "Uncharted 2", "BLUS30001" → "BLUS30001 (PS3)"
pub fn title_from_game_dir(game_dir: &Path) -> String {
    let raw = game_dir
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown");

    // Strip .ps3 / .PS3 extension
    let stripped = if raw.to_lowercase().ends_with(".ps3") {
        &raw[..raw.len() - 4]
    } else {
        raw
    };

    // Replace underscores and hyphens with spaces
    let cleaned = stripped.replace('_', " ").replace('-', " ");

    // If it looks like a bare game ID (all uppercase letters + digits, ≤ 9 chars), keep as-is
    if cleaned.len() <= 9 && cleaned.chars().all(|c| c.is_ascii_alphanumeric() || c == ' ') {
        return cleaned;
    }

    cleaned
}
