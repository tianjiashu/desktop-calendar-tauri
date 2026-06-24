# 04 - 事件信息展示设计

> 所属阶段：Phase 1（MVP）
> 依赖模块：03-week-view
> 状态：已实现 ✅

---

## 1. 功能概述

本模块负责**事件信息展示**的实现，包括：
- 事件 Tooltip 悬浮详情（鼠标悬停显示）
- 事件卡片颜色区分（按 event_type）
- 事件链接点击跳转（window.open）
- 今日事件指示点（悬浮球底部 pulse 动画）
- 状态栏错误提示（红色错误信息展示）

**功能覆盖**：F17（事件 Tooltip 悬浮详情）、F18（事件卡片颜色区分）、F19（事件链接点击跳转）、F20（今日事件指示点）、F21（状态栏错误提示）。

**不负责**：事件 CRUD 逻辑（01）、周视图布局（03）。

---

## 2. 详细设计

### 2.1 事件 Tooltip 悬浮详情（F17）

**交互逻辑**：
```
鼠标悬停事件卡片（onMouseEnter）
    │
    ▼
计算 Tooltip 位置（getTooltipPosition）
    │
    ▼
显示 Tooltip（绝对定位，z-index: 1000）
    │
    ▼
鼠标离开事件卡片（onMouseLeave）
    │
    ▼
隐藏 Tooltip
```

**边界检测**（防止溢出屏幕）：
```typescript
// utils/tooltipPosition.ts

interface TooltipPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

export function getTooltipPosition(
  targetRect: DOMRect,
  tooltipSize: { width: number; height: number },
  viewport: { width: number; height: number }
): TooltipPosition {
  // 优先右侧，空间不足则左侧
  // 优先下方，空间不足则上方
  const spaceRight = viewport.width - targetRect.right;
  const spaceLeft = targetRect.left;
  const spaceBottom = viewport.height - targetRect.bottom;
  const spaceTop = targetRect.top;

  let placement: TooltipPosition['placement'];
  let top = 0, left = 0;

  if (spaceBottom >= tooltipSize.height) {
    placement = 'bottom';
    top = targetRect.bottom + 8;
    left = targetRect.left + targetRect.width / 2 - tooltipSize.width / 2;
  } else if (spaceTop >= tooltipSize.height) {
    placement = 'top';
    top = targetRect.top - tooltipSize.height - 8;
    left = targetRect.left + targetRect.width / 2 - tooltipSize.width / 2;
  } else if (spaceRight >= tooltipSize.width) {
    placement = 'right';
    top = targetRect.top + targetRect.height / 2 - tooltipSize.height / 2;
    left = targetRect.right + 8;
  } else {
    placement = 'left';
    top = targetRect.top + targetRect.height / 2 - tooltipSize.height / 2;
    left = targetRect.left - tooltipSize.width - 8;
  }

  // 边界修正
  left = Math.max(8, Math.min(left, viewport.width - tooltipSize.width - 8));
  top = Math.max(8, Math.min(top, viewport.height - tooltipSize.height - 8));

  return { top, left, placement };
}
```

**Tooltip 内容结构**：
```typescript
// components/Calendar/EventTooltip.tsx

const EventTooltip: React.FC<{ event: Event; position: TooltipPosition }> = ({ event, position }) => {
  return (
    <div
      className="event-tooltip"
      style={{ top: position.top, left: position.left }}
    >
      {/* 日程标题 */}
      <div className="tooltip-title">{event.title}</div>

      {/* 时间 */}
      <div className="tooltip-time">
        {formatTime(event.start_time)} - {formatTime(event.end_time)}
        {event.is_all_day && '（全天）'}
      </div>

      {/* 详情 */}
      {event.description && (
        <div className="tooltip-description">{event.description}</div>
      )}

      {/* 链接 */}
      {event.url && (
        <div className="tooltip-url">
          🔗 {new URL(event.url).hostname}
        </div>
      )}

      {/* 类型 */}
      <div className="tooltip-type">
        类型：{EVENT_TYPE_LABELS[event.event_type]}
      </div>
    </div>
  );
};
```

### 2.2 事件卡片颜色区分（F18）

**颜色映射**（Rust + TypeScript 两侧需同步）：

