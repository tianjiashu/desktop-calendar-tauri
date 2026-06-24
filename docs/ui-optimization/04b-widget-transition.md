# 04b - Widget ↔ 周视图过渡动画

> 模块编号: 04b | 依赖: [04 - 动效与交互](./04-motion-and-interaction.md) | 对应 Phase: E
> MOTION_INTENSITY: 4

## 一、约束分析

| 约束 | 影响 |
|------|------|
| Tauri 窗口物理变化:100×100 ↔ 860×780 | 无法 CSS transition 窗口尺寸,需协调 React 动画与 Tauri resize 时序 |
| 两种不同视觉形态:蓝色渐变圆形 vs 白色圆角卡片 | 不能纯 crossfade,需要"形态连接"让大脑感知连续性 |
| MOTION_INTENSITY: 4 | 流畅但克制,总时长控制在 400-450ms |
| useWindowManager 现有时序:先 setState → 再 resize | AnimatePresence mode="wait" 恰好插入在这之间 |
| `#root.widget-mode { border-radius: 50% }` 裁剪圆形 | 这是 CSS morph 的关键锚点 |

## 二、核心思路:利用 #root border-radius 做形态桥接

当前 CSS:

```css
#root.widget-mode {
  border-radius: 50%;
  overflow: hidden;
}
```

**给 `#root` 加 `transition: border-radius 0.28s`,切换 class 时 border-radius 从 50% 平滑过渡到 0(或 week-view-container 自身 16px)。**

效果:方形窗口的四个角从圆逐渐张开,而 WeekView 内部 `border-radius: 16px` 让最终形态自然接住这些角——形成 "圆形绽放为卡片 / 卡片收拢为圆" 的视觉连续性。

## 三、动画时序

### 3.1 展开:Widget → 周视图 (≈400ms)

```
0ms             120ms          200ms             350ms      400ms
├───────────────┼──────────────┼─────────────────┼──────────┤
Widget 退出      ██████████████
scale 1→1.06
opacity 1→0
blur 0→3px
├───────────────┼──────────────┼─────────────────┼──────────┤
#root morph      │██████████████████████████████████        │
border-radius    │50% ──────────────────────────→ 16px     │
(280ms)          │                                         │
├───────────────┼──────────────┼─────────────────┼──────────┤
Tauri resize     │█████████████████████████                 │
窗口 100→860px   │(≈200ms,异步)                              │
├───────────────┼──────────────┼─────────────────┼──────────┤
周视图 进入      │              ████████████████████████████
                              scale 0.97→1
                              opacity 0→1
                              blur 2px→0
```

| 阶段 | 时长 | 做什么 | 视觉意图 |
|------|------|--------|----------|
| Widget 退出 | 120ms | scale 1→1.06 + blur 3px + opacity→0 | "炸开"消散,比纯淡出有方向感 |
| #root morph | 280ms | border-radius 50%→16px | 圆角平滑展开,视觉桥接两个形态 |
| Tauri resize | ~200ms | 窗口物理扩至 860×780 | 异步/用户不可见,在退出期间并行 |
| 周视图进入 | 200ms(150ms 起) | scale 0.97→1 + blur 消退 | 卡片从中心微微放大显现 |

### 3.2 收缩:周视图 → Widget (≈420ms)

```
0ms             120ms          200ms             350ms      420ms
├───────────────┼──────────────┼─────────────────┼──────────┤
周视图 退出      ██████████████
scale 1→0.97
opacity 1→0
├───────────────┼──────────────┼─────────────────┼──────────┤
#root morph      │██████████████████████████████████        │
border-radius    │16px ──────────────────────────→ 50%     │
├───────────────┼──────────────┼─────────────────┼──────────┤
Tauri resize     │█████████████████████████                 │
窗口 860→100px   │                                         │
├───────────────┼──────────────┼─────────────────┼──────────┤
浮球 进入        │              ████████████████████████████
                              scale 0.8→1
                              opacity 0→1
                              spring 弹入
```

