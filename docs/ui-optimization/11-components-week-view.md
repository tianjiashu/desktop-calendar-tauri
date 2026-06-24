# 11 - 周视图核心组件

> 模块编号: 11 | 依赖: [02 - 设计基础](./02-design-foundations.md) · [03 - 图标系统](./03-icon-system.md) · [04 - 动效](./04-motion-and-interaction.md) · [05 - 可访问性](./05-accessibility.md) | 对应 Phase: B + C + D + E

## 一、组件清单

| 子组件 | 文件 | 优先级 |
|--------|------|--------|
| WeekHeader | `WeekView/WeekHeader.tsx` | P0 |
| DayHeader | `WeekView/DayHeader.tsx` | P1 |
| EventCard | `Calendar/EventCard.tsx` | P0 ⭐ |
| EventDialog | `Calendar/EventDialog.tsx` | P0 ⭐ |
| EventTooltip | `Calendar/EventTooltip.tsx` | P1 |
| TimeColumn & TimeGridLines | `WeekView/TimeColumn.tsx` / `TimeGridLines.tsx` | P2 |
| CurrentTimeLine | `WeekView/CurrentTimeLine.tsx` | P2 |

---

## 二、WeekHeader（顶部导航栏,48px 高）

### 2.1 现状问题

- 7 个 28×28 按钮挤成一团,无视觉分组
- ASCII 字符图标不专业
- 没有分组分隔

### 2.2 优化方向

```
┌────────────────────────────────────────────────────────────┐
│ [◀]  6月 24日 - 6月 30日  [●] [▶]   │   [↻] [＋] [－] [✕]  │
│  ←—— 导航组 ——→              分隔线    ←—— 操作组 ——→       │
└────────────────────────────────────────────────────────────┘
```

1. **按钮尺寸**:从 28×28 提升到 **32×32**
2. **图标替换**:全部换 Phosphor（见 [03 - 图标系统](./03-icon-system.md) §2.1）
3. **分组**:导航组（◀ ● ▶）与操作组（↻ ＋ － ✕）之间加 `1px vertical divider`:

```tsx
<div className="flex items-center gap-1">
  {/* 导航组 */}
  <Button variant="ghost" size="icon-sm" aria-label="上一周" onClick={onPrevWeek}>
    <CaretLeft size={16} />
  </Button>
  <span className="text-md font-medium px-3">{weekTitle}</span>
  <Button variant="ghost" size="icon-sm" aria-label="下一周" onClick={onNextWeek}>
    <CaretRight size={16} />
  </Button>
  {!isCurrentWeek && (
    <Button variant="ghost" size="sm" onClick={onToday}>今日</Button>
  )}

  {/* 分隔线 */}
  <Separator orientation="vertical" className="h-4 mx-2" />

  {/* 操作组 */}
  <Button variant="ghost" size="icon-sm" onClick={onRefresh}>
    <ArrowClockwise size={16} className={isRefreshing ? 'animate-spin' : ''} />
  </Button>
  <Button variant="ghost" size="icon-sm" onClick={onAddEvent}>
    <Plus size={18} weight="bold" />
  </Button>
  <Button variant="ghost" size="icon-sm" onClick={onShrink}>
    <Minus size={16} />
  </Button>
  <Button variant="ghost" size="icon-sm" onClick={onClose}>
    <X size={16} />
  </Button>
</div>
```

4. **标题格式**:周标题改为 `"6月24日 - 6月30日"`（当前周显示 `"本周 · 6月24日 - 6月30日"`）
5. **今日按钮**:当不在本周时显示 `[今日]` pill 按钮,在当前周时隐藏
6. **拖拽区域**:header 中间无按钮区域继续支持 `startDragging`,加 `cursor-grab` 视觉提示

### 2.3 验收

- [ ] 按钮 32×32,有 hover 态
- [ ] 导航组与操作组之间有分隔线
- [ ] 所有按钮有 aria-label
- [ ] 周标题格式正确
- [ ] 今日按钮在当前周隐藏

---

## 三、DayHeader（单日表头）

### 3.1 现状

- weekday `11px` + day-number `16px`,今日加蓝底圆圈
- 周末无视觉区分

### 3.2 优化方向

1. **周末区分**:周六/周日的 weekday 用 `--text-tertiary` 灰色,工作日 `--text-secondary`
2. **今日样式**:从蓝底圆圈改为 `accent-500` 实心圆 + 白字,圆圈直径从 26px 提升到 28px
3. **事件数提示**:在 day-number 下方加小字 `"3 事件"`（灰色 `text-xs`）,无事件时显示 `"+ 新建"`（accent 色,点击创建）

