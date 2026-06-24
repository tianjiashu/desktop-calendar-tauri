# 09 - 错误处理策略#

> 所属阶段：贯穿所有阶段
> 依赖模块：01-data-model（Rust 侧）、所有模块（TypeScript 侧）
> 状态：已实现 ✅

---

## 1. 功能概述#

本模块定义**统一错误处理策略**，贯穿所有模块：
- Rust 侧统一错误类型（`thiserror` + `anyhow`）
- TypeScript 侧统一错误类型（`AppError` 类 + `Result<T,E>` 模式）
- `invoke` 安全封装（`invokeSafe`，禁止 silent catch）
- 错误展示（状态栏红色提示）
- 日志策略（`tracing` 结构化日志）

**不负责**：业务逻辑错误码定义（由各模块自行定义）。

---

## 2. 详细设计#

### 2.1 Rust 侧统一错误类型#

```rust
// src/error.rs

use thiserror::Error;
use rusqlite::Error as DbError;
use serde_json::Error as JsonError;

#[derive(Debug, Error)]
pub enum AppError {
    // ========== 数据库错误 ==========
    #[error("Database error: {0}")]
    Db(#[from] DbError),

    #[error("Event not found: {0}")]
    EventNotFound(String),

    #[error("Event already exists: {0}")]
    EventAlreadyExists(String),

    #[error("Invalid time range: start={0}, end={1}")]
    InvalidTimeRange(i64, i64),

    #[error("Invalid RRULE: {0}")]
    InvalidRrule(String),

    // ========== MCP 错误 ==========
    #[error("MCP error: {0}")]
    Mcp(String),

    #[error("Tool not found: {0}")]
    ToolNotFound(String),

    #[error("Invalid tool arguments: {0}")]
    InvalidToolArgs(String),

    // ========== HTTP 错误 ==========
    #[error("HTTP server error: {0}")]
    Http(#[from] axum::Error),

    #[error("Port {0} already in use: {1}")]
    HttpPortInUse(u16, String),

    // ========== 系统错误 ==========
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] JsonError),

    #[error("Tauri error: {0}")]
    Tauri(String),
}

/// 将 AppError 转换为 Tauri Invoke Error（供 commands/ 使用）
impl From<AppError> for tauri::InvokeError {
    fn from(err: AppError) -> Self {
        tauri::InvokeError::new(err.to_string())
    }
}

/// 将 AppError 转换为 MCP Error（供 mcp/ 使用）
impl From<AppError> for rmcp::Error {
    fn from(err: AppError) -> Self {
        rmcp::Error::internal(err.to_string())
    }
}
```

### 2.2 TypeScript 侧统一错误类型#

```typescript
// types/error.types.ts

/// 错误码枚举（与 Rust AppError 对齐）
export enum ErrorCode {
  // 数据库
  DB_ERROR = 'DB_ERROR',
  EVENT_NOT_FOUND = 'EVENT_NOT_FOUND',
  EVENT_ALREADY_EXISTS = 'EVENT_ALREADY_EXISTS',
  INVALID_TIME_RANGE = 'INVALID_TIME_RANGE',

  // MCP
  MCP_ERROR = 'MCP_ERROR',
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  INVALID_TOOL_ARGS = 'INVALID_TOOL_ARGS',

  // HTTP / 网络
  HTTP_ERROR = 'HTTP_ERROR',
  PORT_IN_USE = 'PORT_IN_USE',

  // 通用
  UNKNOWN = 'UNKNOWN',
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }

  /// 从 Tauri invoke 错误构造
  static fromInvoke(e: unknown): AppError {
    if (e instanceof Error) {
      return new AppError(ErrorCode.UNKNOWN, e.message);
    }
    return new AppError(ErrorCode.UNKNOWN, String(e));
  }
}

/// Result 模式（替代 try/catch）
export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

### 2.3 `invokeSafe` 封装（禁止 silent catch）#

```typescript
// utils/invokeSafe.ts#

