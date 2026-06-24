// ========== eventTypeColors integration tests ==========

import { describe, it, expect } from 'vitest';
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from '../../src/constants/eventTypeColors';

describe('EVENT_TYPE_COLORS', () => {
  it('has color for interview', () => {
    expect(EVENT_TYPE_COLORS.interview).toBe('#3B82F6');
  });

  it('has color for meeting', () => {
    expect(EVENT_TYPE_COLORS.meeting).toBe('#10B981');
  });

  it('has color for reminder', () => {
    expect(EVENT_TYPE_COLORS.reminder).toBe('#F59E0B');
  });

  it('has color for deadline', () => {
    expect(EVENT_TYPE_COLORS.deadline).toBe('#EF4444');
  });

  it('has color for default', () => {
    expect(EVENT_TYPE_COLORS.default).toBe('#6B7280');
  });

  it('all colors are valid hex', () => {
    for (const color of Object.values(EVENT_TYPE_COLORS)) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('has labels matching colors keys', () => {
    const colorKeys = Object.keys(EVENT_TYPE_COLORS);
    const labelKeys = Object.keys(EVENT_TYPE_LABELS);
    expect(colorKeys.sort()).toEqual(labelKeys.sort());
  });
});

describe('EVENT_TYPE_LABELS', () => {
  it('has Chinese labels', () => {
    expect(EVENT_TYPE_LABELS.interview).toBe('面试');
    expect(EVENT_TYPE_LABELS.meeting).toBe('会议');
    expect(EVENT_TYPE_LABELS.reminder).toBe('提醒');
    expect(EVENT_TYPE_LABELS.deadline).toBe('截止');
    expect(EVENT_TYPE_LABELS.default).toBe('默认');
  });
});
