// ========== Zustand Calendar Store (Phase 2: real-time sync) ==========

import { create } from 'zustand';
import type { CalendarEvent, CreateEventInput, UpdateEventInput, TimeSlot } from '../types';
import { AppError } from '../types/error.types';
import { invokeSafe, invokeOrThrow } from '../utils/invokeSafe';
import type { DbChangedEvent } from '../types/sync.types';
import { logger } from '../utils/logger';

let listenerInitialized = false;

interface CalendarStore {
  // State
  events: CalendarEvent[];
  isLoading: boolean;
  error: AppError | null;
  lastSync: number;

  // Actions
  fetchEvents: (startDate: number, endDate: number) => Promise<void>;
  createEvent: (input: CreateEventInput) => Promise<CalendarEvent>;
  updateEvent: (id: string, input: UpdateEventInput) => Promise<CalendarEvent>;
  deleteEvent: (id: string) => Promise<void>;
  getFreeSlots: (date: number, durationMinutes: number) => Promise<TimeSlot[]>;
  clearError: () => void;

  // Sync
  initListener: () => void;
  refetch: () => Promise<void>;
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  events: [],
  isLoading: false,
  error: null,
  lastSync: 0,

  fetchEvents: async (startDate: number, endDate: number) => {
    set({ isLoading: true, error: null });
    const result = await invokeSafe<CalendarEvent[]>('list_events', {
      start_date: startDate,
      end_date: endDate,
    });
    if (result.ok) {
      set({ events: result.value, isLoading: false, lastSync: Date.now() });
    } else {
      set({ error: result.error, isLoading: false });
    }
  },

  createEvent: async (input: CreateEventInput): Promise<CalendarEvent> => {
    set({ error: null });
    const event = await invokeOrThrow<CalendarEvent>('create_event', { input });
    set(state => ({ events: [...state.events, event] }));
    return event;
  },

  updateEvent: async (id: string, input: UpdateEventInput): Promise<CalendarEvent> => {
    logger.info(
      `[STORE] updateEvent START | id=${id} | ` +
      `start_time=${input.start_time} | end_time=${input.end_time}`,
    );
    set({ error: null });
    const t0 = performance.now();
    const updated = await invokeOrThrow<CalendarEvent>('update_event', { id, input });
    const t1 = performance.now();
    logger.info(
      `[STORE] updateEvent IPC returned | id=${id} | ` +
      `result.start_time=${updated.start_time} | result.end_time=${updated.end_time} | ` +
      `duration=${(t1 - t0).toFixed(1)}ms`,
    );
    set(state => {
      logger.info(
        `[STORE] updateEvent → applying set() | id=${id} | ` +
        `eventsCount=${state.events.length} | ` +
        `oldEvent=${state.events.find(ev => ev.id === id) ? 'found' : 'NOT found'}`,
      );
      return {
        events: state.events.map(ev => ev.id === id ? updated : ev),
      };
    });
    logger.info(`[STORE] updateEvent DONE | id=${id}`);
    return updated;
  },

  deleteEvent: async (id: string): Promise<void> => {
    set({ error: null });
    await invokeOrThrow<void>('delete_event', { id });
    set(state => ({
      events: state.events.filter(ev => ev.id !== id),
    }));
  },

  getFreeSlots: async (date: number, durationMinutes: number): Promise<TimeSlot[]> => {
    set({ error: null });
    const result = await invokeSafe<TimeSlot[]>('get_free_slots', {
      date,
      duration_minutes: durationMinutes,
    });
    if (result.ok) return result.value;
    set({ error: result.error });
    return [];
  },

  clearError: () => set({ error: null }),

  // ========== Real-time sync via Tauri events ==========

  initListener: () => {
    if (listenerInitialized) return;
    listenerInitialized = true;

    // Dynamically import Tauri event API
    const startListening = async () => {
      try {
        // @ts-expect-error Tauri API
        const { listen } = await import('@tauri-apps/api/event');

        await listen<DbChangedEvent>('db:events_changed', async (event) => {
          const { action, id, timestamp } = event.payload;
          const { lastSync, events } = get();

          logger.info(
            `[STORE] db:events_changed RECEIVED | action=${action} | id=${id} | ` +
            `timestamp=${timestamp} | lastSync=${lastSync} | ` +
            `eventsCount=${events.length}`,
          );

          // Drop stale events (out-of-order delivery)
          if (timestamp < lastSync) {
            logger.info(`[STORE] db:events_changed SKIPPED (stale) | id=${id} | timestamp=${timestamp} < lastSync=${lastSync}`);
            return;
          }

          if (action === 'create' || action === 'update') {
            // Fetch the event from DB to get full data
            logger.info(`[STORE] db:events_changed → fetching get_event(${id})...`);
            const t0 = performance.now();
            const result = await invokeSafe<CalendarEvent | null>('get_event', { id });
            const t1 = performance.now();
            if (result.ok && result.value) {
              const ev = result.value;
              logger.info(
                `[STORE] db:events_changed → get_event returned | id=${id} | ` +
                `start_time=${ev.start_time} | end_time=${ev.end_time} | ` +
                `duration=${(t1 - t0).toFixed(1)}ms`,
              );
              set(state => {
                logger.info(
                  `[STORE] db:events_changed → applying set() | id=${id} | ` +
                  `eventsCount=${state.events.length}`,
                );
                return {
                  events: [
                    ...state.events.filter(ev => ev.id !== id),
                    result.value!,
                  ].sort((a, b) => a.start_time - b.start_time),
                  lastSync: timestamp,
                };
              });
            } else {
              logger.warn(`[STORE] db:events_changed → get_event(${id}) FAILED or returned null`);
            }
          } else if (action === 'delete') {
            logger.info(`[STORE] db:events_changed → delete id=${id}`);
            set(state => ({
              events: state.events.filter(ev => ev.id !== id),
              lastSync: timestamp,
            }));
          }
        });

        logger.info('Tauri event listener initialized for db:events_changed');
      } catch {
        // Not in Tauri environment — ignore
      }
    };

    startListening();
  },

  refetch: async () => {
    const { events } = get();
    if (events.length === 0) return;

    // Determine current week from existing events context
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(monday.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    await get().fetchEvents(monday.getTime(), sunday.getTime());
  },
}));