import { invoke } from '@tauri-apps/api/core';
import { AppError, ErrorCode, Result } from '../types/error.types';

export async function invokeSafe<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<Result<T, AppError>> {
  try {
    const value = await invoke<T>(cmd, args);
    return { ok: true, value };
  } catch (e) {
    const error = AppError.fromInvoke(e);
    console.error(`[invokeSafe] ${cmd} failed:`, error);
    return { ok: false, error };
  }
}

/// 强制处理的 invoke（返回 T，但要求调用方处理错误）
export async function invokeOrThrow<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  const result = await invokeSafe<T>(cmd, args);
  if (!result.ok) {
    throw result.error;
  }
  return result.value;
}
```

**禁止模式**（ESLint 规则可辅助检查）：

```typescript
/// ❌ 禁止：silent catch
try { await invoke(...) } catch (e) { /* empty */ }

/// ❌ 禁止：只 log 不处理
try { await invoke(...) } catch (e) { console.log(e); }

/// ✅ 正确：使用 invokeSafe
const result = await invokeSafe('create_event', input);
if (!result.ok) {
  setError(result.error);
  return;
}
// 成功后逻辑...
```

### 2.4 错误展示（F21：状态栏错误提示）#

```typescript
// hooks/useErrorHandler.ts#

import { useState } from 'react';
import { AppError } from '../types/error.types';

export function useErrorHandler() {
  const [error, setError] = useState<AppError | null>(null);

  /// 处理错误（自动分类展示）
  const handleError = (e: unknown, context?: string) => {
    const appError = e instanceof AppError
      ? e
      : AppError.fromInvoke(e);

    // 分类处理
    if (appError.code === 'EVENT_NOT_FOUND') {
      setError(new AppError(
        appError.code,
        `事件不存在${context ? `（${context}）` : ''}`
      ));
    } else if (appError.code === 'PORT_IN_USE') {
      setError(new AppError(
        appError.code,
        '端口 18765 已被占用，请关闭其他实例后重试。'
      ));
    } else {
      setError(appError);
    }

    // 同时输出到日志
    console.error('[Error]', appError);
  };

  const clearError = () => setError(null);

  return { error, handleError, clearError };
}
```

### 2.5 日志策略（`tracing`）#

**Rust 侧**：

```rust
// src/main.rs #

use tracing::{info, warn, error, Level};
use tracing_subscriber::{fmt, EnvFilter};

fn init_logger() -> Result<(), AppError> {
    // 从环境变量读取日志级别（RUST_LOG=debug|info|warn|error）
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    fmt()
        .with_env_filter(filter)
        .with_writer(std::io::stdout)  // V1：输出到 stdout
        // V2：输出到文件（见下方注释）
        .init();

    info!("Logger initialized");
    Ok(())
}

/// V2：输出到文件（用户可查看）
/// 文件路径：~/.local/share/com.desktop-calendar/logs/app.log
/// 滚动策略：超过 10MB 自动滚动，保留最近 5 个文件
```

**TypeScript 侧**：

```typescript
// utils/logger.ts#

const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.debug('[debug]', ...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info('[info]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[warn]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[error]', ...args);
    // V2：发送到 Sentry / 日志服务
  },
};
```

---

## 3. 接口定义#

### 3.1 Rust 侧#

```rust
// src/error.rs #

pub type Result<T, E = AppError> = std::result::Result<T, E>;

impl From<AppError> for tauri::InvokeError;
impl From<AppError> for rmcp::Error;
```

### 3.2 TypeScript 侧#

```typescript
// types/error.types.ts #

export enum ErrorCode { ... }
export class AppError extends Error { ... }
export type Result<T, E = AppError> = ...;

// utils/invokeSafe.ts #
export async function invokeSafe<T>(...): Promise<Result<T, AppError>>;
export async function invokeOrThrow<T>(...): Promise<T>;

