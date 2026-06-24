# 06 - MCP Server 设计#

> 所属阶段：Phase 2（MCP Server）
> 依赖模块：01-data-model
> 状态：已实现 ✅

---

## 1. 功能概述#

本模块负责 **MCP Server 实现**，包括：
- HTTP Server 集成（axum，端口 18765）
- MCP 协议实现（rmcp crate，SSE 传输）
- 工具列表定义（V1：`list_events` / `get_event` / `create_event` / `update_event` / `delete_event` / `get_free_slots`）
- `return_ui` 参数设计（文本返回 vs MCP Apps Widget 返回）
- Agent 连接配置示例

**不负责**：数据同步（08）、MCP Apps Widget HTML 生成（07）。

---

## 2. 详细设计#

### 2.1 进程模型#

```
┌─────────────────────────────────────┐
│  单进程：desktop-calendar.exe         │
│                                     │
│  ├── Tauri 主线程（GUI 事件循环）  │
│  └── tokio 运行时（独立线程）：    │
│      ├── HTTP Server (axum)         │
│      │   ├── GET  /mcp  → SSE  │
│      │   └── POST /mcp  → JSON-RPC │
│      ├── MCP Server (rmcp)         │
│      └── SQLite 异步读写           │
└─────────────────────────────────────┘
```

**关键点**：
- HTTP Server 运行在 **独立 tokio 运行时**，不阻塞 Tauri 主线程
- 通过 `tokio::sync::mpsc` 与 Tauri 主线程通信（需要修改 DB 时）

### 2.2 HTTP + SSE 传输设计#

**SSE 连接建立**（`GET /mcp`）：

```
Agent → GET http://localhost:18765/mcp
       ← SSE 流（Content-Type: text/event-stream）

SSE 事件格式：
  event: endpoint
  data: {"method": "initialize", ...}

  event: message
  data: {"jsonrpc": "2.0", "result": {...}, "id": 1}
```

**消息发送**（`POST /mcp`）：

```
Agent → POST http://localhost:18765/mcp
       Content-Type: application/json
       Body: {"jsonrpc": "2.0", "method": "tools/call", ...}

Server → SSE 流中推送响应
```

### 2.3 rmcp 集成#

```rust
// mcp/server.rs

use axum::{Router, extract::State, response::Sse};
use rmcp::{Server, ServerHandle};
use tokio::sync::mpsc;

pub struct McpServer {
    server: Server,
    event_tx: mpsc::Sender<ServerEvent>,
}

impl McpServer {
    pub fn new(db: Database) -> Self {
        let (event_tx, event_rx) = mpsc::channel(100);

        let server = Server::builder()
            .with_tool(ListEvents)
            .with_tool(GetEvent)
            .with_tool(CreateEvent)
            .with_tool(UpdateEvent)
            .with_tool(DeleteEvent)
            .with_tool(GetFreeSlots)
            .build();

        Self { server, event_tx }
    }

    pub async fn start(self) -> Result<(), AppError> {
        // 启动 HTTP Server
        let app = Router::new()
            .route("/mcp", get(sse_handler).post(message_handler))
            .with_state(self.event_tx.clone());

        let listener = tokio::net::TcpListener::bind("127.0.0.1:18765").await?;
        axum::serve(listener, app).await?;

        Ok(())
    }
}
```

### 2.4 工具定义（V1）#

#### `list_events`

```rust
// mcp/tools/list_events.rs

#[derive(Deserialize)]
pub struct ListEventsArgs {
    pub start_date: i64,   // Unix ms
    pub end_date: i64,     // Unix ms
    pub return_ui: Option<bool>,  // 默认 false
}

pub struct ListEvents;

#[rmcp::tool]
impl Tool for ListEvents {
    type Args = ListEventsArgs;
    type Output = McpToolResult;

    async fn call(&self, args: Self::Args) -> Result<Self::Output, rmcp::Error> {
        // 1. 查询数据库
        let events = EventRepo::find_by_date_range(&self.db, args.start_date, args.end_date)
            .map_err(|e| rmcp::Error::internal(e.to_string()))?;

        // 2. 构造返回结果
        let content = json!({ "events": events });

        // 3. 如果 return_ui=true，附加 _meta.ui
        if args.return_ui.unwrap_or(false) {
            Ok(McpToolResult::with_ui(
                content,
                ResourceUri::new("widget://calendar/events-list"),
            ))
        } else {
            Ok(McpToolResult::text(content))
        }
    }
}
```

#### `create_event`

```rust
// mcp/tools/create_event.rs

#[derive(Deserialize)]
pub struct CreateEventArgs {
    pub title: String,
    pub start_time: i64,
    pub end_time: i64,
    pub description: Option<String>,
    pub timezone: Option<String>,
    pub is_all_day: Option<bool>,
    pub event_type: Option<String>,
    pub color: Option<String>,
    pub location: Option<String>,
    pub url: Option<String>,
}

pub struct CreateEvent;

#[rmcp::tool]
impl Tool for CreateEvent {
    type Args = CreateEventArgs;
    type Output = McpToolResult;

    async fn call(&self, args: Self::Args) -> Result<Self::Output, rmcp::Error> {
        // 1. 构造输入
        let input = CreateEventInput::from(args);

        // 2. 写入数据库
        let event = EventRepo::create(&self.db, input)
            .map_err(|e| rmcp::Error::internal(e.to_string()))?;

        // 3. 触发 Tauri 事件（通知 GUI 刷新）
        self.app.emit_all("db:events_changed", json!({
            "table": "events",
            "action": "create",
            "id": event.id
        }));

        // 4. 返回文本确认（创建类工具不返回 UI）
        Ok(McpToolResult::text(json!({
            "ok": true,
            "event": event
        })))
    }
}
```

#### 其他工具（简述）#

| 工具名 | 描述 | 是否支持 `return_ui` |
|--------|------|----------------------|
| `get_event` | 获取单个事件详情 | ✅ 是 |
| `update_event` | 更新事件 | ❌ 否（返回文本确认） |
| `delete_event` | 软删除事件 | ❌ 否（返回文本确认） |
| `get_free_slots` | 查询空闲时间段 | ✅ 是 |

### 2.5 `return_ui` 参数设计#

**协议扩展**（符合 MCP Apps 规范）：

```json
// Agent 调用工具时，可传 return_ui 参数
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
  "id": 1
}
```

**Server 返回格式**（MCP Apps）：

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
  "id": 1
}
```

**Host 行为**：
1. 解析 `_meta.ui.resourceUri`
2. 调用 `resources/read` 获取 Widget HTML
3. 在对话界面中渲染 Widget

### 2.6 Agent 连接配置示例#

**WorkBuddy**（`~/.workbuddy/mcp.json`）：

```json
{
  "mcpServers": {
    "desktop-calendar": {
      "url": "http://localhost:18765/mcp"
    }
  }
}
```

**Claude Desktop**：

```json
{
  "mcpServers": {
    "desktop-calendar": {
      "url": "http://localhost:18765/mcp"
    }
  }
}
```

### 2.7 端口冲突处理（V1）#

```rust
// mcp/server.rs → start()

pub async fn start(self) -> Result<(), AppError> {
    let addr = SocketAddr::new(Ipv4Addr::LOCALHOST.into(), 18765);

    match TcpListener::bind(&addr).await {
        Ok(listener) => {
            axum::serve(listener, self.router).await?;
            Ok(())
        }
        Err(e) if e.kind() == io::ErrorKind::AddrInUse => {
            // V1：直接返回错误，提示用户
            Err(AppError::HttpBindFailed {
                port: 18765,
                reason: "端口已被占用，请关闭其他实例后重试。".to_string(),
            })
        }
        Err(e) => Err(e.into()),
    }
}
```

> **V2 规划**：自动切换随机端口，写入 `.calendar-port` 文件，Agent 读取该文件获取端口。

---

## 3. 接口定义#

### 3.1 Rust 侧（mcp/tools/*.rs）#

```rust
// 所有工具的通用返回类型
pub enum McpToolResult {
    Text(serde_json::Value),
    WithUi {
        text: serde_json::Value,
        resource_uri: ResourceUri,
    },
}

impl McpToolResult {
    pub fn text(value: serde_json::Value) -> Self {
        Self::Text(value)
    }

    pub fn with_ui(value: serde_json::Value, uri: ResourceUri) -> Self {
        Self::WithUi { text: value, resource_uri: uri }
    }
}
```

### 3.2 Tauri 侧（commands/mcp_cmd.rs）#

```rust
// 无直接 Tauri IPC 命令
// MCP Server 在 tokio 运行时中独立运行
// 通过 Tauri `AppHandle` 发射事件通知 GUI

