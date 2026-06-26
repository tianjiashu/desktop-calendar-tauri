# Desktop Calendar Tauri

面向人类用户和 AI Agent 的桌面日历应用。项目基于 **Tauri 2 + React + SQLite** 构建，内置本地 MCP Server，让 Agent 可以通过标准 MCP 工具读写同一份日历数据。

核心理念：人类通过桌面 GUI 管理日程，Agent 通过 MCP 协议管理日程，两者共享同一份 SQLite 数据库，改动会实时同步到界面。

## 功能概览

**桌面日历**

- 悬浮圆形 Widget：默认停靠在屏幕右下区域，可拖动，显示日期和今日事件概览
- 周视图：展开后显示 7 天时间网格，支持创建、编辑、删除事件
- 事件类型：面试、会议、提醒、截止、默认
- 托盘菜单：显示日历、隐藏到托盘、退出应用
- 单实例启动：重复打开 exe 时会唤起已有窗口，而不是启动多个进程
- 暗色模式：跟随系统主题

**MCP / Agent 能力**

- 本地 HTTP MCP Server：默认监听 `http://127.0.0.1:18765/mcp`
- MCP Apps Widget：工具结果可以渲染为交互式 HTML Widget
- 支持查询事件、查看详情、创建事件、更新事件、删除事件、查询空闲时间段
- MCP 输入做了严格校验：时间范围、颜色、URL、事件类型、状态等非法参数会明确报错

## MCP 工具

| 工具 | 说明 |
| --- | --- |
| `list_events` | 按时间范围查询事件，返回事件列表 Widget |
| `get_event` | 查询单个事件详情，返回详情 Widget |
| `create_event` | 创建新事件 |
| `update_event` | 更新已有事件，支持 `clear_fields` 清空备注、地点、链接 |
| `delete_event` | 软删除事件 |
| `get_free_slots` | 按 `YYYY-MM-DD` 查询指定日期内的空闲时间段，返回空闲时间 Widget |

### MCP 连接示例

应用启动后会自动启动 MCP HTTP 服务：

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

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 18, TypeScript, Vite 6 |
| UI | Phosphor Icons, Geist Sans/Mono, CSS variables |
| 状态管理 | Zustand |
| 桌面壳 | Tauri 2 |
| 数据库 | SQLite, rusqlite |
| MCP | rmcp Streamable HTTP Server, MCP Apps Widgets |
| 测试 | Cargo test, Vitest |

## 快速开始

```bash
npm install

# 前端开发服务
npm run dev

# 启动 Tauri 桌面应用
npm run tauri dev

# 前端构建
npm run build

# Rust 测试
cd src-tauri
cargo test
```

## 平台兼容性

当前主要在 **Windows** 上开发和验证。

| 平台 | 状态 | 说明 |
| --- | --- | --- |
| Windows | 已验证 | 托盘、透明窗口、右下角定位、单实例、MCP Server 均已验证 |
| macOS | 理论兼容，待实测 | Tauri/React/SQLite/MCP 代码基本跨平台，但托盘菜单栏图标、Dock 行为、透明置顶窗口、避开 Dock/Menu Bar 仍需在 macOS 上验证 |
| Linux | 未验证 | 核心依赖跨平台，但托盘和透明窗口行为依赖桌面环境 |

macOS 发布前建议补充：

- macOS 专用菜单栏 template icon
- Dock 图标显示/隐藏策略
- 窗口定位避开 Dock 和菜单栏
- `.app` 图标、签名、notarization、entitlements
- 在 Intel 和 Apple Silicon 设备上分别实测

## 项目结构

```text
desktop-calendar-tauri/
├─ src/                         # React 前端
│  ├─ components/
│  │  ├─ Calendar/              # EventCard, EventDialog, EventTooltip
│  │  ├─ Common/                # ErrorBoundary, StatusBar, DiagnosticPanel
│  │  ├─ WeekView/              # 周视图组件
│  │  └─ Widget/                # 悬浮球 Widget
│  ├─ hooks/                    # 窗口、拖拽、周导航等 hooks
│  ├─ stores/                   # Zustand store
│  ├─ utils/                    # 日期、布局、窗口工具
│  ├─ constants/                # 窗口尺寸、事件颜色
│  └─ types/                    # TypeScript 类型
├─ src-tauri/                   # Tauri / Rust 后端
│  ├─ src/
│  │  ├─ commands/              # Tauri IPC 命令
│  │  ├─ db/                    # SQLite schema, migrations, repository
│  │  ├─ mcp/                   # MCP Server, tools, resources, widgets
│  │  └─ models/                # Rust 数据模型
│  └─ tests/                    # Rust 集成测试
├─ docs/                        # 文档
├─ package.json
└─ README.md
```

## 数据模型

核心事件表：

```sql
CREATE TABLE events (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    description  TEXT,
    start_time   INTEGER NOT NULL,
    end_time     INTEGER NOT NULL,
    timezone     TEXT DEFAULT 'Asia/Shanghai',
    is_all_day   INTEGER DEFAULT 0,
    rrule        TEXT,
    rrule_until  INTEGER,
    exdates      TEXT,
    status       TEXT DEFAULT 'confirmed',
    color        TEXT DEFAULT '#3B82F6',
    event_type   TEXT DEFAULT 'default',
    location     TEXT,
    url          TEXT,
    created_by   TEXT DEFAULT 'human',
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL,
    deleted_at   INTEGER DEFAULT NULL
);
```

## 开发备注

- 项目日常开发规范见 [docs/DEVELOPMENT-GUIDELINES.md](docs/DEVELOPMENT-GUIDELINES.md)
- MCP 入参使用固定字符串时间，按 `Asia/Shanghai` 解读：日期时间为 `YYYY-MM-DD HH:mm`，日期为 `YYYY-MM-DD`
- 数据库内部仍使用 Unix milliseconds 存储，前端和 MCP 返回值中的事件时间字段保持毫秒值
- `create_event` 会拒绝相同时间相同标题的重复事件，并限制任意时间段最多 2 个事件
- MCP Server 仅绑定 `127.0.0.1`
- Widget HTML 通过 MCP resource 暴露，MIME 为 `text/html;profile=mcp-app`
- 修改代码后请运行 `cargo test` 和 `npm run build`

## License

MIT
