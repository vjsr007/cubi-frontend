use std::collections::HashMap;
use std::path::Path;
use std::io::Read;
use quick_xml::events::Event;
use quick_xml::Reader;


use crate::db::Database;
use crate::models::{CatalogGame, CatalogSync, CatalogConfig};

// ── No-Intro XML Parser ─────────────────────────────────────────────────

/// Parse a No-Intro DAT file (XML format) and return catalog game entries.
///
/// Expected format:
/// ```xml
/// <datafile>
///   <header>
///     <name>Nintendo - Super Nintendo Entertainment System</name>
///     <version>20260315-091234</version>
///   </header>
///   <game name="Chrono Trigger (USA)">
///     <rom name="Chrono Trigger (USA).sfc" size="4194304"
///          crc="2D5B6A24" md5="..." sha1="DA12F20..." />
///   </game>
/// </datafile>
/// ```
pub fn parse_nointro_dat(file_path: &Path, system_id: &str) -> Result<(Vec<CatalogGame>, String, String), String> {
    let content = std::fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read DAT file: {}", e))?;

    let mut reader = Reader::from_str(&content);
    reader.config_mut().trim_text(true);

    let mut games: Vec<CatalogGame> = Vec::new();
    let mut dat_name = String::new();
    let mut dat_version = String::new();

    let mut in_header = false;
    let mut in_game = false;
    let mut current_tag = String::new();
    let mut buf_text = String::new();
    let mut game_name = String::new();

    loop {
        match reader.read_event() {
            Ok(Event::Start(ref e)) => {
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                match tag.as_str() {
                    "header" => in_header = true,
                    "game" => {
                        in_game = true;
                        game_name.clear();
                        for attr in e.attributes().flatten() {
                            if attr.key.as_ref() == b"name" {
                                game_name = String::from_utf8_lossy(&attr.value).to_string();
                            }
                        }
                    }
                    _ => {}
                }
                if in_header || in_game {
                    current_tag = tag;
                    buf_text.clear();
                }
            }
            Ok(Event::Empty(ref e)) => {
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                if in_game && tag == "rom" {
                    let mut rom_name = String::new();
                    let mut rom_size: Option<u64> = None;
                    let mut rom_crc = None;
                    let mut rom_md5 = None;
                    let mut rom_sha1 = None;

                    for attr in e.attributes().flatten() {
                        let key = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                        let val = String::from_utf8_lossy(&attr.value).to_string();
                        match key.as_str() {
                            "name" => rom_name = val,
                            "size" => rom_size = val.parse().ok(),
                            "crc" => rom_crc = Some(val),
                            "md5" => rom_md5 = Some(val),
                            "sha1" => rom_sha1 = Some(val),
                            _ => {}
                        }
                    }

                    if !rom_name.is_empty() {
                        let title = if !game_name.is_empty() { game_name.clone() } else { rom_name.clone() };
                        let region = extract_region(&title);
                        let id = make_catalog_id(system_id, &dat_name, &rom_name);

                        games.push(CatalogGame {
                            id,
                            system_id: system_id.to_string(),
                            title,
                            region,
                            sha1: rom_sha1,
                            md5: rom_md5,
                            crc32: rom_crc,
                            file_size: rom_size,
                            file_name: rom_name,
                            dat_name: dat_name.clone(),
                            owned: false,
                            owned_game_id: None,
                        });
                    }
                }
            }
            Ok(Event::Text(ref e)) => {
                if (in_header || in_game) && !current_tag.is_empty() {
                    if let Ok(text) = e.unescape() {
                        buf_text.push_str(&text);
                    }
                }
            }
            Ok(Event::End(ref e)) => {
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                match tag.as_str() {
                    "header" => in_header = false,
                    "game" => in_game = false,
                    _ => {}
                }
                if in_header {
                    let text = buf_text.trim().to_string();
                    match current_tag.as_str() {
                        "name" => dat_name = text,
                        "version" => dat_version = text,
                        _ => {}
                    }
                }
                current_tag.clear();
                buf_text.clear();
            }
            Ok(Event::Eof) => break,
            Err(e) => {
                log::warn!("XML parse error in DAT file: {}", e);
                break;
            }
            _ => {}
        }
    }

    // Backfill dat_name on all games (it was empty during early parsing)
    if !dat_name.is_empty() {
        for g in &mut games {
            if g.dat_name.is_empty() {
                g.dat_name = dat_name.clone();
                g.id = make_catalog_id(system_id, &dat_name, &g.file_name);
            }
        }
    }

    log::info!("Parsed No-Intro DAT: {} — {} entries, version {}", dat_name, games.len(), dat_version);
    Ok((games, dat_name, dat_version))
}

