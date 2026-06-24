// ========== Window manager hook (F1-F7) ==========

import { useState, useRef, useCallback } from 'react';
import { logger } from '../utils/logger';
import {
  WIDGET_SIZE,
  WEEK_VIEW_SIZE,
  TRANSITION_LOCK_MS,
} from '../constants/windowConfig';

interface WindowManager {
  isWidgetMode: boolean;
  isTransitioning: boolean;
  toggleExpand: () => Promise<void>;
  shrinkToWidget: () => Promise<void>;
}

/**
 * Manages window mode switching between float widget and week view.
 *
 * Key design: React state is updated BEFORE window resize, so the correct
 * component renders before size changes — eliminating visual flash.
 *
 * Transition lock prevents concurrent state conflicts from rapid clicks.
 */
export function useWindowManager(): WindowManager {
  const [isWidgetMode, setIsWidgetMode] = useState(true);
  const isTransitioning = useRef(false);

/** Frontend → Rust diagnostic log for offline analysis */
async function diag(msg: string) {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('diag_log', { message: msg });
  } catch { /* best-effort */ }
}

const doSetSize = useCallback(async (size: { width: number; height: number }, resizable: boolean) => {
    const { LogicalSize, getCurrentWindow } = await import('@tauri-apps/api/window');
    const win = getCurrentWindow();
    const target = new LogicalSize(size.width, size.height);

    // Lock window to exact size (no user resize)
    await win.setResizable(resizable);
    await win.setSize(target);
    if (!resizable) {
      // Clamp min/max to prevent any size change when not resizable
      await win.setMinSize(target);
      await win.setMaxSize(target);
    } else {
      // Restore reasonable bounds for draggable widget
      await win.setMinSize(new LogicalSize(100, 100));
      await win.setMaxSize(new LogicalSize(200, 200));
    }
  }, []);

  /** Set always-on-top via IPC. Logs failure so it's traceable. */
  const setAlwaysOnTop = useCallback(async (on: boolean) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('set_always_on_top', { onTop: on });
    } catch (e) {
      // Log failure but don't block the transition
      logger.warn('set_always_on_top failed:', e);
    }
  }, []);

  const toggleExpand = useCallback(async () => {
    if (isTransitioning.current) {
      logger.warn('toggleExpand BLOCKED: already transitioning');
      return;
    }
    isTransitioning.current = true;
    logger.info('=== toggleExpand START (widget → weekView) ===');

    try {
      setIsWidgetMode(false);             // Switch React state FIRST — renders WeekView
      await setAlwaysOnTop(false);        // Disable pin-to-top for week view
      await doSetSize(WEEK_VIEW_SIZE, false); // Fixed size, no resize
      logger.info('=== toggleExpand COMPLETE ===');
    } catch (e) {
      logger.error('toggleExpand ERROR:', e);
    } finally {
      setTimeout(() => {
        isTransitioning.current = false;
      }, TRANSITION_LOCK_MS);
    }
  }, [doSetSize, setAlwaysOnTop]);

  const shrinkToWidget = useCallback(async () => {
    if (isTransitioning.current) {
      logger.warn('shrinkToWidget BLOCKED: already transitioning');
      return;
    }
    isTransitioning.current = true;
    logger.info('=== shrinkToWidget START (weekView → widget) ===');

    try {
      setIsWidgetMode(true);              // Switch React state FIRST — renders BallWidget
      await doSetSize(WIDGET_SIZE, true); // Resizable for dragging
      await setAlwaysOnTop(true);         // Re-enable pin-to-top
      logger.info('=== shrinkToWidget COMPLETE ===');
    } catch (e) {
      logger.error('shrinkToWidget ERROR:', e);
    } finally {
      setTimeout(() => {
        isTransitioning.current = false;
      }, TRANSITION_LOCK_MS);
    }
  }, [doSetSize, setAlwaysOnTop]);

  return { isWidgetMode, isTransitioning: isTransitioning.current, toggleExpand, shrinkToWidget };
}
