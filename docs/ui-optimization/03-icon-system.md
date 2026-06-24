# 03 - 图标系统

> 模块编号: 03 | 依赖: [02 - 设计基础](./02-design-foundations.md) | 对应 Phase: B

## 一、图标库选型:Phosphor Icons

### 1.1 选型对比

| 选项 | 风格 | strokeWidth | 多权重 | 推荐度 |
|------|------|-------------|--------|--------|
| **@phosphor-icons/react** | 几何感、柔和、有 6 种权重（thin/light/regular/bold/fill/duotone） | 自适应 | ✅ | ⭐⭐⭐⭐⭐ |
| hugeicons-react | 现代精致、略圆润 | 自适应 | ✅ | ⭐⭐⭐⭐ |
| @radix-ui/react-icons | 简洁克制、配 Radix 生态 | 1.5px 固定 | ❌ | ⭐⭐⭐ |
| @tabler/icons-react | 线条感、数量多 | 2px 固定 | ❌ | ⭐⭐⭐ |
| lucide-react | Feather 继承者,社区主流 | 2px 固定 | ❌ | ⭐⭐（不推荐默认） |

### 1.2 结论

**选 Phosphor Icons**,统一使用 `weight="regular"`,`size={16}`（小按钮）/ `size={20}`（中按钮）。理由:

- Phosphor 的 `duotone` 权重可作事件类型图标（面试/会议/提醒/截止）,视觉层次更丰富
- strokeWidth 全局一致,不会出现"有的图标粗有的细"
- **禁止**手画 SVG,**禁止**继续用 emoji/ASCII 当图标

### 1.3 安装

```bash
npm install @phosphor-icons/react
```

## 二、全量图标映射表

### 2.1 通用 UI 图标（替换现有 emoji/ASCII）

| 当前 | 替换为 Phosphor | 用途 | 权重 | size |
|------|-----------------|------|------|------|
| `◀` | `<CaretLeft />` | 上一周 | regular | 16 |
| `▶` | `<CaretRight />` | 下一周 | regular | 16 |
| `●` | `<DotCircle />` | 回到本周 | regular | 16 |
| `↻` | `<ArrowClockwise />` | 刷新 | regular | 16 |
| `＋` | `<Plus />` | 新建事件 | bold | 18 |
| `－` | `<Minus />` | 收缩为浮球 | regular | 16 |
| `✕` | `<X />` | 关闭 | regular | 16 |
| `🔗` | `<Link />` | 事件链接 | regular | 14 |
| `⚠️` | `<Warning />` | 错误提示 | fill | 14 |
| `🔍` | `<MagnifyingGlass />` | 诊断面板 | regular | 16 |
| `🔄` | `<ArrowsClockwise />` | 刷新（诊断面板） | regular | 14 |
| `📁` | `<Folder />` | 日志目录 | regular | 14 |
| `🗄️` | `<Database />` | 数据库 | regular | 14 |
| `⚡` | `<Lightning />` | 最近错误 | fill | 14 |
| `✅` | `<CheckCircle />` | 状态成功 | fill | 14 |
| `❌` | `<XCircle />` | 状态失败 | fill | 14 |
| `💡` | `<Lightbulb />` | 提示信息 | fill | 14 |
| 无 | `<MapPin />` | 事件地点 | regular | 12 |
| 无 | `<Info />` | Toast info | fill | 14 |
| 无 | `<CheckCircle />` | Toast success | fill | 14 |
| 无 | `<XCircle />` | Toast error | fill | 14 |
| 无 | `<CircleNotch />` | loading 旋转 | regular | 14 |
| 无 | `<Sun />` | 暗色切换-浅色 | fill | 16 |
| 无 | `<Moon />` | 暗色切换-深色 | fill | 16 |
| 无 | `<Monitor />` | 暗色切换-跟随系统 | regular | 16 |
| 无 | `<CaretRight />` | 当前时间线方向指示 | fill | 12 |
| 无 | `<Dot />` | 当前时间线右端圆点 | fill | 8 |
| 无 | `<Trash />` | 删除按钮 | regular | 14 |
| 无 | `<Check />` | 保存按钮 | bold | 14 |