与展开的区别:
- 浮球进入用 **spring** 而非 cubic-bezier,因为 100px 小球需要更明显的弹跳("弹入感")
- 起始 scale 更小(0.8 vs 0.97),小球体量小,需要更大变化才可感知

### 3.3 关于 `AnimatePresence mode="wait"`

`mode="wait"` 确保退出动画**完全播完**后,新组件才 mount 并播放入场动画。此时 Tauri resize 已在退出阶段并行完成,所以:
- 展开时:周视图 mount 时,窗口已经是 860×780
- 收缩时:浮球 mount 时,窗口已经是 100×100

这与 `useWindowManager` 的现有时序(先 setState 触发 React 重渲染,再 doSetSize)无缝衔接。

## 四、缓动函数

| 阶段 | 类型 | 值 | 理由 |
|------|------|-----|------|
| 退出(双向) | cubic-bezier | `[0.16, 1, 0.3, 1]` | Material Emphasized Decelerate,全局统一 |
| #root border-radius | cubic-bezier | `[0.16, 1, 0.3, 1]` | 与退出同步,视觉一体 |
| 周视图进入 | cubic-bezier | `[0.16, 1, 0.3, 1]` | 平稳展开,不抢眼 |
| 浮球弹入 | spring | `stiffness: 350, damping: 28` | 轻微回弹,"圆球弹出来" |

## 五、实现

### 5.1 CSS 改动(index.css)

```css
/* 关键:给 #root 加 border-radius 过渡 */
#root {
  transition: border-radius 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden; /* 两种模式下都保持,防止过渡时边角闪出 */
}

/* 移除原有的条件 overflow */
#root.widget-mode {
  border-radius: 50%;
  /* overflow: hidden 已提到 #root 全局 */
}
```

### 5.2 React 改动(App.tsx)

```tsx
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const App: React.FC = () => {
  const shouldReduce = useReducedMotion();
  // ... 现有 hooks 不变 ...

  // 将现有的三元表达式内容替换为 AnimatePresence
  const content = (
    <AnimatePresence mode="wait">
      {isWidgetMode ? (
        <motion.div
          key="widget"
          className="app-container"
          exit={shouldReduce
            ? { opacity: 0 }
            : { scale: 1.06, opacity: 0, filter: 'blur(3px)' }
          }
          transition={{
            exit: shouldReduce ? { duration: 0 } : { duration: 0.12, ease: [0.16, 1, 0.3, 1] }
          }}
        >
          <BallWidget onDoubleClick={toggleExpand} events={events} />
        </motion.div>
      ) : (
        <motion.div
          key="week"
          className="app-container"
          initial={shouldReduce
            ? { opacity: 0 }
            : { scale: 0.97, opacity: 0, filter: 'blur(2px)' }
          }
          animate={
            shouldReduce
              ? { opacity: 1 }
              : { scale: 1, opacity: 1, filter: 'blur(0px)' }
          }
          transition={
            shouldReduce
              ? { duration: 0 }
              : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
          }
        >
          <WeekView ... />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

### 5.3 浮球收缩进入的特殊逻辑

收缩场景复用上面的 `key="widget"` motion.div,但进入动画参数不同:需要 spring 而非 cubic-bezier。

```tsx
// 浮球的进入(收缩方向)
initial={shouldReduce
  ? { opacity: 0 }
  : { scale: 0.8, opacity: 0, filter: 'blur(3px)' }
}
animate={
  shouldReduce
    ? { opacity: 1 }
    : { scale: 1, opacity: 1, filter: 'blur(0px)' }
}
transition={
  shouldReduce
    ? { duration: 0 }
    : { type: 'spring', stiffness: 350, damping: 28 }
}
```

完整示例见下方"完整代码"节。

## 六、完整代码

```tsx
// ========== App.tsx 改造后 ==========

