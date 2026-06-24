# 02 - 设计基础

> 模块编号: 02 | 依赖: 无 | 对应 Phase: A（基础设施） + C（色板）

## 一、设计系统选型:shadcn/ui

### 1.1 选型对比

| 选项 | 优势 | 劣势 | 推荐度 |
|------|------|------|--------|
| **shadcn/ui** | 代码归你所有,可深度定制;Tailwind 原生;社区组件丰富;无运行时主题 Provider 包裹 | 需要逐个 `npx shadcn add` 引入;无内置 Theme Provider 需自己接 next-themes | ⭐⭐⭐⭐⭐ |
| Radix Themes | 开箱即用 `<Theme>` Provider;内置暗色;强约定 | 强约定难深度定制;和 Tailwind 共存有冲突;包体积大 | ⭐⭐⭐ |
| 手写组件 | 零依赖,现状延续 | 状态机不全、a11y 缺失、维护成本指数级上升 | ⭐ |

### 1.2 结论

**选 shadcn/ui**。理由:

- 项目已是 React + Tailwind,shadcn/ui 是原生适配,不引入新范式
- 桌面工具需要"小而美",shadcn 让我们拥有组件代码,可按 860px 窄窗口深度定制（默认 shadcn 的 Dialog 在窄窗下会溢出,需要改）
- 暗色模式用 `next-themes` 或自写 `useTheme` hook + `class="dark"` 切换,灵活
- **绝不**使用 shadcn 默认态（默认 zinc 灰 + 圆角 0.5rem 太普通）,需按本文件 §3 的 token 定制

### 1.3 首次引入清单

```bash
npx shadcn@latest init      # 初始化（选 New York style,CSS variables,zinc base）
npx shadcn@latest add button input textarea dialog tooltip toast badge
npx shadcn@latest add select popover dropdown-menu separator scroll-area
```

## 二、字体方案:Geist Sans + Geist Mono

| 用途 | 字体 | 来源 |
|------|------|------|
| 显示/UI 文本 | **Geist Sans** | Vercel 出品,几何感、x-height 高、小字号清晰,比 Inter 更有性格 |
| 等宽（时间、数字） | **Geist Mono** | 时间标签 `08:00`、事件时间 `09:00 - 10:00`、诊断面板 |
| 中文 fallback | `PingFang SC, Microsoft YaHei` | 系统字体栈保留 |

**理由**:

- 不用 `Inter`（design-taste-frontend skill 明确反对此默认选择,是 LLM 默认 AI tell）
- Geist 在小字号（10-13px）下可读性优于 Inter,适合 860px 窄窗口
- 自托管:用 `@fontsource/geist-sans` + `@fontsource/geist-mono`,**禁止** `<link>` Google Fonts（Tauri 离线场景必须自托管）

**安装**:

```bash
npm install @fontsource/geist-sans @fontsource/geist-mono
```

**引入**（在 `main.tsx`）:

```ts
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-sans/700.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
```

## 三、色板与暗色模式 Token

### 3.1 主色重选

弃用 Tailwind 默认 `#3B82F6`（AI 通用蓝）,改用 **更冷调、更克制的 Steel Blue**,搭配 **Warm Slate** 中性色,让整体偏向 Linear/Notion 那种"冷静的生产力感"。

### 3.2 完整 Token 定义

