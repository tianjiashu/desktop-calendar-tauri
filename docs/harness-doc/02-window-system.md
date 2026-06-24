# 02 - 窗口系统设计

> 所属阶段：Phase 1（MVP）
> 依赖模块：01-data-model
> 状态：已实现 ✅

---

## 1. 功能概述

本模块负责**窗口系统**的实现，包括：
- 悬浮球 Widget（120×120px，常驻桌面）
- 周视图窗口（860×780px，完整日历视图）
- 双形态切换（带动画过渡）
- 窗口拖拽（悬浮球自由拖拽 + 周视图 Header 拖拽）
- 关闭到托盘（三级兜底策略）
- 过渡锁（防止快速点击导致状态冲突）

**功能覆盖**：F1（悬浮球常驻）、F2（双击展开）、F3（收缩回悬浮球）、F4（关闭到托盘）、F5（悬浮球拖拽）、F6（周视图拖拽）、F7（过渡锁）。

**不负责**：周视图内部渲染（交给 03-week-view）、事件 CRUD（交给 01-data-model）。

---

## 2. 详细设计

### 2.1 窗口属性配置

**悬浮球模式**（F1, F5）：

| 属性 | Tauri 配置值 | 说明 |
|------|-------------|------|
| `width` | 120 | 窗口宽度 |
| `height` | 120 | 窗口高度 |
| `transparent` | true | 透明背景 |
| `decorations` | false | 无标题栏 |
| `always_on_top` | true | 置顶 |
| `skip_taskbar` | true | 不在任务栏显示 |
| `visible` | true | 启动时显示 |
| `resizable` | false | 不可拉伸 |

**周视图模式**（F2, F3, F6）：

| 属性 | Tauri 配置值 | 说明 |
|------|-------------|------|
| `width` | 860 | 窗口宽度 |
| `height` | 780 | 窗口高度 |
| `transparent` | true | 透明背景（毛玻璃效果） |
| `decorations` | false | 自定义 Header |
| `always_on_top` | false（可选） | 默认不置顶，可在设置中开启 |
| `resizable` | false | 固定尺寸 |
| `visible` | false | 启动时隐藏（先显示悬浮球） |

### 2.2 悬浮球 UI 设计（F1）

```
┌──────────────┐
│      22       │  ← 日期数字（48px，粗体）
│   周一        │  ← 星期简称（14px，灰色）
│              │
│   ● ● ●     │  ← 日程指示点（红色，pulse 动画，今日有日程时显示）
└──────────────┘
```

**样式要点**：
- 背景：半透明圆形（`border-radius: 50%`，`backdrop-filter: blur(24px)`）
- 日期数字：白色，48px，`font-weight: 800`
- 星期简称：灰色 `#9CA3AF`，14px
- 日程指示点：红色 `#EF4444`，8px 圆点，`animation: pulse 2s infinite`

### 2.3 双击展开逻辑（F2）

```
用户双击悬浮球
    │
    ▼
onDoubleClick 事件
    │
    ▼
isTransitioning 检查 → 如果为 true，直接 return
    │
    ▼
isTransitioning = true
    │
    ▼
动画： Tauri window.setSize(860, 780)
    + window.setDecorations(false)  ← 保持无边框
    + window.center()              ← 居中显示（可选）
    │
    ▼
React 状态切换：isWidgetMode → false
    │
    ▼
await new Promise(resolve => setTimeout(resolve, 300))  ← 等待动画完成
    │
    ▼
isTransitioning = false
```

**关键代码**（TypeScript）：

```typescript
// hooks/useWindowManager.ts

export function useWindowManager() {
  const [isWidgetMode, setIsWidgetMode] = useState(true);
  const isTransitioning = useRef(false);

  const handleDoubleClick = useCallback(async () => {
    if (isTransitioning.current) return;
    isTransitioning.current = true;

    try {
      const win = getCurrentWindow();
      if (isWidgetMode) {
        // 悬浮球 → 周视图
        await win.setSize(new LogicalSize(860, 780));
        setIsWidgetMode(false);
      } else {
        // 周视图 → 悬浮球
        await win.setSize(new LogicalSize(120, 120));
        setIsWidgetMode(true);
      }
    } finally {
      setTimeout(() => { isTransitioning.current = false; }, 300);
    }
  }, [isWidgetMode]);

  return { isWidgetMode, handleDoubleClick, isTransitioning };
}
```

