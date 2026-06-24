// ========== useDiagnostics integration tests ==========

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockInvokeSafe } = vi.hoisted(() => ({
  mockInvokeSafe: vi.fn(),
}));

vi.mock('../../src/utils/invokeSafe', () => ({
  invokeSafe: mockInvokeSafe,
}));

import { useDiagnostics } from '../../src/hooks/useDiagnostics';

describe('useDiagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with diagnostic null', () => {
    const { result } = renderHook(() => useDiagnostics());

    expect(result.current.diagnostic).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isVisible).toBe(false);
  });

  it('toggle shows diagnostic panel and fetches', async () => {
    const mockDiag = { log_dir: '/logs', db_path: '/db', db_wal_enabled: true, mcp_port: 18765, mcp_running: true, recent_errors: [] };
    mockInvokeSafe.mockResolvedValue({ ok: true, value: mockDiag });

    const { result } = renderHook(() => useDiagnostics());

    await act(async () => {
      await result.current.toggle();
    });

    expect(result.current.isVisible).toBe(true);
    expect(mockInvokeSafe).toHaveBeenCalledWith('get_diagnostics');
    expect(result.current.diagnostic).toEqual(mockDiag);
  });

  it('toggle again hides panel', async () => {
    mockInvokeSafe.mockResolvedValue({ ok: true, value: null });

    const { result } = renderHook(() => useDiagnostics());

    // Show first
    await act(async () => {
      await result.current.toggle();
    });
    expect(result.current.isVisible).toBe(true);

    // Hide
    await act(async () => {
      await result.current.toggle();
    });
    expect(result.current.isVisible).toBe(false);
  });

  it('fetchDiagnostics handles failure', async () => {
    mockInvokeSafe.mockResolvedValue({ ok: false, error: { code: 'INTERNAL', message: 'fail' } });

    const { result } = renderHook(() => useDiagnostics());

    await act(async () => {
      await result.current.fetchDiagnostics();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.diagnostic).toBeNull();
  });
});
