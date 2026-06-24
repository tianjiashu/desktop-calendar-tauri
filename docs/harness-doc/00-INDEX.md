# 📑 设计文档索引

> 版本：v1.0
> 日期：2026-06-22
> 状态：待确认

---

## 项目定位

**纯本地桌面日历应用，核心身份是 MCP Server，同时提供两种 GUI 形态。**

| 身份 | 描述 | 用户 |
|------|------|------|
| **MCP Server**（核心） | 暴露日历操作工具，供 Agent 调用；支持 MCP Apps（返回可交互 HTML Widget） | AI Agent（WorkBuddy / Claude 等） |
| **周视图 GUI**（辅助） | 独立 Tauri 窗口，人类直接查看和操作日历 | 人类 |
| **桌面悬浮 Widget**（辅助） | 常驻桌面的悬浮球，可展开为周视图 | 人类 |

---

## 文档地图

```
design-doc/
├── 00-INDEX.md              ← 本文件（总索引）
├── 01-data-model.md         ← 数据层设计
├── 02-window-system.md     ← 窗口系统（F1-F7）
├── 03-week-view.md         ← 周视图渲染（F8-F16）
├── 04-event-display.md     ← 事件信息展示（F17-F21）
├── 05-date-navigation.md   ← 日期导航（F22-F25）
├── 06-mcp-server.md        ← MCP Server 设计
├── 07-mcp-apps-widget.md  ← MCP Apps Widget 设计
├── 08-data-sync.md         ← 数据同步设计
└── 09-error-handling.md    ← 错误处理策略
```

---

## 文档依赖图

```
00-INDEX
  │
  ├── 01-data-model          ← 所有模块依赖（必须先完成）
  │
  ├── 02-window-system      ← Phase 1 第 1 个模块
  │     └── 依赖：01
  │
  ├── 03-week-view          ← Phase 1 第 2 个模块
  │     └── 依赖：01, 02
  │
  ├── 04-event-display      ← Phase 1 第 3 个模块
  │     └── 依赖：03
  │
  ├── 05-date-navigation    ← Phase 1 第 4 个模块
  │     └── 依赖：03
  │
  ├── 06-mcp-server        ← Phase 2 第 1 个模块
  │     └── 依赖：01
  │
  ├── 07-mcp-apps-widget   ← Phase 3 第 1 个模块
  │     └── 依赖：06
  │
  ├── 08-data-sync         ← Phase 2 第 2 个模块
  │     └── 依赖：01, 06
  │
  └── 09-error-handling    ← 贯穿所有模块
        └── 依赖：01, 02, 03, 06
```

---

## 开发阶段映射

| 阶段 | 涉及设计文档 | 产出 | 验收标志 |
|------|-------------|------|----------|
| **Phase 1 MVP** | 01, 02, 03, 04, 05 | 可运行的桌面日历（悬浮球 + 周视图） | 悬浮球可拖拽、双击展开周视图、事件可 CRUD |
| **Phase 2 MCP Server** | 06, 08, 09 | Agent 可通过 MCP 协议操作日历 | WorkBuddy 连接成功、可调用 `list_events` 等工具 |
| **Phase 3 MCP Apps Widget** | 07 | Agent 调用工具时渲染可交互 HTML Widget | WorkBuddy 对话界面中显示可交互日历 Widget |
| **Phase 4 完善与开源** | 01-09 补充 | 可开源的完整产品 | GitHub Actions 构建通过、README 完整 |

---

## 模块概要

### 01 - 数据模型设计（`01-data-model.md`）

**职责**：定义 SQLite Schema、Rust 结构体、TypeScript 类型，是所有模块的基础。

**核心内容**：
- events / reminders / settings 三张表（含 rrule、timezone、event_type）
- UUID v7 生成策略
- WAL 模式配置
- Rust `Event` / `Reminder` 结构体
- TypeScript `Event` / `Reminder` 类型

**验收标准**：
- [ ] SQL 脚本可在 SQLite 中成功执行
- [ ] Rust `rusqlite::Row` → `Event` 映射无报错
- [ ] TypeScript 类型与 DB Schema 字段一一对应