```typescript
// constants/eventTypeColors.ts

export const EVENT_TYPE_COLORS: Record<Event['event_type'], string> = {
  interview: '#3B82F6',  // 蓝色
  meeting: '#10B981',     // 绿色
  reminder: '#F59E0B',    // 橙色
  deadline: '#EF4444',    // 红色
  default: '#6B7280',     // 灰色
};

export const EVENT_TYPE_LABELS: Record<Event['event_type'], string> = {
  interview: '面试',
  meeting: '会议',
  reminder: '提醒',
  deadline: '截止',
  default: '默认',
};
```

**事件卡片样式**：
```css
.event-card {
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 11px;
  color: white;
  overflow: hidden;
  cursor: pointer;
  transition: opacity 0.2s;
}

.event-card:hover {
  opacity: 0.85;
}
```

### 2.3 事件链接点击跳转（F19）

```typescript
// utils/openEventLink.ts

export function openEventLink(url?: string): void {
  if (!url) return;

  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (e) {
    console.error('Failed to open event link:', e);
    // 降级：复制到剪贴板
    navigator.clipboard.writeText(url);
  }
}
```

**事件卡片点击处理**：
```typescript
// components/Calendar/EventCard.tsx

const handleClick = (e: React.MouseEvent) => {
  // 如果有 URL，点击打开链接
  if (event.url) {
    openEventLink(event.url);
  } else {
    // 否则显示详情（调用 onEventClick）
    onEventClick?.(event);
  }
};
```

### 2.4 今日事件指示点（F20）

**悬浮球组件**（02-window-system 已实现悬浮球 UI，此处补充指示点逻辑）：

```typescript
// components/Widget/BallWidget.tsx

const [hasEventsToday, setHasEventsToday] = useState(false);

useEffect(() => {
  // 检查今日是否有事件
  const checkEvents = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const events = await invoke<Event[]>('list_events', {
      start_date: today.getTime(),
      end_date: tomorrow.getTime(),
    });

    setHasEventsToday(events.length > 0);
  };

  checkEvents();
}, []);

// 指示点渲染
return (
  <div className="ball-widget">
    {/* 日期数字 + 星期 */}
    <div className="date">{today.getDate()}</div>
    <div className="weekday">{WEEKDAYS[today.getDay()]}</div>

    {/* 今日事件指示点 */}
    {hasEventsToday && <div className="event-indicator" />}
  </div>
);
```

**指示点样式**（pulse 动画）：
```css
.event-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #EF4444;
  animation: pulse 2s infinite;
  margin-top: 4px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}
```

### 2.5 状态栏错误提示（F21）

**状态栏组件**：
```typescript
// components/Common/StatusBar.tsx

interface StatusBarProps {
  error: AppError | null;
  isLoading: boolean;
}

const StatusBar: React.FC<StatusBarProps> = ({ error, isLoading }) => {
  return (
    <div className="status-bar">
      {error ? (
        <span className="status-error">
          ⚠️ {error.message}
        </span>
      ) : isLoading ? (
        <span className="status-loading">加载中...</span>
      ) : (
        <span className="status-ready">就绪·半透明模式</span>
      )}
    </div>
  );
};
```

**样式**：
```css
.status-bar {
  height: 28px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.1);
}

.status-error {
  color: #EF4444;
}

.status-ready {
  color: #6B7280;
}
```

---

## 3. 接口定义

### 3.1 TypeScript 侧

```typescript
// hooks/useEvents.ts（扩展）

interface UseEventsReturn {
  // ... 已有接口
  getTooltipPosition: (
    targetRect: DOMRect,
    tooltipSize: { width: number; height: number }
  ) => TooltipPosition;
  openEventLink: (url?: string) => void;
  checkEventsToday: () => Promise<boolean>;
}
```

### 3.2 组件 Props

```typescript
// components/Calendar/EventTooltip.tsx

interface EventTooltipProps {
  event: Event;
  position: TooltipPosition;
  onClose: () => void;
}

// components/Common/StatusBar.tsx

interface StatusBarProps {
  error: AppError | null;
  isLoading: boolean;
}
```

---

## 4. 实施步骤

### 步骤 1：实现 Tooltip 位置计算

