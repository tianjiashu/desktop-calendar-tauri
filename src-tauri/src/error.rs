// ========== Unified error types (Phase 2 enhanced) ==========

use serde::Serialize;

#[derive(Debug, thiserror::Error, Serialize)]
pub enum AppError {
    // ========== 数据库错误 ==========
    #[error("Database error: {0}")]
    Db(String),

    #[error("Event not found: {0}")]
    EventNotFound(String),

    #[error("Invalid time range: start={0}, end={1}")]
    InvalidTimeRange(i64, i64),

    #[error("Reminder not found: {0}")]
    ReminderNotFound(String),

    // ========== MCP 错误 ==========
    #[error("MCP error: {0}")]
    Mcp(String),

    #[error("Tool not found: {0}")]
    ToolNotFound(String),

    #[error("Resource not found: {0}")]
    ResourceNotFound(String),

    #[error("Invalid tool arguments: {0}")]
    InvalidToolArgs(String),

    // ========== HTTP 错误 ==========
    #[error("Port {0} already in use: {1}")]
    HttpPortInUse(u16, String),

    #[error("HTTP error: {0}")]
    Http(String),

    // ========== 系统错误 ==========
    #[error("IO error: {0}")]
    Io(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        if matches!(e, rusqlite::Error::QueryReturnedNoRows) {
            AppError::EventNotFound("entity not found".to_string())
        } else {
            AppError::Db(e.to_string())
        }
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::Internal(format!("JSON parse error: {}", e))
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(e.to_string())
    }
}

/// Tauri command 返回类型
pub type AppResult<T> = Result<T, AppError>;

// ── MCP error conversion ───────────────────────────────────────────────────

impl From<AppError> for rmcp::ErrorData {
    fn from(e: AppError) -> Self {
        let msg = e.to_string();
        match &e {
            AppError::EventNotFound(_)
            | AppError::ResourceNotFound(_)
            | AppError::InvalidToolArgs(_) => {
                rmcp::ErrorData::invalid_params(msg, None)
            }
            _ => rmcp::ErrorData::internal_error(msg, None),
        }
    }
}
