// ========== useErrorHandler integration tests ==========

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '../../src/hooks/useErrorHandler';
import { AppError, ErrorCode } from '../../src/types/error.types';

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with null error', () => {
    const { result } = renderHook(() => useErrorHandler());
    expect(result.current.error).toBeNull();
  });

  it('handleError sets error', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError(new Error('test error'));
    });

    expect(result.current.error).toBeInstanceOf(AppError);
  });

  it('clearError resets to null', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError(new Error('test'));
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('classifies EVENT_NOT_FOUND with Chinese message', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError(new Error('EventNotFound: abc'));
    });

    expect(result.current.error?.message).toBe('事件不存在或已被删除');
  });

  it('classifies PORT_IN_USE with Chinese message', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError(new Error('Port 8080 is in use'));
    });

    expect(result.current.error?.message).toContain('端口');
  });

  it('classifies INVALID_TIME_RANGE with Chinese message', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError(new Error('Invalid time range'));
    });

    expect(result.current.error?.message).toContain('时间范围无效');
  });

  it('passes through AppError instances', () => {
    const { result } = renderHook(() => useErrorHandler());
    const original = new AppError(ErrorCode.INTERNAL, 'custom message');

    act(() => {
      result.current.handleError(original);
    });

    expect(result.current.error?.message).toBe('custom message');
  });
});
