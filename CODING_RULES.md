# 📋 Coding Rules — Desktop Calendar Tauri

> 通用编码规范，适用于项目任何阶段。目标是代码整洁、可持续迭代、AI 和人类都能高效协作。

---

## 🔤 1. 命名规范（铁律）

### 1.1 TypeScript / JavaScript

| 元素 | 规范 | ✅ 正确 | ❌ 错误 |
|------|------|---------|---------|
| 文件名（组件） | PascalCase | `EventCard.tsx` | `eventCard.tsx` |
| 文件名（工具/ Hook） | camelCase | `dateUtils.ts` / `useEvents.ts` | `DateUtils.ts` |
| 文件名（类型） | kebab-case + 后缀 | `event.types.ts` | `EventType.ts` |
| 函数名 | camelCase | `getEvents()` | `GetEvents()` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` | `maxRetryCount` |
| 组件名 | PascalCase | `export function EventCard()` | `export function eventCard()` |
| 接口/类型名 | PascalCase | `interface Event {}` | `interface event {}` |
| 枚举名 | PascalCase | `enum EventType {}` | `enum event_type {}` |
| 枚举值 | UPPER_SNAKE_CASE 或 PascalCase | `ACTIVE` / `Active` | `active` |
| 私有方法/变量 | camelCase + `_` 前缀（可选） | `_handleClick()` | — |

### 1.2 Rust

| 元素 | 规范 | ✅ 正确 | ❌ 错误 |
|------|------|---------|---------|
| 文件名 | snake_case | `event_repository.rs` | `eventRepository.rs` |
| 模块名 | snake_case | `mod event_repository;` | `mod EventRepository;` |
| 函数/方法 | snake_case | `pub fn find_by_id()` | `pub fn findById()` |
| 结构体 | PascalCase | `pub struct Event {}` | `pub struct event {}` |
| 枚举 | PascalCase | `pub enum EventType {}` | `pub enum event_type {}` |
| 常量 | UPPER_SNAKE_CASE | `const MAX_RETRIES: u32` | `const maxRetries: u32` |
| 静态变量 | UPPER_SNAKE_CASE | `static mut CONFIG: Config` | — |
| 局部变量 | snake_case | `let event_count = 0;` | `let eventCount = 0;` |
| 泛型参数 | PascalCase（单大写字母） | `<T>` / `<EventT>` | `<eventT>` |
| 宏名 | snake_case! | `println!()` | — |

### 1.3 CSS / 类名

| 规范 | ✅ 正确 | ❌ 错误 |
|------|---------|---------|
| Tailwind：直接用工具类 | `className="flex p-4"` | — |
| CSS Modules：camelCase | `.eventCard {}` | `.event-card {}` |
| BEM（如不用 Tailwind） | `.event-card__title--active` | — |

---

## 📦 2. 文件与目录组织原则

### 2.1 文件组织基本原则

1. **一个文件一个职责**：文件超过 300 行必须审视是否可以拆分
2. **相关代码放一起**：同一个功能的组件、类型、样式放在同一目录下
3. **通用代码放底层**：越通用的代码越靠近根目录的 `utils/` / `common/`

### 2.2 目录职责划分（前端）

```
src/
├── components/     # 纯展示组件，不直接写业务逻辑
├── hooks/         # 可复用的状态逻辑（业务逻辑写这里）
├── stores/        # 全局状态管理
├── utils/         # 纯函数工具（无副作用）
├── types/         # TypeScript 类型定义
├── constants/     # 常量定义
└── services/      # 外部 API / IPC 调用封装
```

**规则**：
- ❌ `components/` 里禁止直接写 API 调用、数据处理逻辑
- ❌ `utils/` 里禁止写有副作用的函数（如直接修改全局状态）
- ✅ 新增文件前，先检查 `utils/` 和 `hooks/` 是否有可复用的

### 2.3 目录职责划分（Rust 后端）

```
src/
├── commands/      # Tauri IPC 命令（参数校验 + 调用下层）
├── db/           # 数据库访问层（唯一写 SQL 的地方）
├── models/       # 数据结构定义
├── services/     # 业务逻辑层
├── utils/        # 纯函数工具
└── error.rs      # 统一错误类型定义
```

**规则**：
- ❌ `commands/` 里禁止直接写 SQL → 必须调用 `db/` 层
- ❌ `db/` 层里禁止写业务逻辑 → 只做数据读写
- ✅ `services/` 是业务逻辑的唯一去处

---

## 🏗️ 3. 代码整洁规则

### 3.1 函数规范

| 规则 | 说明 |
|------|------|
| 函数长度 ≤ 50 行（TS）/ 30 行（Rust） | 超过必须拆分 |
| 函数参数 ≤ 3 个 | 超过用对象/结构体封装 |
| 禁止嵌套超过 3 层 | 用 early return / 提取函数扁平化 |
| 一个函数只做一件事 | 函数名应该能完整描述它的功能 |

**示例（Early Return 扁平化）**：
```typescript
// ✅ 正确
function processEvent(event: Event): Result {
  if (!event.title) return { ok: false, error: 'title required' };
  if (!event.startTime) return { ok: false, error: 'startTime required' };
  return { ok: true, value: saveEvent(event) };
}

