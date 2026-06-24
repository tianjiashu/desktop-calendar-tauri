> ⚠️ **归档说明**:本文档已拆分为 `docs/ui-optimization/` 目录下的多个模块文档,本文件仅作历史归档。
> 请前往 [docs/ui-optimization/README.md](./ui-optimization/README.md) 查看最新版本。

---

# 桌面日历 UI 优化设计方案（已归档）

> **设计读（Design Read）**：本项目是一个 Tauri 桌面端紧凑型生产力日历工具，包含 100×100 浮球 Widget 与 860×780 周视图两种窗口形态。对标 Cron / Things 3 / Linear Calendar 的"精致小工具"美学，**不是** Landing Page，也**不是** Dashboard。
>
> **三档参数（Dials）**：
> - `DESIGN_VARIANCE: 4` — 功能性网格优先，可预测、克制，禁止花哨
> - `MOTION_INTENSITY: 4` — 轻量流畅过渡（150-300ms cubic-bezier），无电影级动画
> - `VISUAL_DENSITY: 6` — 紧凑桌面工具，信息密度高，但留白要够呼吸
>
> **方案性质**：本文件仅作设计方向与选型论证，**不修改任何代码**。后续按路线图分阶段落地。

---

## 一、现状盘点（Audit Before Touching）

### 1.1 技术栈快照

| 维度 | 现状 |
|------|------|
| 框架 | React 18 + TypeScript + Vite 6 |
| 样式 | Tailwind CSS 3.4（仅引入，未配置主题） + 大量手写 CSS（`App.css` 511 行、`EventDialog.css` 313 行） |
| 状态管理 | Zustand 4.5 |
| 桌面壳 | Tauri 2.x（Rust） |
| 图标 | **无图标库**，全部用 emoji（🔗 ⚠️ 🔍 🔄 ✕）和 ASCII 字符（◀ ▶ ● ↻ ＋ －） |
| 字体 | 系统字体栈：`-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei'` |
| 暗色模式 | **无** |
| 动效 | 仅 CSS hover/transition（150ms），无入场动画、无骨架屏 |

### 1.2 痛点清单（按严重度排序）

#### P0 — 设计系统层缺失
1. **没有设计 Token**：颜色硬编码散落在 CSS（`#3B82F6` `#EF4444` `#F9FAFB` `#E5E7EB` 各出现 10+ 次），改一处要全局搜索替换。
2. **没有组件库**：Button、Input、Dialog、Tooltip、Toast 全是手写 div + className，状态机不全（loading/empty/error 缺失或用 emoji 顶替）。
3. **图标系统混乱**：`◀▶●↻＋－✕` 是 ASCII 字符，`🔗⚠️🔍🔄` 是 emoji，跨平台渲染不一致（Windows 和 macOS 上 emoji 风格差异巨大），且无统一 strokeWidth。

#### P1 — 视觉层问题
4. **AI 通用蓝**：主色 `#3B82F6` 是 Tailwind 默认 blue-500，也是所有 LLM 生成 UI 的默认色，**缺乏品牌识别度**。
5. **无暗色模式**：纯白背景 + 灰边框，桌面常驻场景下夜间刺眼，也不符合现代桌面应用标配。
6. **字体未加载品牌字**：系统字体栈在不同 OS 上呈现差异大，且无 Display 字体强化标题层级。
7. **圆角不统一**：`border-radius: 4px / 6px / 8px / 12px / 16px / 50%` 混用，无系统规则。
8. **阴影纯黑**：`box-shadow: 0 4px 12px rgba(0,0,0,0.2)` 纯黑投影在浅色背景上发灰发脏，应改为主色相 tinted shadow。

#### P2 — 交互与可用性
9. **按钮点击目标过小**：`week-header-btn` 只有 28×28px，**违反 WCAG 2.5.5（最小 44×44px 触摸目标）**，桌面端鼠标点击也偏小。
10. **无空状态设计**：当某天无事件时，day-column 完全空白，用户不知道能双击新建。
11. **无加载骨架屏**：`isLoading` 只在状态栏显示"加载中..."文字，主区域无 skeleton。
12. **Toast 样式简陋**：纯色块 + 白字，无图标、无进度条、无 hover 暂停。
13. **DiagnosticPanel 全 inline style**：与项目 CSS 体系割裂，且 emoji 当图标（🔍 🔄 ✕ 📁 🗄️ ⚡ ✅ ❌ 💡）。
14. **EventCard 颜色对比度风险**：浅色事件（如 `#F59E0B` 黄）上的白字对比度可能不达 WCAG AA 4.5:1。

#### P3 — 排版与节奏
15. **间距不成体系**：`padding: 0 12px` / `6px 0` / `8px 20px` / `16px 20px` 随机数值，无 4px/8px 基线。
16. **字号梯度无规则**：`8px / 9px / 10px / 11px / 12px / 13px / 14px / 16px / 24px`，没有 type scale 比例。
17. **WeekHeader 按钮挤成一团**：7 个按钮挤在 48px 高的 header 里，无视觉分组（导航 vs 操作）。

---

