// ========== useCalendarStore integration tests ==========

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTauriCommands = vi.hoisted(() => ({
  listEvents: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getFreeSlots: vi.fn(),
  getEvent: vi.fn(),
}));

vi.mock('../../src/services/tauriCommands', () => mockTauriCommands);

import { useCalendarStore } from '../../src/stores/useCalendarStore';
import * as tauriCommands from '../../src/services/tauriCommands';

describe('useCalendarStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useCalendarStore.setState({
      events: [],
      isLoading: false,
      error: null,
      lastSync: 0,
    });
  });

  describe('initial state', () => {
    it('has empty events array', () => {
      const { events } = useCalendarStore.getState();
      expect(events).toEqual([]);
    });

    it('isLoading is false', () => {
      const { isLoading } = useCalendarStore.getState();
      expect(isLoading).toBe(false);
    });

    it('error is null', () => {
      const { error } = useCalendarStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('fetchEvents', () => {
    it('sets events on success', async () => {
      const mockEvents = [{ id: '1', title: 'test' }];
      (tauriCommands.listEvents as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: mockEvents,
      });

      await useCalendarStore.getState().fetchEvents(1000, 2000);

      const { events, isLoading } = useCalendarStore.getState();
      expect(events).toEqual(mockEvents);
      expect(isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      const mockError = { code: 'INTERNAL', message: 'failed' };
      (tauriCommands.listEvents as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: mockError,
      });

      await useCalendarStore.getState().fetchEvents(1000, 2000);

      const { error, isLoading } = useCalendarStore.getState();
      expect(error).toEqual(mockError);
      expect(isLoading).toBe(false);
    });
  });

  describe('createEvent', () => {
    it('adds event to state', async () => {
      const newEvent = { id: '1', title: 'new event', start_time: 1000 };
      (tauriCommands.createEvent as ReturnType<typeof vi.fn>).mockResolvedValue(newEvent);

      const result = await useCalendarStore.getState().createEvent({
        title: 'new event',
        start_time: 1000,
        end_time: 2000,
      });

      expect(result).toEqual(newEvent);
      const { events } = useCalendarStore.getState();
      expect(events).toContainEqual(newEvent);
    });
  });

  describe('deleteEvent', () => {
    it('removes event from state', async () => {
      // Pre-populate
      useCalendarStore.setState({
        events: [{ id: '1', title: 'test', start_time: 1000, end_time: 2000 } as any],
      });
      (tauriCommands.deleteEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await useCalendarStore.getState().deleteEvent('1');

      const { events } = useCalendarStore.getState();
      expect(events).toHaveLength(0);
    });
  });

  describe('clearError', () => {
    it('clears error state', () => {
      useCalendarStore.setState({ error: { code: 'INTERNAL', message: 'err' } as any });

      useCalendarStore.getState().clearError();

      expect(useCalendarStore.getState().error).toBeNull();
    });
  });

  describe('getFreeSlots', () => {
    it('returns slots on success', async () => {
      const slots = [{ start_time: 1000, end_time: 2000 }];
      (tauriCommands.getFreeSlots as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        value: slots,
      });

      const result = await useCalendarStore.getState().getFreeSlots(1000, 60);
      expect(result).toEqual(slots);
    });

    it('returns empty on failure', async () => {
      (tauriCommands.getFreeSlots as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        error: { code: 'INTERNAL', message: 'fail' },
      });

      const result = await useCalendarStore.getState().getFreeSlots(1000, 60);
      expect(result).toEqual([]);
    });
  });

  describe('updateEvent', () => {
    it('updates event in state', async () => {
      const existing = { id: '1', title: 'old', start_time: 1000, end_time: 2000 };
      useCalendarStore.setState({ events: [existing as any] });

      const updated = { id: '1', title: 'new', start_time: 1500, end_time: 2500 };
      (tauriCommands.updateEvent as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

      const result = await useCalendarStore.getState().updateEvent('1', {
        title: 'new',
      });

      expect(result).toEqual(updated);
      const { events } = useCalendarStore.getState();
      expect(events[0]).toEqual(updated);
    });
  });
});