// ❌ 错误（深层嵌套）
function processEvent(event: Event): Result {
  if (event.title) {
    if (event.startTime) {
      return { ok: true, value: saveEvent(event) };
    } else {
      return { ok: false, error: 'startTime required' };
    }
  } else {
    return { ok: false, error: 'title required' };
  }
}
```

### 3.2 注释规范

| 场景 | 要求 |
|------|------|
| 公开 API / 导出函数 | 必须写 JSDoc / Rust Doc 注释 |
| 复杂业务逻辑 | 必须写行内注释解释"为什么"，不是"做什么" |
| 魔法数字 | 必须提取为命名常量并注释含义 |
| Hack / 临时方案 | 必须写 `// HACK:` 或 `// TODO:` 注释说明原因 |

```typescript
// ✅ 好的注释：解释原因
// 使用 setTimeout 而非 requestAnimationFrame，
// 因为后者在页面不可见时会暂停（Chrome 后台页优化）
setTimeout(() => { ... }, 0);

// ❌ 差的注释：重复代码内容
// 设置标题
setTitle(event.title);  // ← 废话注释，删除
```

### 3.3 类型安全

**TypeScript**：
- ❌ 禁止 `any` 类型（包括 `as any` 类型断言）
- ❌ 禁止 `@ts-ignore`（除非有详细注释说明原因）
- ✅ 用 `unknown` 替代 `any`
- ✅ 用类型守卫（type guard）缩小类型范围

**Rust**：
- ❌ 生产代码禁止 `unwrap()`（用 `?` 或 `match`）
- ❌ 禁止 `expect()` 硬编码错误信息（用 `thiserror` 定义错误类型）
- ✅ 用 `thiserror` 定义业务错误类型

---

## ♻️ 4. 复用与 DRY 规则

### 4.1 抽取复用的触发条件

满足以下**任意一条**，必须抽取为独立函数/模块：

- 同一段逻辑在 **2 个及以上**地方出现
- 函数超过 **50 行**（TypeScript） / **30 行**（Rust）
- 组件超过 **200 行** → 拆分子组件
- 文件超过 **400 行** → 拆分文件

### 4.2 新增代码前的检查清单

```
新增任何功能前，必须检查：
  □ 项目内是否有同类实现？
  □ utils/ 是否有可复用的工具函数？
  □ hooks/ 是否有可复用的逻辑？
  □ 是否有现成的类型定义可以复用？
  □ 是否有现成的组件可以复用？
```

**如果找到现有实现** → 直接调用或扩展，禁止重新实现。

---

## 🚨 5. 错误处理规范

### 5.1 TypeScript 侧

```typescript
// ✅ 正确：显式处理错误
async function createEvent(event: EventInput): Promise<Result<Event, AppError>> {
  try {
    return { ok: true, value: await invoke<Event>('create_event', { event }) };
  } catch (e) {
    return { ok: false, error: mapTauriError(e) };
  }
}

// ❌ 错误：silent catch
try { await invoke(...) } catch (e) { /* empty */ }

// ❌ 错误：catch 后不处理
try { await invoke(...) } catch (e) { console.log(e); }
```

### 5.2 Rust 侧

```rust
// ✅ 正确：统一错误类型，用 ? 传播
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Db(#[from] rusqlite::Error),
    #[error("Not found: {0}")]
    NotFound(String),
}

// 所有公开函数返回 Result<T, AppError>
pub fn find_event_by_id(id: &str) -> Result<Event, AppError> {
    // 用 ? 传播错误，不要 unwrap
    let conn = establish_connection()?;
    conn.query_row("SELECT ...", [...], |row| { ... })
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(id.to_string()),
            _ => AppError::Db(e),
        })
}
```

---

## 📋 6. 代码审查自查清单

**提交代码前（人类或 AI），必须自查**：

- [ ] 命名是否符合规范（见第 1 节）？
- [ ] 函数是否超过 50 行（TS）/ 30 行（Rust）？
- [ ] 是否有重复代码可以抽取？
- [ ] 类型是否完整（无 `any` / `unwrap()`）？
- [ ] 错误处理是否完整（无 silent catch）？
- [ ] 是否引入了新依赖？理由是否充分？
- [ ] 注释是否解释了"为什么"而不是"做什么"？
- [ ] 公开函数是否有文档注释？
- [ ] 是否有魔法数字未提取为常量？
- [ ] Rust 代码是否有 `unwrap()` 或 `expect()`？

---

## 🚫 7. 绝对禁止清单

| 禁止项 | 原因 |
|--------|------|
| `console.log` 提交到 main 分支 | 用统一日志系统 |
| 硬编码敏感信息（密钥/路径） | 用环境变量或配置文件 |
| `any` 类型（TypeScript） | 破坏类型安全 |
| `unwrap()`（Rust 生产代码） | 运行时 panic 风险 |
| 函数参数超过 3 个不封装 | 降低可读性和可维护性 |
| 嵌套超过 3 层不扁平化 | 代码难以理解和测试 |
| 复制粘贴代码不抽取 | 违反 DRY 原则 |
| 不做错误处理 | 系统脆弱，难以调试 |

---

## 🔄 8. 规范更新

本规范是通用规则，不绑定具体技术选型：

- 发现新问题时，及时更新本文件
- 重大规范变更，需在讨论后更新
- AI Agent 发现规范有矛盾/过时，应主动提出修改建议
- 规范更新后，需在提交信息中注明 `chore(rules): 更新规范 - 原因`

---

> 🕊️ 本规范由咕咕起草，适用于项目任何阶段。AI Agent 在生成代码前必须读取本文件。
