# 05 - 日期导航设计#

> 所属阶段：Phase 1（MVP）
> 依赖模块：03-week-view
> 状态：已实现 ✅

---

## 1. 功能概述

本模块负责**日期导航**的实现，包括：
- 上一周 / 下一周切换
- 回到本周（一键跳回当前周）
- 刷新（重新从数据库加载事件）
- 周范围标题（Header 中心显示）

**功能覆盖**：F22（上一周/下一周）、F23（回到本周）、F24（刷新）、F25（周范围标题）。

**不负责**：周视图渲染（03）、窗口系统（02）。

---

## 2. 详细设计

### 2.1 周范围计算

```
给定任意日期 date：
  step 1: 找到 date 所在周的周一（getMonday(date)）
  step 2: 周日 = 周一 + 6 天
  step 3: 格式化标题 → "M月D日 - M月D日 (YYYY年)"
```

**代码实现**：

```typescript
// utils/dateUtils.ts

export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=周日, 1=周一, ..., 6=周六
  const diff = day === 0 ? -6 : 1 - day; // 周日是上周的周一
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekRange(date: Date): { monday: Date; sunday: Date } {
  const monday = getMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday, sunday };
}

export function formatWeekTitle(monday: Date, sunday: Date): string {
  const y = monday.getFullYear();
  const m1 = monday.getMonth() + 1;
  const d1 = monday.getDate();
  const m2 = sunday.getMonth() + 1;
  const d2 = sunday.getDate();

  if (m1 === m2) {
    // 同月：6月22日 - 6月28日 (2026年)
    return `${m1}月${d1}日 - ${d2}日 (${y}年)`;
  } else {
    // 跨月：6月29日 - 7月5日 (2026年)
    return `${m1}月${d1}日 - ${m2}月${d2}日 (${y}年)`;
  }
}
```

### 2.2 Header 布局（F22-F25）

```
┌─────────────────────────────────────────────────┐
│  ◀  2026年6月22日 - 6月28日 (2026年)  ●  ↻       │
│  ├───┤
│  ◀：上一周（F22）                                    │
│  ●：回到本周（F23）                                   │
│  ▶：下一周（F22）                                    │
│  ↻：刷新（F24）                                       │
│  中心：周范围标题（F25）                                 │
└─────────────────────────────────────────────────┘
```

### 2.3 导航按钮交互（F22）

```typescript
// hooks/useWeekNavigation.ts

export function useWeekNavigation(
  currentDate: Date,
  onNavigate: (newDate: Date) => void
) {
  const goToPrevWeek = useCallback(() => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    onNavigate(newDate);
  }, [currentDate, onNavigate]);

  const goToNextWeek = useCallback(() => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    onNavigate(newDate);
  }, [currentDate, onNavigate]);

  return { goToPrevWeek, goToNextWeek };
}
```

### 2.4 回到本周（F23）

```typescript
// hooks/useWeekNavigation.ts（续）

export function useWeekNavigation(...) {
  // ... goToPrevWeek, goToNextWeek

  const goToToday = useCallback(() => {
    onNavigate(new Date()); // 跳到"今天"所在的周
  }, [onNavigate]);

  return { goToPrevWeek, goToNextWeek, goToToday };
}
```

**按钮高亮逻辑**：如果当前已经在"本周"，● 按钮置灰不可点击。

```typescript
const isCurrentWeek = useMemo(() => {
  const now = new Date();
  const { monday: currentMonday } = getWeekRange(now);
  const { monday: viewMonday } = getWeekRange(currentDate);
  return currentMonday.getTime() === viewMonday.getTime();
}, [currentDate]);
```

### 2.5 刷新（F24）

```typescript
// hooks/useEvents.ts（扩展）

export function useEvents() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchEvents(); // 重新从 DB 加载
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchEvents]);

  return { ..., refresh, isRefreshing };
}
```

**刷新按钮动画**：刷新中显示旋转图标（↻ 旋转）。

```css
.refresh-button.refreshing {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### 2.6 周范围标题（F25）

**实现**：在 `WeekHeader.tsx` 中调用 `formatWeekTitle()`。

```typescript
// components/WeekView/WeekHeader.tsx

