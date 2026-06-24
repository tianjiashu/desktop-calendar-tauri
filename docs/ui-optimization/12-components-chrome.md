# 12 - 应用外壳（StatusBar / Toast / DiagnosticPanel）

> 模块编号: 12 | 依赖: [02 - 设计基础](./02-design-foundations.md) · [03 - 图标系统](./03-icon-system.md) · [04 - 动效](./04-motion-and-interaction.md) | 对应 Phase: B + D + F

## 一、组件清单

| 子组件 | 文件 | 优先级 |
|--------|------|--------|
| StatusBar | `Common/StatusBar.tsx` | P1 |
| Toast | `Common/Toast.tsx` | P2 |
| DiagnosticPanel | `Common/DiagnosticPanel.tsx` | P2 |

---

## 二、StatusBar（底部状态栏,28px）

### 2.1 现状

emoji `⚠️ 🔍` + 文字"就绪·半透明模式"

### 2.2 优化方向

1. emoji 全换 Phosphor:`<Warning weight="fill" />` / `<MagnifyingGlass />`
2. 默认状态从"就绪·半透明模式"改为 `"8 个事件 · 本周"`（更有信息量）
3. loading 状态用 `<CircleNotch className="animate-spin" />` 替代文字
4. 诊断按钮移到右侧,加 hover tooltip `"诊断信息"`
5. **新增**:状态栏右侧加暗色模式切换按钮（`<Sun />` / `<Moon />` / `<Monitor />`）

```tsx
<div className="status-bar">
  <div className="flex-1 flex items-center gap-1.5 text-xs">
    {error ? (
      <>
        <Warning size={12} weight="fill" className="text-red-500" />
        <span className="text-red-500 cursor-pointer" onClick={handleErrorClick}>
          {expanded ? `${error.code}: ${error.message}` : error.message}
        </span>
      </>
    ) : isLoading ? (
      <>
        <CircleNotch size={12} className="animate-spin text-amber-500" />
        <span className="text-amber-500">加载中...</span>
      </>
    ) : (
      <span className="text-tertiary">
        {eventCount} 个事件 · {isCurrentWeek ? '本周' : '其他周'}
      </span>
    )}
  </div>

  <div className="flex items-center gap-1">
    {/* 暗色模式切换 */}
    <ThemeToggle />

    {/* 诊断按钮 */}
    {onShowDiagnostics && (
      <Button variant="ghost" size="icon-sm" onClick={onShowDiagnostics} aria-label="诊断信息">
        <MagnifyingGlass size={14} />
      </Button>
    )}
  </div>
</div>
```

### 2.3 暗色模式切换组件

```tsx
const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={cycle}
      aria-label={`当前主题: ${theme},点击切换`}
    >
      {theme === 'light' && <Sun size={14} weight="fill" />}
      {theme === 'dark' && <Moon size={14} weight="fill" />}
      {theme === 'system' && <Monitor size={14} />}
    </Button>
  );
};
```

### 2.4 验收

- [ ] emoji 替换为 Phosphor
- [ ] 默认状态显示事件数
- [ ] loading 用旋转图标
- [ ] 暗色切换按钮工作（Light → Dark → System 循环）
- [ ] 诊断按钮有 aria-label

---

## 三、Toast（轻提示）

### 3.1 现状

纯色块 + 白字,2.5s 自动消失,无图标、无进度条、无 hover 暂停

### 3.2 优化方向

1. 用 shadcn/ui 的 `toast`（基于 Radix Toast）,自带 a11y
2. 类型图标:info `<Info weight="fill" />` / warn `<Warning weight="fill" />` / success `<CheckCircle weight="fill" />` / error `<XCircle weight="fill" />`
3. 加左侧 3px 类型色条
4. 加进度条（2.5s 倒计时可视化）,hover 时暂停
5. 暗色模式下背景用 `--bg-elevated`,不用纯白

### 3.3 类型样式

| 类型 | 图标 | 色条颜色 | ARIA |
|------|------|----------|------|
| info | `<Info weight="fill" />` | `--accent-500` | `role="status" aria-live="polite"` |
| warn | `<Warning weight="fill" />` | `--event-reminder` #f59e0b | `role="status" aria-live="polite"` |
| success | `<CheckCircle weight="fill" />` | `--event-meeting` #10b981 | `role="status" aria-live="polite"` |
| error | `<XCircle weight="fill" />` | `--event-deadline` #ef4444 | `role="alert" aria-live="assertive"` |

### 3.4 代码结构

```tsx
import { toast as shadcnToast } from '@/components/ui/toast';

export function showToast(text: string, type: 'info' | 'warn' | 'success' | 'error' = 'warn') {
  const icon = {
    info: <Info size={14} weight="fill" className="text-accent-500" />,
    warn: <Warning size={14} weight="fill" className="text-amber-500" />,
    success: <CheckCircle size={14} weight="fill" className="text-emerald-500" />,
    error: <XCircle size={14} weight="fill" className="text-red-500" />,
  }[type];

  shadcnToast({
    description: (
      <div className="flex items-center gap-2">
        {icon}
        <span>{text}</span>
      </div>
    ),
    duration: 2500,
  });
}
```

### 3.5 进度条实现

```tsx
function ToastProgress({ duration }: { duration: number }) {
  const [progress, setProgress] = useState(100);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [duration, paused]);

  return (
    <div
      className="h-0.5 bg-current opacity-30"
      style={{ width: `${progress}%` }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    />
  );
}
```

### 3.6 验收

