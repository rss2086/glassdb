mod ai;
mod files;
mod keychain;
mod sessions;

use sessions::DbConn;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            let conn = sessions::init_db(&data_dir);
            app.manage(DbConn(std::sync::Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            keychain::store_api_key,
            keychain::get_api_key,
            keychain::delete_api_key,
            ai::chat_stream,
            sessions::list_sessions,
            sessions::create_session,
            sessions::save_message,
            sessions::save_dashboard,
            sessions::save_loaded_files,
            sessions::load_session,
            sessions::delete_session,
            files::read_file_bytes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
