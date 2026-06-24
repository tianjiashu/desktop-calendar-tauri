// ========== Safe invoke wrapper (09-error-handling) ==========

import { AppError, type Result } from '../types/error.types';
import { logger } from './logger';

/**
 * Safe invoke wrapper. Never throws — returns Result<T, AppError>.
 * All IPC calls MUST use this instead of raw invoke().
 *
 * Uses dynamic import because @tauri-apps/api/core is only available
 * inside the Tauri WebView runtime, not in browser dev mode.
 */
export async function invokeSafe<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<Result<T, AppError>> {
  try {
    // Dynamic import — Tauri API only available inside Tauri WebView
    const { invoke } = await import('@tauri-apps/api/core');
    const value = await invoke<T>(cmd, args);
    return { ok: true, value };
  } catch (e) {
    const error = AppError.from(e, cmd);
    logger.error(`${cmd} failed:`, error.message);
    return { ok: false, error };
  }
}

/**
 * invokeOrThrow: calls invokeSafe and throws on error.
 * Use when you need the raw value and expect failures to bubble up.
 */
export async function invokeOrThrow<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const t0 = performance.now();
  const result = await invokeSafe<T>(cmd, args);
  const t1 = performance.now();
  if (!result.ok) {
    logger.error(`[IPC] invokeOrThrow → ${cmd} FAILED after ${(t1 - t0).toFixed(1)}ms:`, result.error.message);
    throw result.error;
  }
  // Only log args/value for event mutations (not bulk reads)
  if (cmd === 'update_event' || cmd === 'create_event' || cmd === 'delete_event') {
    logger.info(`[IPC] invokeOrThrow → ${cmd} OK (${(t1 - t0).toFixed(1)}ms) | args=${JSON.stringify(args)} | value=${JSON.stringify(result.value)}`);
  } else {
    logger.debug(`[IPC] invokeOrThrow → ${cmd} OK (${(t1 - t0).toFixed(1)}ms)`);
  }
  return result.value;
}
