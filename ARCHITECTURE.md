# 🏗️ Architecture Design — Desktop Calendar Tauri

> 版本：v1.0  
> 日期：2026-06-22  
> 状态：已确认

---

## 1. 项目定位

**纯本地桌面应用，核心身份是 MCP Server，同时提供两种 GUI 形态。**

| 身份 | 描述 | 用户 |
|------|------|------|
| **MCP Server**（核心） | 暴露日历操作工具，供 Agent 调用；支持 MCP Apps（返回可交互 HTML Widget） | AI Agent（WorkBuddy / Claude 等） |
| **周视图 GUI**（辅助） | 独立 Tauri 窗口，人类直接查看和操作日历 | 人类 |
| **桌面悬浮 Widget**（辅助） | 常驻桌面的悬浮球，可展开为周视图 | 人类 |

---

## 2. 三种视图形态

```
Desktop Calendar 应用
│
├── 形态 A：桌面悬浮球（Widget 模式）
│    └── 120×120px 圆形窗口，常驻桌面，可拖拽
│
├── 形态 B：周视图窗口（GUI 模式）
│    └── 860×780px 固定窗口，完整周视图
│
└── 形态 C：MCP Apps Widget（Agent 渲染）
     └── HTML Widget，嵌入 Agent 对话界面（WorkBuddy 等）
```

### 三种形态对比

| 特性 | 悬浮球 Widget | 周视图 GUI | MCP Apps Widget |
|------|--------------|-------------|-----------------|
| 触发方式 | 启动即显示 | 双击悬浮球展开 | Agent 调用工具（return_ui=true） |
| 窗口尺寸 | 120×120px | 860×780px | 由 Host 决定 |
| 显示内容 | 日期 + 星期 + 日程指示点 | 完整 7 日周视图 + 事件卡片 | 由 Widget HTML 决定 |
| 交互方式 | 拖拽、双击展开 | 点击、拖拽、导航 | 点击 Widget 内按钮 |
| 收缩方式 | 点击「✕」→ 最小化到托盘 | 点击「－」→ 收缩回悬浮球 | Host 关闭对话即消失 |
| 数据来源 | SQLite（同进程） | SQLite（同进程） | MCP Server 返回 HTML |

---

## 3. 功能设计

### 3.1 双形态窗口系统

| ID | 功能 | 描述 | 交互方式 |
| :--- | :--- | :--- | :--- |
| F1 | **悬浮球默认常驻** | 圆形窗口（120×120px），显示日期数字 + 星期简称 + 日程指示点，始终悬浮在桌面上 | 默认启动即为悬浮球模式 |
| F2 | **双击展开为周视图** | 悬浮球双击 → 窗口展开为固定尺寸的完整周视图（860×780px），带弹性动画过渡 | 双击 / Enter / Space |
| F3 | **收缩回悬浮球** | 周视图 Header 右侧「－」按钮 → 窗口缩小回悬浮球，带动画过渡 | 点击「－」按钮 |
| F4 | **关闭到托盘** | 周视图 Header 右侧「✕」按钮 → 按 close → hide → destroy 三级兜底策略隐藏窗口 | 点击「✕」按钮 |
| F5 | **悬浮球自由拖拽** | 悬浮球模式按住鼠标拖拽移动窗口位置（screen delta 计算，防 position 偏移） | 鼠标按住拖拽 |
| F6 | **周视图整体拖拽** | 周视图 Header 区域支持原生窗口拖拽（Tauri startDragging） | 鼠标按住 Header 拖拽 |
| F7 | **展开/收缩过渡锁** | `isTransitioning` 防止双击/快速点击导致的并发状态冲突，finally 中 300ms 后释放 | 自动 |

### 3.2 周视图核心渲染

| ID | 功能 | 描述 |
| :--- | :--- | :--- |
| F8 | **7 日周视图** | 周一至周日 7 列布局，显示 8:00–21:00 共 13 小时 |
| F9 | **时间刻度线** | 左侧时间列显示整点标签 + 整点实线 + 半点虚线 |
| F10 | **日列背景** | 每日列独立背景，今日列高亮（淡蓝色） |
| F11 | **日头标签** | 每列顶部显示「周一」+ 日期数字，今日高亮加粗蓝色 |
| F12 | **当前时间红线** | 红色横线精确标注当前时间位置，左侧显示 HH:MM 标签，每分钟刷新（timeTick） |
| F13 | **事件卡片渲染** | 按时间位置 + 颜色（根据事件类型）渲染彩色卡片 |
| F14 | **多事件重叠自动分列** | assignColumns 算法：同一天相同时段的事件自动分配到多列并排显示 |
| F15 | **事件超出显示范围过滤** | 时间在 8:00 前或 21:00 后的事件不渲染 |
| F16 | **毛玻璃半透明效果** | 窗口背景使用 CSS backdrop-filter blur(24px) 实现毛玻璃效果 |

