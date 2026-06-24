# 03 - 周视图渲染设计

> 所属阶段：Phase 1（MVP）
> 依赖模块：01-data-model
> 状态：已实现 ✅

---

## 1. 功能概述

本模块负责**周视图核心渲染**，包括：
- 7 日周视图布局（周一至周日）
- 时间刻度线（整点实线 + 半点虚线）
- 日列背景（今日高亮）
- 日头标签（周一 + 日期数字）
- 当前时间红线（每分钟刷新）
- 事件卡片渲染（按时间位置 + 颜色）
- 多事件重叠自动分列
- 毛玻璃半透明效果

**功能覆盖**：F8（7 日周视图）、F9（时间刻度线）、F10（日列背景）、F11（日头标签）、F12（当前时间红线）、F13（事件卡片渲染）、F14（多事件重叠自动分列）、F15（超出显示范围过滤）、F16（毛玻璃半透明效果）。

**不负责**：窗口系统（02）、事件展示详情（04）、日期导航（05）。

---

## 2. 详细设计

### 2.1 7 日周视图布局（F8）

```
┌──────────────────────────────────────────────────┐
│  ◀  2026年6月22日 - 6月28日 (2026年)  ●  ↻       │
├────┬──────┬──────┬──────┬──────┬──────┬──────┤
│ 周一 │ 周二 │ 周三 │ 周四 │ 周五 │ 周六 │ 周日 │
│ 22日│ 23日│ 24日│ 25日│ 26日│ 27日│ 28日│
├────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ 8:00│      │      │      │      │      │      │
│ —————│——————│——————│——————│——————│——————│——————│
│ 8:30│      │      │      │      │      │      │
│ - - │ - - │ - - │ - - │ - - │ - - │ - - │
│ 9:00│      │      │  ┌──────┐   │      │
│ —————│——————│——————│  │会议  │——————│——————│
│      │      │      │  │9:00- │      │      │
│      │      │      │  │10:00 │      │      │
│      │      │      │  └──────┘   │      │
│ ... │      │      │      │      │      │      │
│ 21:00      │      │      │      │      │      │
└────┴──────┴──────┴──────┴──────┴──────┴──────┘
              │← 当前时间红线（F12）── 红色横线 + 14:30 标签
```

**列宽计算**：
- 总宽度：860px - 左侧时间列宽度（60px）= 800px
- 每列宽度：800px / 7 ≈ 114px

**行高计算**：
- 总高度：780px - Header 高度（48px）- 状态栏高度（32px）= 700px
- 每小时高度：700px / 13h ≈ 54px
- 每半小时高度：27px

### 2.2 时间刻度线（F9）

```typescript
// components/WeekView/TimeColumn.tsx

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 - 21:00

const TimeColumn: React.FC = () => {
  return (
    <div className="time-column" style={{ width: 60 }}>
      {HOURS.map(hour => (
        <>
          {/* 整点标签 */}
          <div
            className="hour-label"
            style={{ top: `${((hour - 8) * 54)}px` }}
          >
            {String(hour).padStart(2, '0')}:00
          </div>
          {/* 整点实线 */}
          <div
            className="hour-line"
            style={{ top: `${((hour - 8) * 54)}px` }}
          />
          {/* 半点虚线（非最后一行） */}
          {hour < 21 && (
            <div
              className="half-hour-line"
              style={{ top: `${((hour - 8) * 54 + 27)}px` }}
            />
          )}
        </>
      ))}
    </div>
  );
};
```

**样式**：

```css
.hour-label {
  position: absolute;
  right: 8px;
  font-size: 12px;
  color: #6B7280;
  transform: translateY(-50%);
}

.hour-line {
  position: absolute;
  left: 60px;  /* 偏移时间列 */
  right: 0;
  height: 1px;
  background: #E5E7EB;
}

.half-hour-line {
  position: absolute;
  left: 60px;
  right: 0;
  height: 0;
  border-top: 1px dashed #F3F4F6;
}
```

### 2.3 日列背景（F10）

