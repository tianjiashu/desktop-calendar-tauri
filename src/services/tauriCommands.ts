// ========== Tauri IPC command wrappers (Phase 2: invokeSafe) ==========

import type { CalendarEvent, CreateEventInput, UpdateEventInput, TimeSlot } from '../types';
import { invokeOrThrow } from '../utils/invokeSafe';

export async function createEvent(input: CreateEventInput): Promise<CalendarEvent> {
  return invokeOrThrow<CalendarEvent>('create_event', { input });
}

export async function getEvent(id: string): Promise<CalendarEvent | null> {
  return invokeOrThrow<CalendarEvent | null>('get_event', { id });
}

export async function listEvents(startDate: number, endDate: number): Promise<CalendarEvent[]> {
  return invokeOrThrow<CalendarEvent[]>('list_events', { start_date: startDate, end_date: endDate });
}

export async function updateEvent(id: string, input: UpdateEventInput): Promise<CalendarEvent> {
  return invokeOrThrow<CalendarEvent>('update_event', { id, input });
}

export async function deleteEvent(id: string): Promise<void> {
  return invokeOrThrow<void>('delete_event', { id });
}

export async function getFreeSlots(date: number, durationMinutes: number): Promise<TimeSlot[]> {
  return invokeOrThrow<TimeSlot[]>('get_free_slots', { date, duration_minutes: durationMinutes });
}
