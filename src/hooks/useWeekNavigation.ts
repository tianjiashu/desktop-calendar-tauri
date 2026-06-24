// ========== Week navigation hook (F22-F25) ==========

import { useState, useCallback, useMemo } from 'react';
import { getMonday, getWeekRange, formatWeekTitle } from '../utils/dateUtils';

interface UseWeekNavigationReturn {
  currentDate: Date;
  monday: Date;
  sunday: Date;
  weekTitle: string;
  isCurrentWeek: boolean;
  goToPrevWeek: () => void;
  goToNextWeek: () => void;
  goToToday: () => void;
  setCurrentDate: (date: Date) => void;
}

/**
 * Manages week navigation: prev/next week, today, refresh.
 */
export function useWeekNavigation(): UseWeekNavigationReturn {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { monday, sunday } = useMemo(
    () => getWeekRange(currentDate),
    [currentDate],
  );

  const weekTitle = useMemo(
    () => formatWeekTitle(monday, sunday),
    [monday, sunday],
  );

  const isCurrentWeek = useMemo(() => {
    const now = new Date();
    const nowMonday = getMonday(now);
    return nowMonday.getTime() === monday.getTime();
  }, [monday]);

  const goToPrevWeek = useCallback(() => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  return {
    currentDate,
    monday,
    sunday,
    weekTitle,
    isCurrentWeek,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
    setCurrentDate,
  };
}
