// ========== Window utilities ==========

/**
 * Close window to system tray (three-level fallback strategy).
 * V1: just hide the window.
 */
export async function closeToTray(): Promise<void> {
  try {
    // @ts-expect-error Tauri API available at runtime
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const win = getCurrentWindow();
    await win.hide();
  } catch {
    // Silent fail - window will still be hidden by Tauri
  }
}

/**
 * Get current window reference.
 */
export async function getCurrentAppWindow() {
  // @ts-expect-error Tauri API available at runtime
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  return getCurrentWindow();
}