// ── Redump ClrMamePro Text Format Parser ─────────────────────────────

/// Parse a Redump DAT file (ClrMamePro text format).
///
/// Expected format:
/// ```text
/// clrmamepro (
///     name "Sony - PlayStation"
///     version "20260320"
/// )
/// game (
///     name "Final Fantasy VII (USA) (Disc 1)"
///     rom ( name "Final Fantasy VII (USA) (Disc 1).bin" size 734003200 crc ABCD1234 md5 ... sha1 ... )
/// )
/// ```
pub fn parse_redump_dat(file_path: &Path, system_id: &str) -> Result<(Vec<CatalogGame>, String, String), String> {
    let content = std::fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read DAT file: {}", e))?;

    let mut games: Vec<CatalogGame> = Vec::new();
    let mut dat_name = String::new();
    let mut dat_version = String::new();

    let mut in_header = false;
    let mut in_game = false;
    let mut in_rom = false;
    let mut game_name = String::new();

    // Multi-line rom block state
    let mut rom_name = String::new();
    let mut rom_size: Option<u64> = None;
    let mut rom_crc: Option<String> = None;
    let mut rom_md5: Option<String> = None;
    let mut rom_sha1: Option<String> = None;

    for line in content.lines() {
        let trimmed = line.trim();

        // Detect blocks
        if trimmed.starts_with("clrmamepro (") || trimmed == "clrmamepro (" {
            in_header = true;
            continue;
        }
        if trimmed.starts_with("game (") || trimmed == "game (" {
            in_game = true;
            game_name.clear();
            continue;
        }

        // Closing paren — close innermost open block
        if trimmed == ")" {
            if in_rom {
                // Finish multi-line rom block
                if !rom_name.is_empty() {
                    let title = if !game_name.is_empty() { game_name.clone() } else { rom_name.clone() };
                    let region = extract_region(&title);
                    let id = make_catalog_id(system_id, &dat_name, &rom_name);
                    games.push(CatalogGame {
                        id,
                        system_id: system_id.to_string(),
                        title,
                        region,
                        sha1: rom_sha1.take(),
                        md5: rom_md5.take(),
                        crc32: rom_crc.take(),
                        file_size: rom_size.take(),
                        file_name: rom_name.clone(),
                        dat_name: dat_name.clone(),
                        owned: false,
                        owned_game_id: None,
                    });
                }
                rom_name.clear();
                in_rom = false;
            } else {
                in_header = false;
                in_game = false;
            }
            continue;
        }

        if in_header {
            if let Some(val) = extract_quoted_value(trimmed, "name") {
                dat_name = val;
            } else if let Some(val) = extract_quoted_value(trimmed, "version") {
                dat_version = val;
            }
        }

        if in_rom {
            // Collect fields from multi-line rom block
            if let Some(val) = extract_quoted_value(trimmed, "name") {
                rom_name = val;
            } else if trimmed.starts_with("name ") {
                rom_name = trimmed.strip_prefix("name ").unwrap_or("").trim().to_string();
            }
            if let Some(val) = extract_quoted_value(trimmed, "size") {
                rom_size = val.parse().ok();
            } else if trimmed.starts_with("size ") {
                rom_size = trimmed.strip_prefix("size ").unwrap_or("").trim().parse().ok();
            }
            if let Some(val) = extract_quoted_value(trimmed, "crc") {
                rom_crc = Some(val);
            } else if trimmed.starts_with("crc ") {
                rom_crc = Some(trimmed.strip_prefix("crc ").unwrap_or("").trim().to_string());
            }
            if let Some(val) = extract_quoted_value(trimmed, "md5") {
                rom_md5 = Some(val);
            } else if trimmed.starts_with("md5 ") {
                rom_md5 = Some(trimmed.strip_prefix("md5 ").unwrap_or("").trim().to_string());
            }
            if let Some(val) = extract_quoted_value(trimmed, "sha1") {
                rom_sha1 = Some(val);
            } else if trimmed.starts_with("sha1 ") {
                rom_sha1 = Some(trimmed.strip_prefix("sha1 ").unwrap_or("").trim().to_string());
            }
            continue;
        }

        if in_game {
            if let Some(val) = extract_quoted_value(trimmed, "name") {
                game_name = val;
            }
            // Single-line rom: rom ( name "file.bin" size 12345 crc ABCD md5 ... sha1 ... )
            if (trimmed.starts_with("rom (") || trimmed.starts_with("rom(")) && trimmed.ends_with(')') {
                if let Some(rom) = parse_rom_line(trimmed, system_id, &dat_name, &game_name) {
                    games.push(rom);
                }
            }
            // Multi-line rom block start
            else if trimmed.starts_with("rom (") || trimmed == "rom (" || trimmed.starts_with("rom(") {
                in_rom = true;
                rom_name.clear();
                rom_size = None;
                rom_crc = None;
                rom_md5 = None;
                rom_sha1 = None;
            }
        }
    }

    log::info!("Parsed Redump DAT: {} — {} entries, version {}", dat_name, games.len(), dat_version);
    Ok((games, dat_name, dat_version))
}

/// Parse a single `rom ( ... )` line from ClrMamePro format
fn parse_rom_line(line: &str, system_id: &str, dat_name: &str, game_name: &str) -> Option<CatalogGame> {
    // Extract content between ( and )
    let inner = line.trim().strip_prefix("rom")?.trim()
        .strip_prefix('(')?.strip_suffix(')')?.trim();

    let mut rom_name = String::new();
    let mut rom_size: Option<u64> = None;
    let mut rom_crc = None;
    let mut rom_md5 = None;
    let mut rom_sha1 = None;

    // Simple state-machine parser for space-separated key-value pairs where values may be quoted
    let mut chars = inner.chars().peekable();
    loop {
        // Skip whitespace
        while chars.peek().map_or(false, |c| c.is_whitespace()) { chars.next(); }
        if chars.peek().is_none() { break; }

        // Read key
        let mut key = String::new();
        while chars.peek().map_or(false, |c| !c.is_whitespace()) {
            key.push(chars.next().unwrap());
        }

        // Skip whitespace
        while chars.peek().map_or(false, |c| c.is_whitespace()) { chars.next(); }

        // Read value (may be quoted)
        let value = if chars.peek() == Some(&'"') {
            chars.next(); // skip opening quote
            let mut v = String::new();
            while chars.peek().map_or(false, |c| *c != '"') {
                v.push(chars.next().unwrap());
            }
            chars.next(); // skip closing quote
            v
        } else {
            let mut v = String::new();
            while chars.peek().map_or(false, |c| !c.is_whitespace()) {
                v.push(chars.next().unwrap());
            }
            v
        };

        match key.as_str() {
            "name" => rom_name = value,
            "size" => rom_size = value.parse().ok(),
            "crc" => rom_crc = Some(value),
            "md5" => rom_md5 = Some(value),
            "sha1" => rom_sha1 = Some(value),
            _ => {}
        }
    }

    if rom_name.is_empty() { return None; }

    let title = if !game_name.is_empty() { game_name.to_string() } else { rom_name.clone() };
    let region = extract_region(&title);
    let id = make_catalog_id(system_id, dat_name, &rom_name);

    Some(CatalogGame {
        id,
        system_id: system_id.to_string(),
        title,
        region,
        sha1: rom_sha1,
        md5: rom_md5,
        crc32: rom_crc,
        file_size: rom_size,
        file_name: rom_name,
        dat_name: dat_name.to_string(),
        owned: false,
        owned_game_id: None,
    })
}

