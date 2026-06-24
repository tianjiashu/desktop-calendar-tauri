# 05 - 可访问性（WCAG AA 强制）

> 模块编号: 05 | 依赖: [02 - 设计基础](./02-design-foundations.md) | 对应 Phase: 全局贯穿

## 一、对比度（WCAG AA 4.5:1）

### 1.1 文本对比度要求

| 元素 | 要求 | 当前状态 | 优化方案 |
|------|------|----------|----------|
| 正文文字 | ≥ 4.5:1 | ✅ `--text-primary` on `--bg-base` 达标 | 保留 |
| 次要文字 | ≥ 4.5:1 | ✅ `--text-secondary` on `--bg-base` 达标 | 保留 |
| 占位符 | ≥ 4.5:1 | ❌ 当前 `#9CA3AF` on `#F9FAFB` 仅 2.8:1 | 提升到 `--text-tertiary` 级别（#a8a29e on #fafaf9 = 3.5:1,仍不达标,需用 `--text-secondary`） |
| 按钮文字 | ≥ 4.5:1 | ✅ accent button 上用白字 | 验证 `--accent-500` #4f6bed 与 #fff 对比度 = 4.7:1 ✅ |
| EventCard 文字 | ≥ 4.5:1 | ❌ 浅色事件（黄）白字不达标 | 改用 `text-primary` on `color + 8%` 浅底,永远达标 |
| Tooltip 文字 | ≥ 4.5:1 | ✅ 白字 on 暗底 | 保留 |

### 1.2 大字号对比度要求（3:1）

`text-lg`（16px）及以上字号、或 `font-bold` 及以上字重,对比度要求降为 3:1。

### 1.3 验证工具

- 浏览器 DevTools 的 Accessibility 面板
- Chrome 插件:WAVE、axe DevTools
- 命令行:`pa11y`（可集成到 CI）

## 二、键盘导航

### 2.1 快捷键清单

| 快捷键 | 现状 | 优化 | 作用域 |
|--------|------|------|--------|
| `←/→` | ✅ 上下周 | 保留 | 全局 |
| `T` | ✅ 回到本周 | 保留 | 全局 |
| `N` + Cmd/Ctrl | ✅ 新建事件 | 保留 | 全局 |
| `Esc` | ✅ 关闭/收缩 | 保留 | 全局/Dialog |
| `R` + Cmd/Ctrl | ✅ 刷新 | 保留 | 全局 |
| `Cmd/Ctrl+S` | — | **新增** | Dialog 内保存 |
| `Cmd/Ctrl+Enter` | — | **新增** | Dialog 内提交 |
| `Tab` | — | **新增** | 焦点环 `--shadow-glow`,可见且不溢出 |
| `Shift+Tab` | — | **新增** | 反向焦点导航 |
| `Space` | — | **新增** | 在按钮上触发点击 |

### 2.2 焦点管理要求

- Dialog 打开时,焦点自动移到第一个 input（当前已实现,通过 `requestAnimationFrame` + `focus()`）
- Dialog 关闭时,焦点回到触发按钮（当前未实现,**需新增**）
- Tab 顺序应符合视觉顺序（从上到下、从左到右）
- 焦点环必须可见:用 `outline: 2px solid var(--accent-500); outline-offset: 2px;`,**禁止** `outline: none`

### 2.3 焦点环样式

```css
*:focus-visible {
  outline: 2px solid var(--accent-500);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* 输入框焦点用 ring 而非 outline,避免与 border 重叠 */
.form-input:focus-visible {
  outline: none;
  border-color: var(--accent-500);
  box-shadow: var(--shadow-glow);
}
```

## 三、ARIA 语义

### 3.1 各组件 ARIA 规范

| 组件 | ARIA 属性 | 说明 |
|------|-----------|------|
| Dialog | `role="dialog" aria-modal="true" aria-labelledby="dialog-title"` | 当前已有 `aria-label`,可升级为 `aria-labelledby` |
| Tooltip | `aria-describedby="tooltip-id"` | 用 Radix Tooltip 自带 |
| Toast | `role="status" aria-live="polite"` | 非紧急通知 |
| Error Toast | `role="alert" aria-live="assertive"` | 紧急错误 |
| 错误信息 | `aria-invalid="true" aria-describedby="error-id"` | 表单字段错误 |
| 按钮图标 | `aria-label="..."` | 纯图标按钮必须有 |
| 进度条 | `role="progressbar" aria-valuenow="..." aria-valuemin="0" aria-valuemax="100"` | Toast 倒计时 |
| Tab | `role="tab" aria-selected="true/false" aria-controls="panel-id"` | 如有 tab 组件 |

