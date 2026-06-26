// ========== Tauri IPC command wrappers (Phase 2: invokeSafe) ==========

import type { CalendarEvent, CreateEventInput, UpdateEventInput, TimeSlot, Result } from '../types';
import { invokeSafe, invokeOrThrow } from '../utils/invokeSafe';

export async function createEvent(input: CreateEventInput): Promise<CalendarEvent> {
  return invokeOrThrow<CalendarEvent>('create_event', { input });
}

export async function getEvent(id: string): Promise<Result<CalendarEvent | null>> {
  return invokeSafe<CalendarEvent | null>('get_event', { id });
}

export async function listEvents(startDate: number, endDate: number): Promise<Result<CalendarEvent[]>> {
  return invokeSafe<CalendarEvent[]>('list_events', { start_date: startDate, end_date: endDate });
}

export async function updateEvent(id: string, input: UpdateEventInput): Promise<CalendarEvent> {
  return invokeOrThrow<CalendarEvent>('update_event', { id, input });
}

export async function deleteEvent(id: string): Promise<void> {
  return invokeOrThrow<void>('delete_event', { id });
}

export async function getFreeSlots(date: number, durationMinutes: number): Promise<Result<TimeSlot[]>> {
  return invokeSafe<TimeSlot[]>('get_free_slots', { date, duration_minutes: durationMinutes });
}
