// ========== Event IPC commands (Phase 2: with event emission) ==========

use crate::db::event_repo;
use crate::error::{AppError, AppResult};
use crate::models::event::*;
use crate::AppState;
use tauri::Emitter;
use tauri::State;

/// Emit a Tauri event to notify frontend of data changes
fn emit_db_change(app_handle: &tauri::AppHandle, table: &str, action: &str, id: &str) {
    let payload = serde_json::json!({
        "table": table,
        "action": action,
        "id": id,
        "timestamp": chrono::Utc::now().timestamp_millis(),
    });
    let _ = app_handle.emit("db:events_changed", payload);
}

#[tauri::command]
pub fn create_event(
    app_handle: tauri::AppHandle,
    state: State<AppState>,
    input: CreateEventInput,
) -> AppResult<Event> {
    let conn = state
        .db
        .lock()
        .map_err(|e| AppError::Internal(format!("Lock error: {}", e)))?;
    let event = event_repo::create_event(&conn, input)?;
    emit_db_change(&app_handle, "events", "create", &event.id);
    tracing::info!("Event created via GUI: {} ({})", event.title, event.id);
    Ok(event)
}

#[tauri::command]
pub fn get_event(state: State<AppState>, id: String) -> AppResult<Option<Event>> {
    let conn = state
        .db
        .lock()
        .map_err(|e| AppError::Internal(format!("Lock error: {}", e)))?;
    event_repo::find_by_id(&conn, &id)
}

#[tauri::command(rename_all = "snake_case")]
pub fn list_events(
    state: State<AppState>,
    start_date: i64,
    end_date: i64,
) -> AppResult<Vec<Event>> {
    let conn = state
        .db
        .lock()
        .map_err(|e| AppError::Internal(format!("Lock error: {}", e)))?;
    event_repo::find_by_date_range(&conn, start_date, end_date)
}

#[tauri::command]
pub fn update_event(
    app_handle: tauri::AppHandle,
    state: State<AppState>,
    id: String,
    input: UpdateEventInput,
) -> AppResult<Event> {
    tracing::info!(
        "[RUST] update_event called: id={} start_time={:?} end_time={:?}",
        id,
        input.start_time,
        input.end_time,
    );
    let conn = state.db.lock().map_err(|e| {
        let msg = format!("Lock error: {}", e);
        tracing::error!("[RUST] update_event lock failed: {}", msg);
        AppError::Internal(msg)
    })?;
    match event_repo::update_event(&conn, &id, input) {
        Ok(event) => {
            emit_db_change(&app_handle, "events", "update", &event.id);
            tracing::info!("Event updated via GUI: {}", event.id);
            Ok(event)
        }
        Err(e) => {
            tracing::error!("[RUST] update_event FAILED: {:?}", e);
            Err(e)
        }
    }
}

#[tauri::command]
pub fn delete_event(
    app_handle: tauri::AppHandle,
    state: State<AppState>,
    id: String,
) -> AppResult<()> {
    let conn = state
        .db
        .lock()
        .map_err(|e| AppError::Internal(format!("Lock error: {}", e)))?;
    event_repo::soft_delete(&conn, &id)?;
    emit_db_change(&app_handle, "events", "delete", &id);
    tracing::info!("Event deleted via GUI: {}", id);
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_free_slots(
    state: State<AppState>,
    date: i64,
    duration_minutes: i32,
) -> AppResult<Vec<TimeSlot>> {
    let conn = state
        .db
        .lock()
        .map_err(|e| AppError::Internal(format!("Lock error: {}", e)))?;
    event_repo::find_free_slots(&conn, date, duration_minutes)
}
