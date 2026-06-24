// ========== Frontend-to-backend error logging ==========

use tauri::State;
use crate::diagnostics;
use crate::AppState;

/// Receive an error from the React frontend and persist it to the ring buffer.
/// This ensures frontend errors survive page reloads.
#[tauri::command]
pub fn log_frontend_error(
    state: State<AppState>,
    message: String,
    stack: String,
    component_stack: String,
) {
    let full_msg = format!("{} | stack: {} | component: {}", message, stack, component_stack);
    diagnostics::capture_error(&state.error_ring, "ERROR", "frontend", &full_msg);
    tracing::error!("Frontend error: {}", message);
}