### 2.4 周视图 Header 设计（F3, F4, F6）

```
┌──────────────────────────────────────────────────────────┐
│  ◀  2026年6月22日 - 6月28日 (2026年)  ●  ↻  │  ← F6：Header 可拖拽
│                                                －  ✕ │
│                                                ↑       │
│                                             F3  F4   │
├──────────────────────────────────────────────────────────┤
│  周一  │ ...                                       │
```

**Header 交互**：
- `onMouseDown` → `getCurrentWindow().startDragging()`（F6）
- 「－」按钮 → `handleShrink()`（F3）
- 「✕」按钮 → `handleClose()`（F4）

### 2.5 收缩回悬浮球逻辑（F3）

```typescript
const handleShrink = useCallback(async () => {
  if (isTransitioning.current) return;
  isTransitioning.current = true;

  try {
    const win = getCurrentWindow();
    await win.setSize(new LogicalSize(120, 120));
    setIsWidgetMode(true);
  } finally {
    setTimeout(() => { isTransitioning.current = false; }, 300);
  }
}, []);
```

### 2.6 关闭到托盘三级兜底策略（F4）

```typescript
// utils/windowUtils.ts

export async function closeToTray(): Promise<void> {
  const win = getCurrentWindow();
  const tray = Tray.getInstance();  // 假设有 Tray 单例

  try {
    // 第一级：正常关闭（隐藏到托盘）
    await win.hide();
    tray?.setVisible(true);  // 确保托盘图标显示
  } catch (e) {
    try {
      // 第二级：销毁窗口但保留进程
      await win.destroy();
      // 标记：下次从托盘恢复时重建窗口
      localStorage.setItem('window_destroyed', 'true');
    } catch (e2) {
      // 第三级：强制最小化（最兜底）
      await win.minimize();
    }
  }
}
```

**托盘图标恢复窗口**：

```typescript
// Tray 点击事件
tray.onClick(async () => {
  const win = getCurrentWindow();
  const wasDestroyed = localStorage.getItem('window_destroyed') === 'true';

  if (wasDestroyed) {
    // 重建窗口（需要重新调用 createWindow）
    localStorage.removeItem('window_destroyed');
    // 这里需要通知 Rust 侧重建窗口
  } else {
    await win.show();
    await win.setFocus();
  }
});
```

### 2.7 悬浮球自由拖拽（F5）

**问题**：直接用 `onMouseDown` + `startDragging()` 在多显示器下会有位置偏移。

**解决方案**：使用 **screen 坐标** 计算 delta，手动设置窗口位置。

```typescript
// components/Widget/BallWidget.tsx

const BallWidget: React.FC = () => {
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, winX: 0, winY: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStart.current = {
      x: e.screenX,
      y: e.screenY,
    };
    // 获取当前窗口位置（screen 坐标）
    getCurrentWindow().outerPosition.then(pos => {
      dragStart.current.winX = pos.x;
      dragStart.current.winY = pos.y;
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.screenX - dragStart.current.x;
    const deltaY = e.screenY - dragStart.current.y;
    getCurrentWindow().setPosition(
      dragStart.current.winX + deltaX,
      dragStart.current.winY + deltaY
    );
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      className="ball-widget"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      {/* 悬浮球内容 */}
    </div>
  );
};
```

### 2.8 周视图 Header 拖拽（F6）

```typescript
// components/WeekView/WeekHeader.tsx

const WeekHeader: React.FC = () => {
  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    // 只响应 Header 区域（排除按钮）
    if ((e.target as HTMLElement).closest('button')) return;
    getCurrentWindow().startDragging();
  }, []);

  return (
    <div className="week-header" onMouseDown={handleHeaderMouseDown}>
      {/* 导航按钮 + 标题 */}
    </div>
  );
};
```

### 2.9 过渡锁（F7）

**问题**：用户快速双击悬浮球，会触发多次 `setSize`，导致窗口尺寸异常。

**解决方案**：`isTransitioning` ref + `finally` 块中 300ms 后释放。

（已在 2.3 节展示代码）

---

## 3. 接口定义

### 3.1 Tauri IPC 命令