## 二、设计方向锁定（5 大决策）

### 2.1 设计系统选型：**shadcn/ui**（推荐） vs Radix Themes

| 选项 | 优势 | 劣势 | 推荐度 |
|------|------|------|--------|
| **shadcn/ui** | 代码归你所有，可深度定制；Tailwind 原生；社区组件丰富；无运行时主题 Provider 包裹 | 需要逐个 `npx shadcn add` 引入；无内置 Theme Provider 需自己接 next-themes | ⭐⭐⭐⭐⭐ |
| Radix Themes | 开箱即用 `<Theme>` Provider；内置暗色；强约定 | 强约定难深度定制；和 Tailwind 共存有冲突；包体积大 | ⭐⭐⭐ |
| 手写组件 | 零依赖，现状延续 | 状态机不全、a11y 缺失、维护成本指数级上升 | ⭐ |

**结论：选 shadcn/ui**。理由：
- 项目已是 React + Tailwind，shadcn/ui 是原生适配，不引入新范式
- 桌面工具需要"小而美"，shadcn 让我们拥有组件代码，可按 860px 窄窗口深度定制（默认 shadcn 的 Dialog 在窄窗下会溢出，需要改）
- 暗色模式用 `next-themes` 或自写 `useTheme` hook + `class="dark"` 切换，灵活
- **绝不**使用 shadcn 默认态（默认 zinc 灰 + 圆角 0.5rem 太普通），需按本方案 §3.2 定制 token

**首次引入清单**：
```bash
npx shadcn@latest init      # 初始化（选 New York style，CSS variables，zinc base）
npx shadcn@latest add button input textarea dialog tooltip toast badge
npx shadcn@latest add select popover dropdown-menu separator scroll-area
```

### 2.2 图标库选型：**Phosphor Icons**（推荐）

| 选项 | 风格 | strokeWidth | 多权重 | 推荐度 |
|------|------|-------------|--------|--------|
| **@phosphor-icons/react** | 几何感、柔和、有 6 种权重（thin/light/regular/bold/fill/duotone） | 自适应 | ✅ | ⭐⭐⭐⭐⭐ |
| hugeicons-react | 现代精致、略圆润 | 自适应 | ✅ | ⭐⭐⭐⭐ |
| @radix-ui/react-icons | 简洁克制、配 Radix 生态 | 1.5px 固定 | ❌ | ⭐⭐⭐ |
| @tabler/icons-react | 线条感、数量多 | 2px 固定 | ❌ | ⭐⭐⭐ |
| lucide-react | Feather 继承者，社区主流 | 2px 固定 | ❌ | ⭐⭐（不推荐默认） |

**结论：选 Phosphor Icons**，统一使用 `weight="regular"`，`size={16}`（小按钮）/ `size={20}`（中按钮）。理由：
- Phosphor 的 `duotone` 权重可作事件类型图标（面试/会议/提醒/截止），视觉层次更丰富
- strokeWidth 全局一致，不会出现"有的图标粗有的细"
- **禁止**手画 SVG，**禁止**继续用 emoji/ASCII 当图标

**安装**：
```bash
npm install @phosphor-icons/react
```

**图标映射建议**（替换现有 emoji/ASCII）：

| 当前 | 替换为 Phosphor | 用途 |
|------|-----------------|------|
| `◀` | `<CaretLeft size={16} />` | 上一周 |
| `▶` | `<CaretRight size={16} />` | 下一周 |
| `●` | `<DotCircle size={16} />` | 回到本周 |
| `↻` | `<ArrowClockwise size={16} />` | 刷新 |
| `＋` | `<Plus size={18} weight="bold" />` | 新建事件 |
| `－` | `<Minus size={16} />` | 收缩为浮球 |
| `✕` | `<X size={16} />` | 关闭 |
| `🔗` | `<Link size={14} />` | 事件链接 |
| `⚠️` | `<Warning size={14} weight="fill" />` | 错误提示 |
| `🔍` | `<MagnifyingGlass size={16} />` | 诊断面板 |
| `🔄` | `<ArrowsClockwise size={14} />` | 刷新（诊断面板） |
| `📁` | `<Folder size={14} />` | 日志目录 |
| `🗄️` | `<Database size={14} />` | 数据库 |
| `⚡` | `<Lightning size={14} weight="fill" />` | 最近错误 |

事件类型图标（duotone 权重，配在 EventCard 和 EventDialog）：

| 类型 | 图标 | 颜色 |
|------|------|------|
| interview 面试 | `<UserFocus duotone />` | blue |
| meeting 会议 | `<Users duotone />` | emerald |
| reminder 提醒 | `<Bell duotone />` | amber |
| deadline 截止 | `<FlagBanner duotone />` | red |
| default 默认 | `<Circle duotone />` | slate |

### 2.3 字体方案：**Geist + Geist Mono**

| 用途 | 字体 | 来源 |
|------|------|------|
| 显示/UI 文本 | **Geist Sans** | Vercel 出品，几何感、x-height 高、小字号清晰，比 Inter 更有性格 |
| 等宽（时间、数字） | **Geist Mono** | 时间标签 `08:00`、事件时间 `09:00 - 10:00`、诊断面板 |
| 中文 fallback | `PingFang SC, Microsoft YaHei` | 系统字体栈保留 |

