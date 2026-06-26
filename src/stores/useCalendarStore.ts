// ========== Zustand Calendar Store (Phase 2: real-time sync) ==========

import { create } from 'zustand';
import type { CalendarEvent, CreateEventInput, UpdateEventInput, TimeSlot } from '../types';
import { AppError } from '../types/error.types';
import type { DbChangedEvent } from '../types/sync.types';
import { logger } from '../utils/logger';
import * as tauriCommands from '../services/tauriCommands';

let listenerInitialized = false;

interface CalendarStore {
  // State
  events: CalendarEvent[];
  isLoading: boolean;
  error: AppError | null;
  lastSync: number;
  currentRange: { startDate: number; endDate: number } | null;

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
  currentRange: null,

  fetchEvents: async (startDate: number, endDate: number) => {
    set({ isLoading: true, error: null, currentRange: { startDate, endDate } });
    const result = await tauriCommands.listEvents(startDate, endDate);
    if (result.ok) {
      set({ events: result.value, isLoading: false, lastSync: Date.now() });
    } else {
      set({ error: result.error, isLoading: false });
    }
  },

  createEvent: async (input: CreateEventInput): Promise<CalendarEvent> => {
    set({ error: null });
    const event = await tauriCommands.createEvent(input);
    set(state => ({ events: [...state.events, event] }));
    return event;
  },

  updateEvent: async (id: string, input: UpdateEventInput): Promise<CalendarEvent> => {
    set({ error: null });
    const updated = await tauriCommands.updateEvent(id, input);
    set(state => ({
      events: state.events.map(ev => ev.id === id ? updated : ev),
    }));
    return updated;
  },

  deleteEvent: async (id: string): Promise<void> => {
    set({ error: null });
    await tauriCommands.deleteEvent(id);
    set(state => ({
      events: state.events.filter(ev => ev.id !== id),
    }));
  },

  getFreeSlots: async (date: number, durationMinutes: number): Promise<TimeSlot[]> => {
    set({ error: null });
    const result = await tauriCommands.getFreeSlots(date, durationMinutes);
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
        const { listen } = await import('@tauri-apps/api/event');

        await listen<DbChangedEvent>('db:events_changed', async (event) => {
          const { action, id, timestamp } = event.payload;
          const { lastSync } = get();

          // Drop stale events (out-of-order delivery)
          if (timestamp < lastSync) {
            return;
          }

          if (action === 'create' || action === 'update') {
            // Fetch the event from DB to get full data
            const result = await tauriCommands.getEvent(id);
            if (result.ok && result.value) {
              set(state => ({
                events: [
                  ...state.events.filter(ev => ev.id !== id),
                  result.value!,
                ].sort((a, b) => a.start_time - b.start_time),
                lastSync: timestamp,
              }));
            } else {
              logger.warn(`[STORE] db:events_changed get_event(${id}) failed or returned null`);
            }
          } else if (action === 'delete') {
            set(state => ({
              events: state.events.filter(ev => ev.id !== id),
              lastSync: timestamp,
            }));
          }
        });

        logger.debug('Tauri event listener initialized for db:events_changed');
      } catch {
        // Not in Tauri environment; ignore.
      }
    };

    startListening();
  },

  refetch: async () => {
    const { currentRange } = get();
    if (!currentRange) return;

    await get().fetchEvents(currentRange.startDate, currentRange.endDate);
  },
}));
