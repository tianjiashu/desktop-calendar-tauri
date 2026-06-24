// ========== Diagnostics hook ==========

import { useState, useCallback } from 'react';
import type { SystemDiagnostic } from '../types/diagnostic.types';
import { invokeSafe } from '../utils/invokeSafe';

interface UseDiagnosticsReturn {
  diagnostic: SystemDiagnostic | null;
  isLoading: boolean;
  fetchDiagnostics: () => Promise<void>;
  isVisible: boolean;
  toggle: () => void;
}

/**
 * Hook for fetching and displaying runtime diagnostics.
 * Press the diagnostics button in the status bar to toggle the diagnostic panel.
 */
export function useDiagnostics(): UseDiagnosticsReturn {
  const [diagnostic, setDiagnostic] = useState<SystemDiagnostic | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const fetchDiagnostics = useCallback(async () => {
    setIsLoading(true);
    const result = await invokeSafe<SystemDiagnostic>('get_diagnostics');
    if (result.ok) {
      setDiagnostic(result.value);
    }
    setIsLoading(false);
  }, []);

  const toggle = useCallback(async () => {
    const next = !isVisible;
    setIsVisible(next);
    if (next) {
      await fetchDiagnostics();
    }
  }, [isVisible, fetchDiagnostics]);

  return { diagnostic, isLoading, fetchDiagnostics, isVisible, toggle };
}
