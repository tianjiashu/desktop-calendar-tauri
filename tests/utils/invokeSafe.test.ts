// ========== invokeSafe integration tests ==========

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockInvoke = vi.fn();

// Mock the dynamic import of @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}));

// Must import AFTER the mock
import { invokeSafe, invokeOrThrow } from '../../src/utils/invokeSafe';

describe('invokeSafe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok on success', async () => {
    mockInvoke.mockResolvedValue({ id: '1', title: 'test' });

    const result = await invokeSafe<{ id: string; title: string }>('create_event', {
      input: { title: 'test' },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ id: '1', title: 'test' });
    }
    expect(mockInvoke).toHaveBeenCalledWith('create_event', {
      input: { title: 'test' },
    });
  });

  it('returns error on failure', async () => {
    mockInvoke.mockRejectedValue(new Error('EventNotFound: abc'));

    const result = await invokeSafe('get_event', { id: 'abc' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('EVENT_NOT_FOUND');
    }
  });

  it('works without args', async () => {
    mockInvoke.mockResolvedValue([]);

    const result = await invokeSafe<unknown[]>('list_events');

    expect(result.ok).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('list_events', undefined);
  });
});

describe('invokeOrThrow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns value on success', async () => {
    mockInvoke.mockResolvedValue({ id: '1' });

    const value = await invokeOrThrow<{ id: string }>('create_event', {
      input: { title: 'test' },
    });

    expect(value).toEqual({ id: '1' });
  });

  it('throws AppError on failure', async () => {
    mockInvoke.mockRejectedValue(new Error('Invalid time range'));

    await expect(
      invokeOrThrow('create_event', { input: { title: 'test' } }),
    ).rejects.toThrow();
  });

  it('works for non-mutation commands', async () => {
    mockInvoke.mockResolvedValue([{ id: '1' }]);

    const value = await invokeOrThrow<unknown[]>('list_events');

    expect(value).toEqual([{ id: '1' }]);
  });
});
