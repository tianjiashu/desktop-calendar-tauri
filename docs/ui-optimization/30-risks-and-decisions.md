# 30 - 风险与决策

> 模块编号: 30 | 依赖: 无 | 全局参考

## 一、风险与权衡

### 1.1 引入 shadcn/ui 的成本

- **包体积**:shadcn 组件代码 inline 到项目,不增加运行时依赖,但源码体积增加约 30-50KB
- **Tauri 包大小**:估算 +200KB（含 Radix primitives）
- **可接受性**:✅ 桌面应用对包体积不敏感,换取维护成本骤降是值得的

### 1.2 Geist 字体的考量

- **License**:Geist 是 SIL OFL 1.1,可商用、可自托管 ✅
- **中文字符**:Geist 不含中文,中文回退到 PingFang SC / Microsoft YaHei,中英混排时字重可能略不匹配
- **缓解**:在 `font-family` 中显式声明 `Geist Sans, 'PingFang SC', 'Microsoft YaHei', sans-serif`,让中文字体接管 CJK 字符

### 1.3 暗色模式的渐进性

- 当前没有任何暗色准备,全量上线可能引入大量视觉 bug
- **建议**:Phase C 先在 StatusBar 加切换按钮但标记 `"实验性"`,内部测试 1 周后再默认开启跟随系统

### 1.4 性能影响

- Motion 库 gzipped ~25KB,桌面应用可接受
- Phosphor Icons 按需引入（tree-shaking）,实际增加 ~5-10KB
- backdrop-filter 在 Tauri WebView 中性能良好（基于系统 WebView2/WKWebView）,但浮球的 `backdrop-blur(20px)` 在低端机可能掉帧,需提供 fallback

### 1.5 与 design-taste-frontend skill 的偏离

该 skill 主要针对 Landing Page,明确说"不在 scope"的包括 dashboards。本方案将其**设计原则**（设计系统优先、统一图标库、tinted shadow、reduced motion、对比度强制）**迁移**到桌面工具场景,但**不照搬**其 landing page 专属规则（hero、bento、CTA wrap 等）。这是有意识的适配,不是误用。

## 二、决策速查表

| 决策项 | 选择 | 备选 | 理由 |
|--------|------|------|------|
| 设计系统 | **shadcn/ui** | Radix Themes / 手写 | 代码归你所有,Tailwind 原生,可深度定制 |
| 图标库 | **Phosphor Icons** | Lucide / HugeIcons | 6 权重、duotone 适合事件类型、strokeWidth 一致 |
| 字体 | **Geist Sans + Mono** | Inter / Satoshi | 反 AI-default,小字号清晰,免费 OFL |
| 主色 | **Indigo Steel #4f6bed** | Tailwind 默认蓝 | 偏冷调,更有 Linear 感,避 AI 通用蓝 |
| 中性色 | **Warm Slate（浅） / Cool Slate（深）** | Pure gray / zinc | 暖浅冷深对比有层次 |
| 暗色模式 | **class 策略 + 跟随系统** | 仅浅色 / 强制暗色 | 现代桌面应用标配 |
| 动效库 | **Motion (motion/react)** | GSAP / 纯 CSS | 轻量,React 友好,自带 reduced motion |
| 圆角 | **8/12/16/full 四档** | 单一圆角 | 层次清晰,规则简单 |
| 间距 | **4px 基线** | 8px 基线 | 紧凑工具应用,4px 更细粒度 |
| 组件状态 | **shadcn 变体** | 手写 className | variant 系统（default/ghost/outline/destructive） |
| 时间选择 | **native input + 自定义 indicator** | 自建 TimePicker | 避免过度工程,native 在桌面端够用 |
| 暗色切换 | **next-themes 或自写 useTheme** | 仅 CSS media query | 需要手动覆盖能力 |

## 三、Pre-Flight Check（本方案自检）

- [x] **Brief 推断**:桌面端紧凑型生产力工具,已声明
- [x] **三档参数**:4 / 4 / 6,已论证
- [x] **设计系统选型**:shadcn/ui,非手写
- [x] **图标库统一**:Phosphor,禁止 emoji/ASCII
- [x] **字体非 Inter 默认**:Geist
- [x] **色板非 AI 通用蓝**:Indigo Steel
- [x] **暗色模式**:跟随系统 + 手动覆盖
- [x] **圆角统一**:8/12/16/full 四档
- [x] **阴影 tinted**:用 stone-900 tinted,非纯黑
- [x] **对比度**:所有文本 ≥ 4.5:1
- [x] **触摸目标**:按钮 ≥ 32×32
- [x] **Reduced motion**:所有动效降级
- [x] **无 em-dash**:本文件全程使用普通连字符
- [x] **无 AI Tells**:无 AI 紫渐变、无 glassmorphism 滥用、无 fake screenshot

## 四、对标产品参考

### 4.1 视觉对标

- **Cron Calendar**（已被 Notion 收购）:时间轴极简、事件色块克制、字体精致
- **Things 3**:圆角统一、留白慷慨、暗色模式标杆
- **Linear**:键盘优先、冷调色板、紧凑信息密度
- **Fantastical**:事件类型图标丰富、自然语言输入

### 4.2 灵感截图

> TODO: 在 Phase D 启动前,从上述产品截图建立 moodboard,存入 `docs/ui-references/` 目录

## 五、关联模块

- 全局参考,被所有模块引用
- [README - 总索引](./README.md)
