// ========== Unified logger (replaces console.log/error) ==========
// All logs are written to Rust backend's app.log via diag_log IPC,
// so they survive app restarts and are available for post-mortem analysis.

const IS_DEV = import.meta.env.DEV;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ========== Batch flush to Rust backend ==========
// Logs are queued and flushed periodically to avoid blocking the UI thread
// with synchronous IPC calls on every log statement.

const FLUSH_INTERVAL_MS = 500;
const MAX_BATCH_SIZE = 100;

let pendingLogs: string[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let invokeReady = false;
let invokePromise: Promise<typeof import('@tauri-apps/api/core')> | null = null;

function ensureInvoke(): Promise<typeof import('@tauri-apps/api/core')> {
  if (!invokePromise) {
    invokePromise = import('@tauri-apps/api/core').then(
      (mod) => { invokeReady = true; return mod; },
      () => { invokeReady = false; return null as unknown as typeof import('@tauri-apps/api/core'); },
    );
  }
  return invokePromise;
}

async function flushToRust(): Promise<void> {
  if (pendingLogs.length === 0) return;

  const batch = pendingLogs.splice(0, MAX_BATCH_SIZE);
  const message = batch.join('\n');

  try {
    const api = await ensureInvoke();
    if (api && invokeReady) {
      await api.invoke('diag_log', { message });
    }
  } catch {
    // Silently ignore — don't crash the app over log flush failures
  }
}

function enqueueLog(message: string): void {
  pendingLogs.push(message);

  // Start flush timer on first log
  if (!flushTimer) {
    flushTimer = setInterval(flushToRust, FLUSH_INTERVAL_MS);
  }
}

function formatMessage(level: LogLevel, ...args: unknown[]): void {
  const prefix = `[${level.toUpperCase()}]`;
  const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  const timestamp = new Date().toISOString();
  const fullMsg = `${timestamp} ${prefix} ${msg}`;

  // Enqueue for batch flush to Rust log file
  enqueueLog(fullMsg);

  // Console output (DevTools, useful during dev)
  switch (level) {
    case 'debug':
      if (IS_DEV) console.debug(prefix, ...args);
      break;
    case 'info':
      if (IS_DEV) console.info(prefix, ...args);
      break;
    case 'warn':
      console.warn(prefix, ...args);
      break;
    case 'error':
      console.error(prefix, ...args);
      break;
  }
}

/** Force flush pending logs immediately (call before app exit) */
export async function flushLogs(): Promise<void> {
  while (pendingLogs.length > 0) {
    await flushToRust();
  }
}

export const logger = {
  debug: (...args: unknown[]) => formatMessage('debug', ...args),
  info: (...args: unknown[]) => formatMessage('info', ...args),
  warn: (...args: unknown[]) => formatMessage('warn', ...args),
  error: (...args: unknown[]) => formatMessage('error', ...args),
};