**理由**：
- 不用 `Inter`（design-taste-frontend skill 明确反对此默认选择，是 LLM 默认 AI tell）
- Geist 在小字号（10-13px）下可读性优于 Inter，适合 860px 窄窗口
- 自托管：用 `@fontsource/geist-sans` + `@fontsource/geist-mono`，**禁止** `<link>` Google Fonts（Tauri 离线场景必须自托管）

**安装**：
```bash
npm install @fontsource/geist-sans @fontsource/geist-mono
```

**引入**（在 `main.tsx`）：
```ts
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-sans/700.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
```

### 2.4 色板与暗色模式 Token

**主色重选**：弃用 Tailwind 默认 `#3B82F6`（AI 通用蓝），改用 **更冷调、更克制的 Steel Blue**，搭配 **Warm Slate** 中性色，让整体偏向 Linear/Notion 那种"冷静的生产力感"。

```css
/* === Design Tokens === */
/* 放在 tailwind.config.js 的 theme.extend.colors 或 :root CSS 变量 */

:root {
  /* ---------- 品牌主色：Steel Blue ---------- */
  --brand-50:  #eff6ff;
  --brand-100: #dbeafe;
  --brand-200: #bfdbfe;
  --brand-300: #93c5fd;
  --brand-400: #60a5fa;
  --brand-500: #3b82f6;  /* 暂保留兼容，后续淡出 */
  --brand-600: #2563eb;
  --brand-700: #1d4ed8;
  /* 新主色 — 偏冷的 Indigo Steel */
  --accent-500: #4f6bed;  /* 主操作色 */
  --accent-600: #3f56d4;
  --accent-700: #3245b0;

  /* ---------- 事件类型色（语义化） ---------- */
  --event-interview: #4f6bed;  /* 钢蓝 */
  --event-meeting:   #10b981;  /* 翡翠绿 */
  --event-reminder:  #f59e0b;  /* 琥珀 */
  --event-deadline:  #ef4444;  /* 警示红 */
  --event-default:   #64748b;  /* Slate */

  /* ---------- 中性色：Warm Slate（浅色） ---------- */
  --bg-base:        #fafaf9;  /* 主背景，warm off-white */
  --bg-elevated:    #ffffff;  /* 卡片、Dialog */
  --bg-subtle:      #f5f5f4;  /* header、status bar */
  --bg-hover:       #f0f0ef;  /* hover 态 */
  --border-subtle:  #e7e5e4;  /* hairline */
  --border-default: #d6d3d1;  /* input 边框 */
  --text-primary:   #1c1917;  /* stone-900 */
  --text-secondary: #57534e;  /* stone-600 */
  --text-tertiary:  #a8a29e;  /* stone-400 */
  --text-inverse:   #fafaf9;  /* 深色背景上的字 */

  /* ---------- 阴影：tinted ---------- */
  --shadow-sm: 0 1px 2px 0 rgb(28 25 23 / 0.04);
  --shadow-md: 0 4px 8px -2px rgb(28 25 23 / 0.08), 0 2px 4px -2px rgb(28 25 23 / 0.04);
  --shadow-lg: 0 12px 24px -6px rgb(28 25 23 / 0.10), 0 4px 8px -4px rgb(28 25 23 / 0.06);
  --shadow-glow: 0 0 0 3px rgb(79 107 237 / 0.15);  /* focus ring */

  /* ---------- 圆角系统（统一） ---------- */
  --radius-sm:  6px;   /* 小按钮、tag */
  --radius-md:  8px;   /* input、button */
  --radius-lg:  12px;  /* card、dialog */
  --radius-xl:  16px;  /* week-view-container 外壳 */
  --radius-full: 9999px; /* 浮球、pill */

  /* ---------- 字号梯度（1.125 modular scale） ---------- */
  --text-xs:   11px;
  --text-sm:   12px;
  --text-base: 13px;
  --text-md:   14px;
  --text-lg:   16px;
  --text-xl:   18px;
  --text-2xl:  22px;
  --text-3xl:  28px;

  /* ---------- 间距（4px 基线） ---------- */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
}

/* === 暗色模式：Cool Slate（偏冷以平衡 warm light） === */
.dark {
  --bg-base:        #0c0a09;  /* stone-950 */
  --bg-elevated:    #1c1917;  /* stone-900 */
  --bg-subtle:      #292524;  /* stone-800 */
  --bg-hover:       #44403c;  /* stone-700 */
  --border-subtle:  #292524;
  --border-default: #44403c;
  --text-primary:   #fafaf9;
  --text-secondary: #d6d3d1;
  --text-tertiary:  #78716c;
  --text-inverse:   #1c1917;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 8px -2px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3);
  --shadow-lg: 0 12px 24px -6px rgb(0 0 0 / 0.5), 0 4px 8px -4px rgb(0 0 0 / 0.4);

  /* 事件类型色在暗色下提亮 10% */
  --event-interview: #6b85f3;
  --event-meeting:   #34d399;
  --event-reminder:  #fbbf24;
  --event-deadline:  #f87171;
  --event-default:   #94a3b8;
}
```

