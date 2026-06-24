# 📋 桌面日历优化计划

> 生成时间：2026-06-23  
> 基于对当前代码库的全面分析，涵盖吸附体验、性能、代码质量、功能扩展四个维度。

---

## 🎯 一、吸附体验改进（高优先级）

### 1.1 当前问题

当前吸附逻辑只在**松手时**才执行 `snapToHalfHour()`，拖拽过程中用户完全感受不到"磁力"反馈：

```typescript
// 拖拽过程中：用 snapTo5Minutes 做平滑预览（无磁力感）
// 松手时：用 snapToHalfHour 做强吸附（突然跳动）
```

用户只能凭感觉猜测是否对齐，松手后卡片突然跳动，体验割裂。

### 1.2 改进方案：渐进式磁性吸附

#### 方案 A：拖拽过程中实时软吸附（推荐）

在 `handleMouseMove` 中增加**动态吸附**逻辑：

| 距离半小时间隔 | 行为 |
|---------------|------|
| ≤ 3 分钟 | 自动微调到那条线上（软吸附，预览直接显示对齐位置） |
| 3~5 分钟 | 预览保持自由位置，但显示弱视觉提示 |
| > 5 分钟 | 自由移动，无吸附 |

**实现要点**：
- 修改 `handleMouseMove`，对 move 模式也引入半小时间隔判断
- 新增 `SOFT_SNAP_THRESHOLD_MINUTES = 3` 常量
- 软吸附后的位置计算逻辑：当 edge 距离半小时间隔 ≤ 3 分钟时，自动将预览位置吸附到该间隔

#### 方案 B：网格线高亮视觉反馈

当卡片边缘进入吸附范围时，对应的整点/半点网格线高亮：

| 状态 | 网格线样式 |
|------|-----------|
| 正常 | `#E5E7EB` 实线 / `#F3F4F6` 虚线 |
| 吸附中 | `#3B82F6` 加粗（2px），可选加发光效果 |
| 松手完成 | 恢复正常 |

**实现要点**：
- `TimeGridLines` 组件接收吸附状态 props
- 当 `dragPreview` 边缘在吸附范围内时，高亮对应的时间线
- 需要从 `useEventDrag` 向上传递吸附状态到 `WeekView` → `TimeGridLines`

#### 方案 C：松手强吸附保持

保留当前 ±2 分钟的松手强吸附逻辑，作为最终确认步骤。

#### 推荐组合：A + B + C

```
拖拽中 (±3min)  →  软吸附 + 网格线高亮
松手时 (±2min)  →  强吸附到半小时间隔
```

### 1.3 涉及文件

| 文件 | 修改内容 |
|------|---------|
| `src/hooks/useEventDrag.ts` | 增加软吸附逻辑、吸附状态导出 |
| `src/components/WeekView/TimeGridLines.tsx` | 接收吸附状态，高亮对应网格线 |
| `src/components/Calendar/EventCard.tsx` | 传递吸附状态 |
| `src/components/WeekView/DayColumn.tsx` | 传递吸附状态 |
| `src/App.css` | 新增 `.time-hour-line--snapping` 样式 |

---

## ⚡ 二、性能优化（中优先级）

### 2.1 拖拽时用 requestAnimationFrame 节流

**当前问题**：`handleMouseMove` 每次触发都直接调用 `setDragPreview`，高频 `mousemove` 事件（通常 60-120Hz）导致频繁 React 重渲染。

**改进**：用 `requestAnimationFrame` 包装状态更新：

```typescript
// useEventDrag.ts 新增
const rafRef = useRef<number | null>(null);

const handleMouseMove = useCallback((e: MouseEvent) => {
  // ... 计算逻辑 ...
  
  if (rafRef.current !== null) return; // 跳过，等上一帧渲染完
  rafRef.current = requestAnimationFrame(() => {
    setDragPreview({ topPx, heightPx });
    rafRef.current = null;
  });
}, []);
```

**收益**：拖拽帧率稳定在 60fps，减少无效渲染 30-50%。

### 2.2 React.memo 包裹 EventCard

**当前问题**：拖拽一个卡片时，同列所有 `EventCard` 都会因父组件重渲染而重渲染。

**改进**：

