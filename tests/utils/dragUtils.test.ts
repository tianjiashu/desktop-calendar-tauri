// ========== dragUtils integration tests ==========

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DRAG_THRESHOLD_PX,
  MIN_DURATION_MINUTES,
  SNAP_THRESHOLD_MINUTES,
  MAX_CONCURRENT_EVENTS,
  clampMinutes,
  deltaPxToMinutes,
  timestampToMinutes,
  minutesToPx,
  findNearestHalfHour,
  snapToHalfHour,
  snapTo5Minutes,
  calculateRawTimes,
  applyConstraints,
  detectSnapInfo,
  resolveSnappedPreview,
  buildTimestamp,
  getDateMidnight,
  buildCrossDayTimestamp,
  detectTargetDate,
  countOverlapping,
} from '../../src/utils/dragUtils';
import type { DragState, DragMode } from '../../src/utils/dragUtils';

// ========== Helpers ==========

function makeDragState(overrides: Partial<DragState> = {}): DragState {
  return {
    mode: 'move',
    originalStart: new Date(2026, 5, 22, 10, 0).getTime(),
    originalEnd: new Date(2026, 5, 22, 11, 0).getTime(),
    startClientY: 0,
    deltaPx: 0,
    startClientX: 0,
    targetDate: null,
    ...overrides,
  };
}

// ========== Constants ==========

describe('Constants', () => {
  it('DRAG_THRESHOLD_PX is 4', () => {
    expect(DRAG_THRESHOLD_PX).toBe(4);
  });

  it('MIN_DURATION_MINUTES is 15', () => {
    expect(MIN_DURATION_MINUTES).toBe(15);
  });

  it('SNAP_THRESHOLD_MINUTES is 7', () => {
    expect(SNAP_THRESHOLD_MINUTES).toBe(7);
  });

  it('MAX_CONCURRENT_EVENTS is 2', () => {
    expect(MAX_CONCURRENT_EVENTS).toBe(2);
  });
});

// ========== clampMinutes ==========

describe('clampMinutes', () => {
  it('returns value within range unchanged', () => {
    expect(clampMinutes(600)).toBe(600); // 10:00
  });

  it('clamps below minimum', () => {
    expect(clampMinutes(300)).toBe(480); // 5:00 -> 8:00
  });

  it('clamps above maximum', () => {
    expect(clampMinutes(1500)).toBe(1260); // 25:00 -> 21:00
  });

  it('returns minimum at boundary', () => {
    expect(clampMinutes(480)).toBe(480); // exactly 8:00
  });

  it('returns maximum at boundary', () => {
    expect(clampMinutes(1260)).toBe(1260); // exactly 21:00
  });
});

// ========== deltaPxToMinutes ==========

describe('deltaPxToMinutes', () => {
  it('converts positive delta', () => {
    // 50px = 1 hour = 60 minutes
    expect(deltaPxToMinutes(50)).toBe(60);
  });

  it('converts negative delta', () => {
    expect(deltaPxToMinutes(-50)).toBe(-60);
  });

  it('returns 0 for 0 delta', () => {
    expect(deltaPxToMinutes(0)).toBe(0);
  });

  it('handles fractional pixels', () => {
    // 25px = 0.5 hour = 30 minutes
    expect(deltaPxToMinutes(25)).toBe(30);
  });
});

// ========== timestampToMinutes ==========

describe('timestampToMinutes', () => {
  it('converts morning time', () => {
    const ts = new Date(2026, 5, 22, 9, 30).getTime();
    expect(timestampToMinutes(ts)).toBe(570); // 9*60 + 30
  });

  it('converts midnight', () => {
    const ts = new Date(2026, 5, 22, 0, 0).getTime();
    expect(timestampToMinutes(ts)).toBe(0);
  });

  it('converts noon', () => {
    const ts = new Date(2026, 5, 22, 12, 0).getTime();
    expect(timestampToMinutes(ts)).toBe(720);
  });

  it('converts end of day', () => {
    const ts = new Date(2026, 5, 22, 23, 59).getTime();
    expect(timestampToMinutes(ts)).toBe(1439);
  });
});

