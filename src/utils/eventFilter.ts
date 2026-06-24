// ========== Event visibility filter (F15) ==========

import type { CalendarEvent } from '../types';
import { DAY_START_HOUR, DAY_END_HOUR, HOUR_HEIGHT_PX } from '../constants/windowConfig';
import { timestampToMinutes } from './dateUtils';

const MIN_CARD_HEIGHT_PX = 22; // Minimum event card height for readability

/**
 * Filter events that are visible in the configured time range.
 * Keeps events that overlap with the visible range.
 */
export function filterVisibleEvents(events: CalendarEvent[]): CalendarEvent[] {
  const startBoundary = DAY_START_HOUR * 60;
  const endBoundary = DAY_END_HOUR * 60;

  return events.filter(event => {
    const startMin = timestampToMinutes(event.start_time);
    const endMin = timestampToMinutes(event.end_time);
    return startMin < endBoundary && endMin > startBoundary;
  });
}

/**
 * Calculate the Y position for an event in the week view.
 * @param timestamp Unix ms
 * @returns pixel offset from top (start hour = 0)
 */
export function calculateTimePosition(timestamp: number): number {
  const d = new Date(timestamp);
  const hours = d.getHours();
  const minutes = d.getMinutes();

  const effectiveHours = hours - DAY_START_HOUR;
  if (effectiveHours < 0) return 0;

  return effectiveHours * HOUR_HEIGHT_PX + (minutes / 60) * HOUR_HEIGHT_PX;
}

/**
 * Calculate the height of an event card based on duration.
 * @param startMs Start time in Unix ms
 * @param endMs End time in Unix ms
 * @returns height in pixels (>= MIN_CARD_HEIGHT_PX)
 */
export function calculateDurationHeight(startMs: number, endMs: number): number {
  const durationMs = endMs - startMs;
  const durationHours = durationMs / (1000 * 60 * 60);
  const height = durationHours * HOUR_HEIGHT_PX;
  return Math.max(height, MIN_CARD_HEIGHT_PX);
}
