// ========== Event tooltip component (F17) ==========

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

/**
 * Floating tooltip showing event details on hover.
 * Features left color bar, mono time, type/link/location icons.
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
        {event.is_all_day && '（全天）'}
      </div>
      {event.description && (
        <div className="tooltip-description">{event.description}</div>
      )}
      {event.url && (
        <div className="tooltip-url" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Link size={12} weight="regular" aria-hidden="true" />
          {(() => { try { return new URL(event.url).hostname; } catch { return event.url; } })()}
        </div>
      )}
      <div className="tooltip-type">
        类型：{EVENT_TYPE_LABELS[event.event_type] ?? '默认'}
      </div>
      {event.location && (
        <div className="tooltip-type" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <MapPin size={12} weight="regular" aria-hidden="true" />
          {event.location}
        </div>
      )}
    </div>
  );
};

export default EventTooltip;
