// ========== React Error Boundary ==========

import React from 'react';
import { Warning } from '@phosphor-icons/react';
import { logger } from '../../utils/logger';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Catches unhandled React render errors and shows a fallback UI
 * instead of a blank white screen. Logs the error for diagnostics.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    logger.error('React render error:', error.message, errorInfo.componentStack);

    // Also forward to Rust diagnostics via IPC if available
    try {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('log_frontend_error', {
          message: error.message,
          stack: error.stack ?? '',
          component_stack: errorInfo.componentStack ?? '',
        }).catch(() => {});
      }).catch(() => {});
    } catch {
      // Tauri IPC not available
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          fontFamily: "'Geist Sans', sans-serif",
          fontSize: 'var(--text-base)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', color: 'var(--event-reminder)' }}>
            <Warning size={32} weight="fill" />
          </div>
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>应用发生错误</div>
          <div style={{ color: 'var(--event-deadline)', marginBottom: '12px', maxWidth: '400px', textAlign: 'center', wordBreak: 'break-word' }}>
            {this.state.error?.message ?? '未知错误'}
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            style={{
              background: 'var(--accent-500)',
              color: 'var(--text-inverse)',
              border: 'none',
              padding: '6px 16px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 'var(--text-base)',
            }}
          >
            重新加载
          </button>
          {this.state.errorInfo && (
            <details style={{ marginTop: '16px', maxWidth: '400px', opacity: 0.7, fontSize: '11px' }}>
              <summary style={{ cursor: 'pointer' }}>组件堆栈</summary>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: '8px' }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
