// ========== Window manager hook (F1-F7) ==========

import { useState, useRef, useCallback, useEffect } from 'react';
import { logger } from '../utils/logger';
import {
  WIDGET_SIZE,
  WEEK_VIEW_SIZE,
  TRANSITION_LOCK_MS,
} from '../constants/windowConfig';

const WINDOW_EDGE_MARGIN = 96;

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
  const didInitPosition = useRef(false);

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

  const waitForWindowSize = useCallback(async (size: { width: number; height: number }) => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const win = getCurrentWindow();

    for (let i = 0; i < 8; i += 1) {
      const outerSize = await win.outerSize();
      const scaleFactor = await win.scaleFactor();
      const logicalWidth = outerSize.width / scaleFactor;
      const logicalHeight = outerSize.height / scaleFactor;
      if (Math.abs(logicalWidth - size.width) < 12 && Math.abs(logicalHeight - size.height) < 12) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 24));
    }
  }, []);

  const moveToBottomRight = useCallback(async () => {
    const { PhysicalPosition, currentMonitor, getCurrentWindow } = await import('@tauri-apps/api/window');
    const win = getCurrentWindow();
    const monitor = await currentMonitor();
    if (!monitor) return;

    const outerSize = await win.outerSize();
    const margin = Math.round(WINDOW_EDGE_MARGIN * monitor.scaleFactor);
    const x = monitor.position.x + monitor.size.width - outerSize.width - margin;
    const y = monitor.position.y + monitor.size.height - outerSize.height - margin;
    await win.setPosition(new PhysicalPosition(x, y));
  }, []);

  const moveToCenter = useCallback(async () => {
    const { PhysicalPosition, currentMonitor, getCurrentWindow } = await import('@tauri-apps/api/window');
    const win = getCurrentWindow();
    const monitor = await currentMonitor();
    if (!monitor) {
      await win.center();
      return;
    }

    const outerSize = await win.outerSize();
    const x = monitor.position.x + Math.round((monitor.size.width - outerSize.width) / 2);
    const y = monitor.position.y + Math.round((monitor.size.height - outerSize.height) / 2);
    await win.setPosition(new PhysicalPosition(x, y));
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
      await waitForWindowSize(WEEK_VIEW_SIZE);
      await moveToCenter();
      logger.info('=== toggleExpand COMPLETE ===');
    } catch (e) {
      logger.error('toggleExpand ERROR:', e);
    } finally {
      setTimeout(() => {
        isTransitioning.current = false;
      }, TRANSITION_LOCK_MS);
    }
  }, [doSetSize, moveToCenter, setAlwaysOnTop, waitForWindowSize]);

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
      await moveToBottomRight();
      await setAlwaysOnTop(true);         // Re-enable pin-to-top
      logger.info('=== shrinkToWidget COMPLETE ===');
    } catch (e) {
      logger.error('shrinkToWidget ERROR:', e);
    } finally {
      setTimeout(() => {
        isTransitioning.current = false;
      }, TRANSITION_LOCK_MS);
    }
  }, [doSetSize, moveToBottomRight, setAlwaysOnTop]);

  useEffect(() => {
    if (didInitPosition.current) return;
    didInitPosition.current = true;

    const initWidgetWindow = async () => {
      try {
        await doSetSize(WIDGET_SIZE, true);
        await moveToBottomRight();
        await setAlwaysOnTop(true);
      } catch (e) {
        logger.warn('init widget window position failed:', e);
      }
    };

    initWidgetWindow();
  }, [doSetSize, moveToBottomRight, setAlwaysOnTop]);

  return { isWidgetMode, isTransitioning: isTransitioning.current, toggleExpand, shrinkToWidget };
}