/// Extract a quoted value for a key from a line like: `name "Some Value"`
fn extract_quoted_value(line: &str, key: &str) -> Option<String> {
    let trimmed = line.trim();
    if !trimmed.starts_with(key) { return None; }
    let rest = trimmed[key.len()..].trim();
    if rest.starts_with('"') && rest.ends_with('"') && rest.len() >= 2 {
        Some(rest[1..rest.len()-1].to_string())
    } else {
        None
    }
}

// ── Helpers ──────────────────────────────────────────────────────────

/// Create a deterministic ID from system_id + dat_name + file_name
fn make_catalog_id(system_id: &str, dat_name: &str, file_name: &str) -> String {
    let mut hasher = blake3::Hasher::new();
    hasher.update(system_id.as_bytes());
    hasher.update(b"|");
    hasher.update(dat_name.as_bytes());
    hasher.update(b"|");
    hasher.update(file_name.as_bytes());
    hasher.finalize().to_hex().to_string()
}

/// Extract region tag from a game title, e.g. "Chrono Trigger (USA)" -> "USA"
fn extract_region(title: &str) -> String {
    // Look for the last parenthesized segment containing a known region
    let known_regions = [
        "USA", "Europe", "Japan", "World", "Brazil", "Korea", "China",
        "France", "Germany", "Spain", "Italy", "Australia", "Netherlands",
        "Sweden", "Canada", "Asia", "Taiwan", "Hong Kong", "Russia",
    ];

    // Find all parenthesized segments
    let mut regions = Vec::new();
    for cap in title.match_indices('(') {
        if let Some(end) = title[cap.0..].find(')') {
            let content = &title[cap.0+1..cap.0+end];
            // Check if it contains any known region
            for region in &known_regions {
                if content.contains(region) {
                    regions.push(content.to_string());
                    break;
                }
            }
        }
    }

    regions.last().cloned().unwrap_or_default()
}