- 文件：`src/utils/tooltipPosition.ts`
- 实现 `getTooltipPosition()` 函数
- 验证：单元测试（mock DOMRect + viewport）

### 步骤 2：实现事件 Tooltip 组件

- 文件：`src/components/Calendar/EventTooltip.tsx`
- 实现悬浮详情弹窗（日程/时间/详情/链接/类型）
- 集成 `getTooltipPosition()`
- 验证：鼠标悬停事件卡片 → 显示 Tooltip，边界检测正确

### 步骤 3：实现事件颜色区分

- 文件：`src/constants/eventTypeColors.ts`
- 定义 `EVENT_TYPE_COLORS` 和 `EVENT_TYPE_LABELS`
- 修改 `EventCard.tsx` 使用颜色映射
- 验证：不同类型的事件显示不同颜色

### 步骤 4：实现事件链接跳转

- 文件：`src/utils/openEventLink.ts`
- 实现 `openEventLink()` 函数
- 修改 `EventCard.tsx` onClick 处理
- 验证：点击事件卡片 → 打开链接（window.open）

### 步骤 5：实现今日事件指示点

- 文件：`src/components/Widget/BallWidget.tsx`（修改已有文件）
- 实现 `checkEventsToday()` 逻辑
- 添加指示点渲染（pulse 动画）
- 验证：今日有日程时，悬浮球底部显示红色圆点

### 步骤 6：实现状态栏错误提示

- 文件：`src/components/Common/StatusBar.tsx`（新建）
- 实现错误提示 / 加载中 / 就绪三种状态
- 在 `WeekView.tsx` 和 `BallWidget.tsx` 中集成
- 验证：数据加载失败时状态栏显示红色错误信息

---

## 5. 验收标准

### Tooltip 悬浮详情（F17）

- [ ] 鼠标悬停事件卡片 → 显示浮动详情弹窗
- [ ] Tooltip 内容包含：日程标题、时间、详情、链接、类型
- [ ] 边界检测正确：Tooltip 不会溢出屏幕
- [ ] 鼠标离开事件卡片 → Tooltip 隐藏
- [ ] Tooltip 样式清晰可读（背景半透明 + 毛玻璃）

### 事件颜色区分（F18）

- [ ] 面试类型事件 → 蓝色（#3B82F6）
- [ ] 会议类型事件 → 绿色（#10B981）
- [ ] 提醒类型事件 → 橙色（#F59E0B）
- [ ] 截止类型事件 → 红色（#EF4444）
- [ ] 默认类型事件 → 灰色（#6B7280）
- [ ] Rust 侧 `Event` 结构体的 `color` 字段可作为覆盖（优先级高于 event_type）

### 事件链接跳转（F19）

- [ ] 事件有 URL → 点击卡片 → `window.open(url, '_blank', 'noopener,noreferrer')`
- [ ] 事件无 URL → 点击卡片 → 显示事件详情（不跳转）
- [ ] 打开链接失败时 → 复制到剪贴板（降级处理）

### 今日事件指示点（F20）

- [ ] 今日有日程 → 悬浮球底部显示红色圆点（pulse 动画）
- [ ] 今日无日程 → 悬浮球底部不显示圆点
- [ ] 指示点动画流畅（60fps）

### 状态栏错误提示（F21）

- [ ] 数据加载失败 → 状态栏显示红色错误信息
- [ ] 数据加载中 → 状态栏显示"加载中..."
- [ ] 数据加载成功 → 状态栏显示"就绪·半透明模式"
- [ ] 错误信息清晰可读（包含 error.code 和 error.message）

---

## 6. 未决策事项

- [ ] **Tooltip 延迟显示**：是否需要延迟 300ms 再显示（防止快速移动时频繁显示）？
- [ ] **Tooltip 最大宽度**：内容过长时是否截断（max-width: 250px）？
- [ ] **事件卡片点击行为**：有 URL 时点击是跳转还是显示详情？（当前设计是跳转）
- [ ] **指示点动画**：pulse 动画是否过于显眼？是否需要更 subtle 的动画？

---

> 🕊️ 本文档由咕咕起草，老板确认后作为事件展示开发基准。
> 变更需更新版本号并注明原因。
