# 08 - 数据同步设计#

> 所属阶段：Phase 2（MCP Server + 数据同步）
> 依赖模块：01-data-model、06-mcp-server
> 状态：已实现 ✅

---

## 1. 功能概述#

本模块负责 **GUI 和 MCP Server 之间的实时数据同步**，确保：
- Agent 通过 MCP 修改的数据，即时反映到 GUI（周视图 + 悬浮球）
- 人类通过 GUI 修改的数据，MCP Server 能立即读到最新值
- 多 Agent 同时操作时，不出现数据竞争

**核心机制**：Tauri 事件系统（`app.emit_all` + `listen`）。

**不负责**：MCP Server 协议处理（06）、数据库操作（01）。

---

## 2. 详细设计#

### 2.1 同步架构#

```
┌─────────────────────────────────────────────┐
│          Tauri 单进程                      │
│                                             │
│  ┌──────────────┐    ┌──────────────┐  │
│  │  GUI 线程     │    │  MCP Server   │  │
│  │  (Tauri WebView)│  │  (tokio 运行时)│  │
│  └──────┬───────┘    └──────┬───────┘  │
│          │                     │           │
│          └──────────┬────────────┘           │
│                     ▼                        │
│            ┌──────────────┐                  │
│            │   共享数据层    │                  │
│            │  (SQLite +   │                  │
│            │   AppState)   │                  │
│            └──────────────┘                  │
└─────────────────────────────────────────────┘

关键：同一进程，共享 AppState（Arc<Mutex<...>>）
```

### 2.2 Tauri 事件设计#

**事件名称**：`db:events_changed`

**载荷（Payload）**：

```typescript
// TypeScript 侧类型定义
interface DbChangedEvent {
  table: 'events' | 'reminders';
  action: 'create' | 'update' | 'delete';
  id: string;           //  affected event ID
  timestamp: number;     // Unix ms
}
```

```rust
// Rust 侧结构体
#[derive(Serialize, Deserialize)]
pub struct DbChangedEvent {
    pub table: String,
    pub action: String,
    pub id: String,
    pub timestamp: i64,
}
```

### 2.3 触发时机#

| 操作 | 触发位置 | 事件载荷示例 |
|------|---------|---------|
| Agent 创建事件 | `tools/create_event.rs` | `{ table: "events", action: "create", id: "xxx" }` |
| Agent 更新事件 | `tools/update_event.rs` | `{ table: "events", action: "update", id: "xxx" }` |
| Agent 删除事件 | `tools/delete_event.rs` | `{ table: "events", action: "delete", id: "xxx" }` |
| GUI 创建事件 | `commands/event_cmd.rs` | 同上 |
| GUI 更新事件 | `commands/event_cmd.rs` | 同上 |
| GUI 删除事件 | `commands/event_cmd.rs` | 同上 |

**原则**：所有写操作（无论来自 GUI 还是 MCP）都触发事件。

### 2.4 前端监听实现#

```typescript
// stores/useCalendarStore.ts

import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

interface CalendarStore {
  events: Event[];
  isLoading: boolean;
  lastSync: number;  // 上次同步时间戳
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  events: [],
  isLoading: false,
  lastSync: 0,

  // 初始化监听（在 App.tsx 中调用一次）
  initListener: () => {
    listen<DbChangedEvent>('db:events_changed', async (event) => {
      const { action, id } = event.payload;

      // 乐观更新：根据 action 类型直接修改本地状态
      set(state => {
        if (action === 'create' || action === 'update') {
          // 重新获取该事件（保证数据一致性）
          fetchEventById(id).then(event => {
            const events = state.events.filter(e => e.id !== id);
            events.push(event);
            set({ events: sortEvents(events) });
          });
        } else if (action === 'delete') {
          set({
            events: state.events.filter(e => e.id !== id)
          });
        }
      });

      set({ lastSync: Date.now() });
    });
  },

  // 全量刷新（兜底）
  refetch: async () => {
    set({ isLoading: true });
    try {
      const events = await invoke<Event[]>('list_events', {
        startDate: getWeekStart(),
        endDate: getWeekEnd(),
      });
      set({ events, isLoading: false, lastSync: Date.now() });
    } catch (e) {
      set({ isLoading: false });
      console.error('Failed to refetch events:', e);
    }
  },
}));
```

### 2.5 Rust 侧事件发射#

```rust
// db/event_repo.rs

use tauri::Manager;
use serde_json::json;

pub struct EventRepo {
    app: AppHandle,
    conn: Mutex<Connection>,
}

impl EventRepo {
    /// 创建事件并触发同步事件
    pub fn create(&self, input: &CreateEventInput) -> Result<Event> {
        let event = // ... 数据库插入逻辑

        // 发射事件
        self.app.emit_all(
            "db:events_changed",
            json!({
                "table": "events",
                "action": "create",
                "id": event.id,
                "timestamp": Utc::now().timestamp_millis(),
            }),
        )?;

        Ok(event)
    }

    // update / delete 同理
}
```

