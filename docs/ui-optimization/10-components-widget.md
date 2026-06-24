# 10 - 浮球组件（BallWidget）

> 模块编号: 10 | 依赖: [02 - 设计基础](./02-design-foundations.md) · [03 - 图标系统](./03-icon-system.md) · [04 - 动效](./04-motion-and-interaction.md) | 对应 Phase: D + E

## 一、组件定位

浮球是应用的桌面常驻形态,100×100px 圆形窗口,显示今日日期、星期、事件指示。双击展开为周视图。

## 二、现状问题

- 纯色 `#3B82F6` + `border: 2px solid rgba(255,255,255,0.4)`,桌面背景复杂时识别度低
- `font-size: 8px` 的 weekday 几乎看不清
- 事件指示器只是黄点 pulse,信息密度低
- 无 hover 反馈,用户不知道可双击

## 三、优化方向

### 3.1 背景与边框

改用径向渐变 + 轻微 glassmorphism:

```css
.ball-widget {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, var(--brand-400), var(--brand-600));
  backdrop-filter: blur(20px) saturate(1.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow:
    0 4px 16px rgb(79 107 237 / 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

/* prefers-reduced-transparency fallback */
@media (prefers-reduced-transparency: reduce) {
  .ball-widget {
    backdrop-filter: none;
    background: var(--accent-500);
  }
}
```

### 3.2 字号与排版

| 元素 | 现状 | 优化 |
|------|------|------|
| ball-date | 24px / 800 | **28px / 700** Geist Sans |
| ball-weekday | 8px | **11px / 500** Geist Sans,字色 `rgba(255,255,255,0.85)` |

```tsx
<div className="ball-date">{today.getDate()}</div>           {/* 28px */}
<div className="ball-weekday">{getWeekdayLabel(today)}</div> {/* 11px */}
```

### 3.3 事件指示器升级

从单黄点改为"3 个小圆点",显示今日事件密度:

```
   ●●●  ← 3+ 事件
   ●●   ← 2 事件
   ●    ← 1 事件
   （无） ← 无事件
```

颜色编码:

| 状态 | 颜色 |
|------|------|
| 即将开始（未来） | `--event-reminder` #f59e0b 琥珀 |
| 进行中 | `--event-meeting` #10b981 翡翠绿 |
| 已截止 | `--event-deadline` #ef4444 警示红 |

```tsx
{todayEvents.slice(0, 3).map(event => (
  <div
    key={event.id}
    className="event-indicator-dot"
    style={{ background: getEventStatusColor(event) }}
  />
))}
```

### 3.4 Hover 反馈

```tsx
<motion.div
  className="ball-widget"
  whileHover={{ scale: 1.05 }}
  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
>
```

或 Tailwind:

```tsx
className="ball-widget transition-transform duration-200 hover:scale-105"
```

Hover 时阴影加深:

```css
.ball-widget:hover {
  box-shadow:
    0 6px 24px rgb(79 107 237 / 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
```

### 3.5 切换动画

浮球 ↔ 周视图切换时,用 `AnimatePresence` 实现淡入淡出（见 [04 - 动效](./04-motion-and-interaction.md) §2.1）:

```tsx
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
    <motion.div key="week" /* ... */>
      <WeekView />
    </motion.div>
  )}
</AnimatePresence>
```

## 四、代码结构参考

```tsx
const BallWidget: React.FC<BallWidgetProps> = ({ onDoubleClick, events }) => {
  const { onMouseDown, onMouseMove, onMouseUp } = useDragMove();
  const today = useMemo(() => new Date(), []);
  const todayEvents = useMemo(() => getTodayEvents(events), [events]);

  return (
    <motion.div
      className="ball-widget"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onDoubleClick={handleDoubleClick}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
      role="button"
      aria-label={`今日 ${todayEvents.length} 个事件,双击展开`}
    >
      <div className="ball-date">{today.getDate()}</div>
      <div className="ball-weekday">{getWeekdayLabel(today)}</div>
      {todayEvents.length > 0 && (
        <div className="event-indicators">
          {todayEvents.slice(0, 3).map(event => (
            <div
              key={event.id}
              className="event-indicator-dot"
              style={{ background: getEventStatusColor(event) }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};
```

## 五、验收 Checklist

- [ ] 浮球背景改为径向渐变 + backdrop-blur
- [ ] `prefers-reduced-transparency: reduce` 下有纯色 fallback
- [ ] ball-date 字号 28px / Geist 700
- [ ] ball-weekday 字号 11px / Geist 500
- [ ] 事件指示器改为 3 点,按状态着色
- [ ] Hover 时 scale(1.05) + 阴影加深
- [ ] 切换周视图时淡入淡出动画流畅
- [ ] `aria-label` 包含事件数与操作提示
- [ ] 暗色模式下浮球视觉正确（径向渐变在暗色桌面背景上仍清晰）

## 六、关联模块

- 依赖: [02 - 设计基础](./02-design-foundations.md) - 颜色 token、圆角
- 依赖: [03 - 图标系统](./03-icon-system.md) - 暂无图标（浮球内不放图标,保持简洁）
- 依赖: [04 - 动效](./04-motion-and-interaction.md) - 切换动画、hover
- 被依赖: [20 - 迁移路线图](./20-migration-roadmap.md) - Phase D + E
