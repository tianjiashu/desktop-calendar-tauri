// ========== EventTooltip integration tests ==========

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EventTooltip from '../../../src/components/Calendar/EventTooltip';

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    title: 'Test Event',
    start_time: new Date(2026, 5, 22, 10, 0).getTime(),
    end_time: new Date(2026, 5, 22, 11, 0).getTime(),
    timezone: 'Asia/Shanghai',
    is_all_day: false,
    status: 'confirmed' as const,
    color: '#3B82F6',
    event_type: 'default' as const,
    created_by: 'human' as const,
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides,
  };
}

const defaultPosition = { top: 100, left: 200, placement: 'bottom' as const };

describe('EventTooltip', () => {
  it('renders event title', () => {
    render(<EventTooltip event={makeEvent()} position={defaultPosition} />);
    expect(screen.getByText('Test Event')).toBeDefined();
  });

  it('renders time range', () => {
    render(<EventTooltip event={makeEvent()} position={defaultPosition} />);
    expect(screen.getByText('10:00 - 11:00')).toBeDefined();
  });

  it('renders location if present', () => {
    render(
      <EventTooltip
        event={makeEvent({ location: 'Room 101' })}
        position={defaultPosition}
      />,
    );
    expect(screen.getByText(/Room 101/)).toBeDefined();
  });

  it('renders description if present', () => {
    render(
      <EventTooltip
        event={makeEvent({ description: 'Important meeting' })}
        position={defaultPosition}
      />,
    );
    expect(screen.getByText('Important meeting')).toBeDefined();
  });
});
