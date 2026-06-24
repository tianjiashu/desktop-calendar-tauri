// ========== Drag-to-move hook (F5) ==========

import { useCallback, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { logger } from '../utils/logger';

interface DragState {
  isDragging: boolean;       // true once startDragging has been invoked
  startX: number;            // mousedown screenX
  startY: number;            // mousedown screenY
  pending: boolean;          // true between mousedown and threshold-cross
}

/** Pixels of mouse travel before we commit to a drag (instead of click/dblclick). */
const DRAG_THRESHOLD_PX = 4;

/**
 * Hook for window drag-to-move that preserves double-click.
 *
 * Design: defer `startDragging()` until the mouse moves beyond
 * DRAG_THRESHOLD_PX. This way, a quick click/double-click (no real movement)
 * does NOT trigger drag, so onDoubleClick can fire normally.
 *
 * On high-DPI / transparent windows, `startDragging()` is the only reliable
 * drag primitive — but it hijacks the entire mouse stream, so we must call
 * it lazily.
 */
export function useDragMove() {
  const drag = useRef<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    pending: false,
  });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Record start position; don't start dragging yet
    drag.current = {
      isDragging: false,
      startX: e.screenX,
      startY: e.screenY,
      pending: true,
    };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const state = drag.current;
    if (!state.pending || state.isDragging) return;

    const dx = e.screenX - state.startX;
    const dy = e.screenY - state.startY;
    if (Math.abs(dx) < DRAG_THRESHOLD_PX && Math.abs(dy) < DRAG_THRESHOLD_PX) return;

    // Crossed threshold — commit to a drag
    state.pending = false;
    state.isDragging = true;
    getCurrentWindow().startDragging().catch((err: unknown) => {
      logger.warn('startDragging failed:', err);
      state.isDragging = false;
    });
  }, []);

  const onMouseUp = useCallback(() => {
    // Reset both pending and dragging states so subsequent clicks/dblclicks work
    drag.current.pending = false;
    drag.current.isDragging = false;
  }, []);

  return { onMouseDown, onMouseMove, onMouseUp };
}
