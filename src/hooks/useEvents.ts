// ========== Events hook (data fetching + refresh) ==========

import { useCallback, useEffect, useRef } from 'react';
import { useCalendarStore } from '../stores/useCalendarStore';

interface UseEventsOptions {
  /** Whether to auto-fetch on mount */
  autoFetch?: boolean;
}

/**
 * Hook for loading and refreshing calendar events within a date range.
 */
export function useEvents(startDate: number, endDate: number, options: UseEventsOptions = {}) {
  const { autoFetch = true } = options;
  const { events, isLoading, error, fetchEvents, clearError } = useCalendarStore();
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (autoFetch) {
      fetchEvents(startDate, endDate);
    }
    isInitialMount.current = false;
  }, [startDate, endDate, fetchEvents, autoFetch]);

  const refresh = useCallback(async () => {
    await fetchEvents(startDate, endDate);
  }, [startDate, endDate, fetchEvents]);

  // Check if there are events today (for indicator dot F20)
  const hasEventsToday = useCallback(async (): Promise<boolean> => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Directly call fetch with today's range
      await fetchEvents(today.getTime(), tomorrow.getTime());
      const currentEvents = useCalendarStore.getState().events;
      return currentEvents.filter(e => !e.deleted_at).length > 0;
    } catch {
      return false;
    }
  }, [fetchEvents]);

  return {
    events,
    isLoading,
    error,
    refresh,
    hasEventsToday,
    clearError,
  };
}
