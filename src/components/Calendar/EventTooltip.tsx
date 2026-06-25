// ========== Event tooltip component (F17, Phase F: created_by info) ==========

import React from 'react';
import { Link, MapPin } from '@phosphor-icons/react';
import type { CalendarEvent } from '../../types';
import { formatTime } from '../../utils/dateUtils';
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from '../../constants/eventTypeColors';
import type { TooltipPosition } from '../../utils/tooltipPosition';

interface EventTooltipProps {
  event: CalendarEvent;
  position: TooltipPosition;
}

const TEXT = {
  allDay: '\uff08\u5168\u5929\uff09',
  type: '\u7c7b\u578b',
  defaultType: '\u9ed8\u8ba4',
  byAgent: '\u7531 Agent \u521b\u5efa',
  byUser: '\u7531\u4f60\u521b\u5efa',
} as const;

function getUrlLabel(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Floating tooltip showing event details on hover.
 * Features left color bar, mono time, type/link/location icons, and creator attribution.
 */
const EventTooltip: React.FC<EventTooltipProps> = ({ event, position }) => {
  const eventColor = event.color || EVENT_TYPE_COLORS[event.event_type] || 'var(--accent-500)';

  return (
    <div
      className="event-tooltip"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        borderLeft: `3px solid ${eventColor}`,
      }}
    >
      <div className="tooltip-title">{event.title}</div>
      <div className="tooltip-time">
        {formatTime(event.start_time)} - {formatTime(event.end_time)}
        {event.is_all_day && TEXT.allDay}
      </div>
      {event.description && (
        <div className="tooltip-description">{event.description}</div>
      )}
      {event.url && (
        <div className="tooltip-url">
          <Link size={12} weight="regular" aria-hidden="true" />
          {getUrlLabel(event.url)}
        </div>
      )}
      <div className="tooltip-type">
        {TEXT.type}: {EVENT_TYPE_LABELS[event.event_type] ?? TEXT.defaultType}
      </div>
      {event.location && (
        <div className="tooltip-meta">
          <MapPin size={12} weight="regular" aria-hidden="true" />
          {event.location}
        </div>
      )}
      <div className="tooltip-created-by">
        {event.created_by === 'agent' ? TEXT.byAgent : TEXT.byUser}
      </div>
    </div>
  );
};

export default EventTooltip;
