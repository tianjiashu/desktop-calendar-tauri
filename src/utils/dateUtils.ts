// ========== Date utilities ==========

/**
 * Get the Monday of the week containing the given date.
 * Week starts on Monday (Chinese convention).
 */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the week range (7 days) containing the given date.
 * Returns Monday 00:00 to Sunday 23:59:59.
 */
export function getWeekRange(date: Date): { monday: Date; sunday: Date } {
  const monday = getMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

/**
 * Get the 7 dates of the week containing the given date.
 */
export function getWeekDates(date: Date): Date[] {
  const monday = getMonday(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/**
 * Format week range title: "M月D日 - M月D日 (YYYY年)"
 */
export function formatWeekTitle(monday: Date, sunday: Date): string {
  const y = monday.getFullYear();
  const m1 = monday.getMonth() + 1;
  const d1 = monday.getDate();
  const m2 = sunday.getMonth() + 1;
  const d2 = sunday.getDate();

  if (m1 === m2) {
    return `${m1}月${d1}日 - ${d2}日 (${y}年)`;
  }
  return `${m1}月${d1}日 - ${m2}月${d2}日 (${y}年)`;
}

/**
 * Format a timestamp (Unix ms) to HH:MM
 */
export function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Get today's date at 00:00:00
 */
export function getTodayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/**
 * Get day of week label (Chinese)
 */
export function getWeekdayLabel(date: Date): string {
  const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return WEEKDAYS[date.getDay()];
}

/**
 * Convert Unix ms timestamp to minutes since midnight (local time).
 *
 * Single source of truth for this conversion — used by eventFilter,
 * dragUtils, and other time-position calculations.
 */
export function timestampToMinutes(ts: number): number {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Format a Date object to "YYYY-MM-DD" string (for <input type="date">).
 */
export function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Format a Date object to "HH:MM" string (for <input type="time">).
 *
 * This is the Date-based counterpart to `formatTime(timestamp)` which
 * accepts a Unix ms timestamp. Both produce the same "HH:MM" output.
 */
export function formatTimeStr(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