- [ ] 用 shadcn toast 替换手写 toast
- [ ] 4 种类型图标显示正确
- [ ] 左侧 3px 类型色条
- [ ] 进度条倒计时可视化
- [ ] hover 暂停进度
- [ ] ARIA role 正确（status / alert）
- [ ] 暗色模式背景正确

---

## 四、DiagnosticPanel（诊断面板）

### 4.1 现状

全 inline style,emoji 满天飞（🔍 🔄 ✕ 📁 🗄️ ⚡ ✅ ❌ 💡）

### 4.2 优化方向

1. **整体重构**:用 shadcn `Dialog` + `ScrollArea` 替代手写 overlay
2. **去除所有 emoji**:按 [03 - 图标系统](./03-icon-system.md) §2.1 映射表换 Phosphor
3. **结构化**:分 4 个 Section（系统信息 / 数据库 / MCP / 错误日志）,用 shadcn `Separator` 分隔
4. **错误日志**:用 `ScrollArea` + 表格形式,时间/级别/模块/消息 4 列,级别用 badge（PANIC 红、ERROR 橙、WARN 黄）
5. **刷新/关闭按钮**:用 shadcn `Button` variant=`ghost` size=`sm`
6. **暗色优先**:诊断面板默认用暗色主题（开发者向,暗色更聚焦）,不受全局主题影响

### 4.3 代码结构

```tsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-[520px] max-h-[80vh] bg-stone-950 text-stone-100 border-stone-800">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <MagnifyingGlass size={16} />
        诊断信息
      </DialogTitle>
      <DialogActions>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? <CircleNotch size={14} className="animate-spin" /> : <ArrowsClockwise size={14} />}
          刷新
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X size={14} />
          关闭
        </Button>
      </DialogActions>
    </DialogHeader>

    <ScrollArea className="max-h-[60vh]">
      {/* 系统信息 Section */}
      <section className="mb-4">
        <h3 className="text-xs uppercase tracking-wide text-stone-400 mb-2">系统信息</h3>
        <div className="space-y-2 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Folder size={12} className="text-stone-400" />
            <span className="text-stone-400">日志目录:</span>
            <span className="break-all">{diagnostic.log_dir}</span>
          </div>
          <div className="flex items-center gap-2">
            <Database size={12} className="text-stone-400" />
            <span className="text-stone-400">数据库:</span>
            <span className="break-all">{diagnostic.db_path}</span>
          </div>
        </div>
      </section>

      <Separator className="bg-stone-800" />

      {/* 状态 Section */}
      <section className="my-4">
        <h3 className="text-xs uppercase tracking-wide text-stone-400 mb-2">运行状态</h3>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <div className="text-stone-400 mb-1">DB WAL</div>
            <div className={diagnostic.db_wal_enabled ? 'text-emerald-400' : 'text-red-400'}>
              {diagnostic.db_wal_enabled ? <CheckCircle size={12} weight="fill" /> : <XCircle size={12} weight="fill" />}
              {diagnostic.db_wal_enabled ? '已启用' : '未启用'}
            </div>
          </div>
          {/* MCP 端口、状态 */}
        </div>
      </section>

      <Separator className="bg-stone-800" />

      {/* 错误日志 Section */}
      <section className="mt-4">
        <h3 className="text-xs uppercase tracking-wide text-stone-400 mb-2 flex items-center gap-1.5">
          <Lightning size={12} weight="fill" />
          最近错误 ({diagnostic.recent_errors.length})
        </h3>
        {diagnostic.recent_errors.length === 0 ? (
          <div className="text-stone-500 text-xs">无错误记录</div>
        ) : (
          <div className="bg-stone-900 rounded-lg p-2 max-h-[200px] overflow-auto">
            {diagnostic.recent_errors.map((entry, i) => (
              <div key={i} className="py-1 border-b border-stone-800 last:border-0">
                <div className="flex items-center gap-2 text-[10px] text-stone-500">
                  <span>{entry.timestamp}</span>
                  <Badge variant={getLogLevelBadgeVariant(entry.level)}>
                    {entry.level}
                  </Badge>
                  <span>{entry.module}</span>
                </div>
                <div className={cn('text-xs mt-1', getLogLevelTextColor(entry.level))}>
                  {entry.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="text-[10px] text-stone-600 mt-3 flex items-center gap-1.5">
        <Lightbulb size={10} weight="fill" />
        完整日志文件位于上述日志目录中（JSON 格式,可用 jq 解析）
      </div>
    </ScrollArea>
  </DialogContent>
</Dialog>
```

### 4.4 日志级别 Badge 颜色

| 级别 | Badge variant | 文字色 |
|------|---------------|--------|
| PANIC | red | red-400 |
| ERROR | orange | orange-400 |
| WARN | yellow | yellow-400 |
| INFO | blue | blue-400 |

### 4.5 验收

- [ ] 用 shadcn Dialog + ScrollArea 重构
- [ ] 所有 emoji 替换为 Phosphor
- [ ] 4 个 Section 结构清晰
- [ ] 错误日志用 Badge 标注级别
- [ ] 默认暗色主题,不受全局影响
- [ ] ScrollArea 滚动流畅
- [ ] 刷新/关闭按钮用 shadcn Button

---

## 五、关联模块

- 依赖: [02 - 设计基础](./02-design-foundations.md) - token
- 依赖: [03 - 图标系统](./03-icon-system.md) - Phosphor 图标
- 依赖: [04 - 动效](./04-motion-and-interaction.md) - Toast 动效
- 被依赖: [20 - 迁移路线图](./20-migration-roadmap.md) - Phase B + D + F
