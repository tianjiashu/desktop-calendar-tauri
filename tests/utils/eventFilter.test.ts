// ========== eventFilter integration tests ==========

import { describe, it, expect } from 'vitest';
import {
  filterVisibleEvents,
  calculateTimePosition,
  calculateDurationHeight,
} from '../../src/utils/eventFilter';
import type { CalendarEvent } from '../../src/types';

function makeEvent(overrides: Partial<CalendarEvent> & { id: string }): CalendarEvent {
  const now = new Date(2026, 5, 22, 12, 0).getTime();
  return {
    id: overrides.id,
    title: '测试',
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

describe('filterVisibleEvents', () => {
  it('keeps events within 8:00-21:00', () => {
    const inRange = makeEvent({
      id: '1',
      start_time: new Date(2026, 5, 22, 10, 0).getTime(),
      end_time: new Date(2026, 5, 22, 11, 0).getTime(),
    });
    expect(filterVisibleEvents([inRange])).toHaveLength(1);
  });

  it('filters events before 8:00', () => {
    const before = makeEvent({
      id: '1',
      start_time: new Date(2026, 5, 22, 5, 0).getTime(),
      end_time: new Date(2026, 5, 22, 7, 0).getTime(),
    });
    expect(filterVisibleEvents([before])).toHaveLength(0);
  });

  it('filters events after 21:00', () => {
    const after = makeEvent({
      id: '1',
      start_time: new Date(2026, 5, 22, 22, 0).getTime(),
      end_time: new Date(2026, 5, 22, 23, 0).getTime(),
    });
    expect(filterVisibleEvents([after])).toHaveLength(0);
  });

  it('keeps events spanning across 8:00 boundary', () => {
    const spanning = makeEvent({
      id: '1',
      start_time: new Date(2026, 5, 22, 6, 0).getTime(),
      end_time: new Date(2026, 5, 22, 10, 0).getTime(),
    });
    expect(filterVisibleEvents([spanning])).toHaveLength(1);
  });
});

describe('calculateTimePosition', () => {
  it('returns 0 for event at 8:00', () => {
    const ts = new Date(2026, 5, 22, 8, 0).getTime();
    expect(calculateTimePosition(ts)).toBe(0);
  });

  it('returns correct px for event at 9:00', () => {
    const ts = new Date(2026, 5, 22, 9, 0).getTime();
    expect(calculateTimePosition(ts)).toBe(50); // 1h * 50px (HOUR_HEIGHT_PX = 50)
  });

  it('clamps to 0 for events before 8:00', () => {
    const ts = new Date(2026, 5, 22, 6, 0).getTime();
    expect(calculateTimePosition(ts)).toBe(0);
  });
});

describe('calculateDurationHeight', () => {
  it('returns correct height for 1-hour event', () => {
    const start = new Date(2026, 5, 22, 10, 0).getTime();
    const end = new Date(2026, 5, 22, 11, 0).getTime();
    expect(calculateDurationHeight(start, end)).toBe(50); // 1h * 50px (HOUR_HEIGHT_PX = 50)
  });

  it('enforces minimum height of 22px', () => {
    const start = new Date(2026, 5, 22, 10, 0).getTime();
    const end = new Date(2026, 5, 22, 10, 1).getTime(); // 1 minute
    expect(calculateDurationHeight(start, end)).toBe(22);
  });
});