### 2.2 事件类型图标（duotone 权重,配在 EventCard 和 EventDialog）

| 类型 | 标签 | 图标 | 颜色 token |
|------|------|------|------------|
| interview | 面试 | `<UserFocus duotone />` | `--event-interview` #4f6bed |
| meeting | 会议 | `<Users duotone />` | `--event-meeting` #10b981 |
| reminder | 提醒 | `<Bell duotone />` | `--event-reminder` #f59e0b |
| deadline | 截止 | `<FlagBanner duotone />` | `--event-deadline` #ef4444 |
| default | 默认 | `<Circle duotone />` | `--event-default` #64748b |

### 2.3 诊断面板日志级别 badge 图标

| 级别 | 图标 | Badge 颜色 |
|------|------|------------|
| PANIC | `<Warning weight="fill" />` | red |
| ERROR | `<Warning weight="fill" />` | orange |
| WARN | `<Warning weight="fill" />` | yellow |
| INFO | `<Info weight="fill" />` | blue |

## 三、使用规范

### 3.1 统一 size 与 weight

```tsx
// 小按钮内的图标（如 WeekHeader 按钮）
<CaretLeft size={16} weight="regular" />

// 中等按钮内的图标（如新建事件）
<Plus size={18} weight="bold" />

// 事件类型图标（duotone 权重）
<UserFocus size={12} weight="duotone" className="text-[var(--event-interview)]" />

// 状态图标（fill 权重,表示强调）
<Warning size={14} weight="fill" className="text-red-500" />
```

### 3.2 与文字的对齐

图标与文字搭配时,图标 `size` 应等于或略小于文字 `font-size`,并加 `align-middle` 或 `inline-flex items-center gap-1.5`:

```tsx
<button className="inline-flex items-center gap-1.5">
  <Plus size={16} weight="bold" />
  <span className="text-sm">新建事件</span>
</button>
```

### 3.3 颜色继承

图标默认继承父元素 `color`,可通过 `className="text-[var(--event-interview)]"` 覆盖。**禁止**用 `color="..."` prop（Phosphor 接受但与 Tailwind 体系冲突）。

## 四、迁移注意事项

1. **批量替换**:Phase B 时全局搜索 emoji 与 ASCII 字符,逐个替换为 Phosphor 组件
2. **tree-shaking**:Phosphor 支持按需引入,确保 `import { CaretLeft } from '@phosphor-icons/react'` 而非 `import * as Phosphor`
3. **SSR**:本项目无 SSR,Tauri WebView 直接渲染,无需考虑 hydration mismatch
4. **包体积**:Phosphor Icons 按需引入（tree-shaking）,实际增加约 5-10KB

## 五、验收 Checklist

- [ ] `@phosphor-icons/react` 安装并配置
- [ ] WeekHeader 7 个按钮图标全部替换
- [ ] StatusBar 的 `⚠️ 🔍` 替换
- [ ] DiagnosticPanel 全部 emoji 替换
- [ ] EventTooltip 的 `🔗` 替换
- [ ] 事件类型图标（duotone）在 EventCard、EventDialog 中显示
- [ ] 全局搜索 emoji 字符,结果为空（或仅文案中的 emoji 保留）
- [ ] 截图对比,无任何 emoji/ASCII 图标残留

## 六、关联模块

- 依赖: [02 - 设计基础](./02-design-foundations.md) - 颜色 token
- 被依赖: [10 - 浮球组件](./10-components-widget.md)
- 被依赖: [11 - 周视图组件](./11-components-week-view.md)
- 被依赖: [12 - 应用外壳](./12-components-chrome.md)
