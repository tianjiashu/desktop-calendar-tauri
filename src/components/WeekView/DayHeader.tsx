// ========== Day header component (F11) ==========

import React from 'react';
import { getWeekdayLabel } from '../../utils/dateUtils';

interface DayHeaderProps {
  date: Date;
  isToday: boolean;
  eventCount?: number;
}

/** Check if a date is Saturday or Sunday */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Day column header showing weekday and date number.
 * Today's header is highlighted with accent color.
 * Weekend headers use tertiary text color for visual distinction.
 */
const DayHeader: React.FC<DayHeaderProps> = ({ date, isToday, eventCount = 0 }) => {
  const weekend = isWeekend(date);

  return (
    <div className={`day-header ${isToday ? 'today' : ''} ${weekend ? 'weekend' : ''}`}>
      <span className="weekday">{getWeekdayLabel(date)}</span>
      <span className="day-number">{date.getDate()}</span>
      {eventCount > 0 && (
        <span className="event-count has-events">{eventCount} 事件</span>
      )}
    </div>
  );
};

export default DayHeader;
