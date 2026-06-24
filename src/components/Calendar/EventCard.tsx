// ========== Event card component (F13, F18, F19) ==========

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Warning } from '@phosphor-icons/react';
import type { CalendarEvent } from '../../types';
import { formatTime } from '../../utils/dateUtils';
import { EVENT_TYPE_COLORS } from '../../constants/eventTypeColors';
import EventIcon from './EventIcon';
import EventTooltip from './EventTooltip';
import { getTooltipPosition } from '../../utils/tooltipPosition';
import {
  calculateTimePosition,
  calculateDurationHeight,
} from '../../utils/eventFilter';
import { useEventDrag, type SnapInfo } from '../../hooks/useEventDrag';
import { logger } from '../../utils/logger';

interface EventCardProps {
  event: CalendarEvent;
  column: number;
  totalColumns: number;
  /** Whether this event conflicts (time-overlaps) with another event */
  hasConflict?: boolean;
  onEdit?: (event: CalendarEvent) => void;
  onUpdate?: (id: string, startTime: number, endTime: number) => void;
  /** Called when snap state changes — for grid line highlighting */
  onSnapChange?: (snapInfo: SnapInfo) => void;
}

const TOOLTIP_SIZE = { width: 220, height: 120 };

/**
 * Draggable event card in the week view.
 * Supports:
 * - Body drag to move (shift start & end together)
 * - Top/bottom edge resize handles
 * - Click to open edit dialog
 * - Hover tooltip
 */