### 3.3 事件信息展示

| ID | 功能 | 描述 |
| :--- | :--- | :--- |
| F17 | **事件 Tooltip 悬浮详情** | 鼠标悬停事件卡片 → 显示浮动详情弹窗（日程/时间/详情/链接/类型），边界检测防溢出 |
| F18 | **事件卡片颜色区分** | 按类型着色：面试蓝/会议绿/提醒橙/截止红/默认灰 |
| F19 | **事件链接点击跳转** | 点击事件卡片 → `window.open(url, _blank, noopener,noreferrer)` 打开外部链接 |
| F20 | **今日事件指示点** | 悬浮球底部红色圆点（pulse 动画）标识今天有日程 |
| F21 | **状态栏错误提示** | 底部状态栏在数据加载失败时显示红色错误信息，正常时显示"就绪·半透明模式" |

### 3.4 日期导航

| ID | 功能 | 描述 |
| :--- | :--- | :--- |
| F22 | **上一周 / 下一周** | Header 按钮 ◀ / ▶ 切换查看前后周 |
| F23 | **回到本周** | Header 按钮 ● 一键跳回当前周 |
| F24 | **刷新** | Header 按钮 ↻ 重新从数据库加载事件 |
| F25 | **周范围标题** | Header 中心显示「M月D日 - M月D日 (YYYY年)」 |

---

## 4. 技术选型

| 层级 | 技术 | 理由 |
|------|------|------|
| 桌面壳 | **Tauri 2.x** | 体积小、内存低、Rust 后端天然适合 MCP Server |
| 前端框架 | **React 18 + TypeScript** | GUI 和 MCP Apps Widget 共用组件逻辑 |
| 样式方案 | **Tailwind CSS** | 快速开发，毛玻璃效果易实现 |
| 状态管理 | **Zustand** | 轻量，TypeScript 友好，无 Provider 嵌套 |
| HTTP Server（Rust） | **axum** | 轻量，异步，与 Tauri 兼容好 |
| MCP 协议实现 | **rmcp** crate | Rust 的 MCP Server SDK，支持 SSE |
| MCP Apps 支持 | **ext-apps SDK** | 前端 Widget 与 Host 双向通信 |
| 数据存储 | **SQLite** (`rusqlite` + `tokio-rusqlite`) | 本地文件，零配置，WAL 模式支持并发 |
| 日期处理 | **chrono** (Rust) / **date-fns** (TS) | 行业标准 |
| 错误处理 | **thiserror** + **anyhow** | Rust 最佳实践 |
| 日志 | **tracing** | 结构化日志，Rust 生态标准 |
| UUID 生成 | **uuid** (Rust) / **crypto.randomUUID()** (TS) | UUID v7（时间有序） |

---

## 5. 进程与端口

### 5.1 进程模型

```
┌─────────────────────────────────────┐
│  单进程：desktop-calendar.exe         │
│                                     │
│  ├── 主线程：Tauri 事件循环        │
│  ├── WebView：GUI 渲染（周视图）   │
│  ├── WebView：悬浮球 Widget        │
│  └── tokio 运行时：                │
│      ├── HTTP Server (axum)         │
│      ├── MCP Server (rmcp + SSE)   │
│      ├── MCP Apps Resource 服务      │
│      └── SQLite 异步读写             │
└─────────────────────────────────────┘
```

**优势**：
- 无进程间通信开销
- 悬浮球和周视图共享同一块内存状态
- Agent 操作 → 直接修改前端 Zustand Store → UI 实时刷新
- 三种形态（悬浮球 / 周视图 / MCP Apps Widget）使用同一套 React 组件逻辑

### 5.2 端口方案

