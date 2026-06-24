// ========== TimeColumn integration tests ==========

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TimeColumn from '../../../src/components/WeekView/TimeColumn';

describe('TimeColumn', () => {
  it('renders hour labels from 8:00 to 21:00', () => {
    render(<TimeColumn />);

    // Check key hours
    expect(screen.getByText('08:00')).toBeDefined();
    expect(screen.getByText('12:00')).toBeDefined();
    expect(screen.getByText('21:00')).toBeDefined();
  });

  it('renders correct number of hours', () => {
    const { container } = render(<TimeColumn />);
    const labels = container.querySelectorAll('.time-label');
    expect(labels.length).toBe(14); // 21 - 8 + 1 = 14
  });
});