```typescript
// components/WeekView/DayColumn.tsx

interface DayColumnProps {
  date: Date;
  isToday: boolean;
  events: Event[];
}

const DayColumn: React.FC<DayColumnProps> = ({ date, isToday, events }) => {
  return (
    <div
      className={`day-column ${isToday ? 'today' : ''}`}
      style={{
        background: isToday ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
      }}
    >
      {/* 事件卡片渲染区域 */}
      <div className="events-container">
        {events.map(event => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
      {/* 当前时间红线（仅今日） */}
      {isToday && <CurrentTimeLine />}
    </div>
  );
};
```

### 2.4 日头标签（F11）

```typescript
// components/WeekView/WeekHeader.tsx（日头部分）

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

interface DayHeaderProps {
  date: Date;
  isToday: boolean;
}

const DayHeader: React.FC<DayHeaderProps> = ({ date, isToday }) => {
  const dayOfWeek = WEEKDAYS[date.getDay() === 0 ? 6 : date.getDay() - 1];
  const dayOfMonth = date.getDate();

  return (
    <div className={`day-header ${isToday ? 'today' : ''}`}>
      <span className="weekday">{dayOfWeek}</span>
      <span className={`day-number ${isToday ? 'today' : ''}`}>
        {dayOfMonth}
      </span>
    </div>
  );
};
```

**样式**：

```css
.day-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
}

.day-header.today .weekday {
  color: #3B82F6;  /* 蓝色 */
  font-weight: 600;
}

.day-header.today .day-number {
  color: #3B82F6;
  font-weight: 700;
  background: #3B82F6;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### 2.5 当前时间红线（F12）

```typescript
// components/WeekView/CurrentTimeLine.tsx

