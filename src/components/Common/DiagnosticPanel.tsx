// ========== Diagnostic overlay panel (Phase F: structured sections + log level badges) ==========

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

interface DiagnosticPanelProps {
  diagnostic: SystemDiagnostic | null;
  isLoading: boolean;
  onRefresh: () => void;
  onClose: () => void;
}

type LogLevelTone = {
  color: string;
  background: string;
};

const TEXT = {
  title: '\u8bca\u65ad\u4fe1\u606f',
  refresh: '\u5237\u65b0',
  refreshing: '\u5237\u65b0\u4e2d...',
  refreshLabel: '\u5237\u65b0\u8bca\u65ad\u4fe1\u606f',
  close: '\u5173\u95ed',
  closeLabel: '\u5173\u95ed\u8bca\u65ad\u4fe1\u606f',
  loading: '\u52a0\u8f7d\u8bca\u65ad\u4fe1\u606f...',
  system: '\u7cfb\u7edf\u4fe1\u606f',
  logDir: '\u65e5\u5fd7\u76ee\u5f55',
  database: '\u6570\u636e\u5e93',
  enabled: '\u5df2\u542f\u7528',
  disabled: '\u672a\u542f\u7528',
  port: 'MCP \u7aef\u53e3',
  status: 'MCP \u72b6\u6001',
  running: '\u8fd0\u884c\u4e2d',
  stopped: '\u5df2\u505c\u6b62',
  recentErrors: '\u6700\u8fd1\u9519\u8bef',
  noErrors: '\u65e0\u9519\u8bef\u8bb0\u5f55',
  note: '\u5b8c\u6574\u65e5\u5fd7\u6587\u4ef6\u4f4d\u4e8e\u4e0a\u8ff0\u65e5\u5fd7\u76ee\u5f55\u4e2d\uff08JSON \u683c\u5f0f\uff0c\u53ef\u7528 jq \u89e3\u6790\uff09',
} as const;

const LOG_LEVEL_TONES: Record<string, LogLevelTone> = {
  PANIC: { color: 'var(--event-deadline)', background: 'rgb(239 68 68 / 0.20)' },
  ERROR: { color: '#fb923c', background: 'rgb(249 115 22 / 0.20)' },
  WARN: { color: 'var(--event-reminder)', background: 'rgb(245 158 11 / 0.20)' },
  INFO: { color: 'var(--accent-400)', background: 'rgb(96 165 250 / 0.20)' },
};

function getLevelTone(level: string): LogLevelTone {
  return LOG_LEVEL_TONES[level] ?? LOG_LEVEL_TONES.INFO;
}

const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({
  diagnostic,
  isLoading,
  onRefresh,
  onClose,
}) => {
  return (
    <div className="diagnostic-overlay" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="diagnostic-panel" role="dialog" aria-modal="true" aria-label={TEXT.title} onClick={(e) => e.stopPropagation()}>
        <header className="diagnostic-header">
          <h2 className="diagnostic-title">
            <MagnifyingGlass size={18} weight="regular" aria-hidden="true" />
            {TEXT.title}
          </h2>
          <div className="diagnostic-actions">
            <button className="diagnostic-btn" onClick={onRefresh} disabled={isLoading} title={TEXT.refresh} aria-label={TEXT.refreshLabel}>
              {isLoading ? <CircleNotch size={14} weight="regular" className="animate-spin-refresh" /> : <ArrowsClockwise size={14} weight="regular" />}
              {isLoading ? TEXT.refreshing : TEXT.refresh}
            </button>
            <button className="diagnostic-btn" onClick={onClose} title={TEXT.close} aria-label={TEXT.closeLabel}>
              <X size={14} weight="regular" />
              {TEXT.close}
            </button>
          </div>
        </header>

        {isLoading && !diagnostic ? (
          <div className="diagnostic-empty">{TEXT.loading}</div>
        ) : diagnostic ? (
          <div className="diagnostic-content">
            <section className="diagnostic-section">
              <h3 className="diagnostic-section-title">
                <Folder size={14} weight="regular" aria-hidden="true" />
                {TEXT.system}
              </h3>
              <div className="diagnostic-path-row">
                <span>{TEXT.logDir}</span>
                <code>{diagnostic.log_dir}</code>
              </div>
              <div className="diagnostic-path-row">
                <Database size={12} weight="regular" aria-hidden="true" />
                <span>{TEXT.database}</span>
                <code>{diagnostic.db_path}</code>
              </div>
            </section>

            <section className="diagnostic-section diagnostic-status-grid">
              <StatusMetric label="DB WAL" active={diagnostic.db_wal_enabled} activeText={TEXT.enabled} inactiveText={TEXT.disabled} />
              <div>
                <div className="diagnostic-section-title">{TEXT.port}</div>
                <div className="diagnostic-value">{diagnostic.mcp_port}</div>
              </div>
              <StatusMetric label={TEXT.status} active={diagnostic.mcp_running} activeText={TEXT.running} inactiveText={TEXT.stopped} />
            </section>

            <section className="diagnostic-section">
              <h3 className="diagnostic-section-title">
                <Lightning size={14} weight="fill" aria-hidden="true" />
                {TEXT.recentErrors} ({diagnostic.recent_errors.length})
              </h3>
              {diagnostic.recent_errors.length === 0 ? (
                <div className="diagnostic-empty-inline">{TEXT.noErrors}</div>
              ) : (
                <div className="diagnostic-log-list">
                  {diagnostic.recent_errors.map((entry: DiagnosticEntry, index: number) => (
                    <LogEntry key={`${entry.timestamp}-${index}`} entry={entry} />
                  ))}
                </div>
              )}
            </section>

            <p className="diagnostic-note">
              <Lightbulb size={12} weight="fill" aria-hidden="true" />
              {TEXT.note}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
};

interface StatusMetricProps {
  label: string;
  active: boolean;
  activeText: string;
  inactiveText: string;
}

const StatusMetric: React.FC<StatusMetricProps> = ({ label, active, activeText, inactiveText }) => (
  <div>
    <div className="diagnostic-section-title">{label}</div>
    <div className={`diagnostic-status ${active ? 'is-active' : 'is-inactive'}`}>
      {active ? <CheckCircle size={14} weight="fill" /> : <XCircle size={14} weight="fill" />}
      {active ? activeText : inactiveText}
    </div>
  </div>
);

const LogEntry: React.FC<{ entry: DiagnosticEntry }> = ({ entry }) => {
  const tone = getLevelTone(entry.level);

  return (
    <article className="diagnostic-log-entry">
      <div className="diagnostic-log-meta">
        <span>{entry.timestamp}</span>
        <span className="diagnostic-log-badge" style={{ color: tone.color, background: tone.background }}>
          {entry.level}
        </span>
        <span>{entry.module}</span>
      </div>
      <div className="diagnostic-log-message" style={{ color: tone.color }}>
        {entry.message}
      </div>
    </article>
  );
};

export default DiagnosticPanel;
