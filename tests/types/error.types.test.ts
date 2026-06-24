// ========== error.types integration tests ==========

import { describe, it, expect } from 'vitest';
import { AppError, ErrorCode } from '../../src/types/error.types';

describe('ErrorCode', () => {
  it('has all expected codes', () => {
    expect(ErrorCode.DB_ERROR).toBe('DB_ERROR');
    expect(ErrorCode.EVENT_NOT_FOUND).toBe('EVENT_NOT_FOUND');
    expect(ErrorCode.EVENT_ALREADY_EXISTS).toBe('EVENT_ALREADY_EXISTS');
    expect(ErrorCode.INVALID_TIME_RANGE).toBe('INVALID_TIME_RANGE');
    expect(ErrorCode.MCP_ERROR).toBe('MCP_ERROR');
    expect(ErrorCode.TOOL_NOT_FOUND).toBe('TOOL_NOT_FOUND');
    expect(ErrorCode.INVALID_TOOL_ARGS).toBe('INVALID_TOOL_ARGS');
    expect(ErrorCode.HTTP_ERROR).toBe('HTTP_ERROR');
    expect(ErrorCode.PORT_IN_USE).toBe('PORT_IN_USE');
    expect(ErrorCode.IO_ERROR).toBe('IO_ERROR');
    expect(ErrorCode.INTERNAL).toBe('INTERNAL');
    expect(ErrorCode.UNKNOWN).toBe('UNKNOWN');
  });
});

describe('AppError', () => {
  it('constructs with code and message', () => {
    const err = new AppError(ErrorCode.INTERNAL, 'something broke');
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AppError');
    expect(err.code).toBe(ErrorCode.INTERNAL);
    expect(err.message).toBe('something broke');
    expect(err.details).toBeUndefined();
  });

  it('constructs with details', () => {
    const details = { foo: 'bar' };
    const err = new AppError(ErrorCode.DB_ERROR, 'db failed', details);
    expect(err.details).toEqual(details);
  });

  describe('from()', () => {
    it('returns same AppError instance', () => {
      const original = new AppError(ErrorCode.INTERNAL, 'original');
      const result = AppError.from(original);
      expect(result).toBe(original);
    });

    it('parses EventNotFound error', () => {
      const err = AppError.from(new Error('Event not found: abc123'));
      expect(err.code).toBe(ErrorCode.EVENT_NOT_FOUND);
    });

    it('parses EventNotFound Rust error', () => {
      const err = AppError.from(new Error('EventNotFound: something'));
      expect(err.code).toBe(ErrorCode.EVENT_NOT_FOUND);
    });

    it('parses InvalidTimeRange error', () => {
      const err = AppError.from(new Error('Invalid time range: start > end'));
      expect(err.code).toBe(ErrorCode.INVALID_TIME_RANGE);
    });

    it('parses InvalidTimeRange Rust error', () => {
      const err = AppError.from(new Error('InvalidTimeRange: bad'));
      expect(err.code).toBe(ErrorCode.INVALID_TIME_RANGE);
    });

    it('parses PortInUse error', () => {
      const err = AppError.from(new Error('Port 8080 is in use'));
      expect(err.code).toBe(ErrorCode.PORT_IN_USE);
    });

    it('parses ToolNotFound error', () => {
      const err = AppError.from(new Error('Tool not found: bad_tool'));
      expect(err.code).toBe(ErrorCode.TOOL_NOT_FOUND);
    });

    it('defaults to INTERNAL for unknown errors', () => {
      const err = AppError.from(new Error('some random error'));
      expect(err.code).toBe(ErrorCode.INTERNAL);
    });

    it('handles non-Error thrown values', () => {
      const err = AppError.from('string error');
      expect(err.code).toBe(ErrorCode.INTERNAL);
      expect(err.message).toBe('string error');
    });

    it('prepends context prefix', () => {
      const err = AppError.from(new Error('db failure'), 'create_event');
      expect(err.message).toContain('[create_event]');
      expect(err.message).toContain('db failure');
    });

    it('handles null/undefined input gracefully', () => {
      const err = AppError.from(null);
      expect(err.code).toBe(ErrorCode.INTERNAL);
    });
  });
});