// 启动 MCP Server 命令（在 main.rs 中调用）
pub fn start_mcp_server(app: AppHandle) -> Result<(), AppError> {
    tokio::spawn(async move {
        let db = Database::from_app_handle(&app)?;
        let server = McpServer::new(db, app.clone());
        server.start().await
    });
    Ok(())
}
```

---

## 4. 实施步骤#

### 步骤 1：添加依赖#

- 文件：`src-tauri/Cargo.toml`
- 添加：`axum = "0.7"`、`rmcp = "0.2"`、`tokio = { version = "1", features = ["full"] }`
- 验证：`cargo build` 编译通过

### 步骤 2：实现 Database 包装#

- 文件：`src-tauri/src/db/mod.rs`（修改已有文件）
- 实现 `Database` 结构体（包装 `rusqlite::Connection` 或 `tokio_rusqlite::Connection`）
- 实现 `Clone`（通过 `Arc<Mutex<...>>` 或 `tokio_rusqlite`）
- 验证：单元测试（创建 → 查询 → 删除）

### 步骤 3：实现 MCP Server 基础框架#

- 文件：`src-tauri/src/mcp/server.rs`
- 实现 `McpServer::new()` 和 `McpServer::start()`
- 实现 HTTP + SSE 传输（axum）
- 验证：`curl http://localhost:18765/mcp` 返回 SSE 流

### 步骤 4：实现工具 `list_events`#

- 文件：`src-tauri/src/mcp/tools/list_events.rs`
- 实现 `ListEvents` tool
- 支持 `return_ui` 参数
- 验证：Agent 调用 `list_events` 返回 JSON

### 步骤 5：实现工具 `create_event` / `update_event` / `delete_event`#

- 文件：`src-tauri/src/mcp/tools/create_event.rs` 等
- 实现 CRUD 工具
- 写入 DB 后发射 Tauri 事件（`app.emit_all("db:events_changed", ...)`）
- 验证：Agent 调用 `create_event` → GUI 实时刷新

### 步骤 6：实现工具 `get_event` / `get_free_slots`#

- 文件：`src-tauri/src/mcp/tools/get_event.rs`、`get_free_slots.rs`
- 验证：Agent 调用 `get_free_slots` 返回正确时间段

### 步骤 7：集成到 Tauri 启动流程#

- 文件：`src-tauri/src/main.rs`
- 在 `tauri::Builder::default()` 中调用 `start_mcp_server()`
- 验证：启动应用后，`GET http://localhost:18765/mcp` 可连接

---

## 5. 验收标准#

### 功能验收#

- [ ] `GET http://localhost:18765/mcp` 建立 SSE 连接成功
- [ ] `POST http://localhost:18765/mcp` 发送 `tools/list` 返回 6 个工具
- [ ] `tools/call` 调用 `list_events` → 返回 JSON 事件列表
- [ ] `tools/call` 调用 `list_events(return_ui=true)` → 返回 `_meta.ui.resourceUri`
- [ ] `tools/call` 调用 `create_event` → 数据库有记录，返回确认文本
- [ ] `tools/call` 调用 `update_event` → 数据库记录更新
- [ ] `tools/call` 调用 `delete_event` → `deleted_at` 字段非空
- [ ] `tools/call` 调用 `get_event` → 返回单个事件详情
- [ ] `tools/call` 调用 `get_free_slots` → 返回空闲时间段列表
- [ ] WorkBuddy 可成功连接并调用工具
- [ ] Claude Desktop 可成功连接并调用工具

### 实时同步验收#

- [ ] Agent 通过 MCP 创建事件 → GUI 周视图实时刷新（< 1s）
- [ ] Agent 通过 MCP 更新事件 → GUI 实时更新
- [ ] Agent 通过 MCP 删除事件 → GUI 实时移除

### 错误处理验收#

- [ ] 端口 18765 被占用 → 启动失败，提示用户
- [ ] 无效参数（如 `start_date > end_date`）→ 返回友好错误信息
- [ ] 数据库写入失败 → 返回 MCP 错误（不崩溃）

---

## 6. 未决策事项#

- [ ] **SSE 连接保活**：是否需要 ping/pong 机制？（当前依赖 HTTP 层 keep-alive）
- [ ] **多 Agent 并发**：多个 Agent 同时连接时，事件发射是否会重复？
- [ ] **认证（V2）**：是否需要在 HTTP 层加 token 验证？（V1 仅本地访问，暂不需要）
- [ ] **`return_ui` 默认值**：是 `false`（文本）还是由 Agent 决定？（当前设计：`false`）

---

> 🕊️ 本文档由咕咕起草，老板确认后作为 MCP Server 开发基准。
> 变更需更新版本号并注明原因。
