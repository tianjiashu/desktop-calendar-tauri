// ========== Time grid lines overlay (inside days-container) ==========

import React from 'react';
import { DAY_START_HOUR, DAY_END_HOUR, HOUR_HEIGHT_PX } from '../../constants/windowConfig';
import type { SnapInfo } from '../../hooks/useEventDrag';

interface TimeGridLinesProps {
  headerHeight: number;
  /** Current snap info — highlights the magnetic grid line during drag */
  snapInfo?: SnapInfo;
}

/**
 * Renders hour lines and half-hour lines spanning the full width of days-container.
 * Offset by headerHeight to align with events-container below day headers.
 *
 * When snapInfo is provided and a snap is active, the corresponding grid line
 * is highlighted with a blue accent to give visual feedback of the magnetic effect.
 */
const TimeGridLines: React.FC<TimeGridLinesProps> = ({ headerHeight, snapInfo }) => {
  const hours = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
    (_, i) => DAY_START_HOUR + i,
  );

  /**
   * Determine if a given time (minutes since midnight) is the snap target.
   */
  const isSnappingLine = (minutes: number): boolean => {
    if (!snapInfo || snapInfo.edge === null || snapInfo.snappedMinutes === null) {
      return false;
    }
    return minutes === snapInfo.snappedMinutes;
  };

  return (
    <div className="time-grid-lines" style={{ top: `${headerHeight}px` }}>
      {hours.map(hour => {
        const hourMinutes = hour * 60;
        const halfMinutes = hour * 60 + 30;

        return (
          <React.Fragment key={hour}>
            <div
              className={`time-hour-line ${isSnappingLine(hourMinutes) ? 'time-hour-line--snapping' : ''}`}
              style={{ top: `${(hour - DAY_START_HOUR) * HOUR_HEIGHT_PX}px` }}
            />
            {hour < DAY_END_HOUR && (
              <div
                className={`time-half-line ${isSnappingLine(halfMinutes) ? 'time-half-line--snapping' : ''}`}
                style={{ top: `${(hour - DAY_START_HOUR) * HOUR_HEIGHT_PX + HOUR_HEIGHT_PX / 2}px` }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default TimeGridLines;
