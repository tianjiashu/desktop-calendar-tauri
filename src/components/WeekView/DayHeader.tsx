// ========== Day header component (F11, Phase F: empty hint) ==========

import React from 'react';
import { getWeekdayLabel } from '../../utils/dateUtils';

interface DayHeaderProps {
  date: Date;
  isToday: boolean;
  eventCount?: number;
}

const TEXT = {
  event: '\u4e8b\u4ef6',
} as const;

/** Check if a date is Saturday or Sunday. */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Day column header showing weekday, date number, and event count.
 * Today's header is highlighted with accent color.
 */
const DayHeader: React.FC<DayHeaderProps> = ({ date, isToday, eventCount = 0 }) => {
  const weekend = isWeekend(date);

  return (
    <div className={`day-header ${isToday ? 'today' : ''} ${weekend ? 'weekend' : ''}`}>
      <span className="weekday">{getWeekdayLabel(date)}</span>
      <span className="day-number">{date.getDate()}</span>
      {eventCount > 0 ? (
        <span className="event-count has-events">{eventCount} {TEXT.event}</span>
      ) : (
        <span className="event-count event-count-empty" aria-hidden="true">&nbsp;</span>
      )}
    </div>
  );
};

export default DayHeader;
