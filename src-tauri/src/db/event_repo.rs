// ========== Event repository (唯一写 SQL 的地方) ==========

use rusqlite::{params, Connection};
use crate::error::{AppError, AppResult};
use crate::models::event::*;

/// Helper: parse Event from a database row
fn event_from_row(row: &rusqlite::Row) -> rusqlite::Result<Event> {
    Ok(Event {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        start_time: row.get(3)?,
        end_time: row.get(4)?,
        timezone: row.get(5)?,
        is_all_day: row.get::<_, i32>(6)? != 0,
        rrule: row.get(7)?,
        rrule_until: row.get(8)?,
        exdates: row.get::<_, Option<String>>(9)?
            .map(|s| serde_json::from_str(&s).unwrap_or_default()),
        status: EventStatus::from_str(&row.get::<_, String>(10)?),
        color: row.get(11)?,
        event_type: EventType::from_str(&row.get::<_, String>(12)?),
        location: row.get(13)?,
        url: row.get(14)?,
        created_by: Creator::from_str(&row.get::<_, String>(15)?),
        created_at: row.get(16)?,
        updated_at: row.get(17)?,
        deleted_at: row.get(18)?,
    })
}

/// Create a new event. Returns the created Event on success.
pub fn create_event(conn: &Connection, input: CreateEventInput) -> AppResult<Event> {
    let id = generate_id();
    let now = now_ms();

    if input.start_time >= input.end_time {
        return Err(AppError::InvalidTimeRange(input.start_time, input.end_time));
    }

    conn.execute(
        "INSERT INTO events (
            id, title, description, start_time, end_time, timezone,
            is_all_day, rrule, rrule_until, event_type, color,
            location, url, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
        params![
            id,
            input.title,
            input.description,
            input.start_time,
            input.end_time,
            input.timezone,
            input.is_all_day as i32,
            input.rrule,
            input.rrule_until,
            input.event_type.as_str(),
            input.color,
            input.location,
            input.url,
            now,
            now,
        ],
    )?;

    find_by_id(conn, &id)?
        .ok_or_else(|| AppError::Internal("created event not found".into()))
}

/// Find an event by ID (excludes soft-deleted)
pub fn find_by_id(conn: &Connection, id: &str) -> AppResult<Option<Event>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, description, start_time, end_time, timezone,
                is_all_day, rrule, rrule_until, exdates, status, color,
                event_type, location, url, created_by, created_at, updated_at, deleted_at
         FROM events WHERE id = ?1 AND deleted_at IS NULL"
    )?;

    let mut rows = stmt.query_map(params![id], event_from_row)?;
    match rows.next() {
        Some(Ok(event)) => Ok(Some(event)),
        Some(Err(e)) => Err(AppError::from(e)),
        None => Ok(None),
    }
}

/// Find events within a date range (excludes soft-deleted)
pub fn find_by_date_range(conn: &Connection, start: i64, end: i64) -> AppResult<Vec<Event>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, description, start_time, end_time, timezone,
                is_all_day, rrule, rrule_until, exdates, status, color,
                event_type, location, url, created_by, created_at, updated_at, deleted_at
         FROM events
         WHERE deleted_at IS NULL
           AND start_time < ?2
           AND end_time > ?1
         ORDER BY start_time ASC"
    )?;

    let events: Result<Vec<_>, _> = stmt
        .query_map(params![start, end], event_from_row)?
        .collect();

    events.map_err(AppError::from)
}