| 参数 | 值 | 说明 |
|------|-----|------|
| MCP HTTP 端口 | **18765** | 固定端口，IANA 未注册段 |
| MCP 端点（SSE 连接） | `GET http://localhost:18765/mcp` | SSE 流 |
| MCP 端点（发送消息） | `POST http://localhost:18765/mcp` | JSON-RPC 2.0 |
| MCP Apps Resource 端点 | `GET http://localhost:18765/widgets/*` | 返回 HTML Widget 资源 |
| 冲突处理 | 启动失败，提示用户 | V1 不做自动重试 |

---

## 6. 数据流设计

### 6.1 人类用户操作（GUI → DB）

```
用户在周视图点击"新建事件"
        │
        ▼
EventForm（表单提交）
        │
        ▼
useEvents.ts（useMutation）
        │ invoke('create_event', ...)
        ▼
Rust commands/event_cmd.rs
        │
        ▼
db/event_repo.rs（INSERT INTO events ...）
        │
        ▼
SQLite（calendar.db）
        │
        ▼
触发 Zustand Store 更新（通过 Tauri event）
        │
        ▼
周视图 + 悬浮球 同时自动刷新
```

### 6.2 Agent 操作（MCP → DB → GUI 实时刷新）

```
Agent 发送 MCP tools/call { name: "create_event", ... }
        │ HTTP POST :18765/mcp
        ▼
axum 路由 → mcp/server.rs
        │
        ▼
tools.rs（execute_tool）
        │
        ▼
db/event_repo.rs（同样的 INSERT 逻辑）
        │
        ▼
SQLite（calendar.db）
        │
        ▼
通过 Tauri app.emit_all("db:events_changed", ...) 通知前端
        │
        ▼
Zustand Store 监听事件 → 重新加载数据
        │
        ▼
周视图 + 悬浮球 + MCP Apps Widget 同时实时刷新
```

**关键点**：`db/event_repo.rs` 是**唯一写数据库的地方**，GUI 和 MCP 走完全相同的代码路径。

### 6.3 MCP Apps Widget 数据流（核心差异化）

```
Agent 调用工具，return_ui=true
        │
        ▼
tools.rs 返回 ToolResult + _meta.ui.resourceUri
        │ 例如：{"_meta": {"ui": {"resourceUri": "widget://calendar/events-list"}}}
        ▼
Host（WorkBuddy）收到 _meta.ui.resourceUri
        │
        ▼
Host 调用 resources/read，uri = "widget://calendar/events-list"
        │
        ▼
resources.rs 返回 HTML Widget（完整 HTML 页面）
        │
        ▼
Host 在对话界面中用 iframe / WebView 渲染 HTML
        │
        ▼
用户在 Widget 中点击"查看详情"
        │
        ▼
Widget JS 调用 ext-apps SDK：window.parent.postMessage({type: 'ui_event', ...})
        │
        ▼
Host 收到 ui_event → 可以触发新的 Agent 工具调用
```

**ext-apps SDK 通信协议**（Widget ↔ Host）：

```typescript
// Widget 中发送消息给 Host
window.parent.postMessage({
  type: 'ui_event',
  action: 'view_event',
  data: { event_id: 'xxx' }
}, '*');

// Widget 中请求 Host 调用工具（高级用法）
window.parent.postMessage({
  type: 'tool_call',
  tool: 'get_event',
  args: { event_id: 'xxx' }
}, '*');
```

---

## 7. 数据库设计

### 7.1 Schema（V1）

