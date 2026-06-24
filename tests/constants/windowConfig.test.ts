// ========== windowConfig integration tests ==========

import { describe, it, expect } from 'vitest';
import {
  WIDGET_SIZE,
  WEEK_VIEW_SIZE,
  TRANSITION_LOCK_MS,
  HOUR_HEIGHT_PX,
  DAY_START_HOUR,
  DAY_END_HOUR,
  MCP_PORT,
} from '../../src/constants/windowConfig';

describe('windowConfig', () => {
  it('WIDGET_SIZE is 100x100', () => {
    expect(WIDGET_SIZE).toEqual({ width: 100, height: 100 });
  });

  it('WEEK_VIEW_SIZE is 860x780', () => {
    expect(WEEK_VIEW_SIZE).toEqual({ width: 860, height: 780 });
  });

  it('TRANSITION_LOCK_MS is 350', () => {
    expect(TRANSITION_LOCK_MS).toBe(350);
  });

  it('HOUR_HEIGHT_PX is 50', () => {
    expect(HOUR_HEIGHT_PX).toBe(50);
  });

  it('DAY_START_HOUR is 8', () => {
    expect(DAY_START_HOUR).toBe(8);
  });

  it('DAY_END_HOUR is 21', () => {
    expect(DAY_END_HOUR).toBe(21);
  });

  it('DAY_END_HOUR > DAY_START_HOUR', () => {
    expect(DAY_END_HOUR).toBeGreaterThan(DAY_START_HOUR);
  });

  it('MCP_PORT is 18765', () => {
    expect(MCP_PORT).toBe(18765);
  });
});
