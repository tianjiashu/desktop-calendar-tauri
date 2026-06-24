// ========== event.types integration tests ==========

import { describe, it, expect } from 'vitest';
import { AppError } from '../../src/types/event.types';

describe('AppError (event.types)', () => {
  it('constructs with code and message', () => {
    const err = new AppError('INTERNAL', 'something broke');
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AppError');
    expect(err.code).toBe('INTERNAL');
    expect(err.message).toBe('something broke');
    expect(err.details).toBeUndefined();
  });

  it('constructs with details', () => {
    const details = { foo: 'bar' };
    const err = new AppError('DB_ERROR', 'db failed', details);
    expect(err.details).toEqual(details);
  });

  describe('from()', () => {
    it('returns same AppError instance', () => {
      const original = new AppError('INTERNAL', 'original');
      const result = AppError.from(original);
      expect(result).toBe(original);
    });

    it('parses EventNotFound from error message', () => {
      const err = AppError.from(new Error('EventNotFound: abc123'));
      expect(err.code).toBe('EVENT_NOT_FOUND');
    });

    it('defaults to INTERNAL for unknown errors', () => {
      const err = AppError.from(new Error('some random error'));
      expect(err.code).toBe('INTERNAL');
    });

    it('handles non-Error thrown values', () => {
      const err = AppError.from('string error');
      expect(err.code).toBe('UNKNOWN');
      expect(err.message).toBe('string error');
    });

    it('handles null input', () => {
      const err = AppError.from(null);
      expect(err.code).toBe('UNKNOWN');
    });
  });
});