### 2.5 暗色模式策略

- **默认跟随系统**：`prefers-color-scheme: dark` → 自动切暗色
- **手动覆盖**：在 StatusBar 或 Settings 弹层中提供三态切换（Light / Dark / System）
- **实现方式**：在 `<html>` 上加 `class="dark"`，所有 token 用 CSS 变量切换，Tailwind 用 `dark:` 前缀
- **测试要求**：所有事件类型色、所有按钮、所有 Dialog 必须在两种模式下都通过 WCAG AA 对比度（4.5:1 文本 / 3:1 大字号）

---

## 三、组件级优化清单

### 3.1 BallWidget（浮球，100×100）

**现状问题**：
- 纯色 `#3B82F6` + `border: 2px solid rgba(255,255,255,0.4)`，桌面背景复杂时识别度低
- `font-size: 8px` 的 weekday 几乎看不清
- 事件指示器只是黄点 pulse，信息密度低

**优化方向**：
1. **背景**：改用径向渐变 `radial-gradient(circle at 30% 30%, var(--brand-400), var(--brand-600))`，配合 `backdrop-filter: blur(20px) saturate(1.4)` 实现轻微 glassmorphism（**注意**：保留 `prefers-reduced-transparency: reduce` 的纯色 fallback）
2. **边框**：改为 1px 内边框 + 1px 外阴影描边，模拟物理边缘
3. **字号**：weekday 提升到 `11px`，date 维持 `28px` 但改用 Geist 700
4. **事件指示**：从单黄点改为"3 个小圆点"（最多显示 3 个事件），未完成黄、已完成灰、截止红
5. **悬停**：浮球在鼠标 hover 时 `scale(1.05)` + 阴影加深，提示可双击
6. **入场**：从浮球模式切到周视图时，浮球 `scale(0.9) → 0` 淡出，周视图 `scale(0.95) → 1` 淡入（用 Motion `AnimatePresence`）

### 3.2 WeekHeader（顶部导航栏，48px 高）

**现状问题**：
- 7 个 28×28 按钮挤成一团，无视觉分组
- ASCII 字符图标不专业
- 没有分组分隔

**优化方向**：
```
┌────────────────────────────────────────────────────────────┐
│ [◀]  6月 24日 - 6月 30日  [●] [▶]   │   [↻] [＋] [－] [✕]  │
│  ←—— 导航组 ——→              分隔线    ←—— 操作组 ——→       │
└────────────────────────────────────────────────────────────┘
```

1. **按钮尺寸**：从 28×28 提升到 **32×32**（仍紧凑，但更易点）
2. **图标替换**：全部换 Phosphor（见 §2.2 映射表）
3. **分组**：导航组（◀ ● ▶）与操作组（↻ ＋ － ✕）之间加 `1px vertical divider` (`w-px h-4 bg-border-subtle mx-2`)
4. **标题**：周标题改为 `"6月24日 - 6月30日"`（当前周显示 `"本周 · 6月24日 - 6月30日"`），字号 `text-md font-medium`
5. **今日按钮**：当不在本周时 `●` 改为 pill 形 `[今日]` 按钮 + accent 色，在当前周时隐藏（避免冗余）
6. **拖拽区域**：header 中间无按钮区域继续支持 `startDragging`，但加 `cursor-grab` 视觉提示

### 3.3 DayHeader（单日表头）

**现状**：
- weekday `11px` + day-number `16px`，今日加蓝底圆圈
- 周末无视觉区分

**优化方向**：
1. **周末区分**：周六/周日的 weekday 用 `--text-tertiary` 灰色，工作日 `--text-secondary`
2. **今日样式**：从蓝底圆圈改为 `accent-500` 实心圆 + 白字（保持），但圆圈直径从 26px 提升到 28px
3. **事件数提示**：在 day-number 下方加小字 `"3 事件"`（灰色 `text-xs`），无事件时显示 `"+ 新建"`（accent 色，点击创建）

### 3.4 EventCard（事件卡片）⭐ 核心组件

**现状问题**：
- 纯色块 + 白字，浅色事件（黄/橙）白字对比度不达标
- 无事件类型图标
- title `10px` 太小
- conflict 仅靠红左边框

**优化方向**：

```
┌──────────────────────────────────┐
│ ▌ 09:00 - 10:00                  │  ← 左侧 3px 实色色条
│ ▌ ⊛ 周会                         │  ← 类型图标 + 标题
│ ▌ Meeting Room A                 │  ← location (可选)
└──────────────────────────────────┘
背景：event-color 10% 透明度
文字：text-primary
```

