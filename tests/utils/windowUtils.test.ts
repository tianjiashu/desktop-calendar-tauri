// ========== windowUtils integration tests ==========

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockHide = vi.fn();
const mockGetCurrentWindow = vi.fn(() => ({ hide: mockHide }));

// Mock the dynamic import of @tauri-apps/api/window
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: mockGetCurrentWindow,
}));

import { closeToTray, getCurrentAppWindow } from '../../src/utils/windowUtils';

describe('closeToTray', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls window.hide()', async () => {
    await closeToTray();
    expect(mockHide).toHaveBeenCalled();
  });

  it('does not throw when hide fails', async () => {
    mockHide.mockRejectedValue(new Error('window destroyed'));
    await expect(closeToTray()).resolves.toBeUndefined();
  });
});

describe('getCurrentAppWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns current window', async () => {
    const win = await getCurrentAppWindow();
    expect(win).toBeDefined();
    expect(mockGetCurrentWindow).toHaveBeenCalled();
  });
});
