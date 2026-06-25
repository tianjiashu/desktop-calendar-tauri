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

const TEXT = {
  themeLabel: {
    light: '\u6d45\u8272',
    dark: '\u6df1\u8272',
    system: '\u8ddf\u968f\u7cfb\u7edf',
  },
  themePrefix: '\u5f53\u524d\u4e3b\u9898',
  switchTheme: '\u70b9\u51fb\u5207\u6362',
  details: '\u70b9\u51fb\u67e5\u770b\u8be6\u60c5',
  loading: '\u52a0\u8f7d\u4e2d...',
  eventUnit: '\u4e2a\u4e8b\u4ef6',
  currentWeek: '\u672c\u5468',
  otherWeek: '\u5176\u4ed6\u5468',
  diagnostics: '\u8bca\u65ad\u4fe1\u606f',
} as const;

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const cycle = useCallback(() => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  }, [theme, setTheme]);

  const label = `${TEXT.themePrefix}: ${TEXT.themeLabel[theme]}, ${TEXT.switchTheme}`;

  return (
    <button
      className="status-icon-btn"
      onClick={cycle}
      title={label}
      aria-label={label}
    >
      {theme === 'light' && <Sun size={14} weight="fill" />}
      {theme === 'dark' && <Moon size={14} weight="fill" />}
      {theme === 'system' && <Monitor size={14} weight="regular" />}
    </button>
  );
};

/**
 * Status bar displaying ready, loading, and error states.
 * Right side hosts theme toggle and diagnostics.
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
      <div className="status-main">
        {error ? (
          <span
            className="status-error"
            onClick={handleErrorClick}
            title={TEXT.details}
            role="button"
            tabIndex={0}
          >
            <Warning size={14} weight="fill" />
            {expanded ? `${String(error.code)}: ${String(error.message)}` : String(error.message)}
            {Boolean(error.details) && expanded && (
              <span className="status-error-details">
                {String(error.details)}
              </span>
            )}
          </span>
        ) : isLoading ? (
          <span className="status-loading">{TEXT.loading}</span>
        ) : (
          <span className="status-ready">
            {eventCount} {TEXT.eventUnit} {'\u00b7'} {isCurrentWeek ? TEXT.currentWeek : TEXT.otherWeek}
          </span>
        )}
      </div>
      <div className="status-actions">
        <ThemeToggle />
        {onShowDiagnostics && (
          <button
            className="status-icon-btn"
            onClick={onShowDiagnostics}
            title={TEXT.diagnostics}
            aria-label={TEXT.diagnostics}
          >
            <MagnifyingGlass size={16} weight="regular" />
          </button>
        )}
      </div>
    </div>
  );
};

export default StatusBar;
