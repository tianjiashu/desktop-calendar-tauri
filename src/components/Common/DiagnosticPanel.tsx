// ========== Diagnostic overlay panel ==========
//
// 颜色说明：诊断面板始终使用暗色主题（开发者向，暗色更聚焦），
// 不受全局 light/dark 主题影响。
// 以下颜色与 index.css 中 .dark 模式的 token 值一致。
// Phase F 将用 shadcn Dialog 重构此面板。

import React from 'react';
import {
  MagnifyingGlass,
  ArrowsClockwise,
  X,
  Folder,
  Database,
  Lightning,
  CheckCircle,
  XCircle,
  Lightbulb,
  CircleNotch,
} from '@phosphor-icons/react';
import type { SystemDiagnostic, DiagnosticEntry } from '../../types/diagnostic.types';

// ===== 暗色主题常量（对齐 .dark token 值） =====

/** 面板内文字色（暗色背景） */
const TEXT_DARK = '#e5e7eb';        // ≈ text-primary in .dark
const TEXT_DIM = '#9ca3af';        // ≈ text-tertiary in .dark
const TEXT_MUTED = '#6b7280';      // ≈ text-tertiary 更深
const SUCCESS = '#10b981';         // event-meeting 翡翠绿
const ERROR = '#ef4444';           // event-deadline 警示红
const WARNING = '#f59e0b';         // event-reminder 琥珀
const BTN_BG = '#374151';         // 按钮背景
const PANEL_BG = 'rgba(20, 20, 30, 0.97)';
const OVERLAY_BG = 'rgba(0, 0, 0, 0.6)';
const BORDER_FAINT = 'rgba(255, 255, 255, 0.1)';
const BORDER_DIVIDER = 'rgba(255, 255, 255, 0.05)';
const CODE_BG = 'rgba(0, 0, 0, 0.3)';

interface DiagnosticPanelProps {
  diagnostic: SystemDiagnostic | null;
  isLoading: boolean;
  onRefresh: () => void;
  onClose: () => void;
}

const sectionStyle: React.CSSProperties = {
  marginBottom: '12px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: TEXT_DIM,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '4px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
};

const valueStyle: React.CSSProperties = {
  fontSize: '13px',
  color: TEXT_DARK,
  fontFamily: "'Geist Mono', monospace",
  wordBreak: 'break-all',
};

/** DiagnosticPanel header button base style */
const btnStyle: React.CSSProperties = {
  background: BTN_BG,
  color: TEXT_DARK,
  border: 'none',
  padding: '4px 10px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '12px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
};

/**
 * Overlay panel showing system diagnostics: log paths, DB status, MCP status,
 * recent error log entries. Opened via MagnifyingGlass button in the status bar.
 */
const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({
  diagnostic,
  isLoading,
  onRefresh,
  onClose,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: OVERLAY_BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '520px',
          maxHeight: '80vh',
          overflow: 'auto',
          background: PANEL_BG,
          backdropFilter: 'blur(16px)',
          borderRadius: '16px',
          border: `1px solid ${BORDER_FAINT}`,
          padding: '20px',
          color: TEXT_DARK,
          fontFamily: "'Geist Mono', monospace",
          fontSize: '12px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <MagnifyingGlass size={18} weight="regular" /> 诊断信息
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onRefresh} disabled={isLoading} style={btnStyle}>
              {isLoading ? <CircleNotch size={14} weight="regular" className="animate-spin-refresh" /> : <ArrowsClockwise size={14} weight="regular" />}
              {isLoading ? '刷新中...' : '刷新'}
            </button>
            <button onClick={onClose} style={btnStyle}>
              <X size={14} weight="regular" /> 关闭
            </button>
          </div>
        </div>

        {isLoading && !diagnostic ? (
          <div style={{ textAlign: 'center', padding: '24px', color: TEXT_DIM }}>加载诊断信息...</div>
        ) : diagnostic ? (
          <>
            {/* System info */}
            <div style={sectionStyle}>
              <div style={labelStyle}><Folder size={14} weight="regular" /> 日志目录</div>
              <div style={valueStyle}>{diagnostic.log_dir}</div>
            </div>
            <div style={sectionStyle}>
              <div style={labelStyle}><Database size={14} weight="regular" /> 数据库路径</div>
              <div style={valueStyle}>{diagnostic.db_path}</div>
            </div>
            <div style={{ display: 'flex', gap: '24px', ...sectionStyle }}>
              <div>
                <div style={labelStyle}>DB WAL</div>
                <div style={{ ...valueStyle, color: diagnostic.db_wal_enabled ? SUCCESS : ERROR, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {diagnostic.db_wal_enabled
                    ? <><CheckCircle size={14} weight="fill" /> 已启用</>
                    : <><XCircle size={14} weight="fill" /> 未启用</>}
                </div>
              </div>
              <div>
                <div style={labelStyle}>MCP 端口</div>
                <div style={valueStyle}>{diagnostic.mcp_port}</div>
              </div>
              <div>
                <div style={labelStyle}>MCP 状态</div>
                <div style={{ ...valueStyle, color: diagnostic.mcp_running ? SUCCESS : ERROR, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {diagnostic.mcp_running
                    ? <><CheckCircle size={14} weight="fill" /> 运行中</>
                    : <><XCircle size={14} weight="fill" /> 已停止</>}
                </div>
              </div>
            </div>

            {/* Recent errors */}
            <div style={sectionStyle}>
              <div style={labelStyle}>
                <Lightning size={14} weight="fill" /> 最近错误 ({diagnostic.recent_errors.length})
              </div>
              {diagnostic.recent_errors.length === 0 ? (
                <div style={{ color: TEXT_DIM, fontSize: '12px', marginTop: '4px' }}>无错误记录</div>
              ) : (
                <div style={{ maxHeight: '200px', overflow: 'auto', background: CODE_BG, borderRadius: '8px', padding: '8px' }}>
                  {diagnostic.recent_errors.map((entry: DiagnosticEntry, i: number) => (
                    <div key={i} style={{
                      padding: '4px 0',
                      borderBottom: i < diagnostic.recent_errors.length - 1 ? `1px solid ${BORDER_DIVIDER}` : 'none',
                    }}>
                      <div style={{ color: TEXT_DIM, fontSize: '10px' }}>
                        {entry.timestamp} [{entry.level}] {entry.module}
                      </div>
                      <div style={{
                        color: entry.level === 'PANIC' ? ERROR : WARNING,
                        fontSize: '12px',
                        marginTop: '2px',
                        wordBreak: 'break-word',
                      }}>
                        {entry.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ fontSize: '10px', color: TEXT_MUTED, marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Lightbulb size={12} weight="fill" /> 完整日志文件位于上述日志目录中（JSON 格式，可用 jq 解析）
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default DiagnosticPanel;
