// ========== Event type definitions ==========

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: number;     // Unix ms, UTC
  end_time: number;       // Unix ms, UTC
  timezone: string;
  is_all_day: boolean;
  rrule?: string;         // RFC 5545
  rrule_until?: number;   // Unix ms
  exdates?: number[];     // exception dates
  status: 'confirmed' | 'cancelled' | 'tentative';
  color: string;          // hex color
  event_type: 'interview' | 'meeting' | 'reminder' | 'deadline' | 'default';
  location?: string;
  url?: string;
  created_by: 'human' | 'agent';
  created_at: number;
  updated_at: number;
  deleted_at?: number;    // null = not deleted
}

export type EventType = CalendarEvent['event_type'];
export type EventStatus = CalendarEvent['status'];

export interface CreateEventInput {
  title: string;
  description?: string;
  start_time: number;
  end_time: number;
  timezone?: string;
  is_all_day?: boolean;
  rrule?: string;
  rrule_until?: number;
  event_type?: EventType;
  color?: string;
  location?: string;
  url?: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  start_time?: number;
  end_time?: number;
  timezone?: string;
  is_all_day?: boolean;
  rrule?: string;
  rrule_until?: number;
  event_type?: EventType;
  color?: string;
  location?: string;
  url?: string;
  status?: EventStatus;
}

export interface TimeSlot {
  start_time: number;
  end_time: number;
}

export interface EventWithLayout extends CalendarEvent {
  column: number;
  totalColumns: number;
}

// ========== App error types ==========

export interface AppErrorType {
  code: string;
  message: string;
  details?: unknown;
}

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static from(e: unknown): AppError {
    if (e instanceof AppError) return e;
    if (e instanceof Error) {
      // Try to parse Tauri error
      const msg = e.message || String(e);
      if (msg.includes('EventNotFound')) {
        return new AppError('EVENT_NOT_FOUND', msg);
      }
      return new AppError('INTERNAL', msg);
    }
    return new AppError('UNKNOWN', String(e));
  }
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };
