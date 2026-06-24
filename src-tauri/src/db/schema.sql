-- ========== Desktop Calendar Schema V1 ==========

CREATE TABLE IF NOT EXISTS events (
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

CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status) WHERE status = 'cancelled';

CREATE TABLE IF NOT EXISTS reminders (
    id            TEXT PRIMARY KEY,
    event_id      TEXT NOT NULL,
    remind_at     INTEGER NOT NULL,
    type          TEXT DEFAULT 'notification',
    is_sent       INTEGER DEFAULT 0,
    sent_at       INTEGER,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at) WHERE is_sent = 0;

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('db_version', '1');
INSERT OR IGNORE INTO settings (key, value) VALUES ('local_revision', '0');
