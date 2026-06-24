// ========== useEvents integration tests ==========

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockFetchEvents = vi.fn();
const mockClearError = vi.fn();

vi.mock('../../src/stores/useCalendarStore', () => ({
  useCalendarStore: (selector?: (state: any) => any) => {
    const state = {
      events: [{ id: '1', title: 'test', start_time: 1000, end_time: 2000, deleted_at: undefined }],
      isLoading: false,
      error: null,
      fetchEvents: mockFetchEvents,
      clearError: mockClearError,
    };
    if (selector) return selector(state);
    return state;
  },
}));

import { useEvents } from '../../src/hooks/useEvents';

describe('useEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches events on mount when autoFetch is true', () => {
    renderHook(() => useEvents(1000, 2000));
    expect(mockFetchEvents).toHaveBeenCalledWith(1000, 2000);
  });

  it('does not fetch when autoFetch is false', () => {
    renderHook(() => useEvents(1000, 2000, { autoFetch: false }));
    expect(mockFetchEvents).not.toHaveBeenCalled();
  });

  it('returns events from store', () => {
    const { result } = renderHook(() => useEvents(1000, 2000, { autoFetch: false }));
    expect(result.current.events).toHaveLength(1);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('refresh calls fetchEvents again', async () => {
    const { result } = renderHook(() => useEvents(1000, 2000, { autoFetch: false }));
    mockFetchEvents.mockClear();

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockFetchEvents).toHaveBeenCalledWith(1000, 2000);
  });

  it('clearError calls store clearError', () => {
    const { result } = renderHook(() => useEvents(1000, 2000, { autoFetch: false }));

    act(() => {
      result.current.clearError();
    });

    expect(mockClearError).toHaveBeenCalled();
  });
});