```rust
// commands/window_cmd.rs

#[tauri::command]
pub async fn get_window_mode() -> Result<String, AppError> {
    // 返回 "widget" | "window"
}

#[tauri::command]
pub async fn set_window_mode(mode: String) -> Result<(), AppError> {
    // 切换窗口模式（"widget" | "window"）
}
```

### 3.2 TypeScript 侧

```typescript
// hooks/useWindowManager.ts

export interface WindowManager {
  isWidgetMode: boolean;
  isTransitioning: boolean;
  handleDoubleClick: () => Promise<void>;
  handleShrink: () => Promise<void>;
  handleClose: () => Promise<void>;
  handleHeaderMouseDown: (e: React.MouseEvent) => void;
}
```

---

## 4. 实施步骤

### 步骤 1：配置 Tauri 窗口属性

- 文件：`src-tauri/tauri.conf.json`
- 配置 `tauri.windows[]` 数组，定义两个窗口（或动态切换）
- 验证：启动后显示 120×120 圆形悬浮球

### 步骤 2：实现悬浮球组件

- 文件：`src/components/Widget/BallWidget.tsx`
- 实现日期显示 + 星期显示 + 日程指示点
- 实现双击展开（调用 `useWindowManager`）
- 验证：双击后窗口展开为 860×780px。

### 步骤 3：实现周视图 Header

- 文件：`src/components/WeekView/WeekHeader.tsx`
- 实现导航按钮（◀ / ● / ▶ / ↻）
- 实现 Header 拖拽（`startDragging()`）
- 实现「－」「✕」按钮
- 验证：拖拽 Header 可移动窗口，点击按钮正确响应。

### 步骤 4：实现窗口模式切换

- 文件：`src/hooks/useWindowManager.ts`
- 实现 `handleDoubleClick`、`handleShrink`
- 实现过渡锁（`isTransitioning`）
- 验证：双击展开、点击「－」收缩，动画流畅无冲突。

### 步骤 5：实现关闭到托盘

- 文件：`src/utils/windowUtils.ts`
- 实现 `closeToTray()` 三级兜底
- 配置 Tauri Tray（系统托盘图标）
- 验证：点击「✕」后窗口隐藏，托盘图标可见，点击托盘恢复窗口。

### 步骤 6：实现悬浮球拖拽

- 文件：`src/components/Widget/BallWidget.tsx`
- 实现 `handleMouseDown` / `handleMouseMove` / `handleMouseUp`
- 使用 screen 坐标计算 delta
- 验证：悬浮球可自由拖拽，多显示器下位置不偏移。

---

## 5. 验收标准

### 窗口系统

- [ ] 启动后显示 120×120px 圆形悬浮球
- [ ] 悬浮球背景半透明 + 毛玻璃效果
- [ ] 悬浮球显示日期数字 + 星期简称
- [ ] 今日有日程时，悬浮球底部显示红色 pulse 圆点
- [ ] 双击悬浮球 → 展开为 860×780px 周视图（带动画）
- [ ] 点击周视图「－」按钮 → 收缩回悬浮球（带动画）
- [ ] 点击周视图「✕」按钮 → 最小化到系统托盘
- [ ] 点击托盘图标 → 恢复窗口（如果之前销毁了，重建窗口）
- [ ] 悬浮球可自由拖拽，多显示器下位置不偏移
- [ ] 周视图 Header 区域可拖拽移动窗口
- [ ] 快速双击不会触发并发状态冲突（过渡锁生效）

### 性能

- [ ] 窗口切换动画流畅（60fps）
- [ ] 悬浮球拖拽无卡顿
- [ ] 关闭到托盘后，进程仍在运行（可在任务管理器中确认）

---

## 6. 未决策事项

- [ ] **动画实现方式**：使用 CSS transition 还是 Tauri 原生动画 API？
- [ ] **悬浮球初始位置**：第一次启动时，放在屏幕什么位置？（居中？右下角？用户上次拖拽的位置？）
- [ ] **多显示器支持**：用户移动窗口到副屏后，下次启动应该在哪个屏幕？
- [ ] **托盘图标设计**：使用什么图标？（日历图标？数字日期图标？）

---

> 🕊️ 本文档由咕咕起草，老板确认后作为窗口系统开发基准。
> 变更需更新版本号并注明原因。