---

### 02 - 窗口系统设计（`02-window-system.md`）

**职责**：实现悬浮球 Widget 和周视图窗口两种形态的切换、拖拽、过渡动画。

**功能覆盖**：F1（悬浮球常驻）、F2（双击展开）、F3（收缩回悬浮球）、F4（关闭到托盘）、F5（悬浮球拖拽）、F6（周视图拖拽）、F7（过渡锁）。

**验收标准**：
- [ ] 启动后显示 120×120px 圆形悬浮球
- [ ] 双击悬浮球 → 展开为 860×780px 周视图（带动画）
- [ ] 点击「－」→ 收缩回悬浮球（带动画）
- [ ] 点击「✕」→ 最小化到系统托盘
- [ ] 悬浮球可自由拖拽，多显示器下位置不偏移
- [ ] 周视图 Header 可拖拽移动窗口
- [ ] 快速双击不会触发并发状态冲突

---

### 03 - 周视图渲染设计（`03-week-view.md`）

**职责**：实现 7 日周视图的核心渲染，包括时间刻度线、日列背景、日头标签、当前时间红线、事件卡片、多事件重叠分列、毛玻璃效果。

**功能覆盖**：F8（7 日周视图）、F9（时间刻度线）、F10（日列背景）、F11（日头标签）、F12（当前时间红线）、F13（事件卡片渲染）、F14（多事件重叠自动分列）、F15（超出范围过滤）、F16（毛玻璃半透明效果）。

**验收标准**：
- [ ] 周一至周日 7 列正确渲染
- [ ] 时间刻度 8:00-21:00 显示正确（整点实线 + 半点虚线）
- [ ] 今日列高亮（淡蓝色背景）
- [ ] 当前时间红线每分钟自动刷新，位置精确
- [ ] 同一时段多个事件自动分列并排显示
- [ ] 8:00 前 / 21:00 后事件不渲染
- [ ] 窗口背景毛玻璃效果生效（backdrop-filter blur）

---

### 04 - 事件信息展示设计（`04-event-display.md`）

**职责**：实现事件卡片的 Tooltip 悬浮详情、颜色区分、链接跳转、今日事件指示点、状态栏错误提示。

**功能覆盖**：F17（事件 Tooltip 悬浮详情）、F18（事件卡片颜色区分）、F19（事件链接点击跳转）、F20（今日事件指示点）、F21（状态栏错误提示）。

**验收标准**：
- [ ] 鼠标悬停事件卡片 → 显示浮动详情弹窗（边界检测防溢出）
- [ ] 事件按类型着色：面试蓝 / 会议绿 / 提醒橙 / 截止红 / 默认灰
- [ ] 点击事件卡片 → 通过 `window.open` 打开外部链接
- [ ] 悬浮球底部红色圆点（pulse 动画）在今日有日程时显示
- [ ] 数据加载失败时状态栏显示红色错误信息
- [ ] 正常时状态栏显示"就绪·半透明模式"

---

### 05 - 日期导航设计（`05-date-navigation.md`）

**职责**：实现周视图的日期导航功能，包括上一周/下一周切换、回到本周、刷新、周范围标题。

**功能覆盖**：F22（上一周/下一周）、F23（回到本周）、F24（刷新）、F25（周范围标题）。

**验收标准**：
- [ ] 点击 ◀ / ▶ 按钮切换上一周/下一周
- [ ] 点击 ● 按钮一键跳回当前周
- [ ] 点击 ↻ 按钮重新从数据库加载事件
- [ ] Header 中心正确显示「M月D日 - M月D日 (YYYY年)」
- [ ] 导航后周视图正确刷新，事件列表同步更新

---

### 06 - MCP Server 设计（`06-mcp-server.md`）

**职责**：实现 MCP Server（HTTP + SSE 传输），暴露日历操作工具，供 Agent 调用。

**核心内容**：
- HTTP Server 集成（axum，端口 18765）
- MCP 协议实现（rmcp crate，SSE 传输）
- 工具列表（V1：list_events / get_event / create_event / update_event / delete_event / get_free_slots）
- `return_ui` 参数设计（文本返回 vs MCP Apps Widget 返回）
- Agent 连接配置示例