```typescript
// EventCard.tsx
const EventCard: React.FC<EventCardProps> = React.memo(({ event, column, totalColumns, onEdit, onUpdate }) => {
  // ... 组件内容 ...
}, (prevProps, nextProps) => {
  // 自定义比较：只有这些值变化时才重渲染
  return (
    prevProps.event.id === nextProps.event.id &&
    prevProps.event.start_time === nextProps.event.start_time &&
    prevProps.event.end_time === nextProps.event.end_time &&
    prevProps.event.title === nextProps.event.title &&
    prevProps.column === nextProps.column &&
    prevProps.totalColumns === nextProps.totalColumns
  );
});
```

**收益**：拖拽时只有被拖拽的卡片重渲染，其他卡片跳过渲染。

### 2.3 事件卡片虚拟化（远期）

**当前状态**：所有可见事件都渲染为 DOM 节点。

**优化方向**：当事件数量 > 50 时，只渲染可视区域内的卡片。可使用简单的自定义虚拟化或 `react-virtuoso`。

**优先级**：🟢 低 — 当前事件数量一般不会超过 50，暂不急。

---

## 🏗️ 三、代码质量优化（中优先级）

### 3.1 `useEventDrag.ts` 重构（290 行 → 拆分）

**当前问题**：
- 文件 290 行，接近 300 行红线
- `handleMouseMove`（44 行）和 `endDrag`（62 行）有大量重复的时间计算逻辑
- `beginDrag`、`attachListeners`、`onMouseDown*` 可合并简化

**拆分方案**：

```
src/hooks/
├── useEventDrag.ts          # 主 Hook（~100 行）
├── useEventDrag/
│   ├── snapUtils.ts         # snapToHalfHour, snapTo5Minutes, clampMinutes（~30 行）
│   ├── timeCalculations.ts  # calculateNewTimes, deltaPxToMinutes, minutesToPx（~60 行）
│   └── dragState.ts         # DragState 类型定义（~20 行）
```

**抽取重复逻辑**：

```typescript
// timeCalculations.ts — 消除 handleMouseMove 和 endDrag 中的重复计算
export function calculateNewTimes(
  state: DragState,
  deltaPx: number
): { topMinutes: number; bottomMinutes: number } {
  const origStartMin = timestampToMinutes(state.originalStart);
  const origEndMin = timestampToMinutes(state.originalEnd);
  const deltaMin = deltaPxToMinutes(deltaPx);
  
  switch (state.mode) {
    case 'move': return calculateMoveTimes(origStartMin, origEndMin, deltaMin);
    case 'resize-top': return calculateResizeTopTimes(origStartMin, origEndMin, deltaMin);
    case 'resize-bottom': return calculateResizeBottomTimes(origStartMin, origEndMin, deltaMin);
  }
}
```

### 3.2 拖拽状态管理优化（远期）

**当前**：`useState` 驱动 `isDragging` 和 `dragPreview`，每次更新触发 React 重渲染。

**优化方向**：用 `useRef` + `requestAnimationFrame` 直接操作 DOM 样式，完全绕过 React 渲染管线。

**优先级**：🟢 低 — 当前性能可接受，rAF 节流后效果更好。

### 3.3 补充单元测试

**缺少测试的核心函数**：

| 函数 | 文件 | 优先级 |
|------|------|--------|
| `snapToHalfHour` | `useEventDrag.ts` | 🔴 高 |
| `assignColumns` | `eventLayout.ts` | 🟡 中 |
| `calculateTimePosition` | `eventFilter.ts` | 🟡 中 |
| `useEventDrag` 集成测试 | `useEventDrag.ts` | 🟢 低 |

已有测试：`dateUtils.test.ts`、`eventFilter.test.ts`、`eventLayout.test.ts`、`tooltipPosition.test.ts`。

---

## 🚀 四、功能扩展（低优先级）

### 4.1 双击空白区域创建事件

**描述**：在日列空白区域双击，自动弹出创建对话框，且 `start_time` 预填为双击位置对应的时间。

**实现要点**：
- `DayColumn` 的 `events-container` 添加 `onDoubleClick` 事件
- 根据点击的 Y 坐标计算对应的时间
- 调用 `eventDialog.openCreateDialog(preselectedDate, preselectedTime)`

### 4.2 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + N` | 新建事件 |
| `←` / `→` | 切换上一周/下一周 |
| `T` | 回到今天 |
| `Delete` | 删除选中事件 |
| `Esc` | 关闭弹窗 / 缩小为悬浮球 |

**实现要点**：
- 新增 `useKeyboardShortcuts` hook
- 在 `WeekView` 或 `App` 层挂载全局 `keydown` 监听