// ========== minutesToPx ==========

describe('minutesToPx', () => {
  it('returns 0 for DAY_START_HOUR', () => {
    expect(minutesToPx(480)).toBe(0); // 8:00
  });

  it('returns 50 for 1 hour after start', () => {
    expect(minutesToPx(540)).toBe(50); // 9:00 -> (540-480)/60 * 50 = 50
  });

  it('returns correct px for 12:00', () => {
    expect(minutesToPx(720)).toBe(200); // (720-480)/60 * 50 = 200
  });
});

// ========== findNearestHalfHour ==========

describe('findNearestHalfHour', () => {
  it('snaps to exact hour', () => {
    expect(findNearestHalfHour(600)).toEqual({ snapped: 600, dist: 0 });
  });

  it('snaps to exact half-hour', () => {
    expect(findNearestHalfHour(630)).toEqual({ snapped: 630, dist: 0 });
  });

  it('snaps to hour when closer', () => {
    // 10:10 -> closer to 10:00 (dist 10) than 10:30 (dist 20)
    expect(findNearestHalfHour(610)).toEqual({ snapped: 600, dist: 10 });
  });

  it('snaps to half-hour when closer', () => {
    // 10:20 -> closer to 10:30 (dist 10) than 10:00 (dist 20)
    expect(findNearestHalfHour(620)).toEqual({ snapped: 630, dist: 10 });
  });

  it('snaps to half-hour at 14:45', () => {
    // 14:45 = 885 min -> dist to 14:30 = 15, dist to 15:00 = 15
    // findNearestHalfHour: hour=14, min=45, distToHour=45, distToHalf=15
    // distToHalf (15) <= distToHour (45), so snaps to 14:30 (870)
    expect(findNearestHalfHour(885)).toEqual({ snapped: 870, dist: 15 });
  });
});

// ========== snapToHalfHour ==========

describe('snapToHalfHour', () => {
  it('snaps within threshold', () => {
    // 10:03 -> within 7min of 10:00
    expect(snapToHalfHour(603)).toBe(600);
  });

  it('does not snap outside threshold', () => {
    // 10:08 -> 8min from 10:00, not within 7min
    expect(snapToHalfHour(608)).toBe(608);
  });

  it('snaps to half-hour within threshold', () => {
    // 10:25 -> within 7min of 10:30 (dist=5)
    expect(snapToHalfHour(625)).toBe(630);
  });

  it('returns exact value on boundary', () => {
    // 10:07 -> exactly 7min, should snap
    expect(snapToHalfHour(607)).toBe(600);
  });

  it('does not snap at 10:08', () => {
    // 10:08 -> 8min from 10:00, outside 7min threshold
    expect(snapToHalfHour(608)).toBe(608);
  });
});

// ========== snapTo5Minutes ==========

describe('snapTo5Minutes', () => {
  it('snaps 0 to 0', () => {
    expect(snapTo5Minutes(0)).toBe(0);
  });

  it('snaps 2 to 0', () => {
    expect(snapTo5Minutes(2)).toBe(0);
  });

  it('snaps 3 to 5', () => {
    expect(snapTo5Minutes(3)).toBe(5);
  });

  it('snaps 7 to 5', () => {
    expect(snapTo5Minutes(7)).toBe(5);
  });

  it('snaps 8 to 10', () => {
    expect(snapTo5Minutes(8)).toBe(10);
  });

  it('snaps 58 to 60', () => {
    expect(snapTo5Minutes(58)).toBe(60);
  });
});

// ========== calculateRawTimes ==========