```sql
-- 事件表
CREATE TABLE events (
    id              TEXT PRIMARY KEY,           -- UUID v7（时间有序）
    title           TEXT NOT NULL,             -- 事件标题
    description     TEXT,                      -- 事件描述
    start_time      INTEGER NOT NULL,          -- 开始时间 (Unix ms, UTC)
    end_time        INTEGER NOT NULL,          -- 结束时间 (Unix ms, UTC)
    timezone        TEXT DEFAULT 'UTC',        -- 创建时使用的时区（如 'Asia/Shanghai'）
    is_all_day      INTEGER DEFAULT 0,         -- 是否全天 (0/1)
    rrule           TEXT,                      -- RFC 5545 RRULE（NULL=不重复）
    rrule_until     INTEGER,                  -- 重复结束时间 (Unix ms, UTC)，NULL=无限
    exdates         TEXT,                      -- 例外日期 JSON 数组，如 '[1700000000000]'
    status          TEXT DEFAULT 'confirmed',   -- 'confirmed' | 'cancelled' | 'tentative'
    color           TEXT DEFAULT '#3B82F6',   -- 颜色标签 (hex)
    event_type      TEXT DEFAULT 'default',     -- 事件类型：'interview'|'meeting'|'reminder'|'deadline'|'default'
    location        TEXT,                      -- 地点
    url             TEXT,                      -- 关联链接（F19 点击跳转）
    created_by      TEXT DEFAULT 'human',      -- 创建者: 'human' | 'agent'
    created_at      INTEGER NOT NULL,          -- 创建时间 (Unix ms)
    updated_at      INTEGER NOT NULL,          -- 更新时间 (Unix ms)
    deleted_at      INTEGER DEFAULT NULL         -- 软删除（NULL = 未删除）
);

CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_deleted_at ON events(deleted_at);

-- 提醒表
CREATE TABLE reminders (
    id            TEXT PRIMARY KEY,
    event_id      TEXT NOT NULL,
    remind_at     INTEGER NOT NULL,        -- 提醒触发时间 (Unix ms, UTC)
    type          TEXT DEFAULT 'notification',  -- 'notification' | 'email' | 'sound'
    is_sent       INTEGER DEFAULT 0,
    sent_at       INTEGER,                   -- 实际发送时间 (Unix ms)
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX idx_reminders_remind_at ON reminders(remind_at) WHERE is_sent = 0;

-- 设置表
CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- 初始化数据
INSERT INTO settings (key, value) VALUES ('db_version', '1');
INSERT INTO settings (key, value) VALUES ('local_revision', '0');
```

### 7.2 WAL 模式

```sql
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA foreign_keys=ON;
PRAGMA busy_timeout=5000;  -- 5 秒忙等待（并发写入保护）
```

### 7.3 字段设计说明

| 字段 | 说明 |
|------|------|
| `id` 用 UUID v7 | 时间有序，插入 B-tree 不会碎片化（比 UUID v4 性能好） |
| `timezone` | 重复事件展开时需要知道"每周一上午 9 点"是哪个时区的 9 点 |
| `rrule` + `rrule_until` + `exdates` | 支持重复事件（RFC 5545 标准，和 Google Calendar 兼容） |
| `status` | 支持取消（不删除，保留记录） |
| `event_type` | 用于 F18 事件卡片颜色区分（面试蓝/会议绿/提醒橙/截止红/默认灰） |
| `url` | 用于 F19 事件链接点击跳转 |
| `deleted_at` | 软删除，未来支持同步和撤回 |
| `created_by` | 区分人类和 Agent 创建的事件，未来可用于过滤/高亮 |

---

## 8. MCP Server 设计

### 8.1 传输方式

| 参数 | 值 |
|------|-----|
| 传输协议 | HTTP + Server-Sent Events (SSE) |
| 端点（建立连接） | `GET http://localhost:18765/mcp` → SSE 流 |
| 端点（发送消息） | `POST http://localhost:18765/mcp` → JSON-RPC 2.0 |
| 认证 | V1：无（本地 only）/ V2：token |
| 并发 | 支持多 Agent 同时连接（SSE 多播） |

### 8.2 工具列表（V1）

| 工具名 | 描述 | 参数 | 是否支持 MCP Apps |
|--------|------|------|-------------------|
| `list_events` | 按日期范围查询事件 | `start_date`, `end_date`, `return_ui?` | ✅ 是 |
| `get_event` | 获取单个事件详情 | `event_id` | ✅ 是 |
| `create_event` | 创建新事件 | `title`, `start_time`, `end_time`, `description?`, `color?`, `event_type?`, `url?` | ❌ 否（返回文本确认） |
| `update_event` | 更新事件 | `event_id`, `title?`, `start_time?`, ... | ❌ 否 |
| `delete_event` | 删除事件（软删除） | `event_id` | ❌ 否 |
| `get_free_slots` | 查询空闲时间段 | `date`, `duration_minutes` | ✅ 是 |

**`return_ui` 参数**（可选）：
- `return_ui: false`（默认）：返回纯 JSON 文本
- `return_ui: true`：返回 JSON + `_meta.ui.resourceUri`，触发 MCP Apps Widget 渲染

### 8.3 MCP Apps Resource 设计

```
Resource URI 格式：widget://calendar/{widget_name}

已定义的 Widget：
  - widget://calendar/events-list     → 事件列表 Widget（对应 F8-F16 周视图）
  - widget://calendar/event-detail   → 事件详情 Widget（对应 F17）
  - widget://calendar/free-slots     → 空闲时间 Widget
  - widget://calendar/month-view     → 月历视图 Widget（V2）
```

