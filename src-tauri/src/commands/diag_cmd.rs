// ========== Diagnostic IPC command ==========

use tauri::State;
use crate::diagnostics::SystemDiagnostic;
use crate::AppState;

/// Returns runtime diagnostics: log paths, DB status, recent errors.
/// Callable from frontend for self-inspection.
#[tauri::command]
pub fn get_diagnostics(state: State<AppState>) -> SystemDiagnostic {
    let db_path = crate::db::get_db_path();

    // Check if MCP is running by attempting a connection
    // V1: assume running if we got this far (same process)
    let mcp_running = true;

    SystemDiagnostic {
        log_dir: state.log_paths.log_dir.clone(),
        db_path,
        db_wal_enabled: true,
        mcp_port: 18765,
        mcp_running,
        recent_errors: state.error_ring.snapshot(),
    }
}