describe('calculateRawTimes', () => {
  it('move mode shifts both times by delta', () => {
    const state = makeDragState({ mode: 'move' });
    const result = calculateRawTimes(state, 50); // +60min
    expect(result.topMinutes).toBe(660); // 600 + 60
    expect(result.bottomMinutes).toBe(720); // 660 + 60
  });

  it('resize-top shifts top, keeps bottom above top+MIN', () => {
    const state = makeDragState({ mode: 'resize-top' });
    const result = calculateRawTimes(state, -50); // -60min
    expect(result.topMinutes).toBe(540); // 600 - 60
    expect(result.bottomMinutes).toBe(660); // stays at original end (11:00)
  });

  it('resize-top enforces min duration', () => {
    const state = makeDragState({
      mode: 'resize-top',
      originalEnd: new Date(2026, 5, 22, 10, 15).getTime(),
    });
    const result = calculateRawTimes(state, 100); // +120min -> top=720
    // bottom should be >= top + MIN_DURATION_MINUTES
    expect(result.bottomMinutes).toBeGreaterThanOrEqual(result.topMinutes + MIN_DURATION_MINUTES);
  });

  it('resize-bottom shifts bottom, keeps top', () => {
    const state = makeDragState({ mode: 'resize-bottom' });
    const result = calculateRawTimes(state, 50); // +60min
    expect(result.bottomMinutes).toBe(720); // 660 + 60
    expect(result.topMinutes).toBe(600); // unchanged
  });

  it('resize-bottom enforces min duration', () => {
    const state = makeDragState({
      mode: 'resize-bottom',
      originalStart: new Date(2026, 5, 22, 10, 45).getTime(),
    });
    const result = calculateRawTimes(state, -100); // -120min -> bottom=540
    expect(result.topMinutes).toBeLessThanOrEqual(result.bottomMinutes - MIN_DURATION_MINUTES);
  });

  it('none mode returns original times', () => {
    const state = makeDragState({ mode: 'none' });
    const result = calculateRawTimes(state, 100);
    expect(result.topMinutes).toBe(600);
    expect(result.bottomMinutes).toBe(660);
  });
});

// ========== applyConstraints ==========

describe('applyConstraints', () => {
  it('move mode clamps top and adjusts bottom', () => {
    // Push event before 8:00
    const result = applyConstraints('move', 400, 460);
    expect(result.topMinutes).toBe(480); // clamped to 8:00
    expect(result.bottomMinutes).toBe(540); // top + 60 duration
  });

  it('move mode clamps bottom', () => {
    const result = applyConstraints('move', 1300, 1360);
    expect(result.topMinutes).toBeGreaterThanOrEqual(480);
    expect(result.bottomMinutes).toBeLessThanOrEqual(1260);
  });

  it('resize-top mode keeps bottom within range', () => {
    // Top dragged very high, bottom should be clamped
    const result = applyConstraints('resize-top', 300, 660);
    expect(result.topMinutes).toBeGreaterThanOrEqual(480);
    expect(result.bottomMinutes).toBe(660);
  });

  it('resize-bottom mode keeps top within range', () => {
    const result = applyConstraints('resize-bottom', 600, 1400);
    expect(result.topMinutes).toBeGreaterThanOrEqual(480);
    expect(result.bottomMinutes).toBe(1260);
  });
});

// ========== detectSnapInfo ==========

describe('detectSnapInfo', () => {
  it('returns null for none mode', () => {
    expect(detectSnapInfo('none', 600, 660)).toEqual({
      edge: null,
      snappedMinutes: null,
    });
  });

  it('detects top snap for resize-top', () => {
    // top at 603, within 7min of 600 (10:00)
    const result = detectSnapInfo('resize-top', 603, 660);
    expect(result.edge).toBe('top');
    expect(result.snappedMinutes).toBe(600);
  });

  it('detects bottom snap for resize-bottom', () => {
    // bottom at 664, within 7min of 660 (11:00), dist=4
    const result = detectSnapInfo('resize-bottom', 600, 664);
    expect(result.edge).toBe('bottom');
    expect(result.snappedMinutes).toBe(660);
  });

  it('detects top snap for move', () => {
    // top=603 snaps to 600 (dist=3), bottom=675 doesn't snap (dist=15 > 7)
    const result = detectSnapInfo('move', 603, 675);
    expect(result.edge).toBe('top');
    expect(result.snappedMinutes).toBe(600);
  });

  it('detects bottom snap for move', () => {
    // top=610 doesn't snap (dist=10 > 7), bottom=664 snaps to 660 (dist=4 ≤ 7)
    const result = detectSnapInfo('move', 610, 664);
    expect(result.edge).toBe('bottom');
    expect(result.snappedMinutes).toBe(660);
  });

  it('detects both snap for move', () => {
    // top=603 snaps to 600 (dist=3), bottom=664 snaps to 660 (dist=4)
    const result = detectSnapInfo('move', 603, 664);
    expect(result.edge).toBe('both');
    expect(result.snappedMinutes).toBe(600);
  });

  it('returns null when no snap', () => {
    // both > 7min away from any half-hour
    const result = detectSnapInfo('move', 610, 670);
    expect(result.edge).toBeNull();
  });
});