**验收标准**：
- [ ] `GET http://localhost:18765/mcp` 建立 SSE 连接成功
- [ ] `POST http://localhost:18765/mcp` 调用工具成功
- [ ] `list_events` 按日期范围正确返回事件列表
- [ ] `create_event` 成功创建事件，数据库有记录
- [ ] `update_event` 成功更新事件
- [ ] `delete_event` 成功软删除事件（deleted_at 字段）
- [ ] WorkBuddy 可成功连接并调用工具

---

### 07 - MCP Apps Widget 设计（`07-mcp-apps-widget.md`）

**职责**：实现 MCP Apps 支持，使 Agent 调用工具时可返回可交互的 HTML Widget，嵌入 Agent 对话界面。

**核心内容**：
- MCP Apps 协议（_meta.ui.resourceUri）
- Resource URI 格式（widget://calendar/{widget_name}）
- Widget HTML 结构（ext-apps SDK 集成）
- Widget 构建流程（npm run build:widget → dist-widget/）
- resources.rs 实现（返回 HTML Widget）
- Widget ↔ Host 通信（postMessage）

**验收标准**：
- [ ] Agent 调用 `list_events(return_ui=true)` 返回 `_meta.ui.resourceUri`
- [ ] WorkBuddy 收到 `_meta` 后渲染 HTML Widget
- [ ] Widget 中可查看事件列表
- [ ] Widget 中点击事件可查看详情（通过 postMessage 通知 Host）
- [ ] Widget 样式与桌面 GUI 一致（共用 Tailwind 配置）

---

### 08 - 数据同步设计（`08-data-sync.md`）

**职责**：实现 GUI 和 MCP Server 之间的实时数据同步，确保 Agent 操作的数据即时反映到 GUI。

**核心内容**：
- Tauri 事件机制（app.emit_all / listen）
- "db:events_changed" 事件载荷设计
- GUI 监听事件 → Zustand Store 重新加载数据
- MCP Server 写入数据后触发事件

**验收标准**：
- [ ] Agent 通过 MCP 创建事件 → GUI 周视图实时刷新（无需手动刷新）
- [ ] Agent 通过 MCP 更新事件 → GUI 实时更新
- [ ] Agent 通过 MCP 删除事件 → GUI 实时移除
- [ ] 悬浮球和周视图同时实时刷新

---

### 09 - 错误处理策略（`09-error-handling.md`）

**职责**：定义 Rust 侧和 TypeScript 侧的统一错误处理策略，确保错误信息可追溯、用户可理解。

**核心内容**：
- Rust 统一错误类型（thiserror + anyhow）
- TypeScript 统一错误类型（Result<T,E> + AppError 类）
- invoke 安全封装（invokeSafe）
- 错误展示（状态栏红色提示、Tauri 对话框）

**验收标准**：
- [ ] 所有 Rust commands 和 MCP tools 返回 Result<T, AppError>
- [ ] TypeScript invoke 调用均有错误处理的（无 silent catch）
- [ ] 数据库错误（如唯一约束冲突）返回友好错误信息
- [ ] 网络错误（MCP Server 未启动）返回明确提示
- [ ] 状态栏正确显示错误信息（F21）

---

## 使用说明

### 给 AI Agent 的阅读顺序

```
1. 读 00-INDEX.md        → 了解全局、确定当前模块
2. 读对应模块文档         → 了解功能、接口、验收标准
3. 读依赖的模块文档       → 了解依赖的接口定义
4. 实施开发              → 按步骤实施
5. 按验收标准自查         → 逐项确认通过
6. 更新模块文档状态       → 将"状态"改为"已实现"
```

### 给人类的审查建议

- 每个模块文档的**「未决策事项」** 需要你确认后开发才能继续
- 如果需求变更，先更新设计文档，再通知 AI 重新实施
- 验收标准必须具体、可操作，避免"基本可用"这种模糊表述

---

> 🕊️ 本文档由咕咕起草，老板确认后生效。
> 文档变更需更新版本号和变更说明。