**`resources/read` 返回格式**（符合 MCP Apps 规范）：

```json
{
  "contents": [
    {
      "uri": "widget://calendar/events-list",
      "mimeType": "text/html;profile=mcp-app",
      "text": "<!DOCTYPE html><html>...完整 HTML...</html>"
    }
  ]
}
```

### 8.4 工具调用示例

**Agent 调用（文本返回）**：
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "list_events",
    "arguments": {
      "start_date": 1719014400000,
      "end_date": 1719100800000,
      "return_ui": false
    }
  },
  "id": 1
}
```

**Agent 调用（MCP Apps Widget 返回）**：
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "list_events",
    "arguments": {
      "start_date": 1719014400000,
      "end_date": 1719100800000,
      "return_ui": true
    }
  },
  "id": 2
}
```

**返回结果（MCP Apps）**：
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "找到 3 个事件，已为您渲染可交互日历 Widget。"
      }
    ],
    "_meta": {
      "ui": {
        "resourceUri": "widget://calendar/events-list"
      }
    }
  },
  "id": 2
}
```

### 8.5 Agent 连接配置示例

**WorkBuddy（`~/.workbuddy/mcp.json`）**：

```json
{
  "mcpServers": {
    "desktop-calendar": {
      "url": "http://localhost:18765/mcp"
    }
  }
}
```

---

## 9. 窗口系统设计详述

### 9.1 悬浮球模式（F1, F5）

| 属性 | 值 |
|------|-----|
| 窗口尺寸 | 120×120px，圆形（border-radius: 50%） |
| 窗口类型 | `Tauri::Window` with `transparent: true`，无标题栏 |
| 置顶 | `always_on_top: true` |
| 点击穿透 | `ignores_mouse_events: false`（可交互） |
| 显示内容 | 日期数字（大号字体）+ 星期简称（小号字体）+ 日程指示点（底部红点） |
| 拖拽 | 鼠标按住整个窗口区域拖拽，使用 screen delta 计算偏移量，防止多显示器位置偏移 |
| 双击 | 触发 `toggleExpand()` → 展开为周视图 |

**拖拽实现要点**（F5）：
```typescript
// 拖拽逻辑（防止多显示器 position 偏移）
let isDragging = false;
let startX = 0, startY = 0, startLeft = 0, startTop = 0;

onMouseDown(e) {
  isDragging = true;
  startX = e.screenX;
  startY = e.screenY;
  const pos = getCurrentWindow().outerPosition;
  startLeft = pos.x;
  startTop = pos.y;
};

onMouseMove(e) {
  if (!isDragging) return;
  const deltaX = e.screenX - startX;  // 使用 screen 坐标，避免多显示器偏移
  const deltaY = e.screenY - startY;
  getCurrentWindow().setPosition(startLeft + deltaX, startTop + deltaY);
};
```

### 9.2 周视图模式（F2, F3, F4, F6）

| 属性 | 值 |
|------|-----|
| 窗口尺寸 | 860×780px，固定尺寸 |
| 窗口类型 | 普通 Tauri 窗口，自定义 Header（无系统标题栏） |
| 置顶 | 可选（设置中配置） |
| Header 拖拽 | Header 区域 `onMouseDown` → `getCurrentWindow().startDragging()`（F6） |
| 收缩按钮「－」 | 触发 `shrinkToWidget()` → 窗口缩小回 120×120px 圆形，带动画（F3） |
| 关闭按钮「✕」 | 触发 `closeToTray()` → close → hide → destroy 三级兜底（F4） |

**关闭到托盘三级兜底**（F4）：
```typescript
async function closeToTray() {
  try {
    await getCurrentWindow().close();   // 第一级：正常关闭
  } catch {
    try {
      await getCurrentWindow().hide();   // 第二级：隐藏窗口
    } catch {
      // 第三级：销毁窗口但保留进程（tray 仍在）
      // 用户点击 tray icon 时再重建窗口
    }
  }
}
```

### 9.3 展开/收缩过渡锁（F7）

```typescript
const isTransitioning = useRef(false);

