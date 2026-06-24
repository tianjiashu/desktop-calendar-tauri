# 04 - 动效与交互

> 模块编号: 04 | 依赖: [02 - 设计基础](./02-design-foundations.md) | 对应 Phase: E
> MOTION_INTENSITY: 4（轻量流畅,无电影级动画）

## 一、动效库选型:Motion

**选 `motion`（即 `motion/react`,原 Framer Motion 的轻量继承者）**。

| 候选 | 优势 | 劣势 |
|------|------|------|
| **motion (motion/react)** | React 友好、API 简洁、自带 reduced-motion 检测、gzip ~25KB | 较新,文档仍在完善 |
| GSAP | 功能强大、性能极致 | 学习曲线陡、与 React 集成需 `useGSAP` hook |
| 纯 CSS | 零依赖 | 复杂序列难写、状态管理弱 |

**安装**:

```bash
npm install motion
```

## 二、入场动画

### 2.1 浮球 ↔ 周视图切换

详细动画设计（含时序图、缓动函数、实现代码、边界情况）见专用文档:
👉 **[04b - Widget 过渡动画](./04b-widget-transition.md)**

核心方案概要:

```tsx
import { AnimatePresence, motion } from 'motion/react';

<AnimatePresence mode="wait">
  {isWidgetMode ? (
    <motion.div key="widget"
      exit={{ scale: 1.06, opacity: 0, filter: 'blur(3px)' }}
      transition={{ exit: { duration: 0.12, ease: [0.16, 1, 0.3, 1] } }}
    >
      <BallWidget />
    </motion.div>
  ) : (
    <motion.div key="week"
      initial={{ scale: 0.97, opacity: 0, filter: 'blur(2px)' }}
      animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <WeekView />
    </motion.div>
  )}
</AnimatePresence>
```

**关键创新**: 利用 `#root` 的 `border-radius` CSS transition 从 50%→16px 做形态桥接,实现 "圆形绽放为卡片" 的视觉连续性。详见 04b 文档。`

### 2.2 Dialog 入场

```tsx
<motion.div
  initial={{ scale: 0.96, opacity: 0, y: 8 }}
  animate={{ scale: 1, opacity: 1, y: 0 }}
  exit={{ scale: 0.96, opacity: 0, y: 8 }}
  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
/>
```

### 2.3 Toast 入场/出场

```tsx
// 入场:从上方 8px 滑入
initial={{ y: -8, opacity: 0 }}
animate={{ y: 0, opacity: 1 }}
exit={{ y: -8, opacity: 0 }}
transition={{ duration: 0.2 }}

// 出场更快
exit={{ y: -8, opacity: 0 }}
transition={{ duration: 0.15 }}
```

### 2.4 当前时间线呼吸

```tsx
<motion.div
  animate={{ opacity: [1, 0.6, 1] }}
  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
/>
```

## 三、微交互清单

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
| 颜色 swatch hover | hover | `scale(1.15)` | 150ms |
| 浮球 hover | hover | `scale(1.05)` + shadow 加深 | 200ms |

## 四、Tailwind 类名速查

为了减少 motion 调用次数,简单的 hover/active 微交互直接用 Tailwind:

```tsx
// 按钮点击
className="transition-all duration-75 active:translate-y-px active:scale-[0.98]"

// EventCard hover
className="transition-all duration-150 hover:-translate-y-px hover:shadow-md"

// 浮球 hover
className="transition-transform duration-200 hover:scale-105"

// 颜色 swatch hover
className="transition-transform duration-150 hover:scale-110"
```

## 五、Reduced Motion 降级（强制）

所有动效在 `@media (prefers-reduced-motion: reduce)` 下降级为瞬时（`duration: 0`）,EventCard hover 不再 `translate-y`,pulse 动画停止。

### 5.1 全局 CSS 降级

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

### 5.2 Motion 自动降级

Motion 库自带 `useReducedMotion` hook,可针对性控制:

```tsx
import { useReducedMotion } from 'motion/react';

const shouldReduceMotion = useReducedMotion();

<motion.div
  animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
  initial={{ opacity: 0 }}
  transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
/>
```

### 5.3 当前时间线特殊处理

```tsx
// reduced motion 下停止呼吸
<motion.div
  animate={shouldReduceMotion ? {} : { opacity: [1, 0.6, 1] }}
  transition={{ duration: 2, repeat: Infinity }}
/>
```

## 六、性能考量

- **backdrop-filter**:浮球的 `backdrop-blur(20px)` 在 Tauri WebView（基于 WebView2/WKWebView）中性能良好,但低端机可能掉帧
- **fallback**:加 `@media (prefers-reduced-transparency: reduce)` 提供 solid fallback
- **will-change**:对频繁动画的元素加 `will-change: transform`,但避免滥用（最多 3 个元素同时 will-change）
- **transform 优先**:所有位移动画用 `transform` 而非 `top/left`,避免触发 layout

```css
@media (prefers-reduced-transparency: reduce) {
  .ball-widget {
    backdrop-filter: none;
    background: var(--accent-500);  /* 纯色 fallback */
  }
}
```

## 七、验收 Checklist

- [ ] `motion` 安装并配置
- [ ] 浮球 ↔ 周视图切换动画工作（`AnimatePresence mode="wait"`）
- [ ] EventCard hover/拖拽动效流畅
- [ ] Toast 入场/出场动效工作
- [ ] 当前时间线 pulse 呼吸
- [ ] Dialog 入场 scale + opacity
- [ ] 所有动效在 `prefers-reduced-motion: reduce` 下正确降级
- [ ] 浮球 backdrop-blur 在 `prefers-reduced-transparency: reduce` 下有纯色 fallback
- [ ] 帧率测试:拖拽 EventCard 时 FPS ≥ 55

## 八、关联模块

- 依赖: [02 - 设计基础](./02-design-foundations.md) - reduced-motion 媒体查询、阴影 token
- 被依赖: [10 - 浮球组件](./10-components-widget.md) - 浮球切换动画
- 被依赖: [11 - 周视图组件](./11-components-week-view.md) - EventCard 动效、Dialog 动效
- 被依赖: [12 - 应用外壳](./12-components-chrome.md) - Toast 动效
