// ========== Library entry point for Tauri 2 (Phase 2: MCP + Diagnostics) ==========

pub mod commands;
pub mod db;
pub mod diagnostics;
pub mod error;
mod mcp;
pub mod models;

use db::get_db_path;
use std::sync::{Arc, Mutex};
use tauri::{LogicalSize, Manager};

pub struct AppState {
    pub db: Arc<Mutex<rusqlite::Connection>>,
    pub error_ring: Arc<diagnostics::ErrorRing>,
    pub log_paths: diagnostics::LogPaths,
}

pub fn run() {
    let error_ring = Arc::new(diagnostics::ErrorRing::new());
    let log_paths = diagnostics::init(error_ring.clone());
    // diagnostics::init() sets up both stdout + file logging

    let db_path = get_db_path();
    let conn = rusqlite::Connection::open(&db_path)
        .expect("Failed to open database");

    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA synchronous=NORMAL;
         PRAGMA foreign_keys=ON;
         PRAGMA busy_timeout=5000;"
    ).expect("Failed to configure database");

    db::init_schema(&conn).expect("Failed to init schema");

    let mut conn_mut = conn;
    db::run_migrations(&mut conn_mut).expect("Failed to run migrations");

    let db_arc = Arc::new(Mutex::new(conn_mut));
    let db_for_mcp = db_arc.clone();

    let error_ring_for_mcp = error_ring.clone();
    let app_state = AppState {
        db: db_arc,
        error_ring: error_ring.clone(),
        log_paths,
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::create_event,
            commands::get_event,
            commands::list_events,
            commands::update_event,
            commands::delete_event,
            commands::get_free_slots,
            commands::get_diagnostics,
            commands::log_frontend_error,
            commands::set_always_on_top,
            commands::diag_log,
        ])
        // DIAGNOSTIC: Listen for ALL window resize events to detect if
        // setSize is being "overwritten" by something else
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Resized(size) = event {
                let outer = window.outer_size().unwrap_or_default();
                let scale = window.scale_factor().unwrap_or(1.0);
                let logical_w = outer.width as f64 / scale;
                let logical_h = outer.height as f64 / scale;
                tracing::info!(
                    "[RUST EVENT] Window Resized: physical={}x{} outerSize={}x{} logicalSize={:.0}x{:.0} scaleFactor={:.2}",
                    size.width, size.height,
                    outer.width, outer.height,
                    logical_w, logical_h,
                    scale
                );
            }
        })
        .setup(move |app| {
            // ====== Tray: click to restore window ======
            let window = app.get_webview_window("main")
                .expect("main window not found");

            // DIAGNOSTIC: Log initial window state
            let outer_size = window.outer_size().unwrap_or_default();
            let inner_size = window.inner_size().unwrap_or_default();
            let outer_pos = window.outer_position().unwrap_or_default();
            let scale = window.scale_factor().unwrap_or(1.0);
            tracing::info!(
                "[RUST SETUP] Window init state: outerSize={}x{} innerSize={}x{} outerPos=({},{}) scaleFactor={:.2} decorations={} resizable={} transparent=true",
                outer_size.width, outer_size.height,
                inner_size.width, inner_size.height,
                outer_pos.x, outer_pos.y,
                scale,
                window.is_decorated().unwrap_or(false),
                window.is_resizable().unwrap_or(false)
            );

            let window_for_tray = window.clone();
            // Tauri 2 tray-icon feature provides tray from conf.json
            app.on_tray_icon_event(move |_tray, event| {
                if let tauri::tray::TrayIconEvent::Click { .. } = event {
                    let _ = window_for_tray.show();
                    let _ = window_for_tray.set_focus();
                }
            });

            // Center window on first launch (in case conf "center" didn't cover it)
            let _ = window.center();

            // FIX: Force window to physical 64x64px to ensure it renders as a perfect square circle
            // (not an oval) on high-DPI displays (e.g. 125%, 150% scaling).
            // tauri.conf.json width/height are LogicalSize, which gets scaled by DPI,
            // but CSS border-radius:50% operates on physical pixels — causing mismatch.
            if let Ok(scale) = window.scale_factor() {
                let target_physical = 100u32;
                let logical_w = (target_physical as f64 / scale).round() as u32;
                let logical_h = logical_w; // keep perfectly square
                if let Err(e) = window.set_size(LogicalSize::new(logical_w, logical_h)) {
                    tracing::warn!("[RUST SETUP] Failed to set exact size for circle shape: {}", e);
                } else {
                    tracing::info!(
                        "[RUST SETUP] Forced circle window: scale={:.2} logical={}x{} physical={}x{}",
                        scale, logical_w, logical_h, target_physical, target_physical
                    );
                }
            }

            // ====== Start MCP HTTP server ======
            let db = db_for_mcp;
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match mcp::server::start_mcp_server(db, app_handle).await {
                    Ok(()) => tracing::info!("MCP server stopped gracefully"),
                    Err(e) => {
                        tracing::error!("MCP server error: {}", e);
                        diagnostics::capture_error(
                            &error_ring_for_mcp, "ERROR", "mcp::server", &e.to_string()
                        );
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
