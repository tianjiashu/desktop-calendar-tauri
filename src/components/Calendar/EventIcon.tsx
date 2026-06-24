// ========== Event type icons (Phosphor duotone) ==========
// 参考: docs/ui-optimization/03-icon-system.md §2.2

import React from 'react';
import { UserFocus, Users, Bell, FlagBanner, Circle } from '@phosphor-icons/react';
import type { EventType } from '../../types';

interface EventIconProps {
  type: EventType;
  size?: number;
  className?: string;
}

const ICON_MAP: Record<EventType, React.FC<React.ComponentProps<typeof UserFocus>>> = {
  interview: UserFocus,
  meeting: Users,
  reminder: Bell,
  deadline: FlagBanner,
  default: Circle,
};

/**
 * Renders the Phosphor duotone icon for a given event type.
 * Used in EventCard title prefix and EventDialog type selector.
 */
const EventIcon: React.FC<EventIconProps> = ({ type, size = 12, className }) => {
  const Icon = ICON_MAP[type] ?? Circle;
  return <Icon size={size} weight="duotone" className={className} aria-hidden="true" />;
};

export default EventIcon;