// ========== resolveSnappedPreview ==========

describe('resolveSnappedPreview', () => {
  it('returns correct preview for move', () => {
    const state = makeDragState({ mode: 'move' });
    const result = resolveSnappedPreview(state, 0);
    expect(result.topMinutes).toBe(600);
    expect(result.bottomMinutes).toBe(660);
    expect(result.topPx).toBe(100); // (600-480)/60 * 50
    expect(result.heightPx).toBe(50); // 60min = 50px
  });

  it('snaps top in move mode', () => {
    const state = makeDragState({ mode: 'move' });
    // delta that pushes to 10:02 -> should snap to 10:00
    // 2min = (2/60)*50 = 1.67px
    const result = resolveSnappedPreview(state, 1.67);
    expect(result.topMinutes).toBe(600); // snapped to 10:00
  });

  it('returns correct preview for resize-top', () => {
    const state = makeDragState({ mode: 'resize-top' });
    const result = resolveSnappedPreview(state, 0);
    expect(result.topMinutes).toBe(600);
    expect(result.bottomMinutes).toBe(660);
  });

  it('returns correct preview for resize-bottom', () => {
    const state = makeDragState({ mode: 'resize-bottom' });
    const result = resolveSnappedPreview(state, 0);
    expect(result.topMinutes).toBe(600);
    expect(result.bottomMinutes).toBe(660);
  });

  it('snaps to 5-min grid in resize modes', () => {
    const state = makeDragState({
      mode: 'resize-bottom',
      originalEnd: new Date(2026, 5, 22, 11, 3).getTime(),
    });
    // 11:03 = 663 min, snapped to 5-min -> 665
    const result = resolveSnappedPreview(state, 0);
    expect(result.bottomMinutes).toBe(665);
  });
});

// ========== buildTimestamp ==========

describe('buildTimestamp', () => {
  it('builds timestamp from base date and minutes', () => {
    const base = new Date(2026, 5, 22, 10, 0).getTime();
    const result = buildTimestamp(base, 720); // 12:00
    const d = new Date(result);
    expect(d.getHours()).toBe(12);
    expect(d.getMinutes()).toBe(0);
    expect(d.getDate()).toBe(22);
  });

  it('preserves date from base timestamp', () => {
    const base = new Date(2026, 5, 22, 8, 0).getTime();
    const result = buildTimestamp(base, 540); // 9:00
    const d = new Date(result);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(22);
  });
});

// ========== getDateMidnight ==========

describe('getDateMidnight', () => {
  it('returns midnight of given timestamp', () => {
    const ts = new Date(2026, 5, 22, 15, 30, 45, 123).getTime();
    const midnight = getDateMidnight(ts);
    const d = new Date(midnight);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
    expect(d.getDate()).toBe(22);
  });
});

// ========== buildCrossDayTimestamp ==========

describe('buildCrossDayTimestamp', () => {
  it('builds timestamp from target date midnight + minutes', () => {
    const targetMidnight = new Date(2026, 5, 23, 0, 0, 0, 0).getTime();
    const result = buildCrossDayTimestamp(targetMidnight, 600); // 10:00
    const d = new Date(result);
    expect(d.getHours()).toBe(10);
    expect(d.getMinutes()).toBe(0);
    expect(d.getDate()).toBe(23);
  });
});

// ========== detectTargetDate ==========

