# 01 - 概述与现状盘点

> 模块编号: 01 | 依赖: 无 | 对应 Phase: 全局背景

## 一、设计读（Design Read）

本项目是一个 Tauri 桌面端紧凑型生产力日历工具,包含 100×100 浮球 Widget 与 860×780 周视图两种窗口形态。对标 Cron / Things 3 / Linear Calendar 的"精致小工具"美学,**不是** Landing Page,也**不是** Dashboard。

**三档参数（Dials）**:

| 参数 | 值 | 含义 |
|------|----|------|
| `DESIGN_VARIANCE` | 4 | 功能性网格优先,可预测、克制,禁止花哨 |
| `MOTION_INTENSITY` | 4 | 轻量流畅过渡（150-300ms cubic-bezier）,无电影级动画 |
| `VISUAL_DENSITY` | 6 | 紧凑桌面工具,信息密度高,但留白要够呼吸 |

## 二、技术栈快照

| 维度 | 现状 |
|------|------|
| 框架 | React 18 + TypeScript + Vite 6 |
| 样式 | Tailwind CSS 3.4（仅引入,未配置主题） + 大量手写 CSS（`App.css` 511 行、`EventDialog.css` 313 行） |
| 状态管理 | Zustand 4.5 |
| 桌面壳 | Tauri 2.x（Rust） |
| 图标 | **无图标库**,全部用 emoji（🔗 ⚠️ 🔍 🔄 ✕）和 ASCII 字符（◀ ▶ ● ↻ ＋ －） |
| 字体 | 系统字体栈: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei'` |
| 暗色模式 | **无** |
| 动效 | 仅 CSS hover/transition（150ms）,无入场动画、无骨架屏 |

## 三、痛点清单（按严重度排序）

### P0 - 设计系统层缺失

1. **没有设计 Token**:颜色硬编码散落在 CSS（`#3B82F6` `#EF4444` `#F9FAFB` `#E5E7EB` 各出现 10+ 次）,改一处要全局搜索替换。
2. **没有组件库**:Button、Input、Dialog、Tooltip、Toast 全是手写 div + className,状态机不全（loading/empty/error 缺失或用 emoji 顶替）。
3. **图标系统混乱**:`◀▶●↻＋－✕` 是 ASCII 字符,`🔗⚠️🔍🔄` 是 emoji,跨平台渲染不一致（Windows 和 macOS 上 emoji 风格差异巨大）,且无统一 strokeWidth。

### P1 - 视觉层问题

4. **AI 通用蓝**:主色 `#3B82F6` 是 Tailwind 默认 blue-500,也是所有 LLM 生成 UI 的默认色,**缺乏品牌识别度**。
5. **无暗色模式**:纯白背景 + 灰边框,桌面常驻场景下夜间刺眼,也不符合现代桌面应用标配。
6. **字体未加载品牌字**:系统字体栈在不同 OS 上呈现差异大,且无 Display 字体强化标题层级。
7. **圆角不统一**:`border-radius: 4px / 6px / 8px / 12px / 16px / 50%` 混用,无系统规则。
8. **阴影纯黑**:`box-shadow: 0 4px 12px rgba(0,0,0,0.2)` 纯黑投影在浅色背景上发灰发脏,应改为主色相 tinted shadow。

### P2 - 交互与可用性

9. **按钮点击目标过小**:`week-header-btn` 只有 28×28px,**违反 WCAG 2.5.5（最小 44×44px 触摸目标）**,桌面端鼠标点击也偏小。
10. **无空状态设计**:当某天无事件时,day-column 完全空白,用户不知道能双击新建。
11. **无加载骨架屏**:`isLoading` 只在状态栏显示"加载中..."文字,主区域无 skeleton。
12. **Toast 样式简陋**:纯色块 + 白字,无图标、无进度条、无 hover 暂停。
13. **DiagnosticPanel 全 inline style**:与项目 CSS 体系割裂,且 emoji 当图标（🔍 🔄 ✕ 📁 🗄️ ⚡ ✅ ❌ 💡）。
14. **EventCard 颜色对比度风险**:浅色事件（如 `#F59E0B` 黄）上的白字对比度可能不达 WCAG AA 4.5:1。

### P3 - 排版与节奏

15. **间距不成体系**:`padding: 0 12px` / `6px 0` / `8px 20px` / `16px 20px` 随机数值,无 4px/8px 基线。
16. **字号梯度无规则**:`8px / 9px / 10px / 11px / 12px / 13px / 14px / 16px / 24px`,没有 type scale 比例。
17. **WeekHeader 按钮挤成一团**:7 个按钮挤在 48px 高的 header 里,无视觉分组（导航 vs 操作）。

## 四、对标产品

- **Cron Calendar**（已被 Notion 收购）:时间轴极简、事件色块克制、字体精致
- **Things 3**:圆角统一、留白慷慨、暗色模式标杆
- **Linear**:键盘优先、冷调色板、紧凑信息密度
- **Fantastical**:事件类型图标丰富、自然语言输入

## 五、关联模块

- [02 - 设计基础](./02-design-foundations.md) - 解决 P0/P1 痛点的选型与 token
- [03 - 图标系统](./03-icon-system.md) - 解决 P0 痛点 3 的图标混乱
- [20 - 迁移路线图](./20-migration-roadmap.md) - 全局改造阶段划分
