// ========== Float ball widget (F1, F5, F20) ==========

import React, { useCallback, useMemo } from 'react';
import { getWeekdayLabel } from '../../utils/dateUtils';
import { useDragMove } from '../../hooks/useDragMove';
import { logger } from '../../utils/logger';
import type { CalendarEvent } from '../../types';
import CalendarCardScene3D from './CalendarCardScene3D';

interface BallWidgetProps {
  onDoubleClick: () => void;
  events: CalendarEvent[];
}

/** Get today's events sorted by start time. */
function getTodayEvents(events: CalendarEvent[]): CalendarEvent[] {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;

  return events
    .filter(event => event.start_time < todayEnd && event.end_time > todayStart)
    .sort((a, b) => a.start_time - b.start_time);
}

/** Determine event status color based on current time. */
function getEventStatusColor(event: CalendarEvent): string {
  const now = Date.now();
  if (event.end_time < now) return 'var(--event-deadline)';
  if (event.start_time <= now && event.end_time > now) return 'var(--event-meeting)';
  return 'var(--event-reminder)';
}

/**
 * Floating widget showing today's date, weekday, and event indicators.
 * The calendar card itself is rendered by Three.js, while labels stay as DOM text.
 */
const BallWidget: React.FC<BallWidgetProps> = ({ onDoubleClick, events }) => {
  const { onMouseDown, onMouseMove, onMouseUp } = useDragMove();
  const today = useMemo(() => new Date(), []);
  const todayEvents = useMemo(() => getTodayEvents(events), [events]);
  const ariaLabel = `\u4eca\u65e5 ${todayEvents.length} \u4e2a\u4e8b\u4ef6\uff0c\u53cc\u51fb\u5c55\u5f00`;

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onMouseUp();
    logger.info('Calendar widget double-clicked: toggleExpand');
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
      aria-label={ariaLabel}
    >
      <CalendarCardScene3D />
      <div className="ball-content">
        <div className="ball-date">{today.getDate()}</div>
        <div className="ball-weekday">{getWeekdayLabel(today)}</div>
      </div>
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
