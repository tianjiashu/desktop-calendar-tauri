# Desktop Calendar Tauri

> 面向人类和 Agent 双用户的桌面日历应用,基于 Tauri 2.x 构建,原生支持 MCP 协议。

**核心理念**: 传统日历只有人类一个用户视角。本项目让 AI Agent 也成为日历的一等公民——人类通过 GUI 操作,Agent 通过标准 MCP 协议读写同一份 SQLite 日历数据,改动即时可见。

## 视图形态

```
Desktop Calendar
├── 浮球 Widget（100x100px, 圆形, 常驻桌面, 可拖拽）
│    └── 双击展开为周视图
├── 周视图（860x780px, 7 日网格 + 时间轴）
│    └── 事件拖拽/缩放/双击创建
└── MCP Apps（Agent 通过 MCP 工具返回可交互 HTML Widget）
```

## 功能特性

**人类用户（GUI）**
- 周视图: 7 日时间轴网格,支持事件拖拽移动/缩放,双击空区新建
- 事件管理: 创建/编辑/删除,5 种事件类型(面试/会议/提醒/截止/默认),8 色标签
- 浮球 Widget: 圆形悬浮球常驻桌面,显示今日日期和事件数量,双击展开为周视图
- 暗色模式: 跟随系统,支持手动切换
- 键盘快捷键: 方向键切周、T 回本周、Cmd+N 新建、Esc 收缩

**Agent 用户（MCP Server）**
- `list_events` — 按日期范围查询事件
- `create_event` — 创建新事件
- `update_event` — 修改已有事件
- `delete_event` — 删除事件
- `get_free_slots` — 查询空闲时间段
- `suggest_schedule` — AI 智能排程建议
- `detect_conflicts` — 检测时间冲突

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Tailwind CSS 3.4 |
| 设计系统 | Phosphor Icons + Geist Sans/Mono 字体 + CSS 变量 token 体系 |
| 状态管理 | Zustand 4.5 |
| 桌面壳 | Tauri 2.x (Rust) |
| 数据存储 | SQLite (rusqlite) |
| MCP 协议 | 标准 MCP Server (stdio 传输) |
| 测试 | Vitest + React Testing Library |
| 构建 | Vite 6 |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（仅前端,用于 UI 开发调试）
npm run dev

# 启动 Tauri 桌面应用
npm run tauri dev

# 运行测试
npm test
```

## MCP Server 连接

Agent 通过 stdio 方式连接日历:

```json
// mcp.json 配置
{
  "mcpServers": {
    "desktop-calendar": {
      "command": "path/to/desktop-calendar.exe",
      "args": ["--mcp"]
    }
  }
}
```

```json
// Agent 调用示例
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "create_event",
    "arguments": {
      "title": "团队周会",
      "start_time": 1719062400000,
      "end_time": 1719066000000
    }
  },
  "id": 1
}
```

## 项目结构

```
desktop-calendar-tauri/
├── src/                    # React 前端
│   ├── components/
│   │   ├── Calendar/       # EventCard, EventDialog, EventTooltip
│   │   ├── Common/         # ErrorBoundary, StatusBar, Toast, DiagnosticPanel
│   │   ├── WeekView/       # WeekView, WeekHeader, DayColumn, DayHeader, TimeColumn, CurrentTimeLine
│   │   └── Widget/         # BallWidget
│   ├── hooks/              # useWindowManager, useEventDrag, useWeekNavigation, ...
│   ├── stores/             # Zustand store (useCalendarStore)
│   ├── utils/              # dateUtils, eventFilter, eventLayout, dragUtils, ...
│   ├── constants/          # windowConfig, eventTypeColors
│   └── types/              # TypeScript 类型定义
├── src-tauri/              # Tauri / Rust 后端
│   └── src/
│       ├── db/             # SQLite 数据访问层
│       ├── mcp/            # MCP Server 实现
│       └── commands/       # Tauri IPC 命令
├── tests/                  # 前端测试
├── docs/                   # 文档
│   └── ui-optimization/    # UI 优化方案（模块化开发指南）
├── ARCHITECTURE.md         # 架构设计文档
├── CODING_RULES.md         # 编码规范
└── README.md
```

## 开发路线图

- [x] Phase A — 基础设施: CSS 变量 token + 暗色模式 class 策略 + Geist 字体
- [x] Phase B — 图标字体: Phosphor Icons 全量替换 emoji/ASCII
- [x] Phase C — 色板暗色: Indigo Steel 主色 + Warm/Cool Slate 中性色 + 暗色双模式
- [x] Phase D — 核心组件: EventCard(浅底+左色条+类型图标) / EventDialog / BallWidget / WeekHeader
- [ ] Phase E — 交互动效: motion/react 接入 + Widget 过渡动画 + 微交互清单
- [ ] Phase F — 周边打磨: DiagnosticPanel 重构 / Tooltip 升级 / 空状态骨架屏 / a11y 审计

完整 UI 优化方案见 [`docs/ui-optimization/`](docs/ui-optimization/README.md)。

## 数据模型

```sql
CREATE TABLE events (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    description  TEXT,
    start_time   INTEGER NOT NULL,     -- Unix ms
    end_time     INTEGER NOT NULL,     -- Unix ms
    is_all_day   INTEGER DEFAULT 0,
    event_type   TEXT DEFAULT 'default',  -- interview/meeting/reminder/deadline/default
    color        TEXT DEFAULT '#4f6bed',
    location     TEXT,
    url          TEXT,
    created_by   TEXT DEFAULT 'human',
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
);
```

## 事件类型

| 类型 | 图标 (Phosphor duotone) | 颜色 |
|------|------------------------|------|
| interview | `UserFocus` | `#4f6bed` |
| meeting | `Users` | `#10b981` |
| reminder | `Bell` | `#f59e0b` |
| deadline | `FlagBanner` | `#ef4444` |
| default | `Circle` | `#64748b` |

## License

MIT

---

Built by 咕咕
