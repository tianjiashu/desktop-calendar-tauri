// ========== dateUtils integration tests ==========

import { describe, it, expect } from 'vitest';
import {
  getMonday,
  getWeekRange,
  getWeekDates,
  formatWeekTitle,
  formatTime,
  getTodayStart,
  isSameDay,
  getWeekdayLabel,
} from '../../src/utils/dateUtils';

describe('getMonday', () => {
  it('returns Monday for a Tuesday', () => {
    // 2026-06-23 is Tuesday
    const tuesday = new Date(2026, 5, 23);
    const monday = getMonday(tuesday);
    expect(monday.getDay()).toBe(1); // Monday
    expect(monday.getDate()).toBe(22);
  });

  it('returns previous Monday for Sunday', () => {
    // 2026-06-28 is Sunday
    const sunday = new Date(2026, 5, 28);
    const monday = getMonday(sunday);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(22); // Previous Monday
  });

  it('returns same day if already Monday', () => {
    const monday = new Date(2026, 5, 22); // Monday
    const result = getMonday(monday);
    expect(result.getDate()).toBe(22);
  });
});

describe('getWeekRange', () => {
  it('returns correct 7-day range', () => {
    const { monday, sunday } = getWeekRange(new Date(2026, 5, 25));
    expect(monday.getDay()).toBe(1);
    expect(sunday.getDay()).toBe(0);
    // Sunday is set to 23:59:59.999, so diff is 6 days + 23h59m59.999s
    const sixDaysEndOfDay = 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000 + 999;
    expect(sunday.getTime() - monday.getTime()).toBe(sixDaysEndOfDay);
  });
});

describe('getWeekDates', () => {
  it('returns 7 dates', () => {
    const dates = getWeekDates(new Date(2026, 5, 25));
    expect(dates).toHaveLength(7);
    expect(dates[0].getDay()).toBe(1); // Monday
    expect(dates[6].getDay()).toBe(0); // Sunday
  });

  it('all dates within same month (usually)', () => {
    const dates = getWeekDates(new Date(2026, 5, 25));
    // All 7 dates should be sequential
    for (let i = 1; i < 7; i++) {
      expect(dates[i].getTime() - dates[i - 1].getTime()).toBe(24 * 60 * 60 * 1000);
    }
  });
});

describe('formatWeekTitle', () => {
  it('formats same-month range correctly', () => {
    const monday = new Date(2026, 5, 22);
    const sunday = new Date(2026, 5, 28);
    expect(formatWeekTitle(monday, sunday)).toBe('6月22日 - 28日 (2026年)');
  });

  it('formats cross-month range correctly', () => {
    const monday = new Date(2026, 5, 29);
    const sunday = new Date(2026, 6, 5);
    expect(formatWeekTitle(monday, sunday)).toBe('6月29日 - 7月5日 (2026年)');
  });
});

describe('formatTime', () => {
  it('formats morning time', () => {
    // 9:30 AM
    const ts = new Date(2026, 5, 22, 9, 30, 0).getTime();
    expect(formatTime(ts)).toBe('09:30');
  });

  it('formats midnight', () => {
    const ts = new Date(2026, 5, 22, 0, 0, 0).getTime();
    expect(formatTime(ts)).toBe('00:00');
  });
});

describe('isSameDay', () => {
  it('returns true for same day', () => {
    const a = new Date(2026, 5, 22, 10, 0);
    const b = new Date(2026, 5, 22, 15, 30);
    expect(isSameDay(a, b)).toBe(true);
  });

  it('returns false for different days', () => {
    const a = new Date(2026, 5, 22);
    const b = new Date(2026, 5, 23);
    expect(isSameDay(a, b)).toBe(false);
  });
});

describe('getTodayStart', () => {
  it('returns today at 00:00:00', () => {
    const today = getTodayStart();
    expect(today.getHours()).toBe(0);
    expect(today.getMinutes()).toBe(0);
    expect(today.getSeconds()).toBe(0);
    expect(today.getMilliseconds()).toBe(0);
  });

  it('returns current date', () => {
    const today = getTodayStart();
    const now = new Date();
    expect(today.getFullYear()).toBe(now.getFullYear());
    expect(today.getMonth()).toBe(now.getMonth());
    expect(today.getDate()).toBe(now.getDate());
  });
});

describe('getWeekdayLabel', () => {
  it('returns Chinese labels', () => {
    expect(getWeekdayLabel(new Date(2026, 5, 22))).toBe('周一'); // Monday
    expect(getWeekdayLabel(new Date(2026, 5, 28))).toBe('周日'); // Sunday
  });
});
