# 01 - 数据模型设计

> 所属阶段：Phase 1（所有模块依赖本模块）
> 依赖模块：无
> 状态：已实现 ✅

---

## 1. 功能概述

本模块负责**数据层**的设计与实现，包括：
- SQLite 数据库 Schema 定义（events / reminders / settings）
- Rust 侧数据结构（`Event`、`Reminder` 结构体）
- TypeScript 侧类型定义（`Event`、`Reminder` 接口）
- 数据库连接管理（WAL 模式配置）
- 数据迁移机制（版本升级）

**不负责**：HTTP Server、GUI 渲染、MCP 协议处理。

---

## 2. 详细设计

### 2.1 SQLite Schema

```sql
-- ========== events 表 ==========
CREATE TABLE IF NOT EXISTS events (
    id              TEXT PRIMARY KEY,           -- UUID v7（时间有序）
    title           TEXT NOT NULL,             -- 事件标题
    description     TEXT,                      -- 事件描述
    start_time      INTEGER NOT NULL,          -- 开始时间 (Unix ms, UTC)
    end_time        INTEGER NOT NULL,          -- 结束时间 (Unix ms, UTC)
    timezone        TEXT DEFAULT 'UTC',        -- 创建时使用的时区（如 'Asia/Shanghai'）
    is_all_day      INTEGER DEFAULT 0,         -- 是否全天 (0/1)
    rrule           TEXT,                      -- RFC 5545 RRULE（NULL=不重复）
    rrule_until     INTEGER,                  -- 重复结束时间 (Unix ms, UTC)，NULL=无限
    exdates         TEXT,                      -- 例外日期 JSON 数组，如 '[1700000000000, 1700600000000]'
    status          TEXT DEFAULT 'confirmed',   -- 'confirmed' | 'cancelled' | 'tentative'
    color           TEXT DEFAULT '#3B82F6',   -- 颜色标签 (hex)
    event_type      TEXT DEFAULT 'default',     -- 'interview' | 'meeting' | 'reminder' | 'deadline' | 'default'
    location        TEXT,                      -- 地点
    url             TEXT,                      -- 关联链接（F19 点击跳转）
    created_by      TEXT DEFAULT 'human',      -- 创建者: 'human' | 'agent'
    created_at      INTEGER NOT NULL,          -- 创建时间 (Unix ms)
    updated_at      INTEGER NOT NULL,          -- 更新时间 (Unix ms)
    deleted_at      INTEGER DEFAULT NULL         -- 软删除（NULL = 未删除）
);

CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status) WHERE status = 'cancelled';

-- ========== reminders 表 ==========
CREATE TABLE IF NOT EXISTS reminders (
    id            TEXT PRIMARY KEY,
    event_id      TEXT NOT NULL,
    remind_at     INTEGER NOT NULL,        -- 提醒触发时间 (Unix ms, UTC)
    type          TEXT DEFAULT 'notification',  -- 'notification' | 'email' | 'sound'
    is_sent       INTEGER DEFAULT 0,
    sent_at       INTEGER,                   -- 实际发送时间 (Unix ms)
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at) WHERE is_sent = 0;

-- ========== settings 表 ==========
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- ========== 初始化数据 ==========
INSERT OR IGNORE INTO settings (key, value) VALUES ('db_version', '1');
INSERT OR IGNORE INTO settings (key, value) VALUES ('local_revision', '0');
```

### 2.2 WAL 模式配置

```sql
-- 必须在每次连接建立后执行
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA foreign_keys=ON;
PRAGMA busy_timeout=5000;  -- 5 秒忙等待（并发写入保护）
```

### 2.3 UUID v7 生成策略

**Rust 侧**（推荐用 `uuid` crate + v7 feature）：

```rust
use uuid::Uuid;

pub fn generate_id() -> String {
    // UUID v7：时间有序，插入 B-tree 不会碎片化
    Uuid::now_v7().to_string()
}
```

**TypeScript 侧**（降级方案，当 UUID v7 不可用时）：

```typescript
// 简单时间有序 ID（开发阶段可用，生产换 UUID v7）
export function generateId(): string {
    return crypto.randomUUID();  // 未来改为 UUID v7
}
```

### 2.4 Rust 数据结构

