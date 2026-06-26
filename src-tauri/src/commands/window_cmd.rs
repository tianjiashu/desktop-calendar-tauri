// ========== Window control IPC commands ==========

use crate::error::{AppError, AppResult};
use tauri::Manager;

/// Frontend diagnostic log — writes to Rust log file for offline analysis.
#[tauri::command(rename_all = "camelCase")]
pub fn diag_log(message: String) -> AppResult<()> {
    tracing::info!("[DIAG] {}", message);
    Ok(())
}

/// Toggle the window's always-on-top property.
/// Called by frontend when switching between widget mode (on) and week view (off).
#[tauri::command(rename_all = "camelCase")]
pub fn set_always_on_top(app_handle: tauri::AppHandle, on_top: bool) -> AppResult<()> {
    let window = app_handle
        .get_webview_window("main")
        .ok_or_else(|| AppError::Internal("main window not found".into()))?;

    tracing::info!("[RUST] set_always_on_top: {}", on_top);

    // Snapshot current window state before
    if let Ok(size) = window.outer_size() {
        if let Ok(pos) = window.outer_position() {
            tracing::info!("[RUST] Before set_always_on_top: outerSize={}x{} outerPos=({},{}) decorations={} resizable={}",
                size.width, size.height, pos.x, pos.y,
                window.is_decorated().unwrap_or(false),
                window.is_resizable().unwrap_or(false));
        }
    }

    window
        .set_always_on_top(on_top)
        .map_err(|e| AppError::Internal(format!("Failed to set always_on_top: {}", e)))?;

    tracing::info!("[RUST] Window always_on_top set to: {}", on_top);
    Ok(())
}
