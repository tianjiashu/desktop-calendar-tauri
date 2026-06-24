// ========== eventLayout integration tests ==========

import { describe, it, expect } from 'vitest';
import { assignColumns } from '../../src/utils/eventLayout';
import type { CalendarEvent } from '../../src/types';

function makeEvent(overrides: Partial<CalendarEvent> & { id: string }): CalendarEvent {
  const now = new Date(2026, 5, 22, 10, 0).getTime();
  return {
    id: overrides.id,
    title: overrides.title ?? '测试事件',
    start_time: overrides.start_time ?? now,
    end_time: overrides.end_time ?? now + 3600_000,
    timezone: 'Asia/Shanghai',
    is_all_day: false,
    status: 'confirmed',
    color: '#3B82F6',
    event_type: 'default',
    created_by: 'human',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

const H = 3600_000;

describe('assignColumns', () => {
  it('returns empty for no events', () => {
    expect(assignColumns([])).toEqual([]);
  });

  it('single event has column=0, totalColumns=1', () => {
    const events = [makeEvent({ id: '1' })];
    const result = assignColumns(events);
    expect(result).toHaveLength(1);
    expect(result[0].column).toBe(0);
    expect(result[0].totalColumns).toBe(1);
  });

  it('non-overlapping events each get full width', () => {
    const base = new Date(2026, 5, 22, 9, 0).getTime();
    const events = [
      makeEvent({ id: '1', start_time: base, end_time: base + H }),
      makeEvent({ id: '2', start_time: base + H * 2, end_time: base + H * 3 }),
    ];
    const result = assignColumns(events);
    expect(result).toHaveLength(2);
    expect(result[0].totalColumns).toBe(1);
    expect(result[1].totalColumns).toBe(1);
  });

  it('two overlapping events split into 2 columns', () => {
    const base = new Date(2026, 5, 22, 10, 0).getTime();
    const events = [
      makeEvent({ id: '1', start_time: base, end_time: base + H }),
      makeEvent({ id: '2', start_time: base + H / 2, end_time: base + H * 2 }),
    ];
    const result = assignColumns(events);
    expect(result).toHaveLength(2);
    expect(result[0].totalColumns).toBe(2);
    expect(result[1].totalColumns).toBe(2);
    // Different columns
    expect(result[0].column).not.toBe(result[1].column);
  });

  it('three overlapping events split into 3 columns', () => {
    const base = new Date(2026, 5, 22, 10, 0).getTime();
    const events = [
      makeEvent({ id: '1', start_time: base, end_time: base + H }),
      makeEvent({ id: '2', start_time: base, end_time: base + H }),
      makeEvent({ id: '3', start_time: base, end_time: base + H }),
    ];
    const result = assignColumns(events);
    expect(result).toHaveLength(3);
    expect(result[0].totalColumns).toBe(3);
    // All columns are unique
    const cols = new Set(result.map(r => r.column));
    expect(cols.size).toBe(3);
  });

  it('reuses columns when events end', () => {
    const base = new Date(2026, 5, 22, 9, 0).getTime();
    const events = [
      // Event 1: 9:00-9:30
      makeEvent({ id: '1', start_time: base, end_time: base + H / 2 }),
      // Event 2: 9:00-10:00 (overlaps with 1)
      makeEvent({ id: '2', start_time: base, end_time: base + H }),
      // Event 3: 9:30-10:00 (fits in column 0 after event 1 ends)
      makeEvent({ id: '3', start_time: base + H / 2, end_time: base + H }),
    ];
    const result = assignColumns(events);
    expect(result).toHaveLength(3);
    // Event 3 should reuse Event 1's column
    expect(result[2].column).toBe(0);
    expect(result[0].totalColumns).toBe(2);
  });
});