import React, { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import BallWidget from './components/Widget/BallWidget';
import WeekView from './components/WeekView/WeekView';
import DiagnosticPanel from './components/Common/DiagnosticPanel';
import ToastContainer from './components/Common/Toast';
import { useWindowManager } from './hooks/useWindowManager';
import { useWeekNavigation } from './hooks/useWeekNavigation';
import { useCalendarStore } from './stores/useCalendarStore';
import { useDiagnostics } from './hooks/useDiagnostics';
import { useSync } from './hooks/useSync';
import { useEventDialog } from './hooks/useEventDialog';
import { useTheme } from './hooks/useTheme';
import { closeToTray } from './utils/windowUtils';
import './App.css';

const TRANSITION_EXIT = { duration: 0.12, ease: [0.16, 1, 0.3, 1] };
const TRANSITION_ENTER_WEEK = { duration: 0.2, ease: [0.16, 1, 0.3, 1] };
const TRANSITION_ENTER_WIDGET = { type: 'spring' as const, stiffness: 350, damping: 28 };

const App: React.FC = () => {
  const shouldReduce = useReducedMotion();
  const { isWidgetMode, toggleExpand, shrinkToWidget } = useWindowManager();
  const navigation = useWeekNavigation();
  const { events, isLoading, error } = useCalendarStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const eventDialog = useEventDialog();

  useTheme();
  const diag = useDiagnostics();

  useEffect(() => {
    const { initListener } = useCalendarStore.getState();
    initListener();
  }, []);

  useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      root.classList.toggle('widget-mode', isWidgetMode);
    }
  }, [isWidgetMode]);

  useSync();

  useEffect(() => {
    const fetchForWeek = async () => {
      const { fetchEvents } = useCalendarStore.getState();
      await fetchEvents(navigation.monday.getTime(), navigation.sunday.getTime());
    };
    fetchForWeek();
  }, [navigation.monday.getTime(), navigation.sunday.getTime()]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { fetchEvents } = useCalendarStore.getState();
      await fetchEvents(navigation.monday.getTime(), navigation.sunday.getTime());
    } finally {
      setIsRefreshing(false);
    }
  }, [navigation.monday, navigation.sunday]);

  const handleClose = useCallback(() => {
    closeToTray();
  }, []);

  return (
    <ErrorBoundary>
      <AnimatePresence mode="wait">
        {isWidgetMode ? (
          <motion.div
            key="widget"
            className="app-container"
            initial={shouldReduce
              ? { opacity: 0 }
              : { scale: 0.8, opacity: 0, filter: 'blur(3px)' }
            }
            animate={
              shouldReduce
                ? { opacity: 1 }
                : { scale: 1, opacity: 1, filter: 'blur(0px)' }
            }
            exit={shouldReduce
              ? { opacity: 0 }
              : { scale: 1.06, opacity: 0, filter: 'blur(3px)' }
            }
            transition={
              shouldReduce
                ? { duration: 0 }
                : (
                  isWidgetMode
                    ? { ...TRANSITION_ENTER_WIDGET }
                    : { exit: TRANSITION_EXIT }
                )
            }
          >
            <BallWidget onDoubleClick={toggleExpand} events={events} />
          </motion.div>
        ) : (
          <motion.div
            key="week"
            className="app-container"
            initial={shouldReduce
              ? { opacity: 0 }
              : { scale: 0.97, opacity: 0, filter: 'blur(2px)' }
            }
            animate={
              shouldReduce
                ? { opacity: 1 }
                : { scale: 1, opacity: 1, filter: 'blur(0px)' }
            }
            exit={shouldReduce
              ? { opacity: 0 }
              : { scale: 0.97, opacity: 0, filter: 'blur(2px)' }
            }
            transition={
              shouldReduce
                ? { duration: 0 }
                : { ...TRANSITION_ENTER_WEEK }
            }
          >
            <WeekView
              currentDate={navigation.currentDate}
              weekTitle={navigation.weekTitle}
              isCurrentWeek={navigation.isCurrentWeek}
              events={events}
              isLoading={isLoading}
              error={error}
              isRefreshing={isRefreshing}
              onPrevWeek={navigation.goToPrevWeek}
              onNextWeek={navigation.goToNextWeek}
              onToday={navigation.goToToday}
              onRefresh={handleRefresh}
              onShrink={shrinkToWidget}
              onClose={handleClose}
              onShowDiagnostics={diag.toggle}
              eventDialog={eventDialog}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <ToastContainer />
      {diag.isVisible && (
        <DiagnosticPanel
          diagnostic={diag.diagnostic}
          isLoading={diag.isLoading}
          onRefresh={diag.fetchDiagnostics}
          onClose={diag.toggle}
        />
      )}
    </ErrorBoundary>
  );
};

export default App;
```

#### 过渡参数速查

| 方向 | 方向常量 | 退出 | 进入 |
|------|----------|------|------|
| expand | widget→week | `scale: 1.06, blur: 3px, 120ms cubic-bezier` | `scale: 0.97→1, blur: 2px→0, 200ms cubic-bezier` |
| shrink | week→widget | `scale: 0.97, blur: 2px, 120ms cubic-bezier` | `scale: 0.8→1, blur: 3px→0, spring(350, 28)` |

#### CSS bridge

| 文件 | 改动 | 说明 |
|------|------|------|
| `index.css:#root` | 加 `transition: border-radius 0.28s` + 全局 `overflow: hidden` | 圆→方 morph 桥梁 |
| `index.css:#root.widget-mode` | 移除 `overflow: hidden`(已提至全局) | 避免重复声明 |

## 七、边界情况

### 7.1 快速双击

`useWindowManager` 已有 `isTransitioning` ref lock(350ms),总动画时长 ≈400ms,锁定时长略短于动画。若连续双击:第二下被 lock 拦截,不会触发动画中断或双动画叠加。

### 7.2 动画中途再次切换

`AnimatePresence mode="wait"` 确保始终只有一个组件在 render tree 中。如果用户在动画期间再次触发切换,上一个动画会被 cancel,新动画从头开始。

### 7.3 Tauri resize 失败

即使 resize 失败(窗口未变),动画本身不受影响:border-radius morph 和组件 fade 纯前端,无需等待 resize 完成。

### 7.4 暗色模式

动画参数(scale/blur/opacity)与颜色无关,暗色模式无需额外处理。`#root` border-radius transition 同样颜色无关。

### 7.5 低端机/blur 性能

`filter: blur()` 在 Tauri WebView2/WKWebView 中性能良好(基于系统 GPU 加速)。若出现掉帧,可降级为仅 `opacity`(移除 blur,通过注释标注即可):

```tsx
// 低端机降级:去掉 filter 参数
exit: { scale: 1.06, opacity: 0 }
```

## 八、验收 Checklist

- [ ] Widget 展开时 border-radius 平滑从圆变方(280ms)
- [ ] Widget 展开时浮球轻微膨胀后淡出(120ms),无卡顿
- [ ] 周视图以 scale(0.97→1) + blur(2→0) 平滑出现(200ms)
- [ ] 收缩时反向动画同样流畅
- [ ] 收缩时浮球 spring 弹入,轻微回弹不夸张
- [ ] 快速双击不触发两次切换(transition lock 有效)
- [ ] `prefers-reduced-motion: reduce` 下降级为瞬时 opacity 切换
- [ ] 暗色模式下动画效果无变化
- [ ] Tauri 窗口 resize 在动画期间完成,无 visual flash
- [ ] 帧率稳定 ≥ 55fps

## 九、关联模块

- 依赖:[04 - 动效与交互](./04-motion-and-interaction.md) - Motion 库、缓动函数、Reduced Motion 降级
- 依赖:[02 - 设计基础](./02-design-foundations.md) - 圆角系统、阴影 token
- 被依赖:[10 - 浮球组件](./10-components-widget.md)
- 被依赖:[11 - 周视图组件](./11-components-week-view.md)
- 实施入口:`App.tsx` + `src/index.css`
