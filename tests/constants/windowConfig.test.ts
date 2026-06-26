// ========== windowConfig integration tests ==========

import { describe, it, expect } from 'vitest';
import {
  DAY_START_HOUR,
  DAY_END_HOUR,
  CONTENT_FADE_MS,
  HOUR_HEIGHT_PX,
  MCP_PORT,
  TRANSITION_LOCK_MS,
  WIDGET_MAX_SIZE,
  WIDGET_MIN_SIZE,
  WIDGET_SIZE,
  WEEK_VIEW_SIZE,
  WINDOW_EDGE_MARGIN,
} from '../../src/constants/windowConfig';

describe('windowConfig', () => {
  it('WIDGET_SIZE is 100x100', () => {
    expect(WIDGET_SIZE).toEqual({ width: 100, height: 100 });
  });

  it('WEEK_VIEW_SIZE is 860x780', () => {
    expect(WEEK_VIEW_SIZE).toEqual({ width: 860, height: 780 });
  });

  it('widget resize bounds match the floating widget behavior', () => {
    expect(WIDGET_MIN_SIZE).toEqual({ width: 100, height: 100 });
    expect(WIDGET_MAX_SIZE).toEqual({ width: 200, height: 200 });
  });

  it('WINDOW_EDGE_MARGIN is 96', () => {
    expect(WINDOW_EDGE_MARGIN).toBe(96);
  });

  it('TRANSITION_LOCK_MS is 350', () => {
    expect(TRANSITION_LOCK_MS).toBe(350);
  });

  it('CONTENT_FADE_MS is 120', () => {
    expect(CONTENT_FADE_MS).toBe(120);
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