### 4.3 跨日拖拽

**描述**：当前拖拽只在同一天内移动。支持将事件卡片拖拽到相邻日列。

**实现要点**：
- 在 `handleMouseMove` 中追踪鼠标所在的日列
- 跨日时更新事件的日期部分
- 视觉上显示跨日预览（半透明卡片跟随鼠标）

### 4.4 重复事件展开渲染

**描述**：数据库已有 `rrule` 字段（iCalendar RRULE 格式），但前端尚未展开渲染重复事件。

**实现要点**：
- Rust 后端新增 `expand_rrule` 函数，根据 RRULE 计算当前周内的事件实例
- 前端查询时获取展开后的事件列表
- 渲染时显示重复标记（如 🔄 图标）

### 4.5 事件搜索/筛选

**描述**：在 Header 添加搜索框，按标题/类型筛选事件。

**实现要点**：
- 新增 `useEventFilter` hook
- Header 添加搜索输入框
- 实时过滤当前周的事件列表

### 4.6 暗色模式

**描述**：周视图支持暗色主题。

**实现要点**：
- CSS 变量化所有颜色
- 新增 `[data-theme="dark"]` 样式覆盖
- 主题切换按钮 / 跟随系统偏好

---

## 📊 五、实施优先级矩阵

```
                    高影响
                      │
       🔴 吸附改进    │    🟡 性能优化
       (A+B+C 组合)   │    (rAF + React.memo)
                      │
   ───────────────────┼───────────────────
                      │
       🟡 代码重构    │    🟢 功能扩展
       (useEventDrag  │    (双击创建/快捷键/
        拆分+测试)    │     暗色模式...)
                      │
                    低影响
```

### 推荐实施顺序

| 阶段 | 内容 | 预估工时 |
|------|------|---------|
| **Phase 1** | 吸附体验改进（软吸附 + 网格线高亮） | 2-3h |
| **Phase 2** | 性能优化（rAF 节流 + React.memo） | 1-2h |
| **Phase 3** | 代码重构（useEventDrag 拆分 + 测试补充） | 2-3h |
| **Phase 4** | 功能扩展（按需选取） | 各 1-4h |

---

## 📝 六、涉及文件总览

### 需要修改的文件

```
src/
├── hooks/
│   └── useEventDrag.ts              # 重构：拆分 + 软吸附逻辑
├── hooks/useEventDrag/              # 新增：拆分子模块
│   ├── snapUtils.ts                 # 新增
│   ├── timeCalculations.ts          # 新增
│   └── dragState.ts                 # 新增
├── components/
│   ├── Calendar/EventCard.tsx       # React.memo 包裹 + 传递吸附状态
│   ├── WeekView/DayColumn.tsx       # 传递吸附状态 + 双击创建
│   ├── WeekView/WeekView.tsx        # 集成吸附状态传递
│   ├── WeekView/TimeGridLines.tsx   # 网格线高亮
│   └── WeekView/WeekHeader.tsx      # 搜索框（远期）
├── stores/
│   └── useCalendarStore.ts          # 可能需要新增吸附相关状态
├── App.css                          # 吸附高亮样式
└── src-tauri/src/
    └── services/                    # rrule 展开（远期）
```

### 需要新增的文件

```
src/
├── hooks/
│   ├── useEventDrag/                # 拆分目录
│   │   ├── snapUtils.ts
│   │   ├── timeCalculations.ts
│   │   └── dragState.ts
│   ├── useKeyboardShortcuts.ts      # 键盘快捷键
│   └── useEventFilter.ts            # 事件搜索/筛选
├── hooks/useEventDrag.test.ts       # 拖拽逻辑测试
└── components/Common/SearchBar.tsx   # 搜索框组件
```

---

## 📌 附录：关键常量一览

| 常量 | 当前值 | 说明 |
|------|--------|------|
| `HOUR_HEIGHT_PX` | 50px | 每小时像素高度 |
| `DAY_START_HOUR` | 8 | 可视起始小时 |
| `DAY_END_HOUR` | 21 | 可视结束小时 |
| `SNAP_THRESHOLD_MINUTES` | 2 | 松手吸附阈值 |
| `DRAG_THRESHOLD_PX` | 4px | 拖拽/点击判定阈值 |
| `MIN_DURATION_MINUTES` | 15 | 事件最小持续时长 |
| `SOFT_SNAP_THRESHOLD_MINUTES` | 3 | **新增**：拖拽中软吸附阈值 |