async function toggleExpand() {
  if (isTransitioning.current) return;  // 防并发
  isTransitioning.current = true;
  try {
    if (isWidgetMode) {
      await animateExpand();  // 悬浮球 → 周视图（弹性动画）
    } else {
      await animateShrink();  // 周视图 → 悬浮球（弹性动画）
    }
  } finally {
    setTimeout(() => { isTransitioning.current = false; }, 300);  // 300ms 后释放锁
  }
}
```

---

## 10. 周视图渲染详述（F8-F16）

### 10.1 7 日周视图布局（F8）

```
┌──────────────────────────────────────────────────────────┐
│  ◀  2026年6月22日 - 6月28日 (2026年)  ●  ↻       │  ← Header（F6 可拖拽）
├────┬──────┬──────┬──────┬──────┬──────┬──────┤
│ 周一 │ 周二 │ 周三 │ 周四 │ 周五 │ 周六 │ 周日 │
│ 22日│ 23日 │ 24日 │ 25日 │ 26日 │ 27日 │ 28日 │  ← 日头标签（F11）
├────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ 8:00│      │      │      │      │      │      │  ← 时间刻度线（F9）
│ —————│——————│——————│——————│——————│——————│——————│
│ 8:30│      │      │      │      │      │      │  ← 半点虚线
│ - - │ - - -│ - - -│ - - -│ - - -│ - - -│ - - -│
│ 9:00│      │      │      │ ┌──────┐     │      │  ← 事件卡片（F13）
│ —————│——————│——————│——————│ │会议  │——————│——————│
│      │      │      │      │ │9:00- │      │      │
│      │      │      │      │ │10:00  │      │      │
│ 10:00│      │      │      │ └──────┘     │      │
│ —————│——————│——————│——————│——————│——————│——————│
│ ...  │      │      │      │      │      │      │
│ 21:00│      │      │      │      │      │      │
└────┴──────┴──────┴──────┴──────┴──────┴──────┘
                    │← 当前时间红线（F12）── 红色横线 + 14:30 标签
```

### 10.2 多事件重叠自动分列算法（F14）

```typescript
// assignColumns：同一天相同时段的事件自动分配到多列
function assignColumns(events: Event[]): EventWithColumn[] {
  // 按 start_time 排序
  const sorted = [...events].sort((a, b) => a.start_time - b.start_time);
  const columns: EventWithColumn[] = [];
  const activeColumns: { event: Event; end: number }[] = [];

  for (const event of sorted) {
    // 移除已结束的列
    const stillActive = activeColumns.filter(c => c.end > event.start_time);
    // 复用第一个可用的列号
    const colIndex = stillActive.length;  // 0-based
    columns.push({ ...event, column: colIndex, totalColumns: 0 });
    activeColumns.push({ event, end: event.end_time });
  }
  // 计算每行的 totalColumns
  for (const col of columns) {
    col.totalColumns = Math.max(...columns
      .filter(c => isOverlapping(c, col))
      .map(c => c.column + 1));
  }
  return columns;
}
```

### 10.3 事件卡片颜色区分（F18）

| event_type | 颜色 | 说明 |
|------------|------|------|
| `interview` | `#3B82F6` 蓝色 | 面试 |
| `meeting` | `#10B981` 绿色 | 会议 |
| `reminder` | `#F59E0B` 橙色 | 提醒 |
| `deadline` | `#EF4444` 红色 | 截止 |
| `default` | `#6B7280` 灰色 | 默认 |

---

## 11. 实时同步设计

### 11.1 GUI ↔ MCP Server 同步（同进程）

```
Agent 通过 MCP 修改数据
        │
        ▼
db/event_repo.rs 写入成功
        │
        ▼
触发 Tauri 事件：app.emit_all("db:events_changed", payload)
        │
        ▼
前端 listen("db:events_changed")
        │
        ▼
Zustand Store 重新 fetch 事件列表
        │
        ▼
React 组件自动重新渲染（周视图 + 悬浮球同时刷新）
```

### 11.2 事件载荷

```typescript
// "db:events_changed" 事件载荷
interface DbChangedEvent {
  table: 'events' | 'reminders';
  action: 'create' | 'update' | 'delete';
  id: string;
  timestamp: number;
}
```

---

## 12. 错误处理策略

### 12.1 Rust 侧

```rust
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Db(#[from] rusqlite::Error),

    #[error("Event not found: {0}")]
    EventNotFound(String),

    #[error("Invalid time range: start={0}, end={1}")]
    InvalidTimeRange(i64, i64),

    #[error("MCP error: {0}")]
    Mcp(String),

    #[error("HTTP server error: {0}")]
    Http(#[from] axum::Error),
}

// 所有 commands 和 MCP tools 返回 Result<T, AppError>
```