const EventCard: React.FC<EventCardProps> = React.memo(({
  event,
  column,
  totalColumns,
  hasConflict = false,
  onEdit,
  onUpdate,
  onSnapChange,
}) => {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, placement: 'bottom' as const });
  const cardRef = useRef<HTMLDivElement>(null);
  const noopUpdate = useCallback(() => {}, []);
  const effectiveOnUpdate = onUpdate || noopUpdate;

  const {
    isDragging,
    dragPreview,
    snapInfo,
    onMouseDownBody,
    onMouseDownResizeTop,
    onMouseDownResizeBottom,
    crossDay,
  } = useEventDrag({
    event,
    onUpdate: effectiveOnUpdate,
    onEdit,
  });

  // Forward snap info upward for grid line highlighting
  const prevSnapRef = useRef<SnapInfo>({ edge: null, snappedMinutes: null });
  if (
    snapInfo.edge !== prevSnapRef.current.edge ||
    snapInfo.snappedMinutes !== prevSnapRef.current.snappedMinutes
  ) {
    prevSnapRef.current = snapInfo;
    onSnapChange?.(snapInfo);
  }

  const startPos = calculateTimePosition(event.start_time);
  const height = calculateDurationHeight(event.start_time, event.end_time);
  // Prefer user-set color, fall back to event-type default color
  const bgColor = event.color || EVENT_TYPE_COLORS[event.event_type] || 'var(--accent-500)';

  // Width and offset for multi-column layout (F14)
  const widthPercent = totalColumns > 0 ? 100 / totalColumns : 100;
  const leftPercent = column * widthPercent;

  // Log layout CSS values (only when multi-column to avoid spam)
  if (totalColumns > 1) {
    logger.info(
      `[EVENTCARD] multi-col layout | ${event.title.slice(0,8)}(${event.id.slice(0,4)}) | ` +
      `column=${column} totalColumns=${totalColumns} | width=${widthPercent.toFixed(1)}% left=${leftPercent.toFixed(1)}%`,
    );
  }

  const handleMouseEnter = useCallback(() => {
    if (cardRef.current && !isDragging) {
      const rect = cardRef.current.getBoundingClientRect();
      const pos = getTooltipPosition(rect, TOOLTIP_SIZE);
      setTooltipPos(pos);
    }
    if (!isDragging) {
      setTooltipVisible(true);
    }
  }, [isDragging]);

  const handleMouseLeave = useCallback(() => {
    setTooltipVisible(false);
  }, []);

  // Use preview position during drag, otherwise calculated position
  const displayTop = dragPreview ? dragPreview.topPx : startPos;
  const displayHeight = dragPreview ? dragPreview.heightPx : height;

  // Track display position changes to detect bounce
  const prevDisplayRef = useRef<{ top: number; height: number; fromPreview: boolean } | null>(null);
  useEffect(() => {
    const prev = prevDisplayRef.current;
    const fromPreview = !!dragPreview;
    if (prev && !fromPreview && prev.fromPreview) {
      // Transitioned from preview to calculated → potential bounce point
      const topDelta = displayTop - prev.top;
      const heightDelta = displayHeight - prev.height;
      if (Math.abs(topDelta) > 1 || Math.abs(heightDelta) > 1) {
        logger.warn(
          `[EVENTCARD] BOUNCE detected! | eventId=${event.id} | ` +
          `prev(preview: top=${prev.top.toFixed(1)}, h=${prev.height.toFixed(1)}) → ` +
          `now(calculated: top=${displayTop.toFixed(1)}, h=${displayHeight.toFixed(1)}) | ` +
          `delta(top=${topDelta.toFixed(1)}px, h=${heightDelta.toFixed(1)}px) | ` +
          `event.start_time=${event.start_time} end_time=${event.end_time}`,
        );
      } else {
        logger.debug(
          `[EVENTCARD] preview→calculated OK (no bounce) | eventId=${event.id} | ` +
          `top=${displayTop.toFixed(1)} h=${displayHeight.toFixed(1)}`,
        );
      }
    }
    prevDisplayRef.current = { top: displayTop, height: displayHeight, fromPreview };
  }, [displayTop, displayHeight, dragPreview, event.id, event.start_time, event.end_time]);

  // Log render during drag for debugging (only every 10th frame to avoid spam)
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  if (isDragging && renderCountRef.current % 10 === 0) {
    logger.debug(
      `[EVENTCARD] drag render #${renderCountRef.current} | eventId=${event.id} | ` +
      `hasPreview=${!!dragPreview} | ` +
      `displayTop=${displayTop.toFixed(1)} displayHeight=${displayHeight.toFixed(1)}`,
    );
  }

  return (
    <>
      <div
        ref={cardRef}
        className={`event-card ${isDragging ? 'event-card--dragging' : ''} ${crossDay ? 'event-card--leaving' : ''} ${hasConflict ? 'event-card--conflict' : ''}`}
        style={{
          top: `${displayTop}px`,
          height: `${displayHeight}px`,
          width: `${widthPercent}%`,
          left: `${leftPercent}%`,
          // 浅底渐变 + 左色条
          background: `linear-gradient(90deg, ${bgColor}22 0%, ${bgColor}11 100%)`,
          borderLeft: `3px solid ${bgColor}`,
          color: 'var(--text-primary)',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Conflict warning badge */}
        {hasConflict && (
          <Warning
            size={10}
            weight="fill"
            style={{
              position: 'absolute',
              top: '3px',
              right: '3px',
              color: 'var(--event-deadline)',
            }}
            aria-label="时间冲突"
          />
        )}

        {/* Top resize handle */}
        <div
          className="event-card-resize-handle event-card-resize-handle--top"
          onMouseDown={onMouseDownResizeTop}
        />

        {/* Body — drag to move */}
        <div
          className="event-card-body"
          onMouseDown={onMouseDownBody}
        >
          <div className="event-card-title">
            <EventIcon type={event.event_type} size={11} className="event-card-type-icon" />
            <span className="event-card-title-text">{event.title}</span>
          </div>
          {displayHeight > 30 && (
            <div className="event-card-time">
              {formatTime(event.start_time)} - {formatTime(event.end_time)}
            </div>
          )}
        </div>

        {/* Bottom resize handle */}
        <div
          className="event-card-resize-handle event-card-resize-handle--bottom"
          onMouseDown={onMouseDownResizeBottom}
        />
      </div>
      {tooltipVisible && !isDragging && (
        <EventTooltip event={event} position={tooltipPos} />
      )}
    </>
  );
});

EventCard.displayName = 'EventCard';

export default EventCard;
