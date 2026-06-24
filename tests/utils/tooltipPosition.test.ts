// ========== tooltipPosition integration tests ==========

import { describe, it, expect } from 'vitest';
import { getTooltipPosition } from '../../src/utils/tooltipPosition';

const TOOLTIP = { width: 200, height: 100 };
const VIEWPORT = { width: 800, height: 600 };

describe('getTooltipPosition', () => {
  it('places below when enough space', () => {
    // Element at (100, 100, 200, 130), plenty of space below
    const rect = new DOMRect(100, 100, 100, 30);
    const pos = getTooltipPosition(rect, TOOLTIP, VIEWPORT);
    expect(pos.placement).toBe('bottom');
    expect(pos.top).toBe(138); // 100 + 30 + 8
  });

  it('places above when not enough space below', () => {
    // Element at bottom of viewport
    const rect = new DOMRect(100, 550, 100, 30);
    const pos = getTooltipPosition(rect, TOOLTIP, VIEWPORT);
    expect(pos.placement).toBe('top');
    expect(pos.top).toBeLessThan(550); // Above the element
  });

  it('places right when below and above both insufficient', () => {
    // Element takes full vertical height
    const rect = new DOMRect(50, 8, 50, 590);
    const pos = getTooltipPosition(rect, TOOLTIP, VIEWPORT);
    expect(pos.placement).toBe('right');
    expect(pos.left).toBeGreaterThan(50);
  });

  it('clamps position to viewport boundaries', () => {
    const rect = new DOMRect(0, 0, 50, 50);
    const pos = getTooltipPosition(rect, TOOLTIP, VIEWPORT);
    expect(pos.left).toBeGreaterThanOrEqual(8);
    expect(pos.top).toBeGreaterThanOrEqual(8);
    expect(pos.left).toBeLessThan(VIEWPORT.width - TOOLTIP.width);
    expect(pos.top).toBeLessThan(VIEWPORT.height - TOOLTIP.height);
  });

  it('places left when right also insufficient', () => {
    // Narrow viewport, element takes full width — no space left/right either
    const narrowViewport = { width: 300, height: 600 };
    const rect = new DOMRect(8, 8, 284, 590);
    const pos = getTooltipPosition(rect, TOOLTIP, narrowViewport);
    expect(pos.placement).toBe('left');
  });

  it('uses default viewport when not provided', () => {
    // With default viewport (1024x768), element at top-left
    const rect = new DOMRect(100, 100, 100, 30);
    const pos = getTooltipPosition(rect, TOOLTIP);
    expect(pos.placement).toBe('bottom');
  });
});
