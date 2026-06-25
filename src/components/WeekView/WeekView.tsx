// ========== Week view main component (F8-F16) ==========

import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { CalendarEvent } from '../../types';
import WeekHeader from './WeekHeader';
import DayColumn from './DayColumn';
import CurrentTimeLine from './CurrentTimeLine';
import StatusBar from '../Common/StatusBar';
import EventDialog from '../Calendar/EventDialog';
import TimeGridLines from './TimeGridLines';
import { getWeekDates } from '../../utils/dateUtils';
import type { AppError } from '../../types';
import type { UseEventDialogReturn } from '../../hooks/useEventDialog';
import type { SnapInfo } from '../../hooks/useEventDrag';
import { useCalendarStore } from '../../stores/useCalendarStore';
import { logger } from '../../utils/logger';
import { DAY_START_HOUR, DAY_END_HOUR, HOUR_HEIGHT_PX } from '../../constants/windowConfig';
import { MAX_CONCURRENT_EVENTS, countOverlapping } from '../../utils/dragUtils';
import { showToast } from '../Common/Toast';

const TEXT = {
  conflictLimit: '\u8be5\u65f6\u6bb5\u5df2\u6709 2 \u4e2a\u4e8b\u4ef6\uff0c\u65e0\u6cd5\u6dfb\u52a0\u66f4\u591a',
} as const;

interface WeekViewProps {
  currentDate: Date;
  weekTitle: string;
  isCurrentWeek: boolean;
  events: CalendarEvent[];
  isLoading: boolean;
  error: AppError | null;
  isRefreshing: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onRefresh: () => void;
  onShrink: () => void;
  onClose: () => void;
  onShowDiagnostics?: () => void;
  eventDialog: UseEventDialogReturn;
}

/**
 * Complete week view with 7-day grid, time column, event cards, and status bar.
 * Supports keyboard shortcuts and double-click-to-create.
 */
const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  weekTitle,
  isCurrentWeek,
  events,
  isLoading,
  error,
  isRefreshing,
  onPrevWeek,
  onNextWeek,
  onToday,
  onRefresh,
  onShrink,
  onClose,
  onShowDiagnostics,
  eventDialog,
}) => {
  const weekDates = getWeekDates(currentDate);
  const dayHeaderRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(46);
  const [snapInfo, setSnapInfo] = useState<SnapInfo>({ edge: null, snappedMinutes: null });
  const { updateEvent } = useCalendarStore();

  const handleSnapChange = useCallback((info: SnapInfo) => {
    setSnapInfo(info);
  }, []);

  const handleUpdateEvent = useCallback(
    async (id: string, startTime: number, endTime: number) => {
      logger.info(`[WEEKVIEW] updateEvent | id=${id} start=${startTime} end=${endTime}`);

      const overlapping = countOverlapping(events, id, startTime, endTime);
      if (overlapping >= MAX_CONCURRENT_EVENTS) {
        showToast(TEXT.conflictLimit, 'warn');
        throw new Error('CONFLICT_LIMIT');
      }

      await updateEvent(id, { start_time: startTime, end_time: endTime });
    },
    [events, updateEvent],
  );

  const handleDoubleClickEmpty = useCallback(
    (date: Date, startHour: number, startMinute: number, endHour: number, endMinute: number) => {
      logger.info(`[WEEKVIEW] handleDoubleClickEmpty | date=${date.toISOString()} start=${startHour}:${startMinute} end=${endHour}:${endMinute}`);
      const start = new Date(date);
      start.setHours(startHour, startMinute, 0, 0);
      const end = new Date(date);
      end.setHours(endHour, endMinute, 0, 0);
      eventDialog.openCreateDialog(start, end);
      logger.info(`[WEEKVIEW] openCreateDialog called | start=${start.toISOString()} end=${end.toISOString()}`);
    },
    [eventDialog],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          onPrevWeek();
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNextWeek();
          break;
        case 't':
        case 'T':
          e.preventDefault();
          onToday();
          break;
        case 'n':
        case 'N':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            eventDialog.openCreateDialog();
          }
          break;
        case 'Escape':
          if (eventDialog.isOpen) {
            eventDialog.closeDialog();
          } else {
            onShrink();
          }
          break;
        case 'r':
        case 'R':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onRefresh();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onPrevWeek, onNextWeek, onToday, onRefresh, onShrink, eventDialog]);

  const updateHeaderHeight = useCallback(() => {
    if (dayHeaderRef.current) {
      setHeaderHeight(dayHeaderRef.current.offsetHeight);
    }
  }, []);

  useEffect(() => {
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, [updateHeaderHeight]);

  const gridHeight = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT_PX;

  return (
    <div className="week-view-container">
      <WeekHeader
        weekTitle={weekTitle}
        isCurrentWeek={isCurrentWeek}
        isRefreshing={isRefreshing}
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
        onToday={onToday}
        onRefresh={onRefresh}
        onShrink={onShrink}
        onClose={onClose}
        onAddEvent={() => eventDialog.openCreateDialog()}
      />
      <div className="week-grid">
        <div className="time-column">
          <div className="time-spacer" style={{ height: `${headerHeight}px` }} />
          <div className="time-labels-container" style={{ height: `${gridHeight}px`, position: 'relative' }}>
            {Array.from(
              { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
              (_, i) => DAY_START_HOUR + i,
            ).map(hour => (
              <div
                key={hour}
                className="time-label"
                style={{ top: `${(hour - DAY_START_HOUR) * HOUR_HEIGHT_PX}px` }}
              >
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>
        </div>

        <div className="days-container">
          {weekDates.map((date, i) => (
            <DayColumn
              key={date.toISOString()}
              date={date}
              events={events}
              isLoading={isLoading}
              onEditEvent={eventDialog.openEditDialog}
              onUpdateEvent={handleUpdateEvent}
              onDoubleClickEmpty={handleDoubleClickEmpty}
              headerRef={i === 0 ? dayHeaderRef : undefined}
              onSnapChange={handleSnapChange}
            />
          ))}
          <TimeGridLines headerHeight={headerHeight} snapInfo={snapInfo} />
          <CurrentTimeLine headerHeight={headerHeight} />
        </div>
      </div>
      <StatusBar
        error={error}
        isLoading={isLoading}
        eventCount={events.length}
        isCurrentWeek={isCurrentWeek}
        onShowDiagnostics={onShowDiagnostics}
      />

      <EventDialog
        isOpen={eventDialog.isOpen}
        mode={eventDialog.mode}
        preselectedDate={eventDialog.preselectedDate}
        preselectedEnd={eventDialog.preselectedEnd}
        editingEvent={eventDialog.editingEvent}
        onSave={eventDialog.handleSave}
        onUpdate={eventDialog.handleUpdate}
        onDelete={eventDialog.handleDelete}
        onCancel={eventDialog.closeDialog}
      />
    </div>
  );
};

export default WeekView;
