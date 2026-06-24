// ========== Day column component (F10) ==========

import React, { useState, useCallback, useRef } from 'react';
import type { CalendarEvent, EventWithLayout } from '../../types';
import DayHeader from './DayHeader';
import EventCard from '../Calendar/EventCard';
import type { SnapInfo } from '../../hooks/useEventDrag';
import { isSameDay } from '../../utils/dateUtils';
import {
  filterVisibleEvents,
} from '../../utils/eventFilter';
import { assignColumns } from '../../utils/eventLayout';
import { DAY_START_HOUR, DAY_END_HOUR, HOUR_HEIGHT_PX } from '../../constants/windowConfig';
import { logger } from '../../utils/logger';

interface DayColumnProps {
  date: Date;
  events: CalendarEvent[];
  onEditEvent?: (event: CalendarEvent) => void;
  onUpdateEvent?: (id: string, startTime: number, endTime: number) => void;
  /** Called on double-click empty area — opens create dialog with preselected hour-slot range */
  onDoubleClickEmpty?: (date: Date, startHour: number, startMinute: number, endHour: number, endMinute: number) => void;
  headerRef?: React.RefObject<HTMLDivElement | null>;
  onSnapChange?: (snapInfo: SnapInfo) => void;
}

/**
 * Calculate the hour-slot range for a given Y position in the events container.
 * Snaps the start to the nearest half-hour, then spans exactly 1 hour.
 * Returns null if the Y position is outside the visible range.
 */
function calcHourSlot(clientY: number, containerTop: number): {
  topPx: number;
  heightPx: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
} | null {
  const clickY = clientY - containerTop;
  const minutesFromStart = (clickY / HOUR_HEIGHT_PX) * 60;
  const totalMinutes = DAY_START_HOUR * 60 + minutesFromStart;

  if (totalMinutes < DAY_START_HOUR * 60 || totalMinutes >= DAY_END_HOUR * 60) return null;

  // Snap start to nearest half-hour
  const hour = Math.floor(totalMinutes / 60);
  const min = totalMinutes % 60;
  const snappedMinute = min < 30 ? 0 : 30;
  const startMinutes = hour * 60 + snappedMinute;
  const endMinutes = startMinutes + 60;

  // Clamp end to visible range
  const clampedEnd = Math.min(endMinutes, DAY_END_HOUR * 60);
  const actualDuration = clampedEnd - startMinutes;

  const startH = Math.floor(startMinutes / 60);
  const startM = startMinutes % 60;
  const endH = Math.floor(clampedEnd / 60);
  const endM = clampedEnd % 60;

  return {
    topPx: ((startMinutes - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT_PX,
    heightPx: (actualDuration / 60) * HOUR_HEIGHT_PX,
    startHour: startH,
    startMinute: startM,
    endHour: endH,
    endMinute: endM,
  };
}

/**
 * Single day column in the week view.
 * Shows day header, event cards with overlap handling, and hover hour-slot highlight.
 * Double-click on highlighted hour-slot creates a new event at that time range.
 */
const DayColumn: React.FC<DayColumnProps> = ({
  date,
  events,
  onEditEvent,
  onUpdateEvent,
  onDoubleClickEmpty,
  headerRef,
  onSnapChange,
}) => {
  const isToday = isSameDay(date, new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Hover hour-slot highlight state
  const [hoverSlot, setHoverSlot] = useState<{
    topPx: number;
    heightPx: number;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
  } | null>(null);

  // Filter events belonging to this day
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const dayEvents = events.filter(event => {
    return event.start_time < dayEnd.getTime() && event.end_time > dayStart.getTime();
  });

  // Filter visible events (8:00-21:00) and assign columns for overlaps
  const visibleEvents = filterVisibleEvents(dayEvents);
  const layoutEvents: EventWithLayout[] = assignColumns(visibleEvents);

  // Detect conflicts for visual marking
  const conflictIds = new Set<string>();
  for (let i = 0; i < layoutEvents.length; i++) {
    for (let j = i + 1; j < layoutEvents.length; j++) {
      const a = layoutEvents[i];
      const b = layoutEvents[j];
      if (a.start_time < b.end_time && a.end_time > b.start_time) {
        conflictIds.add(a.id);
        conflictIds.add(b.id);
        logger.info(
          `[DAYCOLUMN] CONFLICT detected | date=${date.toLocaleDateString('zh-CN')} | ` +
          `A=${a.title}(${a.id.slice(0,4)}) [${new Date(a.start_time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}-${new Date(a.end_time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}] vs ` +
          `B=${b.title}(${b.id.slice(0,4)}) [${new Date(b.start_time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}-${new Date(b.end_time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}]`,
        );
      }
    }
  }

  // Log layout summary for this day
  if (layoutEvents.length > 0) {
    logger.info(
      `[DAYCOLUMN] render | date=${date.toLocaleDateString('zh-CN')} | ` +
      `dayEvents=${dayEvents.length} visible=${visibleEvents.length} layout=${layoutEvents.length} | ` +
      layoutEvents.map(e => `${e.title.slice(0,8)} col=${e.column} total=${e.totalColumns}`).join(', '),
    );
  }

  // ===== Hover highlight =====

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.event-card')) {
        setHoverSlot(null);
        return;
      }
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const slot = calcHourSlot(e.clientY, rect.top);
      setHoverSlot(slot);
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setHoverSlot(null);
  }, []);

  // ===== Double-click → create event =====

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!onDoubleClickEmpty) return;
      const target = e.target as HTMLElement;
      if (target.closest('.event-card')) {
        logger.debug(`[DAYCOLUMN] double-click ignored — hit event-card`);
        return;
      }
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const slot = calcHourSlot(e.clientY, rect.top);
      if (!slot) return;

      logger.info(
        `[DAYCOLUMN] double-click hour-slot | date=${date.toISOString()} | ` +
        `${slot.startHour}:${String(slot.startMinute).padStart(2, '0')}-${slot.endHour}:${String(slot.endMinute).padStart(2, '0')} | clickY=${(e.clientY - rect.top).toFixed(1)}`,
      );
      onDoubleClickEmpty(date, slot.startHour, slot.startMinute, slot.endHour, slot.endMinute);
    },
    [date, onDoubleClickEmpty],
  );

  return (
    <div className={`day-column ${isToday ? 'today' : ''}`}>
      <div ref={headerRef}>
        <DayHeader date={date} isToday={isToday} eventCount={dayEvents.length} />
      </div>
      <div
        ref={containerRef}
        className="events-container"
        data-date={new Date(date).setHours(0, 0, 0, 0)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
      >
        {/* Hover hour-slot highlight */}
        {hoverSlot && (
          <div
            className="hour-slot-hover"
            style={{
              top: `${hoverSlot.topPx}px`,
              height: `${hoverSlot.heightPx}px`,
            }}
          />
        )}

        {layoutEvents.map(event => (
          <EventCard
            key={event.id}
            event={event}
            column={event.column}
            totalColumns={event.totalColumns}
            hasConflict={conflictIds.has(event.id)}
            onEdit={onEditEvent}
            onUpdate={onUpdateEvent}
            onSnapChange={onSnapChange}
          />
        ))}
      </div>
    </div>
  );
};

export default DayColumn;
