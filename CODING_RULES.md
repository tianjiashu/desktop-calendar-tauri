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

## 🎨 6. 设计 Token 体系

> **核心原则：所有视觉值必须通过 CSS 变量（设计 token）引用，禁止硬编码颜色/圆角/阴影值。**

### 6.1 Token 定义规则

CSS 变量定义集中在 `src/index.css`，按以下分组：

| 分组 | Token 前缀 | 用途 |
|------|-----------|------|
| 品牌色 | `--brand-*` | 产品主色调 |
| 主操作色 | `--accent-*` | 交互按钮、高亮元素 |
| 事件类型色 | `--event-*` | interview / meeting / reminder / deadline / default |
| 中性色 | `--bg-*` / `--border-*` / `--text-*` | 背景、边框、文字层级 |
| 阴影 | `--shadow-*` | 浮层、卡片阴影层级 |
| 圆角 | `--radius-*` | sm(6px) / md(8px) / lg(12px) / xl(16px) / full(9999px) |
| 字号 | `--text-*` | 文字大小层级 |
| 间距 | `--space-*` | 布局间距层级 |

### 6.2 暗色模式

- CSS 变量在 `:root` 中定义浅色值，在 `.dark` 中定义暗色值
- 事件类型色在 `.dark` 模式下必须提亮约 10%，确保暗色背景上可读
- `tailwind.config.js` 必须设置 `darkMode: 'class'`

### 6.3 Tailwind 同步

新增 CSS 变量时，必须同步添加到 `tailwind.config.js` 的 `extend` 块中，使用 `var(--token-name)` 引用：

```js
// tailwind.config.js
extend: {
  colors: {
    'accent-500': 'var(--accent-500)',
  },
  borderRadius: {
    'md': 'var(--radius-md)',
  },
}
```

### 6.4 JS 侧颜色常量

功能性硬编码颜色（如 `PRESET_COLORS`、`EVENT_TYPE_COLORS`）允许存在，但必须：

- hex 值与设计 token 中的对应值完全一致
- 注释中标注对应的 token 名称

```typescript
/** @see --event-meeting  #059669 */
export const MEETING_COLOR = '#059669';
```

---

## 🔤 7. 字体体系

### 7.1 字体栈

| 用途 | 字体栈 |
|------|--------|
| 正文 / UI | `'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif` |
| 等宽（时间/代码） | `'Geist Mono', 'SF Mono', Monaco, Consolas, monospace` |

- 禁止自行拼写不同的字体栈
- 字体通过 `@fontsource` 包自托管引入（`main.tsx` 中 `import '@fontsource/geist-sans'`），禁止通过 CDN / Google Fonts 加载

---

## 🏷️ 8. 图标体系

### 8.1 核心规则

- **禁止使用 emoji 和 ASCII 字符作为 UI 图标**（包括 `◀ ▶ ● ↻ ＋ － ✕ 🔗 ⚠️ 🔍 🔄 📁 🗄️ ⚡ ✅ ❌ 💡` 等）
- 所有图标统一使用 `@phosphor-icons/react` 组件渲染
- 按需引入：`import { X, Check } from '@phosphor-icons/react'`，禁止 `import * as Phosphor` 全量导入

### 8.2 图标尺寸规范

| 场景 | 尺寸 |
|------|------|
| 小图标（tag 内、状态指示） | 10-12px |
| 常规图标（按钮、列表项） | 14-16px |
| 强调图标（空状态、Hero） | 18px |

### 8.3 图标 weight 选择

| weight | 使用场景 |
|--------|----------|
| `regular` | 常规操作按钮 |
| `bold` | 强调状态、激活态 |
| `duotone` | 事件类型标识 |
| `fill` | 警告、错误状态 |

### 8.4 可访问性

- 图标按钮必须设置 `aria-label`（中文）和 `title`（中文）
- 装饰性图标设置 `aria-hidden="true"`

### 8.5 事件类型图标映射

事件类型图标映射集中在 `src/components/Calendar/EventIcon.tsx`，使用 `Record<EventType, React.FC>` 映射表。新增事件类型时必须在此注册图标。

---

## 🌓 9. 主题系统

### 9.1 统一入口

主题切换统一使用 `useTheme()` hook（位于 `src/hooks/useTheme.ts`），不得自行操作 `document.documentElement.classList`。

### 9.2 三种模式

| 模式 | 行为 |
|------|------|
| `light` | 强制浅色 |
| `dark` | 强制暗色 |
| `system`（默认） | 跟随系统 `prefers-color-scheme` |

- 选择通过 `localStorage` 持久化
- `system` 模式下必须监听 `prefers-color-scheme` 的 `change` 事件，实时跟随系统切换

### 9.3 localStorage 安全

所有 localStorage 读写必须包裹 try-catch，静默处理不可用的情况（隐私模式、配额超限等）：

```typescript
function safeGetItem(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback; }
  catch { return fallback; }
}
```

---

## 🧩 10. 组件规范

### 10.1 文件结构

每个组件文件顶部必须有功能编号注释：

