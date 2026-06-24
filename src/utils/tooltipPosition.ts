// ========== Tooltip position calculation (F17) ==========

export interface TooltipPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Calculate optimal tooltip position, with boundary detection to prevent overflow.
 * Priority: bottom > top > right > left
 */
export function getTooltipPosition(
  targetRect: DOMRect,
  tooltipSize: { width: number; height: number },
  viewport: { width: number; height: number } = { width: window.innerWidth, height: window.innerHeight },
): TooltipPosition {
  const margin = 8;
  const spaceRight = viewport.width - targetRect.right;
  const spaceLeft = targetRect.left;
  const spaceBottom = viewport.height - targetRect.bottom;
  const spaceTop = targetRect.top;

  let placement: TooltipPosition['placement'];
  let top = 0;
  let left = 0;

  if (spaceBottom >= tooltipSize.height + margin) {
    placement = 'bottom';
    top = targetRect.bottom + margin;
    left = targetRect.left + targetRect.width / 2 - tooltipSize.width / 2;
  } else if (spaceTop >= tooltipSize.height + margin) {
    placement = 'top';
    top = targetRect.top - tooltipSize.height - margin;
    left = targetRect.left + targetRect.width / 2 - tooltipSize.width / 2;
  } else if (spaceRight >= tooltipSize.width + margin) {
    placement = 'right';
    top = targetRect.top + targetRect.height / 2 - tooltipSize.height / 2;
    left = targetRect.right + margin;
  } else {
    placement = 'left';
    top = targetRect.top + targetRect.height / 2 - tooltipSize.height / 2;
    left = targetRect.left - tooltipSize.width - margin;
  }

  // Boundary correction
  left = Math.max(margin, Math.min(left, viewport.width - tooltipSize.width - margin));
  top = Math.max(margin, Math.min(top, viewport.height - tooltipSize.height - margin));

  return { top, left, placement };
}
