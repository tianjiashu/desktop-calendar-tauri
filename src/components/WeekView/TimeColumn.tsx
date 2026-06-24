// ========== Time column component (F9) ==========

import React from 'react';
import { DAY_START_HOUR, DAY_END_HOUR } from '../../constants/windowConfig';

/**
 * Left-side time column showing hour labels only.
 * Time lines are rendered inside days-container for perfect alignment with event cards.
 */
const TimeColumn: React.FC = () => {
  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
    (_, i) => DAY_START_HOUR + i,
  );

  return (
    <div className="time-column">
      <div className="time-labels-container">
        {hours.map(hour => (
          <div
            key={hour}
            className="time-label"
          >
            {String(hour).padStart(2, '0')}:00
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimeColumn;

