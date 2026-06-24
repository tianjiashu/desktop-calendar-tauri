// ========== Event drag & resize hook ==========

import { useCallback, useRef, useState } from 'react';
import type { CalendarEvent } from '../types';
import { logger } from '../utils/logger';
import { timestampToMinutes } from '../utils/dateUtils';
import {
  type DragMode,
  type DragPreview,
  type DragState,
  type SnapInfo,
  DRAG_THRESHOLD_PX,
  resolveSnappedPreview,
  buildTimestamp,
  getDateMidnight,
  buildCrossDayTimestamp,
  detectTargetDate,
} from '../utils/dragUtils';

export type { DragMode, DragPreview, SnapInfo };

export interface UseEventDragOptions {
  event: CalendarEvent;
  onUpdate: (id: string, startTime: number, endTime: number) => void;
  onEdit?: (event: CalendarEvent) => void;
}

export interface UseEventDragReturn {
  isDragging: boolean;
  crossDay: boolean;
  dragPreview: DragPreview | null;
  snapInfo: SnapInfo;
  onMouseDownMove: (e: React.MouseEvent) => void;
  onMouseDownResizeTop: (e: React.MouseEvent) => void;
  onMouseDownResizeBottom: (e: React.MouseEvent) => void;
  onMouseDownBody: (e: React.MouseEvent) => void;
}

/**
 * Hook for handling event card drag-to-move and edge-resize interactions.
 *
 * - Move: drag the card body to shift start & end times together
 * - Resize-top: drag the top edge to change start time
 * - Resize-bottom: drag the bottom edge to change end time
 *
 * Features:
 * - Unified snap: preview and final position use the same snap logic
 * - rAF-throttled mousemove for 60fps performance
 * - On IPC failure, preview stays at final position (no bounce-back)
 * - SnapInfo exposed for grid line highlighting
 */
