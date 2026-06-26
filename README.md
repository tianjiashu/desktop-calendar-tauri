# Desktop Calendar Tauri

![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=111)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-local-003B57?logo=sqlite&logoColor=white)
![MCP](https://img.shields.io/badge/MCP-enabled-4F6BED)
![License](https://img.shields.io/badge/license-MIT-green)

Desktop Calendar Tauri is a local-first desktop calendar for both humans and AI agents.
Humans manage schedules through a lightweight desktop UI, while agents use the built-in
local MCP server to read and write the same SQLite calendar database.

**Languages:** [English](#english) | [中文](#中文)

---

## English

### Highlights

- Floating desktop widget that starts near the bottom-right area and shows today's date and events.
- Expandable 7-day week view with time grid, event cards, editing, deletion, and drag updates.
- Local SQLite storage shared by the GUI and MCP tools.
- Built-in Streamable HTTP MCP server at `http://127.0.0.1:18765/mcp`.
- MCP Apps Widgets for interactive event lists, event details, and free-slot results.
- Real-time sync between GUI writes and MCP writes.
- Single-instance desktop startup: opening the executable again focuses the existing app.
- System tray menu for show, hide, and quit.
- System theme aware dark mode.

### Architecture

```text
Human user
  -> Tauri desktop window
  -> React UI
  -> Zustand store
  -> Tauri IPC
  -> SQLite

AI agent
  -> MCP client
  -> Local MCP HTTP server
  -> MCP tools
  -> SQLite
  -> db:events_changed
  -> React UI refresh
```

### Tech Stack

| Layer | Technology |
| --- | --- |
| Desktop shell | Tauri 2 |
| Frontend | React 18, TypeScript, Vite 6 |
| UI | Phosphor Icons, Geist Sans/Mono, CSS variables |
| State | Zustand |
| Database | SQLite, rusqlite |
| Agent protocol | rmcp Streamable HTTP Server, MCP Apps Widgets |
| Tests | Vitest, Cargo test |

### MCP Tools

| Tool | Description |
| --- | --- |
| `list_events` | List events in a fixed time range and optionally return an events-list widget. |
| `get_event` | Fetch a single event and optionally return an event-detail widget. |
| `create_event` | Create an event with validation and UI sync. |
| `update_event` | Update an event. Supports `clear_fields` for nullable fields. |
| `delete_event` | Soft-delete an event. |
| `get_free_slots` | Query free slots for a `YYYY-MM-DD` date and optionally return a widget. |

MCP time inputs use fixed string formats:

- Date time: `YYYY-MM-DD HH:mm`
- Date: `YYYY-MM-DD`
- Time zone: interpreted as `Asia/Shanghai`
- Internal storage: Unix milliseconds

### MCP Client Configuration

Start the desktop app first. The MCP server starts with the app.

```json
{
  "mcpServers": {
    "desktop-calendar": {
      "type": "http",
      "url": "http://127.0.0.1:18765/mcp"
    }
  }
}
```

Health check:

```text
http://127.0.0.1:18765/health
```

### Quick Start

Prerequisites:

- Node.js
- Rust toolchain
- Tauri system dependencies for your platform

Install dependencies:

```bash
npm install
```

Run the frontend dev server:

```bash
npm run dev
```

Run the Tauri desktop app:

```bash
npm run tauri dev
```

Build the frontend:

```bash
npm run build
```

Run tests:

```bash
npm test

cd src-tauri
cargo test
```

### Project Structure

```text
desktop-calendar-tauri/
├─ src/
│  ├─ components/
│  │  ├─ Calendar/          # Event cards, dialog, tooltip
│  │  ├─ Common/            # Error boundary, toast, diagnostics, status bar
│  │  ├─ WeekView/          # Week grid, header, time line, day columns
│  │  └─ Widget/            # Floating desktop widget
│  ├─ hooks/                # Stateful frontend workflows
│  ├─ services/             # Tauri IPC boundary
│  ├─ stores/               # Zustand global state
│  ├─ utils/                # Pure utilities
│  ├─ constants/            # Shared constants
│  └─ types/                # TypeScript types
├─ src-tauri/
│  ├─ src/
│  │  ├─ commands/          # Tauri IPC commands
│  │  ├─ db/                # SQLite schema, migrations, repositories
│  │  ├─ mcp/               # MCP server, tools, resources, widgets
│  │  └─ models/            # Rust data models
│  └─ tests/                # Rust integration tests
├─ docs/
│  └─ DEVELOPMENT-GUIDELINES.md
└─ README.md
```

### Platform Status

| Platform | Status | Notes |
| --- | --- | --- |
| Windows | Verified | Tray, transparent window, bottom-right positioning, single instance, and MCP server are tested. |
| macOS | Expected, not fully verified | Core stack is cross-platform, but menu bar tray icon, Dock behavior, transparent always-on-top windows, signing, and notarization still need validation. |
| Linux | Not verified | Core stack is cross-platform, but tray and transparent-window behavior depend on the desktop environment. |

### Development Guidelines

Project-specific rules live in [docs/DEVELOPMENT-GUIDELINES.md](docs/DEVELOPMENT-GUIDELINES.md).

Key boundaries:

- `App.tsx` is composition only.
- UI components should not call Tauri IPC directly.
- Stores call `src/services/tauriCommands.ts`, not raw `invokeSafe` or `invokeOrThrow`.
- Feature CSS belongs next to the feature, not in `App.css`.
- Temporary logs, generated outputs, coverage files, and local scripts should not be committed.

### License

MIT

---

## 中文

Desktop Calendar Tauri 是一个面向人类用户和 AI Agent 的本地优先桌面日历。
人类通过轻量桌面界面管理日程，Agent 通过内置本地 MCP Server 读写同一份 SQLite 日历数据库。

### 项目亮点

- 默认停靠在右下区域的悬浮桌面 Widget，展示日期和今日日程概览。
- 可展开的 7 日周视图，支持时间网格、事件卡片、编辑、删除和拖拽更新时间。
- GUI 和 MCP 工具共享同一份本地 SQLite 数据。
- 内置 Streamable HTTP MCP Server，默认地址为 `http://127.0.0.1:18765/mcp`。
- 支持 MCP Apps Widget，可在 Agent 对话中展示事件列表、事件详情和空闲时间。
- GUI 写入和 MCP 写入会实时同步。
- 单实例启动，重复打开 exe 会唤起已有窗口。
- 系统托盘菜单支持显示、隐藏和退出。
- 暗色模式跟随系统主题。

### 架构概览

```text
人类用户
  -> Tauri 桌面窗口
  -> React UI
  -> Zustand store
  -> Tauri IPC
  -> SQLite

AI Agent
  -> MCP client
  -> 本地 MCP HTTP server
  -> MCP tools
  -> SQLite
  -> db:events_changed
  -> React UI 刷新
```

### 技术栈

| 层级 | 技术 |
| --- | --- |
| 桌面壳 | Tauri 2 |
| 前端 | React 18, TypeScript, Vite 6 |
| UI | Phosphor Icons, Geist Sans/Mono, CSS variables |
| 状态管理 | Zustand |
| 数据库 | SQLite, rusqlite |
| Agent 协议 | rmcp Streamable HTTP Server, MCP Apps Widgets |
| 测试 | Vitest, Cargo test |

### MCP 工具

| 工具 | 说明 |
| --- | --- |
| `list_events` | 按固定时间范围查询事件，可返回事件列表 Widget。 |
| `get_event` | 查询单个事件详情，可返回事件详情 Widget。 |
| `create_event` | 创建事件，并进行参数校验和界面同步。 |
| `update_event` | 更新事件，支持用 `clear_fields` 清空可空字段。 |
| `delete_event` | 软删除事件。 |
| `get_free_slots` | 按 `YYYY-MM-DD` 查询空闲时间段，可返回空闲时间 Widget。 |

MCP 时间入参使用固定字符串格式：

- 日期时间：`YYYY-MM-DD HH:mm`
- 日期：`YYYY-MM-DD`
- 时区：按 `Asia/Shanghai` 解读
- 内部存储：Unix milliseconds

### MCP 客户端配置

先启动桌面应用，MCP Server 会随应用自动启动。

```json
{
  "mcpServers": {
    "desktop-calendar": {
      "type": "http",
      "url": "http://127.0.0.1:18765/mcp"
    }
  }
}
```

健康检查：

```text
http://127.0.0.1:18765/health
```

### 快速开始

前置要求：

- Node.js
- Rust toolchain
- 当前平台所需的 Tauri 系统依赖

安装依赖：

```bash
npm install
```

启动前端开发服务：

```bash
npm run dev
```

启动 Tauri 桌面应用：

```bash
npm run tauri dev
```

构建前端：

```bash
npm run build
```

运行测试：

```bash
npm test

cd src-tauri
cargo test
```

### 项目结构

```text
desktop-calendar-tauri/
├─ src/
│  ├─ components/
│  │  ├─ Calendar/          # 事件卡片、弹窗、Tooltip
│  │  ├─ Common/            # 错误边界、Toast、诊断面板、状态栏
│  │  ├─ WeekView/          # 周视图网格、头部、时间线、日列
│  │  └─ Widget/            # 悬浮桌面 Widget
│  ├─ hooks/                # 前端状态流程
│  ├─ services/             # Tauri IPC 边界
│  ├─ stores/               # Zustand 全局状态
│  ├─ utils/                # 纯工具函数
│  ├─ constants/            # 共享常量
│  └─ types/                # TypeScript 类型
├─ src-tauri/
│  ├─ src/
│  │  ├─ commands/          # Tauri IPC 命令
│  │  ├─ db/                # SQLite schema、迁移、仓库层
│  │  ├─ mcp/               # MCP server、tools、resources、widgets
│  │  └─ models/            # Rust 数据模型
│  └─ tests/                # Rust 集成测试
├─ docs/
│  └─ DEVELOPMENT-GUIDELINES.md
└─ README.md
```

### 平台兼容性

| 平台 | 状态 | 说明 |
| --- | --- | --- |
| Windows | 已验证 | 托盘、透明窗口、右下角定位、单实例和 MCP Server 均已测试。 |
| macOS | 理论兼容，尚未完整验证 | 核心技术栈跨平台，但菜单栏图标、Dock 行为、透明置顶窗口、签名和 notarization 仍需验证。 |
| Linux | 未验证 | 核心技术栈跨平台，但托盘和透明窗口行为依赖桌面环境。 |

### 开发规范

项目专用开发规范见 [docs/DEVELOPMENT-GUIDELINES.md](docs/DEVELOPMENT-GUIDELINES.md)。

关键边界：

- `App.tsx` 只做组合，不承载业务细节。
- UI 组件不直接调用 Tauri IPC。
- Store 统一调用 `src/services/tauriCommands.ts`，不直接调用 `invokeSafe` 或 `invokeOrThrow`。
- 功能样式放在对应功能目录，不再塞回 `App.css`。
- 临时日志、生成产物、覆盖率文件和本地实验脚本不提交。

### License

MIT
