// ========== Data sync event types (08-data-sync) ==========

/**
 * Payload of the "db:events_changed" Tauri event.
 * Emitted whenever any client (GUI or MCP) writes to the database.
 */
export interface DbChangedEvent {
  table: 'events' | 'reminders';
  action: 'create' | 'update' | 'delete';
  id: string;
  timestamp: number;  // Unix ms
}
