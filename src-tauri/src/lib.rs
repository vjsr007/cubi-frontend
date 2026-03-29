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
            commands::config::set_fullscreen,
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
            commands::scraper::get_scrapers,
            commands::scraper::add_scraper,
            commands::scraper::update_scraper,
            commands::scraper::delete_scraper,
            commands::scraper::run_scrape_job,
            commands::scraper::cancel_scrape_job,
            commands::scraper::import_esde_credentials,
        ])
        .setup(|app| {
            let db = db::Database::new(app.handle())?;
            app.manage(db);

            // Apply saved fullscreen preference (overrides compiled default)
            if let Ok(config) = services::config_service::load_config() {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_fullscreen(config.general.fullscreen);
                }
            }

            log::info!("Cubi Frontend initialized");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
