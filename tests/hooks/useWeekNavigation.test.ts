// ========== useWeekNavigation integration tests ==========

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWeekNavigation } from '../../src/hooks/useWeekNavigation';
import { getMonday } from '../../src/utils/dateUtils';

describe('useWeekNavigation', () => {
  it('returns current week data', () => {
    const { result } = renderHook(() => useWeekNavigation());

    expect(result.current.currentDate).toBeInstanceOf(Date);
    expect(result.current.monday).toBeInstanceOf(Date);
    expect(result.current.sunday).toBeInstanceOf(Date);
    expect(typeof result.current.weekTitle).toBe('string');
    expect(typeof result.current.isCurrentWeek).toBe('boolean');
  });

  it('isCurrentWeek is true for current week', () => {
    const { result } = renderHook(() => useWeekNavigation());
    // Default currentDate is new Date(), so it should be current week
    expect(result.current.isCurrentWeek).toBe(true);
  });

  it('goToPrevWeek navigates backward', () => {
    const { result } = renderHook(() => useWeekNavigation());

    const originalMonday = result.current.monday.getTime();

    act(() => {
      result.current.goToPrevWeek();
    });

    // New Monday should be 7 days earlier
    expect(result.current.monday.getTime()).toBe(
      originalMonday - 7 * 24 * 60 * 60 * 1000,
    );
  });

  it('goToNextWeek navigates forward', () => {
    const { result } = renderHook(() => useWeekNavigation());

    const originalMonday = result.current.monday.getTime();

    act(() => {
      result.current.goToNextWeek();
    });

    expect(result.current.monday.getTime()).toBe(
      originalMonday + 7 * 24 * 60 * 60 * 1000,
    );
  });

  it('goToToday returns to current week', () => {
    const { result } = renderHook(() => useWeekNavigation());

    // Navigate away first
    act(() => {
      result.current.goToPrevWeek();
      result.current.goToPrevWeek();
    });

    expect(result.current.isCurrentWeek).toBe(false);

    act(() => {
      result.current.goToToday();
    });

    expect(result.current.isCurrentWeek).toBe(true);
  });

  it('setCurrentDate updates week', () => {
    const { result } = renderHook(() => useWeekNavigation());

    const targetDate = new Date(2026, 5, 15); // June 15, 2026

    act(() => {
      result.current.setCurrentDate(targetDate);
    });

    const expectedMonday = getMonday(targetDate);
    expect(result.current.monday.getTime()).toBe(expectedMonday.getTime());
  });

  it('weekTitle updates with navigation', () => {
    const { result } = renderHook(() => useWeekNavigation());

    const originalTitle = result.current.weekTitle;

    act(() => {
      result.current.goToPrevWeek();
    });

    expect(result.current.weekTitle).not.toBe(originalTitle);
  });
});
