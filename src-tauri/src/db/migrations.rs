// ========== Database migration runner ==========

use rusqlite::Connection;

pub fn run_migrations(conn: &mut Connection) -> Result<(), rusqlite::Error> {
    // Get current DB version
    let version: i32 = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'db_version'",
            [],
            |row| row.get::<_, String>(0),
        )
        .unwrap_or_else(|_| "0".to_string())
        .parse()
        .unwrap_or(0);

    if version < 1 {
        // V1: Initial schema is already in schema.sql
        // Just ensure the version is set
        conn.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES ('db_version', '1')",
            [],
        )?;
    }

    // Future V2, V3... here

    Ok(())
}
