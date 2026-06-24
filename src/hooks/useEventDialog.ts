// ========== Event dialog state management hook ==========

import { useState, useCallback } from 'react';
import type { CalendarEvent, CreateEventInput, UpdateEventInput } from '../types';
import { useCalendarStore } from '../stores/useCalendarStore';

export interface EventDialogState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  /** Pre-selected start date (for create mode, clicking a day column) */
  preselectedDate?: Date;
  /** Pre-selected end date (for create mode, double-click hour slot) */
  preselectedEnd?: Date;
  /** The event being edited (for edit mode) */
  editingEvent?: CalendarEvent;
}

export interface UseEventDialogReturn {
  isOpen: boolean;
  mode: 'create' | 'edit';
  preselectedDate?: Date;
  preselectedEnd?: Date;
  editingEvent?: CalendarEvent;
  openCreateDialog: (preselectedDate?: Date, preselectedEnd?: Date) => void;
  openEditDialog: (event: CalendarEvent) => void;
  closeDialog: () => void;
  handleSave: (input: CreateEventInput) => Promise<void>;
  handleUpdate: (id: string, input: UpdateEventInput) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
}

/**
 * Manages event dialog open/close state and CRUD operations.
 */
export function useEventDialog(): UseEventDialogReturn {
  const [state, setState] = useState<EventDialogState>({
    isOpen: false,
    mode: 'create',
  });

  const { createEvent, updateEvent, deleteEvent } = useCalendarStore();

  const openCreateDialog = useCallback((preselectedDate?: Date, preselectedEnd?: Date) => {
    setState({ isOpen: true, mode: 'create', preselectedDate, preselectedEnd });
  }, []);

  const openEditDialog = useCallback((event: CalendarEvent) => {
    setState({ isOpen: true, mode: 'edit', editingEvent: event });
  }, []);

  const closeDialog = useCallback(() => {
    setState({ isOpen: false, mode: 'create' });
  }, []);

  const handleSave = useCallback(async (input: CreateEventInput): Promise<void> => {
    await createEvent(input);
    closeDialog();
  }, [createEvent, closeDialog]);

  const handleUpdate = useCallback(async (id: string, input: UpdateEventInput): Promise<void> => {
    await updateEvent(id, input);
    closeDialog();
  }, [updateEvent, closeDialog]);

  const handleDelete = useCallback(async (id: string): Promise<void> => {
    await deleteEvent(id);
    closeDialog();
  }, [deleteEvent, closeDialog]);

  return {
    isOpen: state.isOpen,
    mode: state.mode,
    preselectedDate: state.preselectedDate,
    preselectedEnd: state.preselectedEnd,
    editingEvent: state.editingEvent,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    handleSave,
    handleUpdate,
    handleDelete,
  };
}