const WeekHeader: React.FC<{ currentDate: Date }> = ({ currentDate }) => {
  const { monday, sunday } = getWeekRange(currentDate);
  const title = formatWeekTitle(monday, sunday);

  return (
    <div className="week-header">
      <button onClick={goToPrevWeek}>◀</button>
      <span className="week-title">{title}</span>
      <button
        onClick={goToToday}
        disabled={isCurrentWeek}
      >●</button>
      <button onClick={goToNextWeek}>▶</button>
      <button
        className={isRefreshing ? 'refreshing' : ''}
        onClick={refresh}
      >↻</button>
    </div>
  );
};
```

---

## 3. 接口定义#

### 3.1 TypeScript 侧

```typescript
// hooks/useWeekNavigation.ts

interface UseWeekNavigationReturn {
  goToPrevWeek: () => void;
  goToNextWeek: () => void;
  goToToday: () => void;
  isCurrentWeek: boolean;
}

export function useWeekNavigation(
  currentDate: Date,
  onNavigate: (newDate: Date) => void
): UseWeekNavigationReturn;
```

```typescript
// utils/dateUtils.ts

export function getMonday(date: Date): Date;
export function getWeekRange(date: Date): { monday: Date; sunday: Date };
export function formatWeekTitle(monday: Date, sunday: Date): string;
```

### 3.2 组件 Props

```typescript
// components/WeekView/WeekHeader.tsx

interface WeekHeaderProps {
  currentDate: Date;
  onNavigate: (newDate: Date) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}
```

---

## 4. 实施步骤#

### 步骤 1：实现日期工具函数#

- 文件：`src/utils/dateUtils.ts`
- 实现 `getMonday()`、`getWeekRange()`、`formatWeekTitle()`
- 验证：单元测试（覆盖跨月、跨年场景）

### 步骤 2：实现 useWeekNavigation Hook#

- 文件：`src/hooks/useWeekNavigation.ts`
- 实现 `goToPrevWeek`、`goToNextWeek`、`goToToday`
- 实现 `isCurrentWeek` 计算
- 验证：调用后 `currentDate` 正确变化

### 步骤 3：实现 WeekHeader 组件#

- 文件：`src/components/WeekView/WeekHeader.tsx`
- 实现导航按钮（◀ / ● / ▶ / ↻）
- 实现周范围标题（F25）
- 实现刷新按钮旋转动画
- 验证：点击按钮后周视图正确切换

### 步骤 4：集成到 WeekView#

- 文件：`src/components/WeekView/WeekView.tsx`
- 在 `WeekView` 中使用 `useWeekNavigation`
- 导航后调用 `fetchEvents()` 重新加载事件
- 验证：导航后事件列表同步更新

---

## 5. 验收标准#

### 功能验收#

- [ ] 点击 ◀ 按钮 → 切换到上一周，标题正确更新
- [ ] 点击 ▶ 按钮 → 切换到下一周，标题正确更新
- [ ] 点击 ● 按钮 → 一键跳回当前周
- [ ] 当前已在本周时，● 按钮置灰（disabled）
- [ ] 点击 ↻ 按钮 → 重新从数据库加载事件
- [ ] 刷新中 ↻ 按钮显示旋转动画
- [ ] Header 中心正确显示「M月D日 - M月D日 (YYYY年)」
- [ ] 跨月时标题格式正确（如「6月29日 - 7月5日」）
- [ ] 跨年时标题格式正确（如「12月30日 - 1月5日 (2027年)」）

### 性能验收#

- [ ] 导航切换流畅（< 100ms）
- [ ] 刷新不闪烁（数据加载期间保持旧数据展示）

---

## 6. 未决策事项#

- [ ] **周起始日**：是周一还是周日？（当前设计是周一，符合中国习惯）
- [ ] **跨年场景**：标题中年份如何处理？（当前设计：始终显示后面的年份）
- [ ] **快速连点**：是否需要防抖？（当前设计：无防抖，依赖 React 状态更新机制）

---

> 🕊️ 本文档由咕咕起草，老板确认后作为日期导航开发基准。
> 变更需更新版本号并注明原因。