```typescript
// ========== EventCard (F1, F5, F20) ==========
```

> 功能编号对应需求文档，便于追溯。

### 10.2 导出规范

- 导出组件为 `const ComponentName: React.FC<Props>` 或 `default export`
- 子组件（如 `ThemeToggle`）可定义在同一文件中但不应导出

### 10.3 纯函数提取

组件内提取的纯函数（如 `isWeekend()`、`getTodayEvents()`）应定义在组件外部（模块顶层），避免每次渲染重新创建：

```typescript
// ✅ 正确：定义在模块顶层
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export const WeekHeader: React.FC<Props> = ({ dates }) => {
  // ...
};

// ❌ 错误：定义在组件内部
export const WeekHeader: React.FC<Props> = ({ dates }) => {
  function isWeekend(date: Date): boolean { /* ... */ }
  // ...
};
```

### 10.4 可访问性基线

- 所有按钮必须有 `aria-label`（中文）和 `title`（中文）
- 交互元素必须有 `role` 属性（如浮球 `role="button"`）

### 10.5 性能优化

- `EventCard` 等列表渲染组件使用 `React.memo` 包裹
- 列表使用稳定的 `key`（非 index）

---

## 📐 11. 数值与尺寸规范

### 11.1 最小点击区域

| 元素类型 | 最小高度 |
|----------|----------|
| 紧凑按钮（WeekHeader） | 32px |
| 标准按钮（Dialog 按钮） | 40px |

### 11.2 圆角层级

| Token | 值 | 使用场景 |
|-------|-----|----------|
| `--radius-sm` | 6px | 小按钮、tag |
| `--radius-md` | 8px | input、button |
| `--radius-lg` | 12px | card、dialog |
| `--radius-xl` | 16px | 外壳容器 |
| `--radius-full` | 9999px | 浮球、pill |

### 11.3 关键尺寸

| 元素 | 尺寸 |
|------|------|
| Dialog 宽度 | 440px |
| Textarea 最小高度 | 80px |

---

## 🎯 12. 事件类型规范

### 12.1 类型定义

| 类型 | 含义 | CSS Token | 色系 |
|------|------|-----------|------|
| `interview` | 面试 | `--event-interview` | 钢蓝 |
| `meeting` | 会议 | `--event-meeting` | 翡翠绿 |
| `reminder` | 提醒 | `--event-reminder` | 琥珀 |
| `deadline` | 截止 | `--event-deadline` | 警示红 |
| `default` | 默认 | `--event-default` | Slate |

### 12.2 视觉呈现

- 事件卡片使用"浅底渐变 + 左 3px 色条"样式，不使用纯色背景填充
- 事件卡片内必须显示类型图标（`EventIcon` 组件）作为标题前缀
- `eventTypeColors.ts` 中的颜色常量必须与 `index.css` 中 `--event-*` token 值完全一致

---

## ♿ 13. 可访问性

### 13.1 减少动画偏好

`index.css` 必须包含：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 13.2 屏幕阅读器

- 浮球 Widget 的 `aria-label` 应包含动态信息，如 `今日 ${count} 个事件，双击展开`
- 装饰性图标设置 `aria-hidden="true"`，功能性图标必须有 `aria-label`

### 13.3 图标可访问性规则

| 图标类型 | 要求 |
|----------|------|
| 功能性图标（按钮内） | 必须有 `aria-label` 和 `title` |
| 装饰性图标 | 设置 `aria-hidden="true"` |

---

## 📋 14. 代码审查自查清单

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
- [ ] 颜色是否通过 CSS 变量引用（无硬编码 hex/rgb）？
- [ ] 是否使用了 emoji 或 ASCII 作为 UI 图标？
- [ ] 图标按钮是否有 `aria-label` 和 `title`？
- [ ] 新增 CSS 变量是否同步到 `tailwind.config.js`？
- [ ] 事件卡片是否包含类型图标和左色条？
- [ ] 是否包含 `prefers-reduced-motion` 规则？

---

## 🚫 15. 绝对禁止清单

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
| 在 `.css` 中硬编码颜色值 | 暗色模式无法自动切换 |
| 使用 emoji / ASCII 字符作为 UI 图标 | 平台渲染差异大，破坏一致性 |
| `import * as Phosphor` 全量导入 | 增大 bundle 体积 |
| 自行操作 `document.documentElement.classList` 切换主题 | 与 `useTheme()` 冲突 |
| 通过 CDN / Google Fonts 加载字体 | 离线不可用，增加网络延迟 |
| 将纯函数定义在组件内部 | 每次渲染重复创建，浪费性能 |

---

## 🔄 16. 规范更新

本规范是通用规则，不绑定具体技术选型：

- 发现新问题时，及时更新本文件
- 重大规范变更，需在讨论后更新
- AI Agent 发现规范有矛盾/过时，应主动提出修改建议
- 规范更新后，需在提交信息中注明 `chore(rules): 更新规范 - 原因`

---

> 🕊️ 本规范由咕咕起草，适用于项目任何阶段。AI Agent 在生成代码前必须读取本文件。