```css
/* === Design Tokens === */
/* 放在 tailwind.config.js 的 theme.extend.colors 或 :root CSS 变量 */

:root {
  /* ---------- 品牌主色:Steel Blue ---------- */
  --brand-50:  #eff6ff;
  --brand-100: #dbeafe;
  --brand-200: #bfdbfe;
  --brand-300: #93c5fd;
  --brand-400: #60a5fa;
  --brand-500: #3b82f6;  /* 暂保留兼容,后续淡出 */
  --brand-600: #2563eb;
  --brand-700: #1d4ed8;
  /* 新主色 - 偏冷的 Indigo Steel */
  --accent-500: #4f6bed;  /* 主操作色 */
  --accent-600: #3f56d4;
  --accent-700: #3245b0;

  /* ---------- 事件类型色（语义化） ---------- */
  --event-interview: #4f6bed;  /* 钢蓝 */
  --event-meeting:   #10b981;  /* 翡翠绿 */
  --event-reminder:  #f59e0b;  /* 琥珀 */
  --event-deadline:  #ef4444;  /* 警示红 */
  --event-default:   #64748b;  /* Slate */

  /* ---------- 中性色:Warm Slate（浅色） ---------- */
  --bg-base:        #fafaf9;  /* 主背景,warm off-white */
  --bg-elevated:    #ffffff;  /* 卡片、Dialog */
  --bg-subtle:      #f5f5f4;  /* header、status bar */
  --bg-hover:       #f0f0ef;  /* hover 态 */
  --border-subtle:  #e7e5e4;  /* hairline */
  --border-default: #d6d3d1;  /* input 边框 */
  --text-primary:   #1c1917;  /* stone-900 */
  --text-secondary: #57534e;  /* stone-600 */
  --text-tertiary:  #a8a29e;  /* stone-400 */
  --text-inverse:   #fafaf9;  /* 深色背景上的字 */

  /* ---------- 阴影:tinted ---------- */
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

/* === 暗色模式:Cool Slate（偏冷以平衡 warm light） === */
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

## 四、暗色模式策略

- **默认跟随系统**:`prefers-color-scheme: dark` → 自动切暗色
- **手动覆盖**:在 StatusBar 或 Settings 弹层中提供三态切换（Light / Dark / System）
- **实现方式**:在 `<html>` 上加 `class="dark"`,所有 token 用 CSS 变量切换,Tailwind 用 `dark:` 前缀
- **测试要求**:所有事件类型色、所有按钮、所有 Dialog 必须在两种模式下都通过 WCAG AA 对比度（4.5:1 文本 / 3:1 大字号）

## 五、排版与间距系统

### 5.1 Type Scale（1.125 比例,紧凑工具友好）

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

**字重**:常规 `400` / 中等 `500` / 粗 `600` / 特粗 `700`（仅浮球日期用 700）

### 5.2 间距系统（4px 基线）

| Token | 值 | 用途 |
|-------|----|------|
| `space-1` | 4px | icon 与文字间隙、紧凑内边距 |
| `space-2` | 8px | 按钮内边距、卡片内小间距 |
| `space-3` | 12px | input 内边距、组内间距 |
| `space-4` | 16px | section 内 padding、组间间距 |
| `space-5` | 20px | Dialog body padding |
| `space-6` | 24px | section 间距 |
| `space-8` | 32px | 大块间距（少用,工具应用紧凑） |

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

**规则**:交互元素 8px,容器 12-16px,胶囊元素 full。**禁止**再出现 `4px` 或 `6px` 这种非体系数值。

## 六、验收 Checklist

- [ ] `tailwind.config.js` 配置了 CSS 变量映射
- [ ] `index.css` 写入 `:root` + `.dark` token
- [ ] Geist 字体通过 `@fontsource` 引入,`font-family` 全局生效
- [ ] `<html>` 加 `class="dark"` 切换逻辑工作正常
- [ ] 浏览器开发者工具切换 `.dark` class,背景色变化,无视觉破坏
- [ ] 所有硬编码颜色替换为 CSS 变量（Phase C）
- [ ] light / dark 两种模式下所有文字对比度 ≥ 4.5:1

## 七、关联模块

- [03 - 图标系统](./03-icon-system.md) - 依赖本模块的 token 定义
- [04 - 动效与交互](./04-motion-and-interaction.md) - 依赖 reduced-motion 媒体查询
- 所有组件模块 - 依赖本模块的 token 与字体