### 2.6 并发安全#

**问题**：多个 Agent 同时操作，前端可能收到乱序事件。

**解决方案**：前端维护 `lastSync` 时间戳，每次收到事件时：
1. 如果 `event.timestamp < lastSync` → 丢弃（过期事件）
2. 如果 `event.timestamp >= lastSync` → 处理，并更新 `lastSync`

```typescript
// stores/useCalendarStore.ts（补充）

initListener: () => {
  listen<DbChangedEvent>('db:events_changed', async (event) => {
    const { timestamp } = event.payload;
    const { lastSync } = get();

    // 丢弃过期事件
    if (timestamp < lastSync) return;

    // 处理事件...
    set({ lastSync: timestamp });
  });
},
```

### 2.7 兜底策略#

如果事件丢失（例如前端暂时断开监听），提供**手动刷新**和**定时轮询**两种兜底：

```typescript
// hooks/useSync.ts

export function useSync() {
  const refetch = useCalendarStore(s => s.refetch);
  const lastSync = useCalendarStore(s => s.lastSync);

  // 每 30 秒兜底轮询
  useEffect(() => {
    const timer = setInterval(() => {
      refetch();
    }, 30_000);
    return () => clearInterval(timer);
  }, [refetch]);

  // 窗口获得焦点时刷新
  useEffect(() => {
    const unlisten = getCurrentWindow().onFocus(() => {
      refetch();
    });
    return () => { unlisten.then(f => f()); };
  }, [refetch]);

  return { refetch };
}
```

---

## 3. 接口定义#

### 3.1 Rust 侧（db/event_repo.rs）#

```rust
impl EventRepo {
    pub fn create(&self, input: &CreateEventInput) -> Result<Event>;
    pub fn update(&self, id: &str, input: &UpdateEventInput) -> Result<Event>;
    pub fn delete(&self, id: &str) -> Result<()>;
    // 内部会调用 self.app.emit_all(...)
}
```

### 3.2 TypeScript 侧（stores/useCalendarStore.ts）#

```typescript
interface CalendarStore {
  events: Event[];
  isLoading: boolean;
  lastSync: number;

  initListener: () => void;
  refetch: () => Promise<void>;
}
```

---

## 4. 实施步骤#

### 步骤 1：定义事件载荷类型#

- Rust 侧：在 `src-tauri/src/db/event_repo.rs` 中定义 `DbChangedEvent`
- TypeScript 侧：在 `src/types/sync.types.ts` 中定义同名接口
- 验证：两边字段名和类型完全一致

### 步骤 2：Rust 侧实现事件发射#

- 修改 `EventRepo::create()` / `update()` / `delete()`
- 每次 DB 写操作后调用 `self.app.emit_all("db:events_changed", ...)`

### 步骤 3：前端实现监听#

- 在 `stores/useCalendarStore.ts` 中实现 `initListener()`
- 在 `App.tsx` 启动时调用一次

### 步骤 4：实现乐观更新#

- 收到 `create` / `update` 事件时，直接修改 Zustand store（不重新请求 DB）
- 验证：Agent 创建事件后，GUI 在 < 500ms 内刷新

### 步骤 5：实现兜底策略#

- 添加 30 秒定时轮询
- 添加窗口焦点刷新
- 验证：手动断开监听 10 秒，恢复后数据一致

---

## 5. 验收标准#

### 实时同步#

- [ ] Agent 通过 MCP 创建事件 → GUI 周视图在 < 1s 内刷新
- [ ] Agent 通过 MCP 更新事件 → GUI 事件卡片信息实时更新
- [ ] Agent 通过 MCP 删除事件 → GUI 事件卡片实时消失
- [ ] 人类通过 GUI 创建事件 → `db:events_changed` 事件触发
- [ ] 快速连续操作（1 秒内 5 次创建）→ 最终状态正确（无丢失）

### 并发安全#

- [ ] 两个 Agent 同时创建事件 → 前端收到 2 个事件（无丢失）
- [ ] 事件乱序到达（模拟） → 前端按 `timestamp` 正确排序
- [ ] `lastSync` 机制生效 → 过期事件被丢弃

### 兜底策略#

- [ ] 前端每 30 秒自动轮询 DB（网络恢复场景）
- [ ] 窗口获得焦点时触发刷新
- [ ] 手动点击刷新按钮 → 立即全量同步

---

## 6. 未决策事项#

- [ ] **事件粒度**：只发 `{ action, id }` 是否足够？还是直接把整个 `Event` 对象放在事件里？（后者省去前端二次请求，但事件载荷变大）
- [ ] **多窗口同步**：如果未来支持同时打开多个窗口（主窗口 + 多个事件详情窗口），事件是否需要按窗口过滤？
- [ ] **冲突解决**：如果两个 Agent 同时更新同一个事件的不同字段，以谁为准？（目前以 DB 写入顺序为准，无智能合并）

---

> 🕊️ 本文档由咕咕起草，老板确认后作为数据同步开发基准。
> 变更需更新版本号并注明原因。
