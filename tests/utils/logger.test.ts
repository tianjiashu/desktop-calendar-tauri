// ========== logger integration tests ==========

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockInvoke = vi.fn();

// Mock @tauri-apps/api/core dynamic import
vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}));

// Must import AFTER mock
import { logger, flushLogs } from '../../src/utils/logger';

describe('logger', () => {
  let consoleDebug: ReturnType<typeof vi.spyOn>;
  let consoleInfo: ReturnType<typeof vi.spyOn>;
  let consoleWarn: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleDebug.mockRestore();
    consoleInfo.mockRestore();
    consoleWarn.mockRestore();
    consoleError.mockRestore();
  });

  it('logger.debug calls console.debug in dev', () => {
    logger.debug('test message');
    expect(consoleDebug).toHaveBeenCalled();
    const args = consoleDebug.mock.calls[0];
    expect(args[0]).toBe('[DEBUG]');
    expect(args[1]).toBe('test message');
  });

  it('logger.info calls console.info in dev', () => {
    logger.info('info message');
    expect(consoleInfo).toHaveBeenCalled();
    const args = consoleInfo.mock.calls[0];
    expect(args[0]).toBe('[INFO]');
  });

  it('logger.warn calls console.warn', () => {
    logger.warn('warning');
    expect(consoleWarn).toHaveBeenCalled();
    const args = consoleWarn.mock.calls[0];
    expect(args[0]).toBe('[WARN]');
  });

  it('logger.error calls console.error', () => {
    logger.error('error!');
    expect(consoleError).toHaveBeenCalled();
    const args = consoleError.mock.calls[0];
    expect(args[0]).toBe('[ERROR]');
  });

  it('handles multiple arguments', () => {
    logger.info('msg', { key: 'value' }, 42);
    expect(consoleInfo).toHaveBeenCalled();
    const args = consoleInfo.mock.calls[0];
    expect(args[0]).toBe('[INFO]');
    expect(args[1]).toBe('msg');
    // Third arg should be stringified object
  });

  it('handles non-string arguments via JSON.stringify', () => {
    logger.error(new Error('test error'));
    expect(consoleError).toHaveBeenCalled();
  });
});

describe('flushLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves immediately when no pending logs', async () => {
    await expect(flushLogs()).resolves.toBeUndefined();
  });
});
