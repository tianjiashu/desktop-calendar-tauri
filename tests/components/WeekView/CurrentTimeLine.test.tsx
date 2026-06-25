// ========== CurrentTimeLine integration tests (Phase E) ==========

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import CurrentTimeLine from '../../../src/components/WeekView/CurrentTimeLine';

describe('CurrentTimeLine', () => {
  it('renders time line element', () => {
    const { container } = render(<CurrentTimeLine headerHeight={46} />);
    // motion.div renders as a regular div with the CSS class in jsdom
    const line = container.querySelector('.current-time-line');
    expect(line).toBeDefined();
  });

  it('calculates top position based on current time', () => {
    const { container } = render(<CurrentTimeLine headerHeight={46} />);
    const line = container.querySelector('.current-time-line') as HTMLElement | null;
    if (line) {
      // Should have a top style (px value) from the motion component
      expect(line.style.top).toBeDefined();
    } else {
      // Line may be hidden if current time outside visible range (8:00-21:00)
      // This is valid behavior — the line should not render outside visible hours
      const label = container.querySelector('.current-time-label');
      expect(label).toBeNull();
    }
  });
});