### 12.2 TypeScript 侧

```typescript
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: unknown
  ) { super(message); }
}

// F21：状态栏错误提示
function StatusBar() {
  const [error, setError] = useState<AppError | null>(null);
  return (
    <div className="status-bar">
      {error ? (
        <span className="error">{error.message}</span>
      ) : (
        <span className="ready">就绪·半透明模式</span>
      )}
    </div>
  );
}
```

---

## 13. 构建与发布

### 13.1 开发环境

```bash
# 安装依赖
cd src-tauri && cargo install
npm install

# 开发模式（热重载）
npm run tauri dev

# 构建 Widget（独立命令）
npm run build:widget    # 输出到 dist-widget/
```

### 13.2 生产构建

```bash
# 1. 构建 Widget
npm run build:widget

# 2. 构建 Tauri 应用（会自动打包 dist-widget/）
npm run tauri build

# 输出
# Windows: src-tauri/target/release/desktop-calendar.exe
#          + NSIS 安装包 / MSI
```

---

## 14. 开发路线图

### Phase 1 — MVP（最小可用）

- [ ] Tauri 2.x 项目脚手架
- [ ] SQLite 数据层（events 表 CRUD，含 rrule / event_type 支持）
- [ ] 悬浮球 Widget（F1, F5, F20）
- [ ] 周视图核心渲染（F8-F16）
- [ ] 事件信息展示（F17-F19, F21）
- [ ] 日期导航（F22-F25）
- [ ] 双形态窗口系统（F2-F7）
- [ ] Tauri IPC 打通前后端
- [ ] 系统托盘集成

### Phase 2 — MCP Server

- [ ] axum HTTP Server 集成到 Tauri 进程
- [ ] rmcp MCP Server 实现（SSE 传输）
- [ ] 暴露 V1 工具（`list_events` / `create_event` 等）
- [ ] 通过 WorkBuddy 测试 Agent 连接
- [ ] GUI ↔ MCP 实时同步（Tauri event）

### Phase 3 — MCP Apps Widget

- [ ] Widget 前端代码（独立入口）
- [ ] Widget 构建流程（`npm run build:widget`）
- [ ] `resources.rs` 实现（返回 HTML Widget）
- [ ] ext-apps SDK 集成（Widget ↔ Host 通信）
- [ ] 通过 WorkBuddy 测试 Widget 渲染

### Phase 4 — 完善与开源

- [ ] 事件拖拽交互
- [ ] 提醒通知（系统通知 API）
- [ ] 图标、应用元数据
- [ ] README 中英文双语
- [ ] 架构文档 + 贡献指南
- [ ] GitHub Actions CI/CD
- [ ] 代码签名（Windows / macOS）

---

## 15. 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| axum 与 Tauri 事件循环冲突 | 进程崩溃 | 用 `tokio::spawn` 独立运行时，通过 channel 通信 |
| SQLite 并发写入锁 | MCP 和 GUI 同时写失败 | WAL 模式 + `busy_timeout=5000` + 重试逻辑（指数退避） |
| 端口 18765 被占用 | 启动失败 | V1：提示用户；V2：自动切换随机端口 |
| MCP Apps SDK 变更 | Widget 失效 | 锁定 SDK 版本，跟随 CodeBuddy 官方更新 |
| Tauri 2.x 生态不稳定 | 开发受阻 | 锁定版本，等待稳定版 |
| Widget iframe 沙箱限制 | 功能受限 | 使用 postMessage，避免直接 DOM 操作 |
| 多显示器位置偏移 | 拖拽后窗口位置错误 | 使用 screenX/screenY 计算 delta（F5） |

---

## 16. 未决策事项（待讨论）

- [ ] **提醒触发机制**：前台轮询 vs Rust `tokio::timer` vs 系统计划任务
- [ ] **Widget 样式**：跟随系统主题 vs 固定亮色 vs 用户自定义
- [ ] **MCP Apps 返回格式**：每个工具都支持 `return_ui` vs 只有查询类工具支持
- [ ] **数据导入/导出**：未来是否支持 .ics 文件导入/导出？
- [ ] **多日历支持**：V2 是否支持多个日历（工作/个人/节假日）？
- [ ] **国际化**：先中英文，还是只做中文？

---

> 🕊️ 本文档由咕咕起草，老板确认后作为架构基准。  
> 重大架构变更需更新本文档，并注明变更原因。
