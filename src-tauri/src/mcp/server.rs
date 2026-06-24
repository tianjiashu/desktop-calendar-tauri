// ========== MCP Server — rmcp StreamableHttpService + health endpoint ==========

use std::sync::{Arc, Mutex};

use axum::{routing::get, Json, Router};
use rmcp::transport::streamable_http_server::{
    session::local::LocalSessionManager, tower::StreamableHttpServerConfig,
    tower::StreamableHttpService,
};
use serde_json::{json, Value};
use tauri::AppHandle;

use crate::error::AppError;
use crate::mcp::tools::CalendarMcpService;

/// Default MCP server port
pub const MCP_PORT: u16 = 18765;

/// Start the MCP HTTP server on the configured port.
///
/// Creates a StreamableHttpService (rmcp-managed SSE + JSON-RPC),
/// mounts a separate /health endpoint, and serves on 127.0.0.1:MCP_PORT.
pub async fn start_mcp_server(
    db: Arc<Mutex<rusqlite::Connection>>,
    app_handle: AppHandle,
) -> Result<(), AppError> {
    let app_handle_clone = app_handle.clone();

    let service = StreamableHttpService::new(
        move || {
            Ok(CalendarMcpService {
                db: db.clone(),
                app_handle: app_handle_clone.clone(),
            })
        },
        Arc::new(LocalSessionManager::default()),
        StreamableHttpServerConfig::default(),
    );

    let app = Router::new()
        .route("/health", get(health_handler))
        .nest_service("/mcp", service);

    let addr = std::net::SocketAddr::from(([127, 0, 0, 1], MCP_PORT));

    match tokio::net::TcpListener::bind(&addr).await {
        Ok(listener) => {
            tracing::info!("MCP Server started on http://127.0.0.1:{}/mcp", MCP_PORT);
            axum::serve(listener, app.into_make_service())
                .await
                .map_err(|e| AppError::Http(e.to_string()))
        }
        Err(e) if e.kind() == std::io::ErrorKind::AddrInUse => {
            Err(AppError::HttpPortInUse(
                MCP_PORT,
                "端口已被占用，请关闭其他实例后重试。".into(),
            ))
        }
        Err(e) => Err(AppError::from(e)),
    }
}

/// GET /health — Simple health check endpoint for MCP server liveness.
async fn health_handler() -> Json<Value> {
    Json(json!({
        "status": "ok",
        "service": "desktop-calendar-mcp",
        "version": "0.1.0",
        "timestamp": chrono::Utc::now().to_rfc3339(),
    }))
}