```tsx
<div className={`day-header ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}`}>
  <span className="weekday">{getWeekdayLabel(date)}</span>
  <span className="day-number">{date.getDate()}</span>
  <span className="event-count">
    {eventCount > 0 ? `${eventCount} 事件` : '+ 新建'}
  </span>
</div>
```

```css
.day-header.weekend .weekday {
  color: var(--text-tertiary);
}

.day-header.today .day-number {
  background: var(--accent-500);
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.event-count {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

.event-count.has-events {
  color: var(--text-secondary);
}

.event-count.create-hint {
  color: var(--accent-500);
  cursor: pointer;
}
```

### 3.3 验收

- [ ] 周末 weekday 灰色
- [ ] 今日圆圈 28px,accent 色
- [ ] 事件数提示正确显示
- [ ] 无事件日显示"+ 新建"提示,点击可创建

---

## 四、EventCard ⭐ 核心组件

### 4.1 现状问题

- 纯色块 + 白字,浅色事件（黄/橙）白字对比度不达标
- 无事件类型图标
- title `10px` 太小
- conflict 仅靠红左边框

### 4.2 优化方向

```
┌──────────────────────────────────┐
│ ▌ 09:00 - 10:00                  │  ← 左侧 3px 实色色条
│ ▌ ⊛ 周会                         │  ← 类型图标 + 标题
│ ▌ Meeting Room A                 │  ← location (可选)
└──────────────────────────────────┘
背景:event-color 10% 透明度
文字:text-primary
```

1. **背景**:从纯色改为渐变浅底:

```css
.event-card {
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--event-color) 15%, transparent) 0%,
    color-mix(in srgb, var(--event-color) 8%, transparent) 100%
  );
  border-left: 3px solid var(--event-color);
  color: var(--text-primary);
  border-radius: var(--radius-md);
}
```

2. **文字色**:从白色改为 `var(--text-primary)`（暗色下自动反白）,**对比度永远达标**
3. **类型图标**:标题前加 12px 的 Phosphor duotone 图标:

```tsx
<div className="event-card-title">
  <UserFocus size={12} weight="duotone" className="inline mr-1" />
  {event.title}
</div>
```

4. **字号**:title `text-sm font-medium`（12px）,time `text-xs text-secondary`（11px）
5. **冲突态**:从红左边框改为 `ring-2 ring-red-400` + 左上角 Warning 图标:

```tsx
{hasConflict && (
  <Warning
    size={10}
    weight="fill"
    className="absolute top-1 right-1 text-red-500"
    aria-label="时间冲突"
  />
)}
```

6. **拖拽态**:`opacity-80 + scale-[1.02] + shadow-lg`:

```tsx
<motion.div
  className="event-card"
  animate={isDragging ? { scale: 1.02, opacity: 0.8 } : { scale: 1, opacity: 1 }}
  transition={{ duration: 0.15 }}
>
```

7. **悬停**:`hover:shadow-md hover:-translate-y-px`:

```css
.event-card {
  transition: all 150ms cubic-bezier(0.16, 1, 0.3, 1);
}

.event-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
```

### 4.3 验收

- [ ] 背景改为浅色渐变,文字色为 text-primary
- [ ] 左侧 3px 实色边
- [ ] 类型图标（duotone）显示在标题前
- [ ] title 12px / time 11px
- [ ] 冲突态有 ring + Warning 图标
- [ ] 拖拽时 scale + opacity 变化
- [ ] hover 时上浮 + 阴影
- [ ] light / dark 两种模式下对比度 ≥ 4.5:1

---

## 五、EventDialog ⭐ 高频组件

### 5.1 现状问题

- 表单 input 背景 `#F9FAFB` 偏灰,focus 时变白,对比度变化太突兀
- 颜色选择器 8 个圆 + 1 个 color input,无类型联动
- "备注（可选）" textarea 太矮（min-height 56px）
- 时间选择是 native `<input type="time">`,桌面端体验不佳

### 5.2 优化方向

1. **宽度**:从 400px 提升到 **440px**,max-width 92vw 保留
2. **input 背景**:改为 `--bg-elevated`（纯白）,focus 时 `--shadow-glow` ring,**消除**灰→白突变:

```css
.form-input {
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
}

.form-input:focus {
  border-color: var(--accent-500);
  box-shadow: var(--shadow-glow);
  outline: none;
}
```