// hooks/useErrorHandler.ts #
export function useErrorHandler(): {
  error: AppError | null;
  handleError: (e: unknown, context?: string) => void;
  clearError: () => void;
}
```

---

## 4. 实施步骤#

### 步骤 1：定义 Rust 统一错误类型#

- 文件：`src-tauri/src/error.rs`
- 实现 `AppError` 枚举（覆盖数据库 / MCP / HTTP / 系统错误）
- 实现 `From<AppError>` for `tauri::InvokeError` 和 `rmcp::Error`
- 验证：编译通过，无 warning。

### 步骤 2：定义 TypeScript 统一错误类型#

- 文件：`src/types/error.types.ts`
- 实现 `ErrorCode` 枚举 + `AppError` 类 + `Result<T,E>` 类型
- 验证：TypeScript 类型检查通过。

### 步骤 3：实现 `invokeSafe` 封装#

- 文件：`src/utils/invokeSafe.ts`
- 实现 `invokeSafe` + `invokeOrThrow`
- 修改所有 `useEvents.ts` 等 hooks，使用 `invokeSafe`（禁止直接 `invoke`）
- 验证：所有 `invoke` 调用都用 `invokeSafe` 包裹。

### 步骤 4：实现错误展示#

- 文件：`src/hooks/useErrorHandler.ts`
- 在 `App.tsx` 中集成 `useErrorHandler`
- 传递给 `StatusBar.tsx` 展示错误
- 验证：触发一个错误（如删除不存在的事件），状态栏显示红色错误信息。

### 步骤 5：实现日志策略#

- 文件：`src-tauri/src/main.rs`（修改已有文件）
- 实现 `init_logger()`
- 在关键路径添加 `info!` / `warn!` / `error!` 日志
- 验证：运行时控制台输出结构化日志。

---

## 5. 验收标准#

### Rust 侧#

- [ ] `AppError` 覆盖所有预期错误类型（数据库 / MCP / HTTP / 系统）
- [ ] 所有 `commands/*.rs` 返回 `Result<T, AppError>`（无 `unwrap()`）
- [ ] 所有 `mcp/tools/*.rs` 返回 `Result<T, AppError>`（无 `unwrap()`）
- [ ] `From<AppError>` for `tauri::InvokeError` 正确转换
- [ ] `From<AppError>` for `rmcp::Error` 正确转换
- [ ] 日志输出包含时间戳 + 级别 + 模块名

### TypeScript 侧#

- [ ] `AppError` 类正确构造（code + message + details）
- [ ] 所有 `invoke` 调用都用 `invokeSafe` 包裹（无直接 `invoke`）
- [ ] 无 silent catch（ESLint 规则：`no-empty` + 自定义规则）
- [ ] 错误展示正确（状态栏红色 + 友好消息）

### 集成验证#

- [ ] 删除不存在的事件 → 返回 `EVENT_NOT_FOUND` 错误，状态栏显示"事件不存在"
- [ ] 端口 18765 被占用 → 启动失败，返回 `PORT_IN_USE` 错误，状态栏显示"端口已被占用"
- [ ] 无效时间范围（start > end）→ 返回 `INVALID_TIME_RANGE` 错误
- [ ] 日志文件（V2）在 `~/.local/share/com.desktop-calendar/logs/` 下生成

---

## 6. 未决策事项#

- [ ] **V2 日志文件**：是否实现日志滚动？（超过 10MB 自动滚动）
- [ ] **V2 错误上报**：是否集成 Sentry / 自定义错误上报服务？
- [ ] **ESLint 规则**：是否添加自定义规则禁止 `invoke` 直接调用 + silent catch？
- [ ] **国际化**：错误信息是否支持中英双语？（当前只有中文）

---

> 🕊️ 本文档由咕咕起草，老板确认后作为错误处理开发基准。
> 变更需更新版本号并注明原因。
