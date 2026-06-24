// ========== Error handler hook (09-error-handling) ==========

import { useState, useCallback } from 'react';
import { AppError, ErrorCode } from '../types/error.types';
import { logger } from '../utils/logger';

interface UseErrorHandlerReturn {
  error: AppError | null;
  handleError: (e: unknown, context?: string) => void;
  clearError: () => void;
}

/**
 * Hook for managing error state with classification and display.
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<AppError | null>(null);

  const handleError = useCallback((e: unknown, context?: string) => {
    const appError = e instanceof AppError
      ? e
      : AppError.from(e, context);

    // Classify and format error messages
    let displayError = appError;
    switch (appError.code) {
      case ErrorCode.EVENT_NOT_FOUND:
        displayError = new AppError(appError.code, '事件不存在或已被删除', appError.details);
        break;
      case ErrorCode.PORT_IN_USE:
        displayError = new AppError(appError.code, '端口 18765 已被占用，请关闭其他实例后重试', appError.details);
        break;
      case ErrorCode.INVALID_TIME_RANGE:
        displayError = new AppError(appError.code, '时间范围无效：开始时间不能晚于结束时间', appError.details);
        break;
    }

    setError(displayError);
    logger.error(displayError.code, displayError.message);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { error, handleError, clearError };
}
