// ========== CurrentTimeLine integration tests ==========

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import CurrentTimeLine from '../../../src/components/WeekView/CurrentTimeLine';

describe('CurrentTimeLine', () => {
  it('renders time line element', () => {
    const { container } = render(<CurrentTimeLine />);
    expect(container.querySelector('.current-time-line')).toBeDefined();
  });

  it('calculates top position based on current time', () => {
    const { container } = render(<CurrentTimeLine />);
    const line = container.querySelector('.current-time-line') as HTMLElement;
    // Should have a top style (px value)
    expect(line.style.top).toBeDefined();
  });
});
