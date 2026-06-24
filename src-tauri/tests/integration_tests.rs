// ====== Rust Integration Tests ======
// Run with: cd src-tauri && cargo test

#[cfg(test)]
mod tests {
    use rusqlite::Connection;
    use desktop_calendar_tauri_lib::db::event_repo;
    use desktop_calendar_tauri_lib::models::event::*;

    /// Create an in-memory SQLite DB with the full schema
    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().expect("Failed to create in-memory DB");
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS events (
                id              TEXT PRIMARY KEY,
                title           TEXT NOT NULL,
                description     TEXT,
                start_time      INTEGER NOT NULL,
                end_time        INTEGER NOT NULL,
                timezone        TEXT DEFAULT 'Asia/Shanghai',
                is_all_day      INTEGER DEFAULT 0,
                rrule           TEXT,
                rrule_until     INTEGER,
                exdates         TEXT,
                status          TEXT DEFAULT 'confirmed',
                color           TEXT DEFAULT '#3B82F6',
                event_type      TEXT DEFAULT 'default',
                location        TEXT,
                url             TEXT,
                created_by      TEXT DEFAULT 'human',
                created_at      INTEGER NOT NULL,
                updated_at      INTEGER NOT NULL,
                deleted_at      INTEGER DEFAULT NULL
            );
            CREATE TABLE IF NOT EXISTS reminders (
                id TEXT PRIMARY KEY, event_id TEXT NOT NULL,
                remind_at INTEGER NOT NULL, type TEXT DEFAULT 'notification',
                is_sent INTEGER DEFAULT 0, sent_at INTEGER,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            INSERT OR IGNORE INTO settings (key, value) VALUES ('db_version', '1');
            PRAGMA foreign_keys=ON;"
        ).expect("Failed to init schema");
        conn
    }

    fn make_create_input() -> CreateEventInput {
        let now = chrono::Utc::now().timestamp_millis();
        let hour = 3600_000;
        CreateEventInput {
            title: "集成测试事件".into(),
            start_time: now + hour,
            end_time: now + hour * 2,
            description: Some("测试描述".into()),
            timezone: "Asia/Shanghai".into(),
            is_all_day: false,
            rrule: None,
            rrule_until: None,
            event_type: EventType::Meeting,
            color: "#10B981".into(),
            location: Some("测试地点".into()),
            url: Some("https://example.com".into()),
        }
    }

    // ========== CRUD 集成测试 ==========

    #[test]
    fn test_create_event_returns_valid_event() {
        let conn = setup_test_db();
        let input = make_create_input();
        let event = event_repo::create_event(&conn, input).expect("create failed");

        assert_eq!(event.title, "集成测试事件");
        assert_eq!(event.event_type, EventType::Meeting);
        assert_eq!(event.color, "#10B981");
        assert_eq!(event.location.as_deref(), Some("测试地点"));
        assert_eq!(event.url.as_deref(), Some("https://example.com"));
        assert_eq!(event.status, EventStatus::Confirmed);
        assert_eq!(event.created_by, Creator::Human);
        assert!(event.created_at > 0);
        assert!(event.updated_at > 0);
        assert!(event.deleted_at.is_none());
        assert_eq!(event.is_all_day, false);
    }

    #[test]
    fn test_find_by_id_returns_event() {
        let conn = setup_test_db();
        let input = make_create_input();
        let created = event_repo::create_event(&conn, input).expect("create failed");

        let found = event_repo::find_by_id(&conn, &created.id).expect("find failed");
        assert!(found.is_some());
        assert_eq!(found.unwrap().id, created.id);
    }

    #[test]
    fn test_find_by_id_nonexistent_returns_none() {
        let conn = setup_test_db();
        let found = event_repo::find_by_id(&conn, "nonexistent-id").expect("find failed");
        assert!(found.is_none());
    }

    #[test]
    fn test_find_by_date_range_filters_correctly() {
        let conn = setup_test_db();
        let now = chrono::Utc::now().timestamp_millis();
        let hour = 3600_000;

        // Event at now+1h ~ now+2h
        let input1 = CreateEventInput {
            title: "事件A".into(),
            start_time: now + hour,
            end_time: now + hour * 2,
            ..make_create_input_default()
        };
        // Event far in future
        let input2 = CreateEventInput {
            title: "事件B".into(),
            start_time: now + hour * 100,
            end_time: now + hour * 101,
            ..make_create_input_default()
        };

        event_repo::create_event(&conn, input1).expect("create1 failed");
        event_repo::create_event(&conn, input2).expect("create2 failed");

        let events = event_repo::find_by_date_range(&conn, now, now + hour * 10)
            .expect("find range failed");
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].title, "事件A");
    }

    #[test]
    fn test_update_event_modifies_fields() {
        let conn = setup_test_db();
        let created = event_repo::create_event(&conn, make_create_input()).expect("create failed");

        let update = UpdateEventInput {
            title: Some("更新后标题".into()),
            color: Some("#EF4444".into()),
            ..Default::default()
        };
        let updated = event_repo::update_event(&conn, &created.id, update).expect("update failed");

        assert_eq!(updated.title, "更新后标题");
        assert_eq!(updated.color, "#EF4444");
        // updated_at should be >= created_at (may be equal within same ms)
        assert!(updated.updated_at >= created.updated_at);
        // Other fields unchanged
        assert_eq!(updated.event_type, created.event_type);
    }

    #[test]
    fn test_soft_delete_sets_deleted_at() {
        let conn = setup_test_db();
        let created = event_repo::create_event(&conn, make_create_input()).expect("create failed");

        event_repo::soft_delete(&conn, &created.id).expect("delete failed");

        // Should not appear in queries
        let found = event_repo::find_by_id(&conn, &created.id).expect("find failed");
        assert!(found.is_none());
    }

    #[test]
    fn test_delete_nonexistent_returns_error() {
        let conn = setup_test_db();
        let result = event_repo::soft_delete(&conn, "nonexistent-id");
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_time_range_returns_error() {
        let conn = setup_test_db();
        let now = chrono::Utc::now().timestamp_millis();
        let input = CreateEventInput {
            title: "错误事件".into(),
            start_time: now + 1000,
            end_time: now, // end < start
            ..make_create_input_default()
        };
        let result = event_repo::create_event(&conn, input);
        assert!(result.is_err());
    }

    #[test]
    fn test_find_free_slots_returns_gaps() {
        let conn = setup_test_db();
        // Use a fixed day start (2026-06-22 00:00:00 UTC)
        let day_start: i64 = 1751155200000;
        let hour = 3600_000;

        // Create event at 10:00-11:00
        let input = CreateEventInput {
            title: "占用".into(),
            start_time: day_start + hour * 10,
            end_time: day_start + hour * 11,
            timezone: "Asia/Shanghai".into(),
            is_all_day: false,
            description: None,
            rrule: None,
            rrule_until: None,
            event_type: EventType::Default,
            color: "#3B82F6".into(),
            location: None,
            url: None,
        };
        event_repo::create_event(&conn, input).expect("create failed");

        let slots = event_repo::find_free_slots(&conn, day_start, 60)
            .expect("free slots failed");
        assert!(!slots.is_empty());
        // Each slot should be at least 60 minutes
        for slot in &slots {
            assert!(slot.end_time - slot.start_time >= 60 * 60 * 1000);
        }
    }

    // ========== 辅助函数 ==========

    fn make_create_input_default() -> CreateEventInput {
        let now = chrono::Utc::now().timestamp_millis();
        CreateEventInput {
            title: "测试".into(),
            start_time: now,
            end_time: now + 3600_000,
            timezone: "Asia/Shanghai".into(),
            is_all_day: false,
            description: None,
            rrule: None,
            rrule_until: None,
            event_type: EventType::Default,
            color: "#3B82F6".into(),
            location: None,
            url: None,
        }
    }
}