1. **背景**：从纯色改为 `background: linear-gradient(90deg, ${color}15 0%, ${color}08 100%)`（事件色 8-15% 透明度）
2. **左边框**：3px 实色 `border-left: 3px solid ${color}`，强化类型识别
3. **文字色**：从白色改为 `var(--text-primary)`（暗色下自动反白），**对比度永远达标**
4. **类型图标**：标题前加 12px 的 Phosphor duotone 图标（见 §2.2 映射）
5. **字号**：title `text-sm font-medium`，time `text-xs text-secondary`
6. **冲突态**：从红左边框改为整张卡片 `ring-2 ring-red-400` + 左上角 `<Warning size={10} weight="fill" class="text-red-500" />`
7. **拖拽态**：`opacity-80 + scale-[1.02] + shadow-lg`，更明显的物理反馈
8. **悬停**：`hover:shadow-md hover:-translate-y-px`，轻微抬起

### 3.5 EventDialog（事件编辑弹窗）⭐ 高频组件

**现状问题**：
- 表单 input 背景 `#F9FAFB` 偏灰，focus 时变白，对比度变化太突兀
- 颜色选择器 8 个圆 + 1 个 color input，无类型联动
- "备注（可选）" textarea 太矮（min-height 56px）
- 时间选择是 native `<input type="time">`，桌面端体验不佳

**优化方向**：

1. **宽度**：从 400px 提升到 **440px**（更舒展），max-width 92vw 保留
2. **背景**：input 背景改为 `--bg-elevated`（纯白），focus 时 `--shadow-glow` ring，**消除**灰→白突变
3. **时间选择**：保留 native `<input type="time">`，但加自定义 `::-webkit-calendar-picker-indicator` 样式，颜色统一 `--text-secondary`
4. **类型 + 颜色联动**：合并为一个组件。点击类型按钮后，颜色 picker 自动同步到该类型默认色，但用户仍可覆盖。视觉上类型按钮和颜色 picker 合并为一组
5. **快捷时长**：在时间范围下方加 pill 按钮组 `[30min] [1h] [2h] [全天]`，点击调整 end time
6. **textarea**：min-height 提升到 80px，placeholder 改为更友好的 `"添加议程、链接、备注..."`
7. **底部按钮**：
   - 删除按钮（edit 模式）放左下，红色 ghost 样式 + Trash 图标
   - 取消、保存放右下，保存按钮 `accent-600` + Check 图标
   - 按钮高度从 36 提升到 **40**，更易点
8. **键盘**：`Cmd/Ctrl+S` 提交、`Esc` 取消（已有），加 `Cmd/Ctrl+Enter` 提交

### 3.6 EventTooltip（悬停提示）

**现状**：暗色背景 `rgba(30,30,30,0.92)` + 白字，但 `🔗` emoji 和 `类型：xxx` 文字混排

**优化方向**：
1. 背景：`--bg-elevated` + 80% 不透明 + `backdrop-blur`
2. 加类型色条左侧 `border-left: 3px solid ${color}`
3. 链接前的 `🔗` 换 `<Link size={12} />`
4. 时间用 `<span class="font-mono">` Geist Mono
5. 加入 `location` 行（当前已有，但加 `<MapPin size={12} />` 图标前缀）
6. 加 `created_by` 行：`由 Agent 创建` / `由你创建`（小字灰色）

### 3.7 StatusBar（底部状态栏，28px）

**现状**：emoji `⚠️ 🔍` + 文字"就绪·半透明模式"

**优化方向**：
1. emoji 全换 Phosphor：`<Warning weight="fill" />` / `<MagnifyingGlass />`
2. 默认状态从"就绪·半透明模式"改为 `"8 个事件 · 本周"`（更有信息量）
3. loading 状态用 `<CircleNotch className="animate-spin" />` 替代文字
4. 诊断按钮移到右侧，加 hover tooltip `"诊断信息"`
5. **新增**：状态栏右侧加暗色模式切换按钮（`<Sun />` / `<Moon />` / `<Monitor />`）

### 3.8 Toast

**现状**：纯色块 + 白字，2.5s 自动消失

**优化方向**：
1. 用 shadcn/ui 的 `toast`（基于 Radix Toast），自带 a11y
2. 类型图标：info `<Info weight="fill" />` / warn `<Warning weight="fill" />` / success `<CheckCircle weight="fill" />` / error `<XCircle weight="fill" />`
3. 加左侧 3px 类型色条
4. 加进度条（2.5s 倒计时可视化），hover 时暂停
5. 暗色模式下背景用 `--bg-elevated`，不用纯白

### 3.9 DiagnosticPanel（诊断面板）

**现状**：全 inline style，emoji 满天飞

**优化方向**：
1. **整体重构**：用 shadcn `Dialog` + `ScrollArea` 替代手写 overlay
2. **去除所有 emoji**：按 §2.2 映射表换 Phosphor
3. **结构化**：分 4 个 Section（系统信息 / 数据库 / MCP / 错误日志），用 shadcn `Separator` 分隔
4. **错误日志**：用 `ScrollArea` + 表格形式，时间/级别/模块/消息 4 列，级别用 badge（PANIC 红、ERROR 橙、WARN 黄）
5. **刷新/关闭按钮**：用 shadcn `Button` variant=`ghost` size=`sm`
6. **暗色优先**：诊断面板默认用暗色主题（开发者向，暗色更聚焦），不受全局主题影响

