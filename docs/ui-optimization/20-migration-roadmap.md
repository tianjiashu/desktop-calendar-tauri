# 20 - 迁移路线图

> 模块编号: 20 | 依赖: 全部设计文档 | 全局改造阶段划分

## 一、阶段总览

| Phase | 主题 | 时长 | 涉及文档 | 视觉变化 |
|-------|------|------|----------|----------|
| A | 基础设施 | 1-2 天 | [02](./02-design-foundations.md) | 无 |
| B | 图标与字体替换 | 0.5 天 | [03](./03-icon-system.md) | 中等 |
| C | 色板与暗色模式 | 1 天 | [02](./02-design-foundations.md) | 大 |
| D | 核心组件重做 | 2-3 天 | [10](./10-components-widget.md) · [11](./11-components-week-view.md) · [12](./12-components-chrome.md) | 大 |
| E | 交互与动效 | 1 天 | [04](./04-motion-and-interaction.md) | 中等 |
| F | 周边组件与打磨 | 1-2 天 | [12](./12-components-chrome.md) · [05](./05-accessibility.md) | 中等 |

**总工期**:7-10 个工作日

## 二、Phase A - 基础设施（1-2 天,无视觉变化）

### 2.1 目标

搭好底子,不改外观

### 2.2 任务清单

- [ ] 引入 shadcn/ui init（New York style）
- [ ] 引入 Phosphor Icons、Geist 字体
- [ ] 在 `tailwind.config.js` 配置 CSS 变量映射（见 [02](./02-design-foundations.md) §3.2）
- [ ] 在 `index.css` 写入 `:root` + `.dark` token
- [ ] 引入 `motion`（`npm i motion`）
- [ ] 配置 `next-themes` 或自写 `useTheme`（默认跟随系统）
- [ ] 在 `<html>` 加 `class="dark"` 切换逻辑

### 2.3 验收

- [ ] 浏览器开发者工具切换 `.dark` class,背景色变化
- [ ] 无视觉破坏
- [ ] Geist 字体加载成功（Network 面板可见 woff2）
- [ ] Phosphor 图标可渲染（写一个测试 `<CaretLeft />`）

## 三、Phase B - 图标与字体替换（0.5 天）

### 3.1 目标

消除所有 emoji/ASCII 图标,统一字体

### 3.2 任务清单

- [ ] WeekHeader 7 个按钮图标换 Phosphor（见 [03](./03-icon-system.md) §2.1）
- [ ] StatusBar 的 `⚠️ 🔍` 换 Phosphor
- [ ] DiagnosticPanel 全部 emoji 换 Phosphor
- [ ] EventTooltip 的 `🔗` 换 Phosphor
- [ ] 全局 `font-family` 改为 Geist Sans + Mono

### 3.3 验收

- [ ] 截图对比,无任何 emoji/ASCII 图标残留
- [ ] 字体在 DevTools Computed 面板显示 Geist Sans
- [ ] 时间标签、事件时间用 Geist Mono

## 四、Phase C - 色板与暗色模式（1 天）

### 4.1 目标

token 化所有颜色,暗色模式可用

### 4.2 任务清单

- [ ] `App.css` 中所有硬编码颜色替换为 CSS 变量
- [ ] `EventDialog.css` 同上
- [ ] 验证 light / dark 两种模式所有界面
- [ ] StatusBar 加暗色切换按钮（见 [12](./12-components-chrome.md) §2.3）

### 4.3 验收

- [ ] 暗色模式下所有文字对比度 ≥ 4.5:1
- [ ] 无"刺眼白块"
- [ ] 暗色切换按钮工作（Light → Dark → System）
- [ ] `prefers-color-scheme` 跟随系统

## 五、Phase D - 核心组件重做（2-3 天）

### 5.1 目标

EventCard / EventDialog / BallWidget 视觉升级

### 5.2 任务清单