```rust
// models/event.rs

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub start_time: i64,        // Unix ms
    pub end_time: i64,          // Unix ms
    pub timezone: String,
    pub is_all_day: bool,
    pub rrule: Option<String>,  // RFC 5545
    pub rrule_until: Option<i64>,
    pub exdates: Option<Vec<i64>>, // JSON 数组解析
    pub status: EventStatus,
    pub color: String,
    pub event_type: EventType,
    pub location: Option<String>,
    pub url: Option<String>,
    pub created_by: Creator,
    pub created_at: i64,
    pub updated_at: i64,
    pub deleted_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EventStatus {
    Confirmed,
    Cancelled,
    Tentative,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EventType {
    Interview,
    Meeting,
    Reminder,
    Deadline,
    Default,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Creator {
    Human,
    Agent,
}

// 从 DB Row 解析
impl Event {
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Event> {
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
}
```

### 2.5 TypeScript 类型定义

```typescript
// types/event.types.ts

export interface Event {
  id: string;
  title: string;
  description?: string;
  start_time: number;      // Unix ms
  end_time: number;        // Unix ms
  timezone: string;
  is_all_day: boolean;
  rrule?: string;          // RFC 5545
  rrule_until?: number;    // Unix ms
  exdates?: number[];      // 例外日期数组
  status: 'confirmed' | 'cancelled' | 'tentative';
  color: string;           // hex color
  event_type: 'interview' | 'meeting' | 'reminder' | 'deadline' | 'default';
  location?: string;
  url?: string;
  created_by: 'human' | 'agent';
  created_at: number;
  updated_at: number;
  deleted_at?: number;      // Unix ms, null = 未删除
}

export interface CreateEventInput {
  title: string;
  description?: string;
  start_time: number;
  end_time: number;
  timezone?: string;
  is_all_day?: boolean;
  rrule?: string;
  rrule_until?: number;
  event_type?: Event['event_type'];
  color?: string;
  location?: string;
  url?: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  start_time?: number;
  end_time?: number;
  timezone?: string;
  is_all_day?: boolean;
  rrule?: string;
  rrule_until?: number;
  event_type?: Event['event_type'];
  color?: string;
  location?: string;
  url?: string;
  status?: Event['status'];
}
```

### 2.6 数据库迁移机制

```rust
// db/migrations.rs

pub fn run_migrations(conn: &mut rusqlite::Connection) -> Result<()> {
    // 获取当前版本
    let version: i32 = conn.query_row(
        "SELECT value FROM settings WHERE key = 'db_version'",
        [],
        |row| row.get(0),
    ).unwrap_or("0".to_string()).parse().unwrap_or(0);

    if version < 1 {
        // V1: 初始 Schema（已在 CREATE TABLE 中处理）
        conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('db_version', '1')", [])?;
    }

    // 未来 V2, V3... 在此添加

    Ok(())
}
```

---

## 3. 接口定义

### 3.1 Rust 侧（db/event_repo.rs）

```rust
// 事件仓库接口（供 commands/ 和 mcp/tools 调用）
pub struct EventRepo;

impl EventRepo {
    // 创建事件
    pub fn create(conn: &rusqlite::Connection, input: CreateEventInput) -> Result<Event>;

    // 按 ID 查询
    pub fn find_by_id(conn: &rusqlite::Connection, id: &str) -> Result<Option<Event>>;

    // 按日期范围查询（含重复事件展开）
    pub fn find_by_date_range(
        conn: &rusqlite::Connection,
        start: i64,
        end: i64,
    ) -> Result<Vec<Event>>;

    // 更新事件
    pub fn update(conn: &rusqlite::Connection, id: &str, input: UpdateEventInput) -> Result<Event>;

    // 软删除
    pub fn soft_delete(conn: &rusqlite::Connection, id: &str) -> Result<()>;

    // 查询空闲时间段
    pub fn find_free_slots(
        conn: &rusqlite::Connection,
        date: i64,
        duration_minutes: i32,
    ) -> Result<Vec<TimeSlot>>;
}
```

### 3.2 Tauri IPC 命令（commands/event_cmd.rs）

```rust
#[tauri::command]
pub async fn create_event(input: CreateEventInput) -> Result<Event, AppError>;

#[tauri::command]
pub async fn get_event(id: String) -> Result<Option<Event>, AppError>;

#[tauri::command]
pub async fn list_events(start_date: i64, end_date: i64) -> Result<Vec<Event>, AppError>;

#[tauri::command]
pub async fn update_event(id: String, input: UpdateEventInput) -> Result<Event, AppError>;

#[tauri::command]
pub async fn delete_event(id: String) -> Result<(), AppError>;

#[tauri::command]
pub async fn get_free_slots(date: i64, duration_minutes: i32) -> Result<Vec<TimeSlot>, AppError>;
```