const CurrentTimeLine: React.FC = () => {
  const [position, setPosition] = useState(calculatePosition);
  const [timeLabel, setTimeLabel] = useState(calculateTimeLabel);

  useEffect(() => {
    const timer = setInterval(() => {
      setPosition(calculatePosition());
      setTimeLabel(calculateTimeLabel());
    }, 60000);  // 每分钟刷新

    return () => clearInterval(timer);
  }, []);

  // 计算当前时间在视图中的 Y 坐标
  function calculatePosition(): number {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    if (hours < 8 || hours >= 21) return -1;  // 超出范围不显示

    const totalMinutes = (hours - 8) * 60 + minutes;
    return (totalMinutes / 60) * 54;  // 每小时 54px
  }

  function calculateTimeLabel(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  if (position < 0) return null;

  return (
    <>
      {/* 红线 */}
      <div
        className="current-time-line"
        style={{ top: `${position}px` }}
      />
      {/* 时间标签 */}
      <div
        className="current-time-label"
        style={{ top: `${position - 8}px` }}
      >
        {timeLabel}
      </div>
    </>
  );
};
```

**样式**：

```css
.current-time-line {
  position: absolute;
  left: 60px;
  right: 0;
  height: 2px;
  background: #EF4444;  /* 红色 */
  z-index: 10;
  pointer-events: none;
}

.current-time-label {
  position: absolute;
  left: 4px;
  font-size: 11px;
  color: #EF4444;
  font-weight: 600;
  pointer-events: none;
}
```

### 2.6 事件卡片渲染（F13）

```typescript
// components/Calendar/EventCard.tsx

interface EventCardProps {
  event: Event;
  column: number;      // 第几列（F14 重叠分列）
  totalColumns: number;  // 总列数
}

const EventCard: React.FC<EventCardProps> = ({ event, column, totalColumns }) => {
  const startPos = calculateTimePosition(event.start_time);
  const height = calculateDurationHeight(event.start_time, event.end_time);

  const colorMap = {
    'interview': '#3B82F6',
    'meeting': '#10B981',
    'reminder': '#F59E0B',
    'deadline': '#EF4444',
    'default': '#6B7280',
  };

  const bgColor = colorMap[event.event_type] || event.color;

  // 宽度和偏移（F14：多列并排）
  const width = `calc((100% - 4px) / ${totalColumns})`;
  const left = `calc(${column} * (100% / ${totalColumns}))`;

  return (
    <div
      className="event-card"
      style={{
        top: `${startPos}px`,
        height: `${height}px`,
        width,
        left,
        backgroundColor: bgColor,
      }}
      onMouseEnter={(e) => showTooltip(e, event)}
      onClick={() => openEventLink(event.url)}
    >
      <div className="event-title">{event.title}</div>
      <div className="event-time">
        {formatTime(event.start_time)} - {formatTime(event.end_time)}
      </div>
    </div>
  );
};
```

### 2.7 多事件重叠自动分列算法（F14）

```typescript
// utils/eventLayout.ts

interface EventWithLayout extends Event {
  column: number;
  totalColumns: number;
}

export function assignColumns(events: Event[]): EventWithLayout[] {
  // 1. 按开始时间排序
  const sorted = [...events].sort((a, b) => a.start_time - b.start_time);

  const columns: { end: number; events: Event[] }[] = [];

  for (const event of sorted) {
    // 2. 查找第一个可用的列（结束时间 <= 当前事件开始时间）
    let placed = false;
    for (let i = 0; i < columns.length; i++) {
      if (columns[i].end <= event.start_time) {
        columns[i].end = event.end_time;
        columns[i].events.push(event);
        placed = true;
        break;
      }
    }

    // 3. 没有可用列，新建一列
    if (!placed) {
      columns.push({ end: event.end_time, events: [event] });
    }
  }

  // 4. 为每个事件分配 column 和 totalColumns
  const result: EventWithLayout[] = [];
  for (let col = 0; col < columns.length; col++) {
    for (const event of columns[col].events) {
      result.push({
        ...event,
        column: col,
        totalColumns: columns.length,
      });
    }
  }

  return result;
}
```

**算法复杂度**：O(n * m)，n = 事件数，m = 列数（通常很小）。

### 2.8 事件超出显示范围过滤（F15）

```typescript
// utils/eventFilter.ts

export function filterVisibleEvents(events: Event[]): Event[] {
  const DAY_START = 8 * 60;   // 8:00 in minutes
  const DAY_END = 21 * 60;   // 21:00 in minutes

  return events.filter(event => {
    const startMinutes = toMinutes(event.start_time);
    const endMinutes = toMinutes(event.end_time);

    // 保留：开始时间在 8:00-21:00 之间，或跨过 8:00/21:00 的事件
    return startMinutes < DAY_END && endMinutes > DAY_START;
  });
}

function toMinutes(timestamp: number): number {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
}
```

### 2.9 毛玻璃半透明效果（F16）

```css
/* 周视图窗口背景 */
.week-view-container {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

**Tauri 配置**（`tauri.conf.json`）：

```json
{
  "tauri": {
    "windows": [
      {
        "transparent": true,
        "decorations": false
      }
    ]
  }
}
```

---

## 3. 接口定义

### 3.1 TypeScript 侧

```typescript
// utils/eventLayout.ts

export interface EventWithLayout extends Event {
  column: number;
  totalColumns: number;
}

export function assignColumns(events: Event[]): EventWithLayout[];
```

```typescript
// hooks/useWeekView.ts

export interface WeekViewState {
  weekDates: Date[];          // 当前周的 7 个日期
  events: EventWithLayout[];  // 已分配列的事件
  currentTimePosition: number;   // 当前时间红线位置
}

export function useWeekView(
  startDate: Date,
  endDate: Date
): WeekViewState & {
  fetchEvents: () => Promise<void>;
  goToNextWeek: () => void;
  goToPrevWeek: () => void;
  goToToday: () => void;
} {
  // 实现
}
```

### 3.2 组件 Props

```typescript
// components/WeekView/WeekView.tsx

interface WeekViewProps {
  startDate: Date;
  endDate: Date;
  events: Event[];
  onEventClick?: (event: Event) => void;
  onEventDoubleClick?: (event: Event) => void;
}
```

---

## 4. 实施步骤

### 步骤 1：创建周视图基础布局

- 文件：`src/components/WeekView/WeekView.tsx`
- 实现 7 列布局（CSS Grid 或 Flex）
- 验证：渲染 7 个空白日列

### 步骤 2：实现时间刻度线

- 文件：`src/components/WeekView/TimeColumn.tsx`
- 实现整点标签 + 整点实线 + 半点虚线
- 验证：左侧时间列正确显示 8:00-21:00

### 步骤 3：实现日列背景和日头标签

- 文件：`src/components/WeekView/DayColumn.tsx`、`DayHeader.tsx`
- 实现今日高亮（淡蓝色背景）
- 验证：今日列背景高亮，日头标签加粗蓝色

### 步骤 4：实现当前时间红线

- 文件：`src/components/WeekView/CurrentTimeLine.tsx`
- 实现每分钟刷新，精确计算 Y 坐标
- 验证：红线位置与系统时间一致，每分钟更新

### 步骤 5：实现事件卡片渲染

- 文件：`src/components/Calendar/EventCard.tsx`
- 实现按 `event_type` 着色
- 验证：事件卡片显示在正确时间位置，颜色正确

### 步骤 6：实现多事件重叠自动分列

- 文件：`src/utils/eventLayout.ts`
- 实现 `assignColumns` 算法
- 验证：同一时段 3 个事件自动分成 3 列并排显示

### 步骤 7：实现事件超出范围过滤

- 文件：`src/utils/eventFilter.ts`
- 实现 `filterVisibleEvents`
- 验证：8:00 前开始的事件不渲染，21:00 后结束的事件不渲染

### 步骤 8：实现毛玻璃效果

- 文件：`src/App.css`（全局样式）
- 添加 `backdrop-filter: blur(24px)`
- 验证：窗口背景半透明，毛玻璃效果生效

---

## 5. 验收标准

### 布局渲染

- [ ] 周一至周日 7 列正确渲染
- [ ] 每列宽度相等（约 114px）
- [ ] 时间刻度 8:00-21:00 显示正确
- [ ] 整点标签右对齐，格式为 `HH:00`
- [ ] 整点实线贯穿所有列
- [ ] 半点虚线在每小时间隔中间

### 日列和日头

- [ ] 今日列背景高亮（淡蓝色 `rgba(59, 130, 246, 0.05)`）
- [ ] 今日日头「周一」+ 日期数字加粗蓝色
- [ ] 非今日日头颜色为灰色 `#6B7280`

### 当前时间红线

- [ ] 红线精确标注当前时间位置（误差 < 1px）
- [ ] 左侧显示 `HH:MM` 标签（红色）
- [ ] 红线每分钟自动刷新位置
- [ ] 当前时间 < 8:00 或 >= 21:00 时红线不显示

### 事件卡片

- [ ] 事件卡片显示在正确的时间位置（Y 坐标精确）
- [ ] 事件卡片高度与持续时间成正比（每分钟 ≈ 0.9px）
- [ ] 按 `event_type` 着色：面试蓝 / 会议绿 / 提醒橙 / 截止红 / 默认灰
- [ ] 点击事件卡片 → `window.open(url)` 打开外部链接（F19）

### 多事件重叠分列

- [ ] 同一时段 2 个事件：各占 50% 宽度，并排显示
- [ ] 同一时段 3 个事件：各占 33% 宽度，并排显示
- [ ] 不重叠的事件：各占 100% 宽度
- [ ] 部分重叠（A: 9:00-10:00, B: 9:30-10:30）：各占 50% 宽度

### 过滤和效果

- [ ] 开始时间 < 8:00 的事件不渲染
- [ ] 结束时间 > 21:00 的事件不渲染
- [ ] 跨过 8:00 的事件（开始 < 8:00，结束 > 8:00）：从 8:00 位置开始渲染
- [ ] 窗口背景毛玻璃效果生效（`backdrop-filter: blur(24px)`）
- [ ] 窗口背景半透明（alpha ≈ 0.7）

---

## 6. 未决策事项

- [ ] **事件卡片高度计算**：是否考虑「紧凑模式」（最小高度 20px）？
- [ ] **当前时间红线穿越事件卡片时**：红线应该显示在卡片上层还是下层？
- [ ] **多显示器 DPI 缩放**：`backdrop-filter` 在高 DPI 下是否需要特殊处理？
- [ ] **周视图滚动**：如果事件太多超出视图高度，是否需要滚动？

---

> 🕊️ 本文档由咕咕起草，老板确认后作为周视图渲染开发基准。
> 变更需更新版本号并注明原因。
