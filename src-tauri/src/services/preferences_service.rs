use std::collections::HashMap;
use rusqlite::Connection;
use crate::services::launcher_service::get_emulator_registry;

/// Get the stored emulator preference for a system
pub fn get_preference(
    system_id: &str,
    conn: &Connection,
) -> Result<Option<String>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT selected_emulator FROM emulator_preferences WHERE system_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let result = stmt.query_row([system_id], |row| row.get::<_, String>(0));

    match result {
        Ok(emulator) => {
            log::debug!(
                "Retrieved emulator preference for {}: {}",
                system_id,
                emulator
            );
            Ok(Some(emulator))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            log::debug!("No emulator preference found for {}", system_id);
            Ok(None)
        }
        Err(e) => Err(e.to_string()),
    }
}

/// Set emulator preference for a system with validation
pub fn set_preference(
    system_id: &str,
    emulator_name: &str,
    conn: &Connection,
) -> Result<(), String> {
    // Validate that the emulator exists in the registry for this system
    let registry = get_emulator_registry();
    let valid = registry.iter().any(|def| {
        def.system_ids.contains(&system_id) && def.name == emulator_name
    });

    if !valid {
        let err_msg = format!(
            "Emulator '{}' does not support system '{}'",
            emulator_name, system_id
        );
        log::warn!("{}", err_msg);
        return Err(err_msg);
    }

    conn.execute(
        "INSERT OR REPLACE INTO emulator_preferences (system_id, selected_emulator, updated_at)
         VALUES (?1, ?2, datetime('now'))",
        rusqlite::params![system_id, emulator_name],
    )
    .map_err(|e| e.to_string())?;

    log::info!(
        "Set emulator preference: {} → {}",
        system_id,
        emulator_name
    );
    Ok(())
}

/// Delete emulator preference for a system (revert to default)
pub fn delete_preference(system_id: &str, conn: &Connection) -> Result<(), String> {
    conn.execute(
        "DELETE FROM emulator_preferences WHERE system_id = ?1",
        rusqlite::params![system_id],
    )
    .map_err(|e| e.to_string())?;

    log::info!("Deleted emulator preference for {}", system_id);
    Ok(())
}

/// Get all stored emulator preferences as a HashMap
pub fn get_all_preferences(conn: &Connection) -> Result<HashMap<String, String>, String> {
    let mut stmt = conn
        .prepare("SELECT system_id, selected_emulator FROM emulator_preferences")
        .map_err(|e| e.to_string())?;

    let preferences = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<HashMap<_, _>, _>>()
        .map_err(|e| e.to_string())?;

    log::debug!("Retrieved {} emulator preferences", preferences.len());
    Ok(preferences)
}

// ── Per-Game Emulator Overrides ────────────────────────────────────────

/// Get the emulator override for a specific game (if exists)
pub fn get_game_override(
    game_id: &str,
    conn: &Connection,
) -> Result<Option<String>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT selected_emulator FROM game_emulator_overrides WHERE game_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let result = stmt.query_row([game_id], |row| row.get::<_, String>(0));

    match result {
        Ok(emulator) => {
            log::debug!(
                "Retrieved emulator override for game {}: {}",
                game_id,
                emulator
            );
            Ok(Some(emulator))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            log::debug!("No emulator override found for game {}", game_id);
            Ok(None)
        }
        Err(e) => Err(e.to_string()),
    }
}

/// Set emulator override for a specific game
pub fn set_game_override(
    game_id: &str,
    emulator_name: &str,
    system_id: &str,
    conn: &Connection,
) -> Result<(), String> {
    // Validate that the emulator exists in the registry for this system
    let registry = get_emulator_registry();
    let valid = registry.iter().any(|def| {
        def.system_ids.contains(&system_id) && def.name == emulator_name
    });

    if !valid {
        let err_msg = format!(
            "Emulator '{}' does not support system '{}'",
            emulator_name, system_id
        );
        log::warn!("{}", err_msg);
        return Err(err_msg);
    }

    conn.execute(
        "INSERT OR REPLACE INTO game_emulator_overrides (game_id, selected_emulator, updated_at)
         VALUES (?1, ?2, datetime('now'))",
        rusqlite::params![game_id, emulator_name],
    )
    .map_err(|e| e.to_string())?;

    log::info!(
        "Set emulator override for game {}: {}",
        game_id,
        emulator_name
    );
    Ok(())
}

/// Delete emulator override for a specific game (revert to system default)
pub fn delete_game_override(game_id: &str, conn: &Connection) -> Result<(), String> {
    conn.execute(
        "DELETE FROM game_emulator_overrides WHERE game_id = ?1",
        rusqlite::params![game_id],
    )
    .map_err(|e| e.to_string())?;

    log::info!("Deleted emulator override for game {}", game_id);
    Ok(())
}