### 3.2 图标按钮的 aria-label

```tsx
// ✅ 正确:有 aria-label
<button aria-label="上一周" onClick={onPrevWeek}>
  <CaretLeft size={16} />
</button>

// ❌ 错误:无 aria-label,屏幕阅读器读"button"
<button onClick={onPrevWeek}>
  <CaretLeft size={16} />
</button>

// ✅ 装饰性图标:aria-hidden
<span className="inline-flex items-center gap-1.5">
  <MapPin size={12} aria-hidden="true" />
  <span>Meeting Room A</span>
</span>
```

## 四、触摸目标

### 4.1 最小尺寸

| 元素 | 现状 | 要求 | 优化 |
|------|------|------|------|
| WeekHeader 按钮 | 28×28px | ≥ 32×32（AA）/ ≥ 44×44（AAA） | 提升到 **32×32** |
| Dialog 按钮 | 36×36px | ≥ 32×32 | ✅ 已达标,提升到 40×40 更舒适 |
| 浮球 | 100×100 | ≥ 44×44 | ✅ 达标 AAA |
| 颜色 swatch | 28×28 | ≥ 32×32 | 提升到 **32×32** |
| 类型按钮 | 文字高度 ~28px | ≥ 32×32 | 加 padding 提升到 32×32 |

**桌面端鼠标场景**:比 WCAG 2.5.5 的 44px 略小（32px）但仍合规 AA,因为桌面端无触摸需求。若未来支持触摸屏,需提升到 44px。

### 4.2 间距保证

相邻可点击元素之间至少 8px 间距,避免误触:

```tsx
// ✅ 按钮组有 gap
<div className="flex gap-2">
  <Button size="sm">取消</Button>
  <Button size="sm">保存</Button>
</div>

// ❌ 按钮紧贴
<div className="flex">
  <Button size="sm">取消</Button>
  <Button size="sm">保存</Button>
</div>
```

## 五、颜色与图形信息

### 5.1 不依赖颜色 alone

事件类型不仅用颜色区分,还需配合:

- 图标（duotone 权重,见 [03 - 图标系统](./03-icon-system.md)）
- 文字标签（"面试"、"会议"等）

**反例**:

```tsx
// ❌ 仅靠颜色区分事件类型
<div style={{ background: color }} />
```

**正例**:

```tsx
// ✅ 颜色 + 图标 + 文字
<div style={{ background: color }}>
  <UserFocus size={12} weight="duotone" />
  <span>面试</span>
</div>
```

### 5.2 链接可识别

链接除颜色外,需有下划线或图标:

```tsx
<a href={url} className="underline text-accent-500 hover:text-accent-600">
  {hostname}
</a>
```

## 六、屏幕阅读器优化

### 6.1 动态内容通告

- 事件加载完成:`aria-live="polite"` 区域更新 "已加载 8 个事件"
- 事件创建/删除:`role="status"` Toast 通告
- 错误发生:`role="alert"` Toast 通告

### 6.2 隐藏内容

```tsx
// 装饰性元素:aria-hidden
<div aria-hidden="true" className="bg-pattern" />

// 仅视觉隐藏,屏幕阅读器可见
<span className="sr-only">当前周</span>
```

### 6.3 sr-only 工具类（Tailwind 自带）

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

## 七、验收 Checklist

- [ ] 所有文本对比度 ≥ 4.5:1（用 axe DevTools 扫描）
- [ ] 占位符颜色提升到 `--text-secondary` 级别
- [ ] EventCard 文字改用 `text-primary` on 浅底
- [ ] 所有快捷键工作正常（`Cmd/Ctrl+S`、`Cmd/Ctrl+Enter`、`Tab`、`Shift+Tab`）
- [ ] Dialog 关闭后焦点回到触发按钮
- [ ] 焦点环可见（`outline: 2px solid var(--accent-500)`）
- [ ] 所有图标按钮有 `aria-label`
- [ ] 装饰性图标 `aria-hidden="true"`
- [ ] 事件类型不依赖颜色 alone（有图标 + 文字）
- [ ] 按钮最小 32×32px
- [ ] 链接有下划线或图标
- [ ] 屏幕阅读器测试:VoiceOver（macOS）/ NVDA（Windows）能正确朗读所有交互元素

## 八、关联模块

- 依赖: [02 - 设计基础](./02-design-foundations.md) - 对比度 token
- 依赖: [03 - 图标系统](./03-icon-system.md) - 图标按钮 aria-label
- 贯穿: 所有组件模块
