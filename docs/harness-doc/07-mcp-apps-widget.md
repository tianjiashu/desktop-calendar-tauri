# 07 - MCP Apps Widget 设计#

> 所属阶段：Phase 3（MCP Apps Widget）
> 依赖模块：06-mcp-server
> 状态：待确认

---

## 1. 功能概述#

本模块负责 **MCP Apps Widget 实现**，包括：
- MCP Apps 协议（`_meta.ui.resourceUri`）
- Resource URI 格式（`widget://calendar/{widget_name}`）
- Widget HTML 结构（ext-apps SDK 集成）
- Widget 构建流程（`npm run build:widget` → `dist-widget/`）
- `resources.rs` 实现（返回 HTML Widget）
- Widget ↔ Host 通信（`postMessage`）

**功能覆盖**：MCP Apps 支持（F 系列未直接编号，但属于核心差异化功能）。

**不负责**：MCP Server 协议处理（06）、数据同步（08）。

---

## 2. 详细设计#

### 2.1 MCP Apps 协议概述#

**核心概念**：MCP Server 可以暴露一种特殊 Resource（`mimeType: text/html;profile=mcp-app`），当 Agent 调用工具时，Host（CodeBuddy/WorkBuddy）会自动把这个 HTML 渲染成一个内嵌的 Widget 界面。

```
Agent 调用工具
    ↓
MCP Server 返回 toolResult + _meta.ui.resourceUri
    ↓
Host 读取对应的 Resource（HTML）
    ↓
Host 用 iframe 把 HTML 渲染到对话界面
    ↓
HTML 里的 JS 通过 ext-apps SDK 和 Host 双向通信
```

### 2.2 Resource URI 格式#

```
widget://calendar/{widget_name}

已定义的 Widget：
  - widget://calendar/events-list     → 事件列表 Widget（对应 03-week-view）
  - widget://calendar/event-detail   → 事件详情 Widget（对应 04-event-display）
  - widget://calendar/free-slots     → 空闲时间 Widget（对应 06-mcp-server）
  - widget://calendar/month-view     → 月历视图 Widget（V2）
```

### 2.3 `resources/read` 返回格式（符合 MCP Apps 规范）#

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