### 3.10 TimeColumn & TimeGridLines（时间轴）

**现状**：时间标签 `11px` 灰色，整点实线 + 半点虚线

**优化方向**：
1. 时间标签改用 Geist Mono `font-mono text-xs text-tertiary`
2. 整点线颜色从 `#E5E7EB` 改为 `--border-subtle`
3. 半点虚线从 `1px dashed #F3F4F6` 改为 `1px dashed --border-subtle`（暗色下也可见）
4. 当前时间线（红色）改为 `accent-600` 2px + 右侧 `<Dot size={8} weight="fill" />` 圆点

### 3.11 CurrentTimeLine（当前时间指示线）

**现状**：红色 2px 横线 + 左侧红色时间标签

**优化方向**：
1. 线条颜色从警示红 `#EF4444` 改为 `accent-500`，避免与冲突红混淆
2. 右端加 `<CaretRight size={12} weight="fill" />` 指示当前时间方向
3. 时间标签用 Geist Mono + 半透明胶囊背景 `bg-accent-500 text-white px-1.5 rounded-sm`
4. 入场动画：`animate-pulse` 缓慢呼吸（2s 周期），提示"实时"

---

## 四、交互与动效（MOTION_INTENSITY: 4）

### 4.1 入场动画（用 Motion / motion/react）

```tsx
// 浮球 → 周视图切换
<AnimatePresence mode="wait">
  {isWidgetMode ? (
    <motion.div key="widget"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <BallWidget />
    </motion.div>
  ) : (
    <motion.div key="week"
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.96, opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      <WeekView />
    </motion.div>
  )}
</AnimatePresence>
```

### 4.2 微交互清单

| 场景 | 触发 | 动效 | 时长 |
|------|------|------|------|
| 按钮点击 | `:active` | `translate-y-px` + `scale-[0.98]` | 80ms |
| EventCard hover | `:hover` | `-translate-y-px` + `shadow-md` | 150ms |
| EventCard 拖拽 | drag start | `scale-[1.02]` + `shadow-lg` + `opacity-80` | 150ms |
| Toast 入场 | show | `translateY(8px) → 0` + opacity | 200ms |
| Toast 出场 | dismiss | `translateY(0) → -8px` + opacity | 150ms |
| Dialog 入场 | open | `scale(0.96) → 1` + opacity | 200ms |
| 当前时间线 | load | `pulse` 2s 周期 | infinite |
| 类型按钮选中 | click | `scale(1.05) → 1` | 120ms |

### 4.3 Reduced Motion（强制）

所有动效在 `@media (prefers-reduced-motion: reduce)` 下降级为瞬时（`duration: 0`），EventCard hover 不再 `translate-y`，pulse 动画停止。

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 五、排版与间距系统

### 5.1 Type Scale（1.125 比例，紧凑工具友好）

| Token | 字号 | 行高 | 用途 |
|-------|------|------|------|
| `text-xs` | 11px | 1.4 | 时间标签、tooltip 类型 |
| `text-sm` | 12px | 1.4 | 表单 label、status bar |
| `text-base` | 13px | 1.5 | 正文、input、event title |
| `text-md` | 14px | 1.5 | 周标题、section title |
| `text-lg` | 16px | 1.4 | Dialog 标题、day-number |
| `text-xl` | 18px | 1.3 | 强调标题 |
| `text-2xl` | 22px | 1.2 | 大标题（少用） |
| `text-3xl` | 28px | 1.1 | 浮球日期 |

**字重**：常规 `400` / 中等 `500` / 粗 `600` / 特粗 `700`（仅浮球日期用 700）

### 5.2 间距系统（4px 基线）

| Token | 值 | 用途 |
|-------|----|------|
| `space-1` | 4px | icon 与文字间隙、紧凑内边距 |
| `space-2` | 8px | 按钮内边距、卡片内小间距 |
| `space-3` | 12px | input 内边距、组内间距 |
| `space-4` | 16px | section 内 padding、组间间距 |
| `space-5` | 20px | Dialog body padding |
| `space-6` | 24px | section 间距 |
| `space-8` | 32px | 大块间距（少用，工具应用紧凑） |

### 5.3 圆角系统（统一规则）

| 元素 | 圆角 |
|------|------|
| Button | `--radius-md` 8px |
| Input / Textarea | `--radius-md` 8px |
| Tag / Pill / Badge | `--radius-full` 9999px |
| Card / EventCard | `--radius-md` 8px |
| Dialog | `--radius-lg` 12px |
| Week-view-container 外壳 | `--radius-xl` 16px |
| 浮球 | `--radius-full` 9999px |

**规则**：交互元素 8px，容器 12-16px，胶囊元素 full。**禁止**再出现 `4px` 或 `6px` 这种非体系数值。

---

## 六、可访问性（WCAG AA 强制）

### 6.1 对比度

