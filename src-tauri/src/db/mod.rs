// ========== Database module ==========

pub mod event_repo;
pub mod migrations;

use rusqlite::Connection;

/// Get the SQLite database file path
pub fn get_db_path() -> String {
    let home = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    home.join(".desktop-calendar")
        .join("calendar.db")
        .to_string_lossy()
        .to_string()
}

/// Ensure DB directory exists
fn ensure_db_dir() -> Result<(), std::io::Error> {
    let home = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    let dir = home.join(".desktop-calendar");
    if !dir.exists() {
        std::fs::create_dir_all(&dir)?;
    }
    Ok(())
}

/// Initialize schema from embedded SQL file
pub fn init_schema(conn: &Connection) -> Result<(), rusqlite::Error> {
    ensure_db_dir()
        .map_err(|e| rusqlite::Error::InvalidParameterName(format!("create db dir: {}", e)))?;
    conn.execute_batch(include_str!("schema.sql"))
}

pub use migrations::run_migrations;
