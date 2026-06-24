// ========== openEventLink integration tests ==========

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openEventLink } from '../../src/utils/openEventLink';

describe('openEventLink', () => {
  let mockWindowOpen: ReturnType<typeof vi.fn>;
  let mockClipboardWrite: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockWindowOpen = vi.fn();
    mockClipboardWrite = vi.fn();

    // Override the polyfill mocks with test mocks
    (globalThis.window as Record<string, unknown>).open = mockWindowOpen;
    (globalThis.navigator as Record<string, unknown>).clipboard = {
      writeText: mockClipboardWrite,
    };
  });

  afterEach(() => {
    // Restore polyfill defaults
    (globalThis.window as Record<string, unknown>).open = () => null;
    (globalThis.navigator as Record<string, unknown>).clipboard = {
      writeText: () => Promise.resolve(),
    };
  });

  it('calls window.open with URL', () => {
    openEventLink('https://example.com');
    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://example.com',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('does nothing when URL is empty string', () => {
    openEventLink('');
    expect(mockWindowOpen).not.toHaveBeenCalled();
    expect(mockClipboardWrite).not.toHaveBeenCalled();
  });

  it('does nothing when URL is undefined', () => {
    openEventLink(undefined);
    expect(mockWindowOpen).not.toHaveBeenCalled();
  });

  it('falls back to clipboard when window.open throws', () => {
    mockWindowOpen.mockImplementation(() => {
      throw new Error('blocked');
    });
    mockClipboardWrite.mockResolvedValue(undefined);

    openEventLink('https://example.com');
    expect(mockClipboardWrite).toHaveBeenCalledWith('https://example.com');
  });

  it('handles clipboard fallback failure silently', () => {
    mockWindowOpen.mockImplementation(() => {
      throw new Error('blocked');
    });
    mockClipboardWrite.mockRejectedValue(new Error('clipboard denied'));

    // Should not throw
    expect(() => openEventLink('https://example.com')).not.toThrow();
  });
});
