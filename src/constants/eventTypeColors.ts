// ========== Event type colors and labels ==========
// Keep in sync with Rust: models/event.rs
// Colors align with design tokens in index.css (Phase C)

import type { EventType } from '../types';

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  interview: '#4f6bed',  // --event-interview steel blue
  meeting: '#10b981',    // --event-meeting emerald
  reminder: '#f59e0b',   // --event-reminder amber
  deadline: '#ef4444',   // --event-deadline red
  default: '#64748b',    // --event-default slate
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  interview: '\u9762\u8bd5',
  meeting: '\u4f1a\u8bae',
  reminder: '\u63d0\u9192',
  deadline: '\u622a\u6b62',
  default: '\u9ed8\u8ba4',
};
