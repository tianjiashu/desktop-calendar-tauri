// ========== Library entry point for Tauri 2 (Phase 2: MCP + Diagnostics) ==========

pub mod commands;
pub mod db;
pub mod diagnostics;
pub mod error;
mod mcp;
pub mod models;

use db::get_db_path;
use std::sync::{Arc, Mutex};
use tauri::{
    image::Image,
    menu::MenuBuilder,
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    LogicalSize, Manager, PhysicalPosition, Position,
};

const WINDOW_EDGE_MARGIN: i32 = 96;
const TRAY_MENU_SHOW: &str = "show";
const TRAY_MENU_HIDE: &str = "hide";
const TRAY_MENU_QUIT: &str = "quit";

fn move_window_to_bottom_right(window: &tauri::WebviewWindow) {
    let Ok(Some(monitor)) = window.current_monitor() else {
        tracing::warn!("[RUST SETUP] Failed to resolve current monitor for initial position");
        return;
    };
    let Ok(outer_size) = window.outer_size() else {
        tracing::warn!("[RUST SETUP] Failed to read outer size for initial position");
        return;
    };

    let margin = (WINDOW_EDGE_MARGIN as f64 * monitor.scale_factor()).round() as i32;
    let monitor_position = monitor.position();
    let monitor_size = monitor.size();
    let x = monitor_position.x + monitor_size.width as i32 - outer_size.width as i32 - margin;
    let y = monitor_position.y + monitor_size.height as i32 - outer_size.height as i32 - margin;

    if let Err(e) = window.set_position(Position::Physical(PhysicalPosition::new(x, y))) {
        tracing::warn!("[RUST SETUP] Failed to move window to bottom-right: {}", e);
    } else {
        tracing::info!("[RUST SETUP] Window moved to bottom-right: x={} y={}", x, y);
    }
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn calendar_tray_icon() -> Image<'static> {
    const SIZE: u32 = 32;
    let mut rgba = vec![0u8; (SIZE * SIZE * 4) as usize];

    let mut set_px = |x: u32, y: u32, color: [u8; 4]| {
        let idx = ((y * SIZE + x) * 4) as usize;
        rgba[idx..idx + 4].copy_from_slice(&color);
    };

    for y in 5..29 {
        for x in 4..28 {
            let is_corner =
                (x < 7 && y < 8) || (x > 24 && y < 8) || (x < 7 && y > 25) || (x > 24 && y > 25);
            if !is_corner {
                set_px(x, y, [246, 249, 255, 255]);
            }
        }
    }

    for y in 5..11 {
        for x in 4..28 {
            set_px(x, y, [42, 126, 255, 255]);
        }
    }

    for x in 6..26 {
        set_px(x, 27, [42, 126, 255, 255]);
    }
    for y in 8..27 {
        set_px(4, y, [42, 126, 255, 255]);
        set_px(27, y, [42, 126, 255, 255]);
    }

    for x in [10, 16, 22] {
        for y in [15, 20, 24] {
            for yy in y..y + 2 {
                for xx in x..x + 2 {
                    set_px(xx, yy, [42, 126, 255, 255]);
                }
            }
        }
    }

    Image::new_owned(rgba, SIZE, SIZE)
}

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

            let tray_menu = MenuBuilder::new(app)
                .text(TRAY_MENU_SHOW, "显示日历")
                .text(TRAY_MENU_HIDE, "隐藏到托盘")
                .separator()
                .text(TRAY_MENU_QUIT, "退出")
                .build()?;

            TrayIconBuilder::with_id("desktop-calendar-tray")
                .icon(calendar_tray_icon())
                .icon_as_template(false)
                .tooltip("桌面日历")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                })
                .on_menu_event(|app, event| match event.id().as_ref() {
                    TRAY_MENU_SHOW => show_main_window(app),
                    TRAY_MENU_HIDE => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    TRAY_MENU_QUIT => app.exit(0),
                    _ => {}
                })
                .build(app)?;

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

            move_window_to_bottom_right(&window);

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
