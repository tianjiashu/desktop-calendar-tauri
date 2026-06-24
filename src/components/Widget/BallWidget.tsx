// ========== Float ball widget (F1, F5, F20) ==========

import React, { useCallback, useMemo } from 'react';
import { getWeekdayLabel } from '../../utils/dateUtils';
import { useDragMove } from '../../hooks/useDragMove';
import { logger } from '../../utils/logger';
import type { CalendarEvent } from '../../types';

interface BallWidgetProps {
  onDoubleClick: () => void;
  events: CalendarEvent[];
}

/** Get today's events sorted by start time */
function getTodayEvents(events: CalendarEvent[]): CalendarEvent[] {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;

  return events
    .filter(event => event.start_time < todayEnd && event.end_time > todayStart)
    .sort((a, b) => a.start_time - b.start_time);
}

/** Determine event status color based on current time */
function getEventStatusColor(event: CalendarEvent): string {
  const now = Date.now();
  if (event.end_time < now) return 'var(--event-deadline)';
  if (event.start_time <= now && event.end_time > now) return 'var(--event-meeting)';
  return 'var(--event-reminder)';
}

/**
 * Floating ball widget showing today's date, weekday, and event indicators.
 * Features:
 * - Radial gradient background with glassmorphism
 * - 3-dot event density indicator (max 3 dots, colored by event status)
 * - Hover scale feedback
 * - Drag to move (delegated to useDragMove hook)
 * - Double-click expands to week view (F2)
 */
const BallWidget: React.FC<BallWidgetProps> = ({ onDoubleClick, events }) => {
  const { onMouseDown, onMouseMove, onMouseUp } = useDragMove();

  const today = useMemo(() => new Date(), []);
  const todayEvents = useMemo(() => getTodayEvents(events), [events]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onMouseUp();
    logger.info('BallWidget double-clicked → toggleExpand');
    onDoubleClick();
  }, [onDoubleClick, onMouseUp]);

  return (
    <div
      className="ball-widget"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onDoubleClick={handleDoubleClick}
      role="button"
      aria-label={`今日 ${todayEvents.length} 个事件，双击展开`}
    >
      <div className="ball-date">{today.getDate()}</div>
      <div className="ball-weekday">{getWeekdayLabel(today)}</div>
      {todayEvents.length > 0 && (
        <div className="event-indicators">
          {todayEvents.slice(0, 3).map(event => (
            <div
              key={event.id}
              className="event-indicator-dot"
              style={{ background: getEventStatusColor(event) }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BallWidget;
