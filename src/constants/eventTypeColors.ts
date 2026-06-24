// ========== Event type colors and labels ==========
// Keep in sync with Rust: models/event.rs
// Colors align with design tokens in index.css (Phase C)

import type { EventType } from '../types';

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  interview: '#4f6bed',  // --event-interview 钢蓝
  meeting: '#10b981',    // --event-meeting 翡翠绿
  reminder: '#f59e0b',   // --event-reminder 琥珀
  deadline: '#ef4444',   // --event-deadline 警示红
  default: '#64748b',    // --event-default Slate
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  interview: '面试',
  meeting: '会议',
  reminder: '提醒',
  deadline: '截止',
  default: '默认',
};
