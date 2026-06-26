// ========== Event overlap column assignment (F14) ==========

import type { CalendarEvent, EventWithLayout } from '../types';

/**
 * Check if two events overlap in time.
 * Overlap: a.start < b.end AND a.end > b.start
 */
function overlaps(a: CalendarEvent, b: CalendarEvent): boolean {
  return a.start_time < b.end_time && a.end_time > b.start_time;
}

/**
 * Group events into connected overlapping clusters.
 * Uses union-find: if event A overlaps B and B overlaps C, then A,B,C are in the same group,
 * even if A and C don't directly overlap.
 */
function buildOverlapGroups(events: CalendarEvent[]): CalendarEvent[][] {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => a.start_time - b.start_time);
  const groups: CalendarEvent[][] = [];
  let currentGroup: CalendarEvent[] = [sorted[0]];
  let maxEndInGroup = sorted[0].end_time;

  for (let i = 1; i < sorted.length; i++) {
    const ev = sorted[i];
    // If this event starts before the max end_time in the current group, it overlaps
    if (ev.start_time < maxEndInGroup) {
      currentGroup.push(ev);
      maxEndInGroup = Math.max(maxEndInGroup, ev.end_time);
    } else {
      // No overlap with current group — start a new group
      groups.push(currentGroup);
      currentGroup = [ev];
      maxEndInGroup = ev.end_time;
    }
  }
  groups.push(currentGroup);
  return groups;
}

/**
 * Assign columns to a single overlap group.
 * Within this group, overlapping events get side-by-side columns.
 */
function assignColumnsForGroup(events: CalendarEvent[]): {
  event: CalendarEvent;
  column: number;
  totalColumns: number;
}[] {
  const sorted = [...events].sort((a, b) => a.start_time - b.start_time);
  const columnEndTimes: number[] = [];
  const raw: { event: CalendarEvent; column: number }[] = [];

  for (const event of sorted) {
    let placed = false;
    for (let col = 0; col < columnEndTimes.length; col++) {
      if (columnEndTimes[col] <= event.start_time) {
        columnEndTimes[col] = event.end_time;
        raw.push({ event, column: col });
        placed = true;
        break;
      }
    }
    if (!placed) {
      columnEndTimes.push(event.end_time);
      raw.push({ event, column: columnEndTimes.length - 1 });
    }
  }

  const totalColumns = columnEndTimes.length;

  return raw.map(({ event, column }) => ({
    event,
    column,
    totalColumns,
  }));
}

/**
 * Assign columns to events so only overlapping events are displayed side-by-side.
 * Non-overlapping events keep 100% width even if other events elsewhere overlap.
 *
 * Algorithm:
 *   1. Build connected overlap groups
 *   2. Within each group, assign columns independently
 *   3. Non-overlapping events (group of size 1) get totalColumns=1 (100% width)
 */
export function assignColumns(events: CalendarEvent[]): EventWithLayout[] {
  if (events.length === 0) return [];

  const groups = buildOverlapGroups(events);

  const result: EventWithLayout[] = [];

  for (const group of groups) {
    const assigned = assignColumnsForGroup(group);

    for (const { event, column, totalColumns } of assigned) {
      result.push({ ...event, column, totalColumns });
    }
  }

  // Re-sort by start_time for consistent rendering order
  result.sort((a, b) => a.start_time - b.start_time);

  return result;
}
