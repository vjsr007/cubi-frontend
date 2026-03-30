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
            commands::library::get_all_games,
            commands::library::get_game,
            commands::library::toggle_favorite,
            commands::scanner::scan_library,
            commands::launcher::launch_game,
            commands::launcher::get_emulator_status,
            commands::launcher::get_all_emulator_info,
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
            commands::pc_games::detect_pc_libs,
            commands::pc_games::import_steam_games,
            commands::pc_games::import_epic_games,
            commands::pc_games::import_ea_games,
            commands::pc_games::import_gog_games,
            commands::pc_games::save_pc_games,
            commands::pc_games::add_pc_game,
            commands::pc_games::delete_pc_game,
            commands::rom_paths::get_system_registry_list,
            commands::rom_paths::get_rom_path_overrides,
            commands::rom_paths::set_rom_path_override,
            commands::rom_paths::delete_rom_path_override,
            commands::input_mapping::get_input_profiles,
            commands::input_mapping::get_input_profile,
            commands::input_mapping::create_input_profile,
            commands::input_mapping::update_input_profile,
            commands::input_mapping::delete_input_profile,
            commands::input_mapping::get_profile_bindings,
            commands::input_mapping::set_binding,
            commands::input_mapping::reset_profile_bindings,
            commands::input_mapping::get_system_profile_assignments,
            commands::input_mapping::set_system_profile_assignment,
            commands::input_mapping::delete_system_profile_assignment,
            commands::input_mapping::assign_profile_to_all_systems,
            commands::input_mapping::export_profile_for_emulator,
            commands::input_mapping::write_profile_to_retroarch,
            commands::input_mapping::write_profile_to_emulator,
            commands::input_mapping::get_all_actions,
            commands::input_mapping::get_button_label,
            commands::emulator_settings::get_setting_definitions,
            commands::emulator_settings::get_config_writers_info,
            commands::emulator_settings::get_emulator_settings,
            commands::emulator_settings::get_all_emulator_settings,
            commands::emulator_settings::set_emulator_setting,
            commands::emulator_settings::reset_emulator_settings,
            commands::emulator_settings::preview_emulator_config,
            commands::pc_scraper::check_pc_scraper_tools,
            commands::pc_scraper::get_pc_metadata_config,
            commands::pc_scraper::save_pc_metadata_config,
            commands::pc_scraper::scrape_single_pc_game,
            commands::pc_scraper::run_pc_metadata_job,
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
