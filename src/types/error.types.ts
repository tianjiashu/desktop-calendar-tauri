// ========== Enhanced error types (09-error-handling) ==========

/** Error codes aligned with Rust AppError */
export enum ErrorCode {
  // Database
  DB_ERROR = 'DB_ERROR',
  EVENT_NOT_FOUND = 'EVENT_NOT_FOUND',
  EVENT_ALREADY_EXISTS = 'EVENT_ALREADY_EXISTS',
  INVALID_TIME_RANGE = 'INVALID_TIME_RANGE',

  // MCP
  MCP_ERROR = 'MCP_ERROR',
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  INVALID_TOOL_ARGS = 'INVALID_TOOL_ARGS',

  // HTTP / Network
  HTTP_ERROR = 'HTTP_ERROR',
  PORT_IN_USE = 'PORT_IN_USE',

  // System
  IO_ERROR = 'IO_ERROR',

  // Generic
  INTERNAL = 'INTERNAL',
  UNKNOWN = 'UNKNOWN',
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  /** Construct from any caught error */
  static from(e: unknown, context?: string): AppError {
    if (e instanceof AppError) return e;
    const msg = e instanceof Error ? e.message : String(e);
    const prefix = context ? `[${context}] ` : '';

    // Try to parse Rust error patterns
    if (msg.includes('Event not found') || msg.includes('EventNotFound')) {
      return new AppError(ErrorCode.EVENT_NOT_FOUND, prefix + msg);
    }
    if (msg.includes('Invalid time range') || msg.includes('InvalidTimeRange')) {
      return new AppError(ErrorCode.INVALID_TIME_RANGE, prefix + msg);
    }
    if (msg.includes('Port') && msg.includes('in use')) {
      return new AppError(ErrorCode.PORT_IN_USE, prefix + msg);
    }
    if (msg.includes('Tool not found')) {
      return new AppError(ErrorCode.TOOL_NOT_FOUND, prefix + msg);
    }

    return new AppError(ErrorCode.INTERNAL, prefix + msg);
  }
}

/** Result type pattern (no silent catch) */
export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };
