// ========== MCP Widget HTML templates (external files, compile-time embedded) ==========
//
// HTML templates live in `src/mcp/widgets/*.html` and are embedded at compile time
// via `include_str!()`. This keeps HTML/CSS/JS separate from Rust logic for:
//  - Editor syntax highlighting / formatting
//  - Easier style iteration (no Rust rebuild needed for HTML changes)
//  - Better separation of concerns
//
// Each template uses the @modelcontextprotocol/ext-apps SDK (ESM import) for:
//  1. `App` class with `autoResize` support
//  2. `app.ontoolresult` — receives tool result (structuredContent) pushed by Host
//  3. `app.uiEvent()` — sends interaction events back to Host
//  4. `app.onhostcontextchanged` — theme adaption (light/dark)
//  5. CSS `light-dark()` — dual-theme color scheme (first-paint fallback)
//  6. `await app.connect()` — establishes bidirectional communication with Host

/// Events list widget: shows title, time, color-coded cards for each event.
/// Clicking a card sends `uiEvent` with `view_event` action.
pub fn build_events_list_html() -> String {
    include_str!("widgets/events-list.html").to_string()
}

/// Event detail widget: shows all fields of a single event.
/// Data is pushed by Host via `ontoolresult` callback (structuredContent).
pub fn build_event_detail_html() -> String {
    include_str!("widgets/event-detail.html").to_string()
}

/// Free slots widget: shows available time slots for today.
/// Clicking a slot sends `uiEvent` with `select_slot` action.
pub fn build_free_slots_html() -> String {
    include_str!("widgets/free-slots.html").to_string()
}
