// ========== Diagnostics & Observability ==========
///
/// Log output: stdout (human-readable) + in-memory error ring buffer.
/// Log files to disk are deferred to a later phase (non_blocking needs tokio runtime).
///
/// Runtime inspection:
///   - get_diagnostics IPC → ring buffer snapshot + system info
///   - /health endpoint → MCP server liveness
use parking_lot::Mutex;
use serde::Serialize;
use std::sync::Arc;

const RING_BUFFER_SIZE: usize = 50;

#[derive(Debug, Clone, Serialize)]
pub struct DiagnosticEntry {
    pub timestamp: String,
    pub level: String,
    pub module: String,
    pub message: String,
}

/// In-memory ring buffer of recent diagnostic entries
pub struct ErrorRing {
    entries: Mutex<Vec<DiagnosticEntry>>,
}

impl ErrorRing {
    pub fn new() -> Self {
        Self {
            entries: Mutex::new(Vec::with_capacity(RING_BUFFER_SIZE)),
        }
    }

    pub fn push(&self, entry: DiagnosticEntry) {
        let mut entries = self.entries.lock();
        if entries.len() >= RING_BUFFER_SIZE {
            entries.remove(0);
        }
        entries.push(entry);
    }

    pub fn snapshot(&self) -> Vec<DiagnosticEntry> {
        self.entries.lock().clone()
    }
}

pub struct LogPaths {
    pub log_dir: String,
    pub app_log: String,
    pub error_log: String,
}

/// Initialize stdout logging + panic hook + ring buffer.
/// File-based logging is deferred until the tokio runtime is available.
pub fn init(ring: Arc<ErrorRing>) -> LogPaths {
    let data_dir = dirs::home_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join(".desktop-calendar");

    let log_dir = data_dir.join("logs");
    std::fs::create_dir_all(&log_dir).ok();

    let app_log_path = log_dir.join("app.log");
    let error_log_path = log_dir.join("error.log");

    // Write logs to file so they survive process exit
    let log_file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&app_log_path)
        .expect("Failed to open app log file");

    let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));

    tracing_subscriber::fmt()
        .with_env_filter(env_filter)
        .with_target(true)
        .with_file(true)
        .with_line_number(true)
        .with_timer(tracing_subscriber::fmt::time::LocalTime::rfc_3339())
        .with_writer(std::sync::Mutex::new(log_file))
        .compact()
        .init();

    // === Panic hook ===
    let ring_for_panic = ring.clone();
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let location = info
            .location()
            .map(|l| format!("{}:{}", l.file(), l.line()))
            .unwrap_or_else(|| "unknown location".into());

        let msg = info
            .payload()
            .downcast_ref::<&str>()
            .map(|s| s.to_string())
            .or_else(|| info.payload().downcast_ref::<String>().cloned())
            .unwrap_or_else(|| "unknown panic".into());

        tracing::error!(target: "panic", "PANIC at {}: {}", location, msg);

        ring_for_panic.push(DiagnosticEntry {
            timestamp: chrono::Utc::now().to_rfc3339(),
            level: "PANIC".into(),
            module: location,
            message: msg,
        });

        default_hook(info);
    }));

    tracing::info!("Diagnostics initialized. Log dir: {}", log_dir.display());

    LogPaths {
        app_log: app_log_path.to_string_lossy().to_string(),
        error_log: error_log_path.to_string_lossy().to_string(),
        log_dir: log_dir.to_string_lossy().to_string(),
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct SystemDiagnostic {
    pub log_dir: String,
    pub db_path: String,
    pub db_wal_enabled: bool,
    pub mcp_port: u16,
    pub mcp_running: bool,
    pub recent_errors: Vec<DiagnosticEntry>,
}

/// Capture an error into the ring buffer for runtime inspection
pub fn capture_error(ring: &ErrorRing, level: &str, module: &str, msg: &str) {
    ring.push(DiagnosticEntry {
        timestamp: chrono::Utc::now().to_rfc3339(),
        level: level.to_string(),
        module: module.to_string(),
        message: msg.to_string(),
    });
}
