mod commands;
mod models;
mod services;
mod db;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::config::get_config,
            commands::config::set_config,
            commands::config::detect_emudeck,
            commands::config::get_config_path,
            commands::library::get_systems,
            commands::library::get_games,
            commands::library::get_game,
            commands::library::toggle_favorite,
            commands::scanner::scan_library,
            commands::launcher::launch_game,
            commands::launcher::get_emulator_status,
            commands::media::get_game_media,
            commands::media::get_system_media,
            commands::media::download_game_media,
            commands::media::download_system_media,
        ])
        .setup(|app| {
            let db = db::Database::new(app.handle())?;
            app.manage(db);
            log::info!("Cubi Frontend initialized");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