/// Build partial UPDATE clauses for an event mutation
fn build_update_sets(
    existing: &Event,
    input: &UpdateEventInput,
    now: i64,
) -> AppResult<(Vec<String>, Vec<Box<dyn rusqlite::types::ToSql>>)> {
    let mut sets = vec!["updated_at = ?1".to_string()];
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(now)];

    macro_rules! add_field {
        ($field:ident, $val:expr) => {{
            let param_idx = sets.len() + 1;
            sets.push(format!("{} = ?{}", stringify!($field), param_idx));
            values.push(Box::new($val));
        }};
    }
    macro_rules! add_opt_str {
        ($field:ident) => {
            if let Some(ref v) = input.$field {
                add_field!($field, v.clone());
            }
        };
    }
    macro_rules! add_opt_i64 {
        ($field:ident) => {
            if let Some(v) = input.$field {
                add_field!($field, v);
            }
        };
    }

    add_opt_str!(title);
    add_opt_str!(description);
    add_opt_str!(timezone);
    add_opt_str!(rrule);
    add_opt_str!(color);
    add_opt_str!(location);
    add_opt_str!(url);
    add_opt_i64!(rrule_until);

    if let Some(v) = input.is_all_day {
        add_field!(is_all_day, v as i32);
    }
    if let Some(ref v) = input.event_type {
        add_field!(event_type, v.as_str().to_string());
    }
    if let Some(ref v) = input.status {
        add_field!(status, v.as_str().to_string());
    }
    // Time range validation: when both start and end are updated together,
    // validate against each other; when only one is updated, validate
    // against the existing value of the other.
    let new_start = input.start_time.unwrap_or(existing.start_time);
    let new_end = input.end_time.unwrap_or(existing.end_time);

    tracing::info!(
        "[RUST] build_update_sets: time validation | new_start={} new_end={} existing.start={} existing.end={} both_start={} both_end={}",
        new_start, new_end, existing.start_time, existing.end_time,
        input.start_time.is_some(), input.end_time.is_some(),
    );

    if new_start >= new_end {
        return Err(AppError::InvalidTimeRange(new_start, new_end));
    }

    if let Some(v) = input.start_time {
        add_field!(start_time, v);
    }
    if let Some(v) = input.end_time {
        add_field!(end_time, v);
    }

    Ok((sets, values))
}

/// Update an event (partial update). Returns the updated Event.
pub fn update_event(conn: &Connection, id: &str, input: UpdateEventInput) -> AppResult<Event> {
    let existing = find_by_id(conn, id)?
        .ok_or_else(|| AppError::EventNotFound(id.to_string()))?;

    let now = now_ms();
    let (sets, mut values) = build_update_sets(&existing, &input, now)?;

    let sql = format!(
        "UPDATE events SET {} WHERE id = ?{} AND deleted_at IS NULL",
        sets.join(", "),
        sets.len() + 1
    );
    values.push(Box::new(id.to_string()));

    let affected = conn.execute(
        &sql,
        rusqlite::params_from_iter(values.iter().map(|v| v.as_ref())),
    )?;

    if affected == 0 {
        return Err(AppError::EventNotFound(id.to_string()));
    }

    find_by_id(conn, id)?
        .ok_or_else(|| AppError::Internal("updated event not found".into()))
}

/// Soft-delete an event (set deleted_at)
pub fn soft_delete(conn: &Connection, id: &str) -> AppResult<()> {
    let now = now_ms();
    let affected = conn.execute(
        "UPDATE events SET deleted_at = ?1, updated_at = ?2 WHERE id = ?3 AND deleted_at IS NULL",
        params![now, now, id],
    )?;

    if affected == 0 {
        return Err(AppError::EventNotFound(id.to_string()));
    }
    Ok(())
}

/// Find free time slots on a given date
pub fn find_free_slots(
    conn: &Connection,
    date: i64,
    duration_minutes: i32,
) -> AppResult<Vec<TimeSlot>> {
    const MS_PER_DAY: i64 = 24 * 60 * 60 * 1000;
    const MS_PER_MINUTE: i64 = 60 * 1000;

    let day_end = date + MS_PER_DAY;
    let slot_duration_ms = (duration_minutes as i64) * MS_PER_MINUTE;

    let events = find_by_date_range(conn, date, day_end)?;

    if events.is_empty() {
        return Ok(vec![TimeSlot { start_time: date, end_time: day_end }]);
    }

    Ok(find_gaps_in_day(date, day_end, &events, slot_duration_ms))
}

/// Scan through events on a day and collect gaps ≥ slot_duration_ms
fn find_gaps_in_day(
    day_start: i64,
    day_end: i64,
    events: &[Event],
    min_gap_ms: i64,
) -> Vec<TimeSlot> {
    let mut slots = Vec::new();
    let mut cursor = day_start;

    for event in events {
        if event.start_time > cursor {
            let gap = event.start_time - cursor;
            if gap >= min_gap_ms {
                slots.push(TimeSlot { start_time: cursor, end_time: event.start_time });
            }
        }
        cursor = cursor.max(event.end_time);
    }

    if day_end - cursor >= min_gap_ms {
        slots.push(TimeSlot { start_time: cursor, end_time: day_end });
    }

    slots
}
