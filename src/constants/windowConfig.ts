// ========== Window dimension constants ==========

/** Float ball widget size (square). 100px for a comfortable visible ball. */
export const WIDGET_SIZE = { width: 100, height: 100 } as const;

/** Week view window size */
export const WEEK_VIEW_SIZE = { width: 860, height: 780 } as const;

/** Transition lock release delay in ms */
export const TRANSITION_LOCK_MS = 350;

/** Hour height in pixels for week view rendering */
export const HOUR_HEIGHT_PX = 50;

/** Visible time range in hours */
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 21;

/** MCP server port */
export const MCP_PORT = 18765;
