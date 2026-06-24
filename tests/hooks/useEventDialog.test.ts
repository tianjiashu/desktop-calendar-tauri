// ========== useEventDialog integration tests ==========

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { CalendarEvent } from '../../src/types';

// Mock the Zustand store before importing the hook
vi.mock('../../src/stores/useCalendarStore', () => ({
  useCalendarStore: () => ({
    createEvent: vi.fn().mockResolvedValue(undefined),
    updateEvent: vi.fn().mockResolvedValue(undefined),
    deleteEvent: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { useEventDialog } from '../../src/hooks/useEventDialog';

function makeEvent(overrides: Partial<CalendarEvent> & { id: string }): CalendarEvent {
  const now = Date.now();
  return {
    id: overrides.id,
    title: 'Test Event',
    start_time: now,
    end_time: now + 3600_000,
    timezone: 'Asia/Shanghai',
    is_all_day: false,
    status: 'confirmed',
    color: '#3B82F6',
    event_type: 'default',
    created_by: 'human',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('useEventDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with closed dialog', () => {
    const { result } = renderHook(() => useEventDialog());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.mode).toBe('create');
    expect(result.current.editingEvent).toBeUndefined();
    expect(result.current.preselectedDate).toBeUndefined();
  });

  it('openCreateDialog sets isOpen and preselectedDate', () => {
    const { result } = renderHook(() => useEventDialog());
    const date = new Date(2026, 5, 22);

    act(() => {
      result.current.openCreateDialog(date);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.mode).toBe('create');
    expect(result.current.preselectedDate).toEqual(date);
    expect(result.current.editingEvent).toBeUndefined();
  });

  it('openEditDialog sets isOpen and editingEvent', () => {
    const { result } = renderHook(() => useEventDialog());
    const event = makeEvent({ id: '1' });

    act(() => {
      result.current.openEditDialog(event);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.mode).toBe('edit');
    expect(result.current.editingEvent).toEqual(event);
  });

  it('closeDialog resets state', () => {
    const { result } = renderHook(() => useEventDialog());
    const date = new Date(2026, 5, 22);

    act(() => {
      result.current.openCreateDialog(date);
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.closeDialog();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.mode).toBe('create');
  });
});