### 2.4 Widget HTML 结构示例#

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://codebuddy.cn/ext-apps/sdk.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; background: transparent; }
    .event-card { background: #3B82F6; color: white; border-radius: 8px; padding: 8px; margin-bottom: 8px; cursor: pointer; }
    .event-time { font-size: 12px; opacity: 0.8; }
  </style>
</head>
<body>
  <div id="root">
    <h3 class="text-lg font-bold mb-4">本周日程</h3>
    <div id="events-list">
      <!-- 由 JS 动态渲染 -->
    </div>
  </div>

  <script>
    // 使用 ext-apps SDK 与 Host 通信
    async function init() {
      // 1. 通过 SDK 调用 MCP 工具获取数据
      const result = await window.extApps.callTool('desktop-calendar', 'list_events', {
        start_date: Date.now() - 7 * 24 * 60 * 60 * 1000,
        end_date: Date.now() + 7 * 24 * 60 * 60 * 1000,
        return_ui: false  // Widget 内用文本返回，不递归触发 Widget
      });

      // 2. 渲染事件列表
      renderEvents(result.content[0].text);
    }

    function renderEvents(jsonText) {
      const data = JSON.parse(jsonText);
      const container = document.getElementById('events-list');
      container.innerHTML = '';
      for (const event of data.events) {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.style.background = event.color || '#3B82F6';
        card.innerHTML = `
          <div class="font-bold">${event.title}</div>
          <div class="event-time">${formatTime(event.start_time)} - ${formatTime(event.end_time)}</div>
        `;
        card.onclick = () => handleEventClick(event.id);
        container.appendChild(card);
      }
    }

    function handleEventClick(eventId) {
      // 通过 postMessage 通知 Host
      window.parent.postMessage({
        type: 'ui_event',
        action: 'view_event',
        data: { event_id: eventId }
      }, '*');
    }

    function formatTime(ms) {
      const d = new Date(ms);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    init();
  </script>
</body>
</html>
```

### 2.5 ext-apps SDK 通信协议（Widget ↔ Host）#

**Widget → Host**（通过 `postMessage`）：

```typescript
// 通知 Host 用户进行了操作（Host 可据此触发新工具调用）
window.parent.postMessage({
  type: 'ui_event',
  action: 'view_event',       // 操作类型
  data: { event_id: 'xxx' }
}, '*');

// 请求 Host 调用 MCP 工具（高级用法，需 Host 支持）
window.parent.postMessage({
  type: 'tool_call',
  tool: 'create_event',
  args: { title: '...', start_time: ..., end_time: ... }
}, '*');
```

**Host → Widget**（通过 `window.extApps`）：

```typescript
// Widget 内调用 MCP 工具（推荐方式，比 postMessage 更结构化）
const result = await window.extApps.callTool(
  'desktop-calendar',        // MCP Server 名称（来自 mcp.json 配置）
  'list_events',             // 工具名
  { start_date: ..., end_date: ... }  // 参数
);
```

> **注意**：`extApps.callTool()` 是 CodeBuddy/WorkBuddy 的私有 SDK，非 MCP 标准。标准 MCP 流程是：Widget 通过 `postMessage` 发 `ui_event`，Host 决定下一步操作。

### 2.6 `resources.rs` 实现（Rust 侧）#

```rust
// mcp/resources.rs

use axum::{extract::State, http::StatusCode, response::IntoResponse};
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<rusqlite::Connection>,  // 或 tokio_rusqlite::Connection
}

/// GET /widgets/{widget_name} → 返回 HTML Widget
pub async fn get_widget(
    State(state): State<AppState>,
    axum::extract::Path(widget_name): axum::extract::Path<String>,
) -> impl IntoResponse {
    let html = match widget_name.as_str() {
        "events-list" => include_str!("../widgets/events-list.html"),
        "event-detail" => include_str!("../widgets/event-detail.html"),
        "free-slots" => include_str!("../widgets/free-slots.html"),
        _ => return (StatusCode::NOT_FOUND, "Widget not found").into_response(),
    };

    (
        StatusCode::OK,
        [("Content-Type", "text/html; charset=utf-8")],
        html,
    ).into_response()
}

/// MCP resources/list 实现
pub fn list_resources() -> Vec<Resource> {
    vec![
        Resource {
            uri: "widget://calendar/events-list".to_string(),
            name: "Events List Widget".to_string(),
            description: Some("可交互的周事件列表 Widget".to_string()),
            mime_type: Some("text/html;profile=mcp-app".to_string()),
        },
        // ... 其他 Widget
    ]
}

/// MCP resources/read 实现
pub fn read_resource(uri: &str) -> Result<ResourceContents, AppError> {
    match uri {
        "widget://calendar/events-list" => {
            let html = include_str!("../widgets/events-list.html");
            Ok(ResourceContents::TextResource(TextResource {
                uri: uri.to_string(),
                mime_type: "text/html;profile=mcp-app".to_string(),
                text: html.to_string(),
            }))
        }
        _ => Err(AppError::ResourceNotFound(uri.to_string())),
    }
}
```

### 2.7 Widget 构建流程#

```
前端源码（src/ + src/AppWidget.tsx）
        │ npm run build:widget
        ▼
Vite 构建 → dist-widget/（静态 HTML + JS + CSS）
        │
        ▼
Tauri 打包时，将 dist-widget/ 嵌入到二进制
（tauri.conf.json → bundle.resources）
        │
        ▼
运行时，resources.rs 通过 include_str!() 读取嵌入的 HTML
（或在开发模式下读取 dist-widget/ 文件）
```

**`vite.config.ts`（Widget 构建配置）**：

```typescript
// vite.config.ts

export default defineConfig({
  build: {
    outDir: 'dist-widget',
    lib: {
      entry: 'src/AppWidget.tsx',
      name: 'CalendarWidget',
      fileName: 'widget'
    },
    rollupOptions: {
      output: {
        // 打包成单个 HTML（内联 CSS/JS）
        inlineDynamicImports: true,
      }
    }
  },
  // 开发模式：serve dist-widget/
  server: {
    port: 3001,
    proxy: {
      '/mcp': 'http://localhost:18765'
    }
  }
});
```

> **简化方案**（推荐 V1）：不单独构建 Widget HTML，而是让 `resources.rs` 直接返回**由 Rust 服务端渲染的 HTML 字符串**（类似 SSR），避免前端构建复杂度。

### 2.8 `return_ui` 参数完整流程#

```
Agent 收到用户请求："帮我看看本周的日程"
        │
        ▼
Agent 调用 desktop-calendar MCP Server：
  tools/call {
    name: "list_events",
    arguments: {
      start_date: ...,
      end_date: ...,
      return_ui: true   ← 关键参数
    }
  }
        │
        ▼
MCP Server（tools.rs）
  → 查询数据库获取 events
  → 构造 ToolResult：
    {
      content: [{ type: "text", text: "找到 3 个事件，已为您渲染可交互日历 Widget。" }],
      _meta: {
        ui: {
          resourceUri: "widget://calendar/events-list"
        }
      }
    }
        │
        ▼
Host（WorkBuddy）收到 _meta.ui.resourceUri
        │
        ▼
Host 调用 resources/read { uri: "widget://calendar/events-list" }
        │
        ▼
MCP Server（resources.rs）
  → 返回 HTML Widget（mimeType: text/html;profile=mcp-app）
        │
        ▼
Host 在对话界面中用 iframe / WebView 渲染 HTML
        │
        ▼
用户可以直接在 Widget 中查看事件、点击查看详情
        │
        ▼
Widget JS 通过 ext-apps SDK 或 postMessage 与 Host 通信
  → 例如：用户点击某事件 → Widget 发 ui_event → Host 可调用 get_event 获取详情
```

---

## 3. 接口定义#

### 3.1 Rust 侧（mcp/resources.rs）#

```rust
pub struct Resource {
    pub uri: String,
    pub name: String,
    pub description: Option<String>,
    pub mime_type: Option<String>,
}

pub enum ResourceContents {
    TextResource(TextResource),
    // BinaryResource(...)  // V2 如果需要图片等二进制资源
}

pub struct TextResource {
    pub uri: String,
    pub mime_type: String,
    pub text: String,
}

pub fn list_resources() -> Vec<Resource>;
pub fn read_resource(uri: &str) -> Result<ResourceContents, AppError>;
```

### 3.2 TypeScript 侧（Widget JS）#

```typescript
// Widget 内使用 ext-apps SDK（如果 Host 支持）
declare global {
  interface Window {
    extApps?: {
      callTool: (serverName: string, toolName: string, args: Record<string, unknown>) => Promise<any>;
    };
  }
}

// Widget 内使用 postMessage（通用降级方案）
function notifyHost(action: string, data: unknown) {
  window.parent.postMessage({
    type: 'ui_event',
    action,
    data,
  }, '*');
}
```

---

## 4. 实施步骤#

### 步骤 1：创建 Widget HTML 模板#

- 文件：`widgets/events-list.html`（先用手写 HTML，不引入构建步骤）
- 内容：参考 2.4 节的 HTML 结构
- 验证：在浏览器中直接打开能正常显示样式

### 步骤 2：实现 `resources.rs`#

- 文件：`src-tauri/src/mcp/resources.rs`
- 实现 `list_resources()` 和 `read_resource()`
- 开发模式下读取 `widgets/` 目录的文件；生产模式下用 `include_str!()`
- 验证：`curl http://localhost:18765/widgets/events-list` 返回 HTML

### 步骤 3：修改 `tools.rs` 支持 `return_ui` 参数#

- 文件：`src-tauri/src/mcp/tools/list_events.rs`
- 当 `return_ui=true` 时，在 ToolResult 中附加 `_meta.ui.resourceUri`
- 验证：用 `curl` 发送 `tools/call` 请求，检查返回结果包含 `_meta`

### 步骤 4（可选）：设置 Widget 构建流程#

- 文件：`vite.config.ts`（添加 `build-widget` 配置）
- 添加 npm 脚本：`"build:widget": "vite build --config vite.widget.config.ts"`
- 验证：`npm run build:widget` 生成 `dist-widget/widget.html`

### 步骤 5：集成测试#

- 启动 Desktop Calendar 应用
- 在 WorkBuddy 中连接 MCP Server
- 发送请求："帮我看看本周的日程（用 Widget 展示）"
- 验证：WorkBuddy 对话界面中出现可交互的日历 Widget

---

## 5. 验收标准#

### MCP Apps 协议#

- [ ] Agent 调用 `list_events(return_ui=true)` 返回结果包含 `_meta.ui.resourceUri`
- [ ] `_meta.ui.resourceUri` 的值符合 `widget://calendar/{name}` 格式
- [ ] Host 调用 `resources/read` 时，返回 `mimeType: text/html;profile=mcp-app`
- [ ] 返回的 HTML 可以在 iframe 中正确渲染

### Widget 内容#

- [ ] Widget 中显示事件列表（标题 + 时间）
- [ ] 事件按开始时间排序
- [ ] 点击事件卡片，通过 `postMessage` 成功发送 `ui_event`
- [ ] Widget 样式清晰可读（背景半透明、字体合适）

### 通信#

- [ ] Widget JS 可以通过 `window.parent.postMessage()` 发送消息
- [ ] Host（WorkBuddy）能正确接收 `ui_event`
- [ ] （如果支持 ext-apps SDK）`window.extApps.callTool()` 能成功调用 MCP 工具

### 构建与打包#

- [ ] `npm run build:widget` 成功生成 `dist-widget/`
- [ ] Tauri 打包后，Widget HTML 正确嵌入二进制
- [ ] 运行时 `resources.rs` 能正确读取 Widget HTML

---

## 6. 未决策事项#

- [ ] **Widget 构建方案**：V1 用手写 HTML（简单），还是引入 Vite 构建（灵活但复杂）？
- [ ] **Widget 样式**：用 Tailwind CDN（快速）还是内联 CSS（可控）？
- [ ] **ext-apps SDK 依赖**：是否要求 Host 必须支持 ext-apps SDK？（当前设计用 `postMessage` 做降级）
- [ ] **Widget 交互复杂度**：V1 只展示，还是支持在 Widget 中直接创建/编辑事件？
- [ ] **多个 Widget 管理**：如果 Widget 数量增多，是否需要一个 Widget 注册机制？

---

> 🕊️ 本文档由咕咕起草，老板确认后作为 MCP Apps Widget 开发基准。
> 变更需更新版本号并注明原因。