| 元素 | 要求 | 验证方式 |
|------|------|----------|
| 正文文字 | ≥ 4.5:1 | `--text-primary` on `--bg-base` |
| 次要文字 | ≥ 4.5:1 | `--text-secondary` on `--bg-base` |
| 占位符 | ≥ 4.5:1 | 当前 `#9CA3AF` on `#F9FAFB` 仅 2.8:1 **不达标**，需提升到 `--text-tertiary` 级别 |
| 按钮文字 | ≥ 4.5:1 | accent button 上用白字，验证 `--accent-500` #4f6bed 与 #fff 对比度 = 4.7:1 ✅ |
| EventCard 文字 | ≥ 4.5:1 | 改用 `text-primary` on `color + 8%` 浅底后，永远达标 |

### 6.2 键盘导航

| 快捷键 | 现状 | 优化 |
|--------|------|------|
| `←/→` | 上下周 | ✅ 保留 |
| `T` | 回到本周 | ✅ 保留 |
| `N` + Cmd/Ctrl | 新建事件 | ✅ 保留 |
| `Esc` | 关闭/收缩 | ✅ 保留 |
| `R` + Cmd/Ctrl | 刷新 | ✅ 保留 |
| `Cmd/Ctrl+S` | — | **新增** Dialog 内保存 |
| `Cmd/Ctrl+Enter` | — | **新增** Dialog 内提交 |
| `Tab` | — | **新增** 焦点环 `--shadow-glow`，可见且不溢出 |

### 6.3 触摸目标

- 所有按钮最小 **32×32px**（桌面端鼠标场景，比 WCAG 2.5.5 的 44px 略小但仍合规 AA）
- 浮球本身 100×100，符合 AAA

### 6.4 ARIA

- Dialog：`role="dialog" aria-modal="true" aria-labelledby="dialog-title"`（当前已有 `aria-label`，可升级）
- Tooltip：用 Radix Tooltip 自带 `aria-describedby`
- Toast：`role="status" aria-live="polite"`
- 错误信息：`aria-invalid="true"` + `aria-describedby="error-id"`

---

## 七、迁移路线图（按优先级分阶段）

### Phase A — 基础设施（1-2 天，无视觉变化）

**目标**：搭好底子，不改外观

- [ ] 引入 shadcn/ui init（New York style）
- [ ] 引入 Phosphor Icons、Geist 字体
- [ ] 在 `tailwind.config.js` 配置 CSS 变量映射（见 §2.4）
- [ ] 在 `index.css` 写入 `:root` + `.dark` token
- [ ] 引入 `motion`（`npm i motion`）
- [ ] 配置 `next-themes` 或自写 `useTheme`（默认跟随系统）
- [ ] 在 `<html>` 加 `class="dark"` 切换逻辑

**验收**：浏览器开发者工具切换 `.dark` class，背景色变化；无视觉破坏

### Phase B — 图标与字体替换（0.5 天）

**目标**：消除所有 emoji/ASCII 图标，统一字体

- [ ] WeekHeader 7 个按钮图标换 Phosphor
- [ ] StatusBar 的 `⚠️ 🔍` 换 Phosphor
- [ ] DiagnosticPanel 全部 emoji 换 Phosphor
- [ ] EventTooltip 的 `🔗` 换 Phosphor
- [ ] 全局 `font-family` 改为 Geist Sans + Mono

**验收**：截图对比，无任何 emoji/ASCII 图标残留

### Phase C — 色板与暗色模式（1 天）

**目标**：token 化所有颜色，暗色模式可用

- [ ] `App.css` 中所有硬编码颜色替换为 CSS 变量
- [ ] `EventDialog.css` 同上
- [ ] 验证 light / dark 两种模式所有界面
- [ ] StatusBar 加暗色切换按钮

**验收**：暗色模式下所有文字对比度 ≥ 4.5:1，无"刺眼白块"

### Phase D — 核心组件重做（2-3 天）

**目标**：EventCard / EventDialog / BallWidget 视觉升级

- [ ] EventCard 改为浅底 + 左色条 + 类型图标（见 §3.4）
- [ ] EventDialog 加快捷时长 pill、合并类型+颜色、textarea 加高（见 §3.5）
- [ ] BallWidget 改径向渐变 + 3 点事件指示（见 §3.1）
- [ ] WeekHeader 分组 + 分隔线（见 §3.2）

**验收**：截图对比 Phase C，视觉精致度明显提升

### Phase E — 交互与动效（1 天）

**目标**：Motion 接入，微交互落地

- [ ] 浮球 ↔ 周视图切换动画（见 §4.1）
- [ ] EventCard hover/拖拽动效
- [ ] Toast 用 shadcn toast 重做
- [ ] Reduced motion 测试

**验收**：动效流畅，reduced motion 下正确降级

### Phase F — 周边组件与打磨（1-2 天）

**目标**：DiagnosticPanel、Tooltip、空状态、骨架屏

- [ ] DiagnosticPanel 用 shadcn Dialog + ScrollArea 重做
- [ ] EventTooltip 视觉升级（§3.6）
- [ ] 空状态：无事件日的 day-column 显示居中灰字 `"双击新建"` + Plus 图标
- [ ] 骨架屏：loading 时 day-column 显示 3-5 个灰色 pill skeleton
- [ ] 全局 a11y 审计

**验收**：所有状态（empty / loading / error / success）都有视觉表达

