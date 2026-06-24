// ========== TimeGridLines integration tests ==========

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import TimeGridLines from '../../../src/components/WeekView/TimeGridLines';

describe('TimeGridLines', () => {
  it('renders hour lines', () => {
    const { container } = render(<TimeGridLines headerHeight={48} />);
    const hourLines = container.querySelectorAll('.time-hour-line');
    expect(hourLines.length).toBe(14); // 21-8+1 = 14
  });

  it('renders half-hour lines', () => {
    const { container } = render(<TimeGridLines headerHeight={48} />);
    const halfLines = container.querySelectorAll('.time-half-line');
    expect(halfLines.length).toBe(13); // one less than hours
  });

  it('renders with snapInfo', () => {
    const snapInfo = { edge: 'top' as const, snappedMinutes: 600 };
    const { container } = render(
      <TimeGridLines headerHeight={48} snapInfo={snapInfo} />,
    );
    // Should still render lines
    expect(container.querySelectorAll('.time-hour-line').length).toBeGreaterThan(0);
  });
});