export function useEventDrag({ event, onUpdate, onEdit }: UseEventDragOptions): UseEventDragReturn {
  const dragRef = useRef<DragState | null>(null);
  const rafRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [snapInfo, setSnapInfo] = useState<SnapInfo>({ edge: null, snappedMinutes: null });
  const [crossDay, setCrossDay] = useState(false);

  // ===== beginDrag =====

  const beginDrag = useCallback(
    (mode: DragMode, clientY: number, clientX: number) => {
      const origStartMin = timestampToMinutes(event.start_time);
      const origEndMin = timestampToMinutes(event.end_time);
      logger.info(
        `[DRAG] beginDrag | mode=${mode} | eventId=${event.id} | ` +
        `start=${origStartMin}min end=${origEndMin}min | clientY=${clientY} clientX=${clientX}`,
      );
      dragRef.current = {
        mode,
        originalStart: event.start_time,
        originalEnd: event.end_time,
        startClientY: clientY,
        startClientX: clientX,
        deltaPx: 0,
        targetDate: null,
      };
      setIsDragging(true);
    },
    [event.start_time, event.end_time, event.id],
  );

  // ===== endDrag =====

  const endDrag = useCallback(
    async (totalDeltaPx: number) => {
      const state = dragRef.current;
      if (!state) {
        logger.warn('[DRAG] endDrag called but dragRef.current is null!');
        return;
      }

      // Below threshold → treat as click
      if (Math.abs(totalDeltaPx) < DRAG_THRESHOLD_PX) {
        logger.info(`[DRAG] endDrag → CLICK | delta=${totalDeltaPx}px | mode=${state.mode}`);
        dragRef.current = null;
        setIsDragging(false);
        setDragPreview(null);
        setSnapInfo({ edge: null, snappedMinutes: null });
        setCrossDay(false);
        if (state.mode === 'move') onEdit?.(event);
        return;
      }

      const resolved = resolveSnappedPreview(state, totalDeltaPx);
      const origDate = getDateMidnight(state.originalStart);
      const isCrossDay = state.targetDate !== null && state.targetDate !== origDate;

      const newStartTs = isCrossDay
        ? buildCrossDayTimestamp(state.targetDate!, resolved.topMinutes)
        : buildTimestamp(event.start_time, resolved.topMinutes);
      const newEndTs = isCrossDay
        ? buildCrossDayTimestamp(state.targetDate!, resolved.bottomMinutes)
        : buildTimestamp(event.start_time, resolved.bottomMinutes);

      logger.info(
        `[DRAG] endDrag → COMMIT | mode=${state.mode} | deltaPx=${totalDeltaPx} | ` +
        `final.start=${resolved.topMinutes}min (ts=${newStartTs}) | ` +
        `final.end=${resolved.bottomMinutes}min (ts=${newEndTs}) | ` +
        `preview(top=${resolved.topPx.toFixed(1)}, h=${resolved.heightPx.toFixed(1)})`,
      );

      // Show final position immediately, even during async IPC
      setDragPreview({ topPx: resolved.topPx, heightPx: resolved.heightPx });

      try {
        await onUpdate(event.id, newStartTs, newEndTs);
        logger.info(`[DRAG] endDrag → onUpdate OK`);
        requestAnimationFrame(() => setDragPreview(null));
      } catch (e) {
        logger.error(`[DRAG] endDrag → onUpdate FAILED:`, e);
        const isConflictLimit = e instanceof Error && e.message === 'CONFLICT_LIMIT';
        if (isConflictLimit) {
          // Bounce back: clear preview so card snaps to original position
          setDragPreview(null);
        }
        // For other errors, keep preview (don't bounce to stale data)
      } finally {
        dragRef.current = null;
        setIsDragging(false);
        setSnapInfo({ edge: null, snappedMinutes: null });
        setCrossDay(false);
      }
    },
    [event, onEdit, onUpdate],
  );

  // ===== handleMouseMove (rAF-throttled) =====

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const state = dragRef.current;
      if (!state) return;

      state.deltaPx = e.clientY - state.startClientY;

      // Only check cross-day for move mode (not resize)
      if (state.mode === 'move') {
        const targetDate = detectTargetDate(e.clientX);
        const origDate = getDateMidnight(state.originalStart);
        state.targetDate = targetDate !== null && targetDate !== origDate ? targetDate : null;
      }

      // rAF throttle: skip if a frame is already pending
      if (rafRef.current !== null) return;

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const s = dragRef.current;
        if (!s) return;

        const resolved = resolveSnappedPreview(s, s.deltaPx);

        setSnapInfo(resolved.snap);
        setDragPreview({ topPx: resolved.topPx, heightPx: resolved.heightPx });
        setCrossDay(s.targetDate !== null);

        logger.debug(
          `[DRAG] mousemove | clientY=${e.clientY} deltaPx=${s.deltaPx} | ` +
          `snap(${resolved.topMinutes.toFixed(1)},${resolved.bottomMinutes.toFixed(1)}) | ` +
          `preview(top=${resolved.topPx.toFixed(1)}, h=${resolved.heightPx.toFixed(1)}) | ` +
          `snapEdge=${resolved.snap.edge} | crossDay=${s.targetDate !== null}`,
        );
      });
    },
    [],
  );

  // ===== handleMouseUp =====

  const handleMouseUp = useCallback(() => {
    const state = dragRef.current;
    if (state) endDrag(state.deltaPx);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [endDrag, handleMouseMove]);

  // ===== attachListeners =====

  const attachListeners = useCallback(
    (mode: DragMode, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      beginDrag(mode, e.clientY, e.clientX);
    },
    [beginDrag, handleMouseMove, handleMouseUp],
  );

  // ===== Public event handlers =====

  const onMouseDownBody = useCallback(
    (e: React.MouseEvent) => attachListeners('move', e),
    [attachListeners],
  );
  const onMouseDownMove = useCallback(
    (e: React.MouseEvent) => attachListeners('move', e),
    [attachListeners],
  );
  const onMouseDownResizeTop = useCallback(
    (e: React.MouseEvent) => attachListeners('resize-top', e),
    [attachListeners],
  );
  const onMouseDownResizeBottom = useCallback(
    (e: React.MouseEvent) => attachListeners('resize-bottom', e),
    [attachListeners],
  );

  return {
    isDragging,
    crossDay,
    dragPreview,
    snapInfo,
    onMouseDownMove,
    onMouseDownResizeTop,
    onMouseDownResizeBottom,
    onMouseDownBody,
  };
}