### 3.3 TypeScript 侧（stores/useCalendarStore.ts）

```typescript
// Zustand Store 接口
interface CalendarStore {
  events: Event[];
  isLoading: boolean;
  error: AppError | null;

  // 操作
  fetchEvents: (startDate: number, endDate: number) => Promise<void>;
  createEvent: (input: CreateEventInput) => Promise<Event>;
  updateEvent: (id: string, input: UpdateEventInput) => Promise<Event>;
  deleteEvent: (id: string) => Promise<void>;
  getFreeSlots: (date: number, durationMinutes: number) => Promise<TimeSlot[]>;
}
```

---

## 4. 实施步骤

### 步骤 1：创建 SQLite Schema 文件

- 文件位置：`src-tauri/src/db/schema.sql`
- 内容：上述 2.1 节完整 SQL
- 验证：在 SQLite 客户端中执行，确认无语法错误

### 步骤 2：实现 Rust 数据结构

- 文件：`src-tauri/src/models/event.rs`
- 实现 `Event`、`Reminder`、`EventType`、`EventStatus`、`Creator` 结构体
- 实现 `From<&rusqlite::Row>` trait

### 步骤 3：实现数据库迁移

- 文件：`src-tauri/src/db/migrations.rs`
- 实现 `run_migrations()` 函数
- 在 `main.rs` 启动时调用

### 步骤 4：实现 EventRepo（数据库访问层）

- 文件：`src-tauri/src/db/event_repo.rs`
- 实现 CRUD 方法（见 3.1 节）
- **注意**：所有 SQL 必须写在这个文件，禁止在其他地方写 SQL

### 步骤 5：实现 Tauri IPC 命令

- 文件：`src-tauri/src/commands/event_cmd.rs`
- 每个命令调用 `EventRepo` 的对应方法
- 错误处理：用 `?` 传播到 `AppError`

### 步骤 6：实现 TypeScript 类型定义

- 文件：`src/types/event.types.ts`
- 定义 `Event`、`CreateEventInput`、`UpdateEventInput` 接口

### 步骤 7：实现 Zustand Store

- 文件：`src/stores/useCalendarStore.ts`
- 实现 `fetchEvents`、`createEvent` 等方法
- 每个方法调用 `invoke()` 并更新 Store 状态

---

## 5. 验收标准

### 数据库层

- [ ] `schema.sql` 可在 SQLite 中成功执行，无语法错误
- [ ] WAL 模式配置正确（`journal_mode=WAL`）
- [ ] `busy_timeout=5000` 已设置
- [ ] 外键约束已启用（`foreign_keys=ON`）

### Rust 侧

- [ ] `Event` 结构体字段与 DB Schema 一一对应
- [ ] `Event::from_row()` 可正确解析 DB Row
- [ ] `EventRepo::create()` 成功插入后返回完整 `Event`
- [ ] `EventRepo::find_by_date_range()` 正确过滤 `deleted_at IS NULL`
- [ ] `EventRepo::soft_delete()` 只更新 `deleted_at`，不物理删除
- [ ] UUID v7 生成正确（时间有序，长度 36 字符）

### TypeScript 侧

- [ ] `event.types.ts` 类型定义与 DB Schema 字段一一对应
- [ ] `useCalendarStore.ts` 的 `fetchEvents` 正确调用 `invoke('list_events', ...)`
- [ ] 所有 `invoke` 调用均有错误处理（无 silent catch）

### 集成测试

- [ ] 创建事件 → 数据库有记录 → Store 中有该事件
- [ ] 更新事件 → 数据库 `updated_at` 变化 → Store 中事件已更新
- [ ] 软删除事件 → 数据库 `deleted_at` 非空 → `list_events` 不返回该事件
- [ ] 按日期范围查询 → 只返回 `start_time/end_time` 在范围内的事件

---

## 6. 未决策事项

- [ ] **UUID v7 的 Rust crate 选择**：`uuid` crate 的 v7 feature 是否稳定？是否需要手动实现？
- [ ] **重复事件展开策略**：`find_by_date_range` 是在 Rust 侧展开 `rrule`，还是用 SQLite 扩展（如 `recur`）？
- [ ] **时区处理**：是否引入 `chrono-tz` crate 来支持时区转换？还是只存 UTC，展示时转换？
- [ ] **批量操作**：是否需要 `bulk_create_events`、`bulk_delete_events`？

---

> 🕊️ 本文档由咕咕起草，老板确认后作为数据层开发基准。
> 变更需更新版本号并注明原因。