/// Normalize a filename stem for fuzzy matching:
/// - Remove file extension
/// - Remove region tags like (USA), (Europe)
/// - Remove revision info like (Rev 1), (v1.1)
/// - Remove articles like "The ", "A "
/// - Lowercase + trim
fn normalize_stem(file_name: &str) -> String {
    let stem = Path::new(file_name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(file_name);

    let mut s = stem.to_string();

    // Remove parenthesized content (region, revision, etc.)
    while let Some(start) = s.find('(') {
        if let Some(end) = s[start..].find(')') {
            s = format!("{}{}", &s[..start], &s[start+end+1..]);
        } else {
            break;
        }
    }
    // Remove bracket content [!], [b], etc.
    while let Some(start) = s.find('[') {
        if let Some(end) = s[start..].find(']') {
            s = format!("{}{}", &s[..start], &s[start+end+1..]);
        } else {
            break;
        }
    }

    s = s.to_lowercase();
    // Remove leading articles
    for article in &["the ", "a ", "an "] {
        if s.starts_with(article) {
            s = s[article.len()..].to_string();
        }
    }
    s.trim().to_string()
}

/// Normalize a game title for fuzzy matching:
/// - Remove region tags like (USA), (Europe), (XBLA), (Addon)
/// - Remove revision info like (Rev 1), (v1.1)
/// - Remove articles like "The ", "A "
/// - Remove punctuation: colons, dashes, apostrophes
/// - Lowercase + collapse whitespace
fn normalize_title(title: &str) -> String {
    let mut s = title.to_string();

    // Remove parenthesized content (region, revision, etc.)
    while let Some(start) = s.find('(') {
        if let Some(end) = s[start..].find(')') {
            s = format!("{}{}", &s[..start], &s[start+end+1..]);
        } else {
            break;
        }
    }
    // Remove bracket content [!], [b], etc.
    while let Some(start) = s.find('[') {
        if let Some(end) = s[start..].find(']') {
            s = format!("{}{}", &s[..start], &s[start+end+1..]);
        } else {
            break;
        }
    }

    s = s.to_lowercase();
    // Remove common punctuation for fuzzy matching
    s = s.replace([':', '-', '\'', '.', '!', '?', ',', '&'], " ");
    // Remove leading articles
    let s_trimmed = s.trim().to_string();
    let s_no_article = s_trimmed.strip_prefix("the ")
        .or_else(|| s_trimmed.strip_prefix("a "))
        .or_else(|| s_trimmed.strip_prefix("an "))
        .unwrap_or(&s_trimmed)
        .to_string();
    // Collapse multiple spaces
    s_no_article.split_whitespace().collect::<Vec<_>>().join(" ")
}

// ── Ownership Matching ──────────────────────────────────────────────

/// Match catalog games against the user's actual games for a system.
/// Returns Vec<(catalog_game_id, owned_game_id)> for matches found.
pub fn match_ownership(
    db: &Database,
    system_id: &str,
) -> Result<Vec<(String, String)>, String> {
    // Get user's games for this system (id, file_name, title)
    let user_games = db.get_game_info_for_system(system_id)
        .map_err(|e| format!("Failed to get user games: {}", e))?;

    log::info!(
        "Ownership matching for '{}': {} user games in library",
        system_id, user_games.len()
    );

    if user_games.is_empty() {
        log::info!("No user games found for system '{}' — ownership will be 0", system_id);
        return Ok(Vec::new());
    }

    // Get all catalog games for this system
    let filter = crate::models::CatalogFilter {
        system_id: system_id.to_string(),
        status: None,
        region: None,
        search: None,
        page: 1,
        page_size: 100_000, // Get all
    };
    let catalog_page = db.get_catalog_games(&filter)
        .map_err(|e| format!("Failed to get catalog games: {}", e))?;

    // Build lookup maps for user games
    let mut exact_map: HashMap<String, String> = HashMap::new(); // file_name -> game_id
    let mut normalized_map: HashMap<String, String> = HashMap::new(); // normalized_stem -> game_id
    let mut title_map: HashMap<String, String> = HashMap::new(); // normalized_title -> game_id
    for (game_id, file_name, title) in &user_games {
        exact_map.insert(file_name.clone(), game_id.clone());
        normalized_map.insert(normalize_stem(file_name), game_id.clone());
        let norm_title = normalize_title(title);
        if !norm_title.is_empty() {
            title_map.insert(norm_title, game_id.clone());
        }
    }

    // Log sample user titles for debugging
    for (_, _, title) in user_games.iter().take(5) {
        log::debug!("  User game title: '{}' → normalized: '{}'", title, normalize_title(title));
    }

    let mut matches: Vec<(String, String)> = Vec::new();
    let mut match_exact = 0u32;
    let mut match_stem = 0u32;
    let mut match_title = 0u32;

    for cat_game in &catalog_page.games {
        // 1) Exact filename match
        if let Some(game_id) = exact_map.get(&cat_game.file_name) {
            matches.push((cat_game.id.clone(), game_id.clone()));
            match_exact += 1;
            continue;
        }
        // 2) Normalized stem match (fallback)
        let cat_stem = normalize_stem(&cat_game.file_name);
        if let Some(game_id) = normalized_map.get(&cat_stem) {
            matches.push((cat_game.id.clone(), game_id.clone()));
            match_stem += 1;
            continue;
        }
        // 3) Normalized title match (for systems like Xbox 360 where DAT filenames are hashes)
        let cat_title = normalize_title(&cat_game.title);
        if !cat_title.is_empty() {
            if let Some(game_id) = title_map.get(&cat_title) {
                matches.push((cat_game.id.clone(), game_id.clone()));
                match_title += 1;
            }
        }
    }

    log::info!(
        "Ownership results for '{}': {} total matches (exact={}, stem={}, title={}), from {} catalog entries",
        system_id, matches.len(), match_exact, match_stem, match_title, catalog_page.games.len()
    );

    Ok(matches)
}

/// Import a DAT file (auto-detect format) and update the database
pub fn import_dat_file(
    db: &Database,
    system_id: &str,
    file_path: &str,
) -> Result<CatalogSync, String> {
    let path = Path::new(file_path);
    if !path.exists() {
        return Err(format!("DAT file not found: {}", file_path));
    }

    // Try No-Intro XML first, fall back to Redump text
    let (games, dat_name, dat_version) = match parse_nointro_dat(path, system_id) {
        Ok(result) if !result.0.is_empty() => result,
        _ => parse_redump_dat(path, system_id)?,
    };

    if games.is_empty() {
        return Err("No games found in DAT file".to_string());
    }

    let dat_name = if dat_name.is_empty() {
        path.file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string()
    } else {
        dat_name
    };

    // Deduplicate games by ID (MAME DATs can have shared ROMs across parent/clone sets)
    let mut seen = std::collections::HashSet::new();
    let games: Vec<CatalogGame> = games.into_iter().filter(|g| seen.insert(g.id.clone())).collect();

    // Bulk insert
    db.bulk_insert_catalog_games(system_id, &dat_name, &games)
        .map_err(|e| format!("Failed to insert catalog games: {}", e))?;

    // Run ownership matching
    let ownership_matches = match_ownership(db, system_id)?;
    let owned_count = db.update_catalog_ownership(system_id, &ownership_matches)
        .map_err(|e| format!("Failed to update ownership: {}", e))?;

    log::info!(
        "Imported {} catalog entries for {} ({} owned, DAT: {})",
        games.len(), system_id, owned_count, dat_name
    );

    let sync = CatalogSync {
        system_id: system_id.to_string(),
        dat_name: dat_name.clone(),
        dat_version,
        entry_count: games.len() as u32,
        last_synced: chrono::Utc::now().to_rfc3339(),
        source_url: None,
    };

    db.upsert_catalog_sync(&sync)
        .map_err(|e| format!("Failed to save sync metadata: {}", e))?;

    Ok(sync)
}

/// Refresh ownership matching for one or all systems
pub fn refresh_ownership(
    db: &Database,
    system_id: Option<&str>,
) -> Result<u32, String> {
    let system_ids = if let Some(sid) = system_id {
        vec![sid.to_string()]
    } else {
        db.get_catalog_system_ids()
            .map_err(|e| format!("Failed to get catalog systems: {}", e))?
    };

    let mut total_matched = 0u32;
    for sid in &system_ids {
        let matches = match_ownership(db, sid)?;
        let count = db.update_catalog_ownership(sid, &matches)
            .map_err(|e| format!("Failed to update ownership for {}: {}", sid, e))?;
        total_matched += count;
    }

    log::info!("Refreshed catalog ownership: {} matches across {} systems", total_matched, system_ids.len());
    Ok(total_matched)
}

/// Get catalog config from the app config
pub fn get_catalog_config() -> Result<CatalogConfig, String> {
    let config = crate::services::config_service::load_config()
        .map_err(|e| format!("Failed to load config: {}", e))?;
    Ok(config.catalog)
}

/// Set a download URL for a specific system in the catalog config
pub fn set_download_url(system_id: &str, url: &str) -> Result<(), String> {
    let mut config = crate::services::config_service::load_config()
        .map_err(|e| format!("Failed to load config: {}", e))?;
    config.catalog.download_urls.insert(system_id.to_string(), url.to_string());
    crate::services::config_service::save_config(&config)
        .map_err(|e| format!("Failed to save config: {}", e))?;
    Ok(())
}

// ── DAT Download + Sync ─────────────────────────────────────────────

/// Download a DAT file from a URL, extract if ZIP, and import into the catalog.
/// Returns the CatalogSync result after import.
pub async fn download_and_import_dat(
    db: &Database,
    system_id: &str,
    url: &str,
) -> Result<CatalogSync, String> {
    log::info!("Downloading DAT for {} from {}", system_id, url);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .user_agent("cubi-frontend/0.9")
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let resp = client.get(url).send().await
        .map_err(|e| format!("Download failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("HTTP error {}: {}", resp.status().as_u16(), url));
    }

    let bytes = resp.bytes().await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    if bytes.is_empty() {
        return Err("Downloaded file is empty".to_string());
    }

    // 50 MB limit
    if bytes.len() > 50 * 1024 * 1024 {
        return Err(format!("Downloaded file too large: {} MB", bytes.len() / 1024 / 1024));
    }

    log::info!("Downloaded {} bytes for {}", bytes.len(), system_id);

    // Determine if it's a ZIP (magic bytes PK\x03\x04)
    let dat_content = if bytes.len() >= 4 && bytes[0] == 0x50 && bytes[1] == 0x4B && bytes[2] == 0x03 && bytes[3] == 0x04 {
        extract_dat_from_zip(&bytes)?
    } else {
        // Assume it's a raw DAT/XML file
        String::from_utf8(bytes.to_vec())
            .map_err(|e| format!("DAT file is not valid UTF-8: {}", e))?
    };

    // Write to temp file for import
    let temp_dir = std::env::temp_dir();
    let temp_file = temp_dir.join(format!("cubi_dat_{}_{}.dat", system_id, chrono::Utc::now().timestamp()));
    std::fs::write(&temp_file, &dat_content)
        .map_err(|e| format!("Failed to write temp DAT file: {}", e))?;

    // Import using existing logic
    let result = import_dat_file(db, system_id, temp_file.to_str().unwrap_or(""));

    // Clean up temp file
    let _ = std::fs::remove_file(&temp_file);

    result
}

/// Extract the first .dat or .xml file from a ZIP archive
fn extract_dat_from_zip(zip_bytes: &[u8]) -> Result<String, String> {
    let cursor = std::io::Cursor::new(zip_bytes);
    let mut archive = zip::ZipArchive::new(cursor)
        .map_err(|e| format!("Failed to open ZIP: {}", e))?;

    // Look for .dat or .xml files
    let dat_extensions = ["dat", "xml"];
    let mut best_name: Option<String> = None;

    for i in 0..archive.len() {
        let file = archive.by_index(i)
            .map_err(|e| format!("Failed to read ZIP entry: {}", e))?;
        let name = file.name().to_string();
        if let Some(ext) = Path::new(&name).extension().and_then(|e| e.to_str()) {
            if dat_extensions.contains(&ext.to_lowercase().as_str()) {
                best_name = Some(name);
                break;
            }
        }
    }

    let file_name = best_name.ok_or_else(|| "No .dat or .xml file found in ZIP".to_string())?;

    let mut file = archive.by_name(&file_name)
        .map_err(|e| format!("Failed to extract '{}': {}", file_name, e))?;

    let mut content = String::new();
    file.read_to_string(&mut content)
        .map_err(|e| format!("Failed to read '{}' from ZIP: {}", file_name, e))?;

    log::info!("Extracted '{}' from ZIP ({} bytes)", file_name, content.len());
    Ok(content)
}

/// Get the default DAT download URLs for known systems.
/// Maps system_id -> recommended download URL.
pub fn get_default_dat_urls() -> HashMap<String, String> {
    // These map to the well-known No-Intro and Redump DAT naming conventions.
    // Users can override with their own URLs via set_download_url().
    // Source: libretro-database GitHub repository (raw content URLs).
    let nointro = "https://raw.githubusercontent.com/libretro/libretro-database/master/metadat/no-intro";
    let dat = "https://raw.githubusercontent.com/libretro/libretro-database/master/dat";
    let mame_dir = "https://raw.githubusercontent.com/libretro/libretro-database/master/metadat/mame";
    let fbneo_dir = "https://raw.githubusercontent.com/libretro/libretro-database/master/metadat/fbneo-split";
    let redump = "https://raw.githubusercontent.com/libretro/libretro-database/master/metadat/redump";
    let mut urls: HashMap<String, String> = HashMap::new();

    // No-Intro (cartridge-based systems) — from metadat/no-intro/
    urls.insert("nes".into(), format!("{}/Nintendo - Nintendo Entertainment System.dat", nointro));
    urls.insert("snes".into(), format!("{}/Nintendo - Super Nintendo Entertainment System.dat", nointro));
    urls.insert("n64".into(), format!("{}/Nintendo - Nintendo 64.dat", nointro));
    urls.insert("gb".into(), format!("{}/Nintendo - Game Boy.dat", nointro));
    urls.insert("gbc".into(), format!("{}/Nintendo - Game Boy Color.dat", nointro));
    urls.insert("gba".into(), format!("{}/Nintendo - Game Boy Advance.dat", nointro));
    urls.insert("nds".into(), format!("{}/Nintendo - Nintendo DS.dat", nointro));
    urls.insert("fds".into(), format!("{}/Nintendo - Family Computer Disk System.dat", nointro));
    urls.insert("3ds".into(), format!("{}/Nintendo - Nintendo 3DS.dat", nointro));
    urls.insert("genesis".into(), format!("{}/Sega - Mega Drive - Genesis.dat", nointro));
    urls.insert("megadrive".into(), format!("{}/Sega - Mega Drive - Genesis.dat", nointro));
    urls.insert("mastersystem".into(), format!("{}/Sega - Master System - Mark III.dat", nointro));
    urls.insert("gamegear".into(), format!("{}/Sega - Game Gear.dat", nointro));
    urls.insert("sg1000".into(), format!("{}/Sega - SG-1000.dat", nointro));
    urls.insert("atari2600".into(), format!("{}/Atari - 2600.dat", nointro));
    urls.insert("atari5200".into(), format!("{}/Atari - 5200.dat", nointro));
    urls.insert("atari7800".into(), format!("{}/Atari - 7800.dat", nointro));
    urls.insert("atarilynx".into(), format!("{}/Atari - Lynx.dat", nointro));
    urls.insert("atarijaguar".into(), format!("{}/Atari - Jaguar.dat", nointro));
    urls.insert("pcengine".into(), format!("{}/NEC - PC Engine - TurboGrafx 16.dat", nointro));
    urls.insert("ngpc".into(), format!("{}/SNK - Neo Geo Pocket Color.dat", nointro));
    urls.insert("wswan".into(), format!("{}/Bandai - WonderSwan.dat", nointro));
    urls.insert("wswanc".into(), format!("{}/Bandai - WonderSwan Color.dat", nointro));
    urls.insert("colecovision".into(), format!("{}/Coleco - ColecoVision.dat", nointro));
    urls.insert("intellivision".into(), format!("{}/Mattel - Intellivision.dat", nointro));
    urls.insert("msx".into(), format!("{}/Microsoft - MSX.dat", nointro));
    urls.insert("atarist".into(), format!("{}/Atari - ST.dat", nointro));
    urls.insert("c64".into(), format!("{}/Commodore - 64.dat", nointro));
    urls.insert("amiga".into(), format!("{}/Commodore - Amiga.dat", nointro));
    urls.insert("satellaview".into(), format!("{}/Nintendo - Satellaview.dat", nointro));
    urls.insert("psvita".into(), format!("{}/Sony - PlayStation Vita.dat", nointro));
    // Disc-based systems — from metadat/redump/
    urls.insert("xbox360".into(), format!("{}/Microsoft - Xbox 360.dat", redump));
    urls.insert("ps1".into(), format!("{}/Sony - PlayStation.dat", redump));
    urls.insert("ps2".into(), format!("{}/Sony - PlayStation 2.dat", redump));
    urls.insert("ps3".into(), format!("{}/Sony - PlayStation 3.dat", redump));
    urls.insert("psp".into(), format!("{}/Sony - PlayStation Portable.dat", redump));
    urls.insert("saturn".into(), format!("{}/Sega - Saturn.dat", redump));
    urls.insert("dreamcast".into(), format!("{}/Sega - Dreamcast.dat", redump));
    urls.insert("gamecube".into(), format!("{}/Nintendo - GameCube.dat", redump));
    urls.insert("wii".into(), format!("{}/Nintendo - Wii.dat", redump));
    urls.insert("3do".into(), format!("{}/The 3DO Company - 3DO.dat", redump));
    urls.insert("xbox".into(), format!("{}/Microsoft - Xbox.dat", redump));

    // Custom libretro dat/
    urls.insert("neogeo".into(), format!("{}/SNK - Neo Geo.dat", dat));
    urls.insert("wiiu".into(), format!("{}/Nintendo - Wii U.dat", dat));
    urls.insert("scummvm".into(), format!("{}/ScummVM.dat", dat));

    // Arcade — from metadat/mame/ and metadat/fbneo-split/
    urls.insert("arcade".into(), format!("{}/MAME.dat", mame_dir));
    urls.insert("fbneo".into(), format!("{}/FBNeo - Arcade Games.dat", fbneo_dir));

    urls
}
