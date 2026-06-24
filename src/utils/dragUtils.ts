// ========== Drag & snap pure utilities ==========
// Extracted from useEventDrag.ts to keep the hook lean.
// All functions are pure (no side effects, no React dependencies).

import type { CalendarEvent } from '../types';
import { DAY_START_HOUR, DAY_END_HOUR, HOUR_HEIGHT_PX } from '../constants/windowConfig';
import { timestampToMinutes } from './dateUtils';
export { timestampToMinutes };

// ========== Constants ==========

/** Drag threshold in pixels — below this, treat as a click */
export const DRAG_THRESHOLD_PX = 4;

/** Minimum event duration in minutes */
export const MIN_DURATION_MINUTES = 15;

/**
 * Snap threshold — if within ±7 min of a half-hour mark, snap to it.
 * At HOUR_HEIGHT_PX=50, this is ~5.8px of magnetic range, providing
 * a comfortable snap zone without being too aggressive.
 */
export const SNAP_THRESHOLD_MINUTES = 7;

// ========== Types ==========

export type DragMode = 'none' | 'move' | 'resize-top' | 'resize-bottom';

export interface DragPreview {
  topPx: number;
  heightPx: number;
}

/**
 * Info about which grid line is currently being snapped to.
 * Consumed by TimeGridLines to highlight the magnetic line.
 */
export interface SnapInfo {
  edge: 'top' | 'bottom' | 'both' | null;
  snappedMinutes: number | null;
}

export interface DragState {
  mode: DragMode;
  originalStart: number;
  originalEnd: number;
  startClientY: number;
  deltaPx: number;
  /** Mouse X coordinate at drag start — used for cross-day detection */
  startClientX: number;
  /** Target date's 0:00 timestamp, or null if same as original day */
  targetDate: number | null;
}

// ========== Time / pixel conversion ==========

/** Clamp minutes to the visible time range [DAY_START_HOUR, DAY_END_HOUR] */
export function clampMinutes(minutes: number): number {
  const min = DAY_START_HOUR * 60;
  const max = DAY_END_HOUR * 60;
  return Math.max(min, Math.min(max, minutes));
}

/** Convert pixel delta to minutes shift (positive = later time) */
export function deltaPxToMinutes(deltaPx: number): number {
  return (deltaPx / HOUR_HEIGHT_PX) * 60;
}

// `timestampToMinutes` is imported from dateUtils.ts — single source of truth.

