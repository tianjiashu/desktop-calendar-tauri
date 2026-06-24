// ========== Status bar component (F21) ==========

import React, { useState, useCallback } from 'react';
import { Warning, MagnifyingGlass, Sun, Moon, Monitor } from '@phosphor-icons/react';
import type { AppError } from '../../types';
import { useTheme } from '../../hooks/useTheme';

interface StatusBarProps {
  error: AppError | null;
  isLoading: boolean;
  eventCount?: number;
  isCurrentWeek?: boolean;
  onShowDiagnostics?: () => void;
}

/**
 * Theme toggle button: cycles Light → Dark → System.
 */
const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const cycle = useCallback(() => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  }, [theme, setTheme]);

  return (
    <button
      onClick={cycle}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '2px',
        color: 'var(--text-tertiary)',
        display: 'flex',
        alignItems: 'center',
      }}
      title={`当前主题: ${theme}，点击切换`}
      aria-label={`当前主题: ${theme}，点击切换`}
    >
      {theme === 'light' && <Sun size={14} weight="fill" />}
      {theme === 'dark' && <Moon size={14} weight="fill" />}
      {theme === 'system' && <Monitor size={14} weight="regular" />}
    </button>
  );
};

/**
 * Status bar displaying ready / loading / error states.
 * Errors are clickable to show full details.
 * Right side: theme toggle + diagnostics button.
 */
const StatusBar: React.FC<StatusBarProps> = ({
  error,
  isLoading,
  eventCount = 0,
  isCurrentWeek = false,
  onShowDiagnostics,
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleErrorClick = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  return (
    <div className="status-bar">
      <div style={{ flex: 1 }}>
        {error ? (
          <span
            className="status-error"
            onClick={handleErrorClick}
            style={{ cursor: 'pointer', userSelect: 'text', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            title="点击查看详情"
          >
            <Warning size={14} weight="fill" />
            {expanded ? `${error.code}: ${error.message}` : error.message}
            {error.details && expanded && (
              <span style={{ display: 'block', fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
                {String(error.details)}
              </span>
            )}
          </span>
        ) : isLoading ? (
          <span className="status-loading">加载中...</span>
        ) : (
          <span className="status-ready">
            {eventCount} 个事件 · {isCurrentWeek ? '本周' : '其他周'}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <ThemeToggle />
        {onShowDiagnostics && (
          <button
            onClick={onShowDiagnostics}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              color: 'var(--text-tertiary)',
              display: 'flex',
              alignItems: 'center',
            }}
            title="诊断信息"
            aria-label="诊断信息"
          >
            <MagnifyingGlass size={16} weight="regular" />
          </button>
        )}
      </div>
    </div>
  );
};

export default StatusBar;
