import { useCallback, useEffect, useState } from 'react';
import { useCalendarStore } from '../stores/useCalendarStore';

interface VisibleWeekEvents {
  isRefreshing: boolean;
  refreshEvents: () => Promise<void>;
}

export function useVisibleWeekEvents(
  weekStart: Date,
  weekEnd: Date,
  isWidgetMode: boolean,
): VisibleWeekEvents {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const weekStartMs = weekStart.getTime();
  const weekEndMs = weekEnd.getTime();

  const fetchVisibleWeek = useCallback(async () => {
    const { fetchEvents } = useCalendarStore.getState();
    await fetchEvents(weekStartMs, weekEndMs);
  }, [weekStartMs, weekEndMs]);

  useEffect(() => {
    fetchVisibleWeek();
  }, [fetchVisibleWeek]);

  useEffect(() => {
    if (isWidgetMode) return;
    fetchVisibleWeek();
  }, [fetchVisibleWeek, isWidgetMode]);

  const refreshEvents = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchVisibleWeek();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchVisibleWeek]);

  return { isRefreshing, refreshEvents };
}