describe('detectTargetDate', () => {
  let querySelectorAllSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    querySelectorAllSpy = vi.spyOn(document, 'querySelectorAll');
  });

  afterEach(() => {
    querySelectorAllSpy.mockRestore();
  });

  it('returns null when no containers exist', () => {
    querySelectorAllSpy.mockReturnValue([] as unknown as NodeListOf<HTMLElement>);
    expect(detectTargetDate(100)).toBeNull();
  });

  it('returns date when cursor is over a container', () => {
    const mockEl = {
      getBoundingClientRect: vi.fn(() => ({
        left: 0, right: 200, top: 0, bottom: 600,
        width: 200, height: 600,
        x: 0, y: 0,
        toJSON: () => ({}),
      })),
      dataset: { date: '1719014400000' },
    };
    querySelectorAllSpy.mockReturnValue([mockEl] as unknown as NodeListOf<HTMLElement>);

    expect(detectTargetDate(100)).toBe(1719014400000);
  });

  it('returns null when cursor is outside all containers', () => {
    const mockEl = {
      getBoundingClientRect: vi.fn(() => ({
        left: 0, right: 200, top: 0, bottom: 600,
        width: 200, height: 600,
        x: 0, y: 0,
        toJSON: () => ({}),
      })),
      dataset: { date: '1719014400000' },
    };
    querySelectorAllSpy.mockReturnValue([mockEl] as unknown as NodeListOf<HTMLElement>);

    expect(detectTargetDate(300)).toBeNull();
  });

  it('picks the correct container when multiple exist', () => {
    const mockEl1 = {
      getBoundingClientRect: vi.fn(() => ({
        left: 0, right: 100, top: 0, bottom: 600,
        width: 100, height: 600,
        x: 0, y: 0,
        toJSON: () => ({}),
      })),
      dataset: { date: '111' },
    };
    const mockEl2 = {
      getBoundingClientRect: vi.fn(() => ({
        left: 100, right: 200, top: 0, bottom: 600,
        width: 100, height: 600,
        x: 100, y: 0,
        toJSON: () => ({}),
      })),
      dataset: { date: '222' },
    };
    querySelectorAllSpy.mockReturnValue([mockEl1, mockEl2] as unknown as NodeListOf<HTMLElement>);

    expect(detectTargetDate(50)).toBe(111);
    expect(detectTargetDate(150)).toBe(222);
  });

  it('returns null when container has no data-date', () => {
    const mockEl = {
      getBoundingClientRect: vi.fn(() => ({
        left: 0, right: 200, top: 0, bottom: 600,
        width: 200, height: 600,
        x: 0, y: 0,
        toJSON: () => ({}),
      })),
      dataset: {},
    };
    querySelectorAllSpy.mockReturnValue([mockEl] as unknown as NodeListOf<HTMLElement>);

    expect(detectTargetDate(100)).toBeNull();
  });
});

// ========== countOverlapping ==========

describe('countOverlapping', () => {
  const events = [
    { id: '1', start_time: 1000, end_time: 2000 },
    { id: '2', start_time: 1500, end_time: 2500 },
    { id: '3', start_time: 3000, end_time: 4000 },
  ];

  it('returns 0 when no events overlap', () => {
    expect(countOverlapping(events, 'x', 5000, 6000)).toBe(0);
  });

  it('counts overlapping events', () => {
    // Range overlaps with event 1 and 2
    expect(countOverlapping(events, 'x', 1200, 1800)).toBe(2);
  });

  it('excludes given event id', () => {
    // Range overlaps with 1 and 2, but exclude 1
    expect(countOverlapping(events, '1', 1200, 1800)).toBe(1);
  });

  it('handles exact boundary (non-overlap)', () => {
    // Range [2000, 3000] — event 3 starts at 3000 (not >, so no overlap with 3)
    // But event 2 end=2500 > 2000 and start=1500 < 3000, so event 2 overlaps
    expect(countOverlapping(events, 'x', 2000, 3000)).toBe(1);
  });

  it('handles exact boundary (overlap)', () => {
    // Start just before event 3 ends
    expect(countOverlapping(events, 'x', 3999, 5000)).toBe(1);
  });

  it('returns 0 for empty events array', () => {
    expect(countOverlapping([], 'x', 1000, 2000)).toBe(0);
  });
});
