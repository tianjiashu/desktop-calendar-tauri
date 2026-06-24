// ========== Data sync hook (08-data-sync) ==========

import { useEffect } from 'react';
import { useCalendarStore } from '../stores/useCalendarStore';

/**
 * Hook for background sync: periodic polling + window focus refresh.
 * Ensures data consistency even if Tauri events are missed.
 */
export function useSync(): void {
  const refetch = useCalendarStore(s => s.fetchEvents);

  // 30-second polling fallback
  useEffect(() => {
    const timer = setInterval(() => {
      const { events } = useCalendarStore.getState();
      if (events.length > 0) {
        // Only refetch if we have a previous data context
        const now = new Date();
        const monday = new Date(now);
        monday.setDate(monday.getDate() - ((now.getDay() + 6) % 7));
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        refetch(monday.getTime(), sunday.getTime());
      }
    }, 30_000);

    return () => clearInterval(timer);
  }, [refetch]);

  // Refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(monday.getDate() - ((now.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      refetch(monday.getTime(), sunday.getTime());
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch]);
}