/** Convert minutes-since-midnight to pixel offset from DAY_START_HOUR */
export function minutesToPx(minutes: number): number {
  return ((minutes - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT_PX;
}

// ========== Snap helpers ==========

/**
 * Find the nearest half-hour mark and return { snapped, dist }.
 * When equidistant (e.g. 14:45 is 15min from both 14:30 and 15:00),
 * prefers the half-hour mark (14:30) over the full hour (15:00).
 * This provides a slight downward bias in snap behavior.
 */
export function findNearestHalfHour(minutes: number): { snapped: number; dist: number } {
  const hour = Math.floor(minutes / 60);
  const min = minutes % 60;
  const distToHour = Math.abs(min);
  const distToHalf = Math.abs(min - 30);

  if (distToHour <= distToHalf) {
    return { snapped: hour * 60, dist: distToHour };
  }
  return { snapped: hour * 60 + 30, dist: distToHalf };
}

/** Snap to nearest half-hour if within SNAP_THRESHOLD_MINUTES */
export function snapToHalfHour(minutes: number): number {
  const { snapped, dist } = findNearestHalfHour(minutes);
  return dist <= SNAP_THRESHOLD_MINUTES ? snapped : minutes;
}

/** Snap minutes to a 5-minute grid (used for resize drag preview) */
export function snapTo5Minutes(minutes: number): number {
  return Math.round(minutes / 5) * 5;
}

// ========== Time calculation ==========

/**
 * Calculate raw top/bottom minutes for a given drag state and delta.
 * Returns values before clamping so callers can detect snap state.
 */
export function calculateRawTimes(
  state: DragState,
  deltaPx: number,
): { topMinutes: number; bottomMinutes: number } {
  const origStartMin = timestampToMinutes(state.originalStart);
  const origEndMin = timestampToMinutes(state.originalEnd);
  const origDuration = origEndMin - origStartMin;
  const deltaMin = deltaPxToMinutes(deltaPx);

  switch (state.mode) {
    case 'move': {
      const top = origStartMin + deltaMin;
      return { topMinutes: top, bottomMinutes: top + origDuration };
    }
    case 'resize-top': {
      const top = origStartMin + deltaMin;
      const bottom = Math.max(top + MIN_DURATION_MINUTES, origEndMin);
      return { topMinutes: top, bottomMinutes: bottom };
    }
    case 'resize-bottom': {
      const bottom = origEndMin + deltaMin;
      const top = Math.min(bottom - MIN_DURATION_MINUTES, origStartMin);
      return { topMinutes: top, bottomMinutes: bottom };
    }
    default:
      return { topMinutes: origStartMin, bottomMinutes: origEndMin };
  }
}

/**
 * Apply clamping and boundary constraints to the raw times.
 */
export function applyConstraints(
  mode: DragMode,
  topMinutes: number,
  bottomMinutes: number,
): { topMinutes: number; bottomMinutes: number } {
  let top = clampMinutes(topMinutes);
  let bottom = clampMinutes(bottomMinutes);

  if (mode === 'resize-top') {
    if (bottom > DAY_END_HOUR * 60) {
      bottom = DAY_END_HOUR * 60;
      top = Math.min(top, bottom - MIN_DURATION_MINUTES);
    }
  } else if (mode === 'resize-bottom') {
    if (top < DAY_START_HOUR * 60) {
      top = DAY_START_HOUR * 60;
      bottom = Math.max(bottom, top + MIN_DURATION_MINUTES);
    }
  } else {
    const duration = bottomMinutes - topMinutes;
    top = clampMinutes(topMinutes);
    bottom = clampMinutes(top + duration);
  }

  return { topMinutes: top, bottomMinutes: bottom };
}

// ========== Snap detection ==========

/**
 * Detect snap info for grid line highlighting.
 * - resize-top: checks top edge
 * - resize-bottom: checks bottom edge
 * - move: checks both edges
 */
export function detectSnapInfo(
  mode: DragMode,
  topMinutes: number,
  bottomMinutes: number,
): SnapInfo {
  if (mode === 'resize-top') {
    const { snapped, dist } = findNearestHalfHour(topMinutes);
    if (dist <= SNAP_THRESHOLD_MINUTES) {
      return { edge: 'top', snappedMinutes: snapped };
    }
  }
  if (mode === 'resize-bottom') {
    const { snapped, dist } = findNearestHalfHour(bottomMinutes);
    if (dist <= SNAP_THRESHOLD_MINUTES) {
      return { edge: 'bottom', snappedMinutes: snapped };
    }
  }
  if (mode === 'move') {
    const topSnap = findNearestHalfHour(topMinutes);
    const bottomSnap = findNearestHalfHour(bottomMinutes);
    const topSnapping = topSnap.dist <= SNAP_THRESHOLD_MINUTES;
    const bottomSnapping = bottomSnap.dist <= SNAP_THRESHOLD_MINUTES;

    if (topSnapping && bottomSnapping) {
      return { edge: 'both', snappedMinutes: topSnap.snapped };
    }
    if (topSnapping) {
      return { edge: 'top', snappedMinutes: topSnap.snapped };
    }
    if (bottomSnapping) {
      return { edge: 'bottom', snappedMinutes: bottomSnap.snapped };
    }
  }

  return { edge: null, snappedMinutes: null };
}

/**
 * Apply snap and constraints, returning the final snapped minutes
 * and the resulting pixel preview. Used by both mousemove and endDrag.
 */
export function resolveSnappedPreview(
  state: DragState,
  deltaPx: number,
): { topMinutes: number; bottomMinutes: number; topPx: number; heightPx: number; snap: SnapInfo } {
  const raw = calculateRawTimes(state, deltaPx);

  let topMinutes = raw.topMinutes;
  let bottomMinutes = raw.bottomMinutes;

  if (state.mode === 'move') {
    topMinutes = snapToHalfHour(raw.topMinutes);
    bottomMinutes = topMinutes + (raw.bottomMinutes - raw.topMinutes);
  } else if (state.mode === 'resize-top') {
    topMinutes = snapTo5Minutes(raw.topMinutes);
    bottomMinutes = raw.bottomMinutes;
  } else {
    bottomMinutes = snapTo5Minutes(raw.bottomMinutes);
    topMinutes = raw.topMinutes;
  }

  const constrained = applyConstraints(state.mode, topMinutes, bottomMinutes);
  const snap = detectSnapInfo(state.mode, raw.topMinutes, raw.bottomMinutes);

  const topPx = minutesToPx(constrained.topMinutes);
  const bottomPx = minutesToPx(constrained.bottomMinutes);

  return {
    topMinutes: constrained.topMinutes,
    bottomMinutes: constrained.bottomMinutes,
    topPx,
    heightPx: Math.max(bottomPx - topPx, 0),
    snap,
  };
}

/**
 * Build a Unix ms timestamp from minutes-since-midnight,
 * preserving the original event's date.
 */
export function buildTimestamp(baseTimestamp: number, minutes: number): number {
  const baseDate = new Date(baseTimestamp);
  baseDate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return baseDate.getTime();
}

/**
 * Extract the 0:00:00 Unix ms timestamp for the date of the given timestamp.
 */
export function getDateMidnight(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Build a Unix ms timestamp using a specific date (midnight ts) + minutes-since-midnight.
 * Used for cross-day drag: target date + original time-of-day.
 */
export function buildCrossDayTimestamp(dateMidnight: number, minutes: number): number {
  const d = new Date(dateMidnight);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d.getTime();
}

/** CSS selector for event containers that carry a data-date attribute */
const EVENTS_CONTAINER_SELECTOR = '.events-container[data-date]';

/**
 * Detect which day column the mouse is currently hovering over.
 * Returns the target date's 0:00 timestamp, or null if not over any column.
 */
export function detectTargetDate(clientX: number): number | null {
  const containers = document.querySelectorAll(EVENTS_CONTAINER_SELECTOR);
  for (const el of containers) {
    const rect = el.getBoundingClientRect();
    if (clientX >= rect.left && clientX <= rect.right) {
      const dateAttr = (el as HTMLElement).dataset.date;
      if (dateAttr) {
        return Number(dateAttr);
      }
    }
  }
  return null;
}

// ========== Conflict detection ==========

/** Maximum number of overlapping events allowed at the same time */
export const MAX_CONCURRENT_EVENTS = 2;

/** Lightweight event shape for conflict checks */
interface ConflictCheckEvent {
  id: string;
  start_time: number;
  end_time: number;
}

/**
 * Count how many events (excluding the given eventId) overlap with the target time range.
 * Two events overlap if: a.start < b.end AND a.end > b.start
 *
 * Boundary note: events that are exactly adjacent (e.g. A ends at 10:00, B starts at 10:00)
 * are NOT considered overlapping, which is the correct behavior for schedule conflict detection.
 */
export function countOverlapping(
  events: readonly ConflictCheckEvent[],
  excludeId: string,
  startTime: number,
  endTime: number,
): number {
  let count = 0;
  for (const ev of events) {
    if (ev.id === excludeId) continue;
    if (ev.start_time < endTime && ev.end_time > startTime) {
      count++;
    }
  }
  return count;
}