3. **时间选择**:保留 native `<input type="time">`,但加自定义 `::-webkit-calendar-picker-indicator` 样式:

```css
.form-time::-webkit-calendar-picker-indicator {
  filter: invert(0.5);
  cursor: pointer;
}

.dark .form-time::-webkit-calendar-picker-indicator {
  filter: invert(0.8);
}
```

4. **类型 + 颜色联动**:合并为一个组件。点击类型按钮后,颜色 picker 自动同步到该类型默认色,但用户仍可覆盖:

```tsx
<div className="form-group">
  <label className="form-label">类型与颜色</label>
  <div className="flex flex-wrap gap-2 mb-3">
    {EVENT_TYPES.map(type => (
      <button
        key={type}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 transition-all',
          eventType === type ? 'border-current' : 'border-transparent'
        )}
        style={{ color: EVENT_TYPE_COLORS[type] }}
        onClick={() => { setEventType(type); setColor(EVENT_TYPE_COLORS[type]); }}
      >
        <EventIcon type={type} size={12} />
        <span className="text-xs">{EVENT_TYPE_LABELS[type]}</span>
      </button>
    ))}
  </div>
  <div className="flex items-center gap-2">
    {PRESET_COLORS.map(c => (
      <button
        key={c}
        className={cn(
          'w-7 h-7 rounded-full border-2 transition-transform hover:scale-110',
          color === c ? 'border-stone-900 scale-110' : 'border-transparent'
        )}
        style={{ background: c }}
        onClick={() => setColor(c)}
        aria-label={`选择颜色 ${c}`}
      />
    ))}
    <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-7 h-7 rounded-full" />
  </div>
</div>
```

5. **快捷时长**:在时间范围下方加 pill 按钮组:

```tsx
<div className="flex gap-1.5 mt-2">
  {[
    { label: '30min', duration: 30 },
    { label: '1h', duration: 60 },
    { label: '2h', duration: 120 },
    { label: '全天', duration: -1 },
  ].map(preset => (
    <button
      key={preset.label}
      type="button"
      className="px-2.5 py-1 text-xs rounded-full border border-border-default hover:bg-bg-hover"
      onClick={() => applyDuration(preset.duration)}
    >
      {preset.label}
    </button>
  ))}
</div>
```

6. **textarea**:min-height 提升到 80px,placeholder 改为 `"添加议程、链接、备注..."`
7. **底部按钮**:
   - 删除按钮（edit 模式）放左下,红色 ghost 样式 + Trash 图标
   - 取消、保存放右下,保存按钮 `accent-600` + Check 图标
   - 按钮高度从 36 提升到 **40**

```tsx
<div className="flex justify-between mt-5 gap-2">
  {mode === 'edit' && (
    <Button variant="ghost" className="text-red-500 hover:bg-red-50" onClick={handleDeleteClick}>
      <Trash size={14} className="mr-1.5" />删除
    </Button>
  )}
  <div className="flex gap-2 ml-auto">
    <Button variant="ghost" onClick={onCancel}>取消</Button>
    <Button variant="default" className="bg-accent-500 hover:bg-accent-600" onClick={handleSubmit}>
      <Check size={14} className="mr-1.5" />保存
    </Button>
  </div>
</div>
```

8. **键盘**:`Cmd/Ctrl+S` 提交、`Esc` 取消（已有）,加 `Cmd/Ctrl+Enter` 提交

### 5.3 验收

- [ ] 宽度 440px
- [ ] input 背景纯白,focus 时 ring
- [ ] 时间选择器 indicator 样式统一
- [ ] 类型 + 颜色联动,选类型自动同步颜色
- [ ] 快捷时长 pill 按钮工作
- [ ] textarea min-height 80px
- [ ] 按钮高度 40px
- [ ] 删除按钮带 Trash 图标,保存按钮带 Check 图标
- [ ] `Cmd/Ctrl+S` 和 `Cmd/Ctrl+Enter` 提交工作
- [ ] Dialog 关闭后焦点回到触发按钮

---

## 六、EventTooltip（悬停提示）

### 6.1 现状

暗色背景 `rgba(30,30,30,0.92)` + 白字,但 `🔗` emoji 和 `类型:xxx` 文字混排

### 6.2 优化方向

