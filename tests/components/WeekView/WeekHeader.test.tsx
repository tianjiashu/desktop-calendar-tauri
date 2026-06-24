// ========== WeekHeader integration tests ==========

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WeekHeader from '../../../src/components/WeekView/WeekHeader';

describe('WeekHeader', () => {
  it('renders week title', () => {
    render(
      <WeekHeader
        weekTitle="6月22日 - 28日 (2026年)"
        isCurrentWeek={false}
        isRefreshing={false}
        onPrevWeek={() => {}}
        onNextWeek={() => {}}
        onToday={() => {}}
        onRefresh={() => {}}
        onShrink={() => {}}
        onClose={() => {}}
        onAddEvent={() => {}}
      />,
    );

    expect(screen.getByText('6月22日 - 28日 (2026年)')).toBeDefined();
  });

  it('renders navigation buttons by aria-label', () => {
    render(
      <WeekHeader
        weekTitle="test"
        isCurrentWeek={false}
        isRefreshing={false}
        onPrevWeek={() => {}}
        onNextWeek={() => {}}
        onToday={() => {}}
        onRefresh={() => {}}
        onShrink={() => {}}
        onClose={() => {}}
        onAddEvent={() => {}}
      />,
    );

    // Navigation buttons use aria-label now (Phosphor icons)
    expect(screen.getByLabelText('上一周')).toBeDefined();
    expect(screen.getByLabelText('下一周')).toBeDefined();
  });

  it('shows today button when not isCurrentWeek', () => {
    render(
      <WeekHeader
        weekTitle="test"
        isCurrentWeek={false}
        isRefreshing={false}
        onPrevWeek={() => {}}
        onNextWeek={() => {}}
        onToday={() => {}}
        onRefresh={() => {}}
        onShrink={() => {}}
        onClose={() => {}}
        onAddEvent={() => {}}
      />,
    );

    // Today pill button should be visible (non-current week)
    expect(screen.getByLabelText('回到本周')).toBeDefined();
  });

  it('hides today button when isCurrentWeek', () => {
    render(
      <WeekHeader
        weekTitle="test"
        isCurrentWeek={true}
        isRefreshing={false}
        onPrevWeek={() => {}}
        onNextWeek={() => {}}
        onToday={() => {}}
        onRefresh={() => {}}
        onShrink={() => {}}
        onClose={() => {}}
        onAddEvent={() => {}}
      />,
    );

    // Today pill should not exist when on current week
    expect(screen.queryByLabelText('回到本周')).toBeNull();
  });
});
