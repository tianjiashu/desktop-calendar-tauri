// ========== DayHeader integration tests ==========

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DayHeader from '../../../src/components/WeekView/DayHeader';

describe('DayHeader', () => {
  it('renders weekday label', () => {
    // 2026-06-22 is Monday
    render(<DayHeader date={new Date(2026, 5, 22)} isToday={false} />);
    expect(screen.getByText('周一')).toBeDefined();
  });

  it('renders date number', () => {
    render(<DayHeader date={new Date(2026, 5, 22)} isToday={false} />);
    expect(screen.getByText('22')).toBeDefined();
  });

  it('adds today class when isToday', () => {
    const { container } = render(
      <DayHeader date={new Date(2026, 5, 22)} isToday={true} />,
    );
    expect(container.querySelector('.today')).toBeDefined();
  });

  it('does not add today class when not isToday', () => {
    const { container } = render(
      <DayHeader date={new Date(2026, 5, 22)} isToday={false} />,
    );
    expect(container.querySelector('.today')).toBeNull();
  });
});
