// ========== Data sync hook (08-data-sync) ==========

import { useEffect } from 'react';
import { useCalendarStore } from '../stores/useCalendarStore';

/**
 * Hook for background sync: periodic polling + window focus refresh.
 * Ensures data consistency even if Tauri events are missed.
 */
export function useSync(): void {
  const refetch = useCalendarStore(s => s.refetch);

  // 30-second polling fallback
  useEffect(() => {
    const timer = setInterval(() => {
      refetch();
    }, 30_000);

    return () => clearInterval(timer);
  }, [refetch]);

  // Refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      refetch();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch]);
}