1. 背景:`--bg-elevated` + 80% 不透明 + `backdrop-blur`
2. 加类型色条左侧 `border-left: 3px solid ${color}`
3. 链接前的 `🔗` 换 `<Link size={12} />`
4. 时间用 `<span className="font-mono">` Geist Mono
5. 加入 `location` 行（当前已有,但加 `<MapPin size={12} />` 图标前缀）
6. 加 `created_by` 行:`由 Agent 创建` / `由你创建`（小字灰色）

```tsx
<div className="event-tooltip" style={{ borderLeft: `3px solid ${eventColor}` }}>
  <div className="tooltip-title">{event.title}</div>
  <div className="tooltip-time font-mono">
    {formatTime(event.start_time)} - {formatTime(event.end_time)}
    {event.is_all_day && '（全天）'}
  </div>
  {event.description && (
    <div className="tooltip-description">{event.description}</div>
  )}
  {event.url && (
    <div className="tooltip-url inline-flex items-center gap-1">
      <Link size={12} aria-hidden="true" />
      <a href={event.url} className="underline">{hostname}</a>
    </div>
  )}
  {event.location && (
    <div className="tooltip-meta inline-flex items-center gap-1">
      <MapPin size={12} aria-hidden="true" />
      <span>{event.location}</span>
    </div>
  )}
  <div className="tooltip-meta">
    类型:{EVENT_TYPE_LABELS[event.event_type]}
  </div>
  <div className="tooltip-meta text-xs text-tertiary">
    {event.created_by === 'agent' ? '由 Agent 创建' : '由你创建'}
  </div>
</div>
```

### 6.3 验收

- [ ] 背景使用 token,暗色模式自适应
- [ ] 左侧 3px 类型色条
- [ ] 时间用 Geist Mono
- [ ] 链接换 Link 图标
- [ ] 地点换 MapPin 图标
- [ ] 显示创建者信息

---

## 七、TimeColumn & TimeGridLines（时间轴）

### 7.1 现状

时间标签 `11px` 灰色,整点实线 + 半点虚线

### 7.2 优化方向

1. 时间标签改用 Geist Mono `font-mono text-xs text-tertiary`
2. 整点线颜色从 `#E5E7EB` 改为 `--border-subtle`
3. 半点虚线从 `1px dashed #F3F4F6` 改为 `1px dashed --border-subtle`（暗色下也可见）
4. 当前时间线（红色）改为 `accent-600` 2px + 右侧 `<Dot size={8} weight="fill" />` 圆点

```tsx
{Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }).map((_, i) => {
  const hour = DAY_START_HOUR + i;
  return (
    <div
      key={hour}
      className="time-label font-mono text-xs text-tertiary"
      style={{ top: `${(hour - DAY_START_HOUR) * HOUR_HEIGHT_PX}px` }}
    >
      {String(hour).padStart(2, '0')}:00
    </div>
  );
})}
```

### 7.3 验收

- [ ] 时间标签 Geist Mono
- [ ] 整点/半点线用 token,暗色可见
- [ ] 当前时间线 accent 色 + 圆点

---

## 八、CurrentTimeLine（当前时间指示线）

### 8.1 现状

红色 2px 横线 + 左侧红色时间标签

### 8.2 优化方向

1. 线条颜色从警示红 `#EF4444` 改为 `accent-500`,避免与冲突红混淆
2. 右端加 `<CaretRight size={12} weight="fill" />` 指示当前时间方向
3. 时间标签用 Geist Mono + 半透明胶囊背景 `bg-accent-500 text-white px-1.5 rounded-sm`
4. 入场动画:`animate-pulse` 缓慢呼吸（2s 周期）,提示"实时"

```tsx
<motion.div
  className="current-time-line"
  style={{ background: 'var(--accent-500)' }}
  animate={shouldReduceMotion ? {} : { opacity: [1, 0.6, 1] }}
  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
>
  <span className="current-time-label font-mono">
    {formatTime(Date.now())}
  </span>
  <CaretRight size={12} weight="fill" className="absolute right-0 -mr-3 text-accent-500" />
</motion.div>
```

### 8.3 验收

- [ ] 线条 accent 色,不与冲突红混淆
- [ ] 右端有方向指示
- [ ] 时间标签胶囊背景
- [ ] 呼吸动画在 reduced motion 下停止

---

## 九、关联模块

- 依赖: [02 - 设计基础](./02-design-foundations.md)
- 依赖: [03 - 图标系统](./03-icon-system.md)
- 依赖: [04 - 动效](./04-motion-and-interaction.md)
- 依赖: [05 - 可访问性](./05-accessibility.md)
- 被依赖: [20 - 迁移路线图](./20-migration-roadmap.md)
