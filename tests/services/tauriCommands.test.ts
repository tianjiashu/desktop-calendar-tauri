// ========== tauriCommands integration tests ==========

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockInvokeSafe, mockInvokeOrThrow } = vi.hoisted(() => ({
  mockInvokeSafe: vi.fn(),
  mockInvokeOrThrow: vi.fn(),
}));

vi.mock('../../src/utils/invokeSafe', () => ({
  invokeSafe: mockInvokeSafe,
  invokeOrThrow: mockInvokeOrThrow,
}));

import {
  createEvent,
  getEvent,
  listEvents,
  updateEvent,
  deleteEvent,
  getFreeSlots,
} from '../../src/services/tauriCommands';

describe('tauriCommands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createEvent calls invokeOrThrow', async () => {
    mockInvokeOrThrow.mockResolvedValue({ id: '1' });
    const input = { title: 'test', start_time: 1000, end_time: 2000 };

    await createEvent(input);

    expect(mockInvokeOrThrow).toHaveBeenCalledWith('create_event', { input });
  });

  it('getEvent calls invokeSafe', async () => {
    mockInvokeSafe.mockResolvedValue({ ok: true, value: { id: '1' } });

    await getEvent('1');

    expect(mockInvokeSafe).toHaveBeenCalledWith('get_event', { id: '1' });
  });

  it('listEvents calls invokeSafe', async () => {
    mockInvokeSafe.mockResolvedValue({ ok: true, value: [] });

    await listEvents(1000, 2000);

    expect(mockInvokeSafe).toHaveBeenCalledWith('list_events', {
      start_date: 1000,
      end_date: 2000,
    });
  });

  it('updateEvent calls invokeOrThrow', async () => {
    mockInvokeOrThrow.mockResolvedValue({ id: '1' });
    const input = { title: 'updated' };

    await updateEvent('1', input);

    expect(mockInvokeOrThrow).toHaveBeenCalledWith('update_event', {
      id: '1',
      input,
    });
  });

  it('deleteEvent calls invokeOrThrow', async () => {
    mockInvokeOrThrow.mockResolvedValue(undefined);

    await deleteEvent('1');

    expect(mockInvokeOrThrow).toHaveBeenCalledWith('delete_event', { id: '1' });
  });

  it('getFreeSlots calls invokeSafe', async () => {
    mockInvokeSafe.mockResolvedValue({ ok: true, value: [] });

    await getFreeSlots(1000, 30);

    expect(mockInvokeSafe).toHaveBeenCalledWith('get_free_slots', {
      date: 1000,
      duration_minutes: 30,
    });
  });
});