- [ ] EventCard 改为浅底 + 左色条 + 类型图标（见 [11](./11-components-week-view.md) §4）
- [ ] EventDialog 加快捷时长 pill、合并类型+颜色、textarea 加高（见 [11](./11-components-week-view.md) §5）
- [ ] BallWidget 改径向渐变 + 3 点事件指示（见 [10](./10-components-widget.md)）
- [ ] WeekHeader 分组 + 分隔线（见 [11](./11-components-week-view.md) §2）
- [ ] DayHeader 周末区分 + 事件数提示（见 [11](./11-components-week-view.md) §3）

### 5.3 验收

- [ ] 截图对比 Phase C,视觉精致度明显提升
- [ ] EventCard 浅色事件文字对比度达标
- [ ] EventDialog 类型+颜色联动
- [ ] BallWidget 3 点指示正确

## 六、Phase E - 交互与动效（1 天）

### 6.1 目标

Motion 接入,微交互落地

### 6.2 任务清单

- [ ] 浮球 ↔ 周视图切换动画（见 [04](./04-motion-and-interaction.md) §2.1）
- [ ] EventCard hover/拖拽动效（见 [04](./04-motion-and-interaction.md) §3）
- [ ] Toast 用 shadcn toast 重做（见 [12](./12-components-chrome.md) §3）
- [ ] Reduced motion 测试

### 6.3 验收

- [ ] 动效流畅,无卡顿
- [ ] `prefers-reduced-motion: reduce` 下正确降级
- [ ] FPS ≥ 55（拖拽时）

## 七、Phase F - 周边组件与打磨（1-2 天）

### 7.1 目标

DiagnosticPanel、Tooltip、空状态、骨架屏

### 7.2 任务清单

- [ ] DiagnosticPanel 用 shadcn Dialog + ScrollArea 重做（见 [12](./12-components-chrome.md) §4）
- [ ] EventTooltip 视觉升级（见 [11](./11-components-week-view.md) §6）
- [ ] 空状态:无事件日的 day-column 显示居中灰字 `"双击新建"` + Plus 图标
- [ ] 骨架屏:loading 时 day-column 显示 3-5 个灰色 pill skeleton
- [ ] 全局 a11y 审计（见 [05](./05-accessibility.md)）

### 7.3 验收

- [ ] 所有状态（empty / loading / error / success）都有视觉表达
- [ ] axe DevTools 扫描无 error 级问题
- [ ] 键盘导航完整（Tab / Shift+Tab / 快捷键）

## 八、阶段依赖关系

```
Phase A（基础设施）
    ↓
Phase B（图标字体） ────┐
    ↓                   │
Phase C（色板暗色）     │
    ↓                   ↓
Phase D（核心组件） ← ──┘
    ↓
Phase E（动效）
    ↓
Phase F（打磨）
```

**关键约束**:

- Phase A 必须先完成,是所有后续阶段的基础
- Phase B 和 C 可以部分并行（不同人负责不同文件）
- Phase D 依赖 B 和 C 完成
- Phase E 依赖 D 完成（动效作用于新组件）
- Phase F 依赖 E 完成

## 九、回滚策略

每个 Phase 完成后打 git tag（如 `phase-a-done`）,若下一 Phase 出现严重问题,可回滚到上一个 tag。

**严重问题定义**:

- 核心功能（创建/编辑/拖拽事件）不可用
- 暗色模式大面积视觉破坏
- 性能严重退化（FPS < 30）

## 十、关联模块

- 依赖: [01 - 概述](./01-overview.md)
- 依赖: [02 - 设计基础](./02-design-foundations.md)
- 依赖: [03 - 图标系统](./03-icon-system.md)
- 依赖: [04 - 动效](./04-motion-and-interaction.md)
- 依赖: [05 - 可访问性](./05-accessibility.md)
- 依赖: [10 - 浮球组件](./10-components-widget.md)
- 依赖: [11 - 周视图组件](./11-components-week-view.md)
- 依赖: [12 - 应用外壳](./12-components-chrome.md)
- 依赖: [30 - 风险与决策](./30-risks-and-decisions.md)