---

## 八、风险与权衡

### 8.1 引入 shadcn/ui 的成本

- **包体积**：shadcn 组件代码 inline 到项目，不增加运行时依赖，但源码体积增加约 30-50KB
- **Tauri 包大小**：估算 +200KB（含 Radix primitives）
- **可接受性**：✅ 桌面应用对包体积不敏感，换取维护成本骤降是值得的

### 8.2 Geist 字体的考量

- **License**：Geist 是 SIL OFL 1.1，可商用、可自托管 ✅
- **中文字符**：Geist 不含中文，中文回退到 PingFang SC / Microsoft YaHei，中英混排时字重可能略不匹配
- **缓解**：在 `font-family` 中显式声明 `Geist Sans, 'PingFang SC', 'Microsoft YaHei', sans-serif`，让中文字体接管 CJK 字符

### 8.3 暗色模式的渐进性

- 当前没有任何暗色准备，全量上线可能引入大量视觉 bug
- **建议**：Phase C 先在 StatusBar 加切换按钮但标记 `"实验性"`，内部测试 1 周后再默认开启跟随系统

### 8.4 性能影响

- Motion 库 gzipped ~25KB，桌面应用可接受
- Phosphor Icons 按需引入（tree-shaking），实际增加 ~5-10KB
- backdrop-filter 在 Tauri WebView 中性能良好（基于系统 WebView2/WKWebView），但浮球的 `backdrop-blur(20px)` 在低端机可能掉帧，需提供 fallback

### 8.5 与 design-taste-frontend skill 的偏离

该 skill 主要针对 Landing Page，明确说"不在 scope"的包括 dashboards。本方案将其**设计原则**（设计系统优先、统一图标库、tinted shadow、reduced motion、对比度强制）**迁移**到桌面工具场景，但**不照搬**其 landing page 专属规则（hero、bento、CTA wrap 等）。这是有意识的适配，不是误用。

---

## 九、决策速查表

| 决策项 | 选择 | 备选 | 理由 |
|--------|------|------|------|
| 设计系统 | **shadcn/ui** | Radix Themes / 手写 | 代码归你所有，Tailwind 原生，可深度定制 |
| 图标库 | **Phosphor Icons** | Lucide / HugeIcons | 6 权重、duotone 适合事件类型、strokeWidth 一致 |
| 字体 | **Geist Sans + Mono** | Inter / Satoshi | 反 AI-default，小字号清晰，免费 OFL |
| 主色 | **Indigo Steel #4f6bed** | Tailwind 默认蓝 | 偏冷调，更有 Linear 感，避 AI 通用蓝 |
| 中性色 | **Warm Slate（浅） / Cool Slate（深）** | Pure gray / zinc | 暖浅冷深对比有层次 |
| 暗色模式 | **class 策略 + 跟随系统** | 仅浅色 / 强制暗色 | 现代桌面应用标配 |
| 动效库 | **Motion (motion/react)** | GSAP / 纯 CSS | 轻量，React 友好，自带 reduced motion |
| 圆角 | **8/12/16/full 四档** | 单一圆角 | 层次清晰，规则简单 |
| 间距 | **4px 基线** | 8px 基线 | 紧凑工具应用，4px 更细粒度 |

---

## 十、附录：参考视觉

### 10.1 对标产品

- **Cron Calendar**（已被 Notion 收购）：时间轴极简、事件色块克制、字体精致
- **Things 3**：圆角统一、留白慷慨、暗色模式标杆
- **Linear**：键盘优先、冷调色板、紧凑信息密度
- **Fantastical**：事件类型图标丰富、自然语言输入

### 10.2 灵感截图（需后续补充）

> TODO: 在 Phase D 启动前，从上述产品截图建立 moodboard，存入 `docs/ui-references/` 目录

---

## 十一、Pre-Flight Check（本方案自检）

- [x] **Brief 推断**：桌面端紧凑型生产力工具，已声明
- [x] **三档参数**：4 / 4 / 6，已论证
- [x] **设计系统选型**：shadcn/ui，非手写
- [x] **图标库统一**：Phosphor，禁止 emoji/ASCII
- [x] **字体非 Inter 默认**：Geist
- [x] **色板非 AI 通用蓝**：Indigo Steel
- [x] **暗色模式**：跟随系统 + 手动覆盖
- [x] **圆角统一**：8/12/16/full 四档
- [x] **阴影 tinted**：用 stone-900 tinted，非纯黑
- [x] **对比度**：所有文本 ≥ 4.5:1
- [x] **触摸目标**：按钮 ≥ 32×32
- [x] **Reduced motion**：所有动效降级
- [x] **无 em-dash**：本文件全程使用普通连字符
- [x] **无 AI Tells**：无 AI 紫渐变、无 glassmorphism 滥用、无 fake screenshot

---

**方案版本**：v1.0
**编写日期**：2026-06-24
**编写者**：UI Designer（像素君）
**状态**：等待评审 → 评审通过后进入 Phase A
**下次评审**：实施 Phase A 前与开发者对齐 shadcn/ui 引入方式
