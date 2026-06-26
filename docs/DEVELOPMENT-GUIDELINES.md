# Development Guidelines

This document defines the day-to-day development rules for Desktop Calendar Tauri.
It complements `CODING_RULES.md`: use `CODING_RULES.md` for general coding style,
and use this file for project-specific boundaries and workflows.

## Core Principles

1. Keep ownership clear. A file should have one primary reason to change.
2. Prefer existing project patterns over new abstractions.
3. Move logic down into hooks, services, utils, or Rust modules before App-level files grow.
4. Keep UI components focused on rendering and interaction wiring.
5. Do not leave diagnostic code, generated output, or temporary scripts in normal code paths.
6. Every intentional code or documentation change must be committed.

## Frontend Boundaries

### `src/App.tsx`

`App.tsx` is composition only.

Allowed:

- Wire top-level providers, error boundaries, app-level layout, and mode switching.
- Pass data and handlers into `Widget`, `WeekView`, and shared overlays.

Avoid:

- Fetching data directly.
- Owning feature-specific loading or refreshing state.
- Direct Tauri IPC calls.
- Large inline business logic.

When App needs feature state, create a hook in `src/hooks/`.

### `src/components/`

Components render UI and expose callbacks.

Allowed:

- Local UI state such as hover, open/closed visual state, text input drafts.
- Calling callback props provided by hooks or stores.
- Component-local CSS in the same feature directory.

Avoid:

- Direct database, MCP, or Tauri IPC calls.
- Mutating global store state without going through a hook/store action.
- Duplicating date, layout, or validation logic already in `utils/`.

### `src/hooks/`

Hooks own reusable stateful logic.

Use hooks for:

- View-specific data loading, refresh state, and subscriptions.
- Window behavior and user interaction flows.
- Combining store state with derived UI behavior.

Naming:

- Hooks must start with `use`.
- A hook should describe one workflow, for example `useVisibleWeekEvents`.

### `src/stores/`

Stores own global state and actions.

Rules:

- Stores call `src/services/tauriCommands.ts`, not raw `invokeSafe` or `invokeOrThrow`.
- Stores may transform returned data into global state.
- Stores should not contain component-specific UI state.
- Keep store logs quiet. Use `warn` or `error` for actionable problems, `debug` for diagnostics.

### `src/services/`

Services are the frontend boundary for external APIs and Tauri IPC.

Rules:

- All Tauri command names live in `tauriCommands.ts`.
- Read/query commands should return `Result<T>` when callers need to render recoverable errors.
- Mutation commands may throw through `invokeOrThrow` when failure should abort the workflow.
- Tests for services should verify command names and argument shapes.

### `src/utils/`

Utils are pure helpers.

Rules:

- No React hooks.
- No store access.
- No Tauri IPC.
- No side effects except explicit, well-named utilities such as `openEventLink`.

### `src/constants/`

Constants centralize shared numbers and names.

Rules:

- No magic numbers in UI or hooks when the value is shared or behavior-critical.
- Window sizes, hour ranges, ports, layout dimensions, and event limits belong here.

## CSS Boundaries

Do not put feature styles back into `App.css`.

Current style ownership:

- `src/App.css`: imports and app container only.
- `src/components/Common/Toast.css`: toast styles.
- `src/components/Common/DiagnosticPanel.css`: diagnostic overlay styles.
- `src/components/Widget/Widget.css`: floating widget styles.
- `src/components/WeekView/WeekView.css`: week view, event cards, time grid, status bar.
- `src/components/Calendar/EventDialog.css`: event dialog styles.

Rules:

- Place new styles next to the component or feature they belong to.
- Keep selectors prefixed by feature names, for example `.week-*`, `.event-*`, `.toast-*`.
- Use design tokens from `src/index.css` instead of hard-coded colors, shadows, radius, or typography.
- If a CSS file grows past roughly 400 lines, consider splitting by sub-feature.

## Backend Boundaries

### `src-tauri/src/commands/`

Tauri commands validate inputs, call lower layers, and emit frontend sync events.

Avoid:

- Raw SQL.
- Long business workflows.
- MCP-specific logic.

### `src-tauri/src/db/`

Database modules own schema, migrations, and repository reads/writes.

Rules:

- SQL belongs here.
- Enforce database-adjacent invariants here when they must be consistent for GUI and MCP.
- Keep user-facing messages and transport formatting out of this layer.

### `src-tauri/src/mcp/`

MCP modules own tool schemas, prompts, resources, and MCP widget output.

Rules:

- MCP parameters should use documented fixed formats, not implicit timestamps.
- Tool validation should produce clear user-facing errors.
- MCP writes must emit the same `db:events_changed` sync event as GUI writes.

## Data Flow Rules

Preferred frontend flow:

```text
Component -> hook/store action -> services/tauriCommands -> invokeSafe/invokeOrThrow -> Rust command
```

Preferred backend flow:

```text
Tauri command or MCP tool -> db repository -> model -> sync event -> frontend store
```

Do not skip layers unless the file is specifically the owner of that layer.

## Logging Rules

Use logs for diagnosis, not narration.

Rules:

- `error`: failures that need attention.
- `warn`: recoverable but suspicious behavior.
- `info`: important lifecycle events only.
- `debug`: diagnostic details, timings, resize traces, verbose data.

Do not log inside hot render/layout paths unless it is behind `debug` and needed for active diagnosis.
Remove temporary logs before committing.

## Testing Rules

Run the smallest useful test first, then the full checks before committing meaningful changes.

Frontend:

```bash
npm test
npm run build
```

Backend:

```bash
cd src-tauri
cargo test
```

Guidance:

- New pure utility logic needs focused unit tests.
- Store changes should mock `src/services/tauriCommands.ts`.
- Service tests should mock `invokeSafe` or `invokeOrThrow`.
- Avoid smoke tests that import the whole app if a static or focused test is enough.
- Expected error-path logs in tests are acceptable; unexpected noisy logs should be reduced.

## Git Rules

- Commit every intentional code or documentation change.
- Keep commits focused on one reason to change.
- Do not include generated outputs, logs, coverage files, or local experiment scripts.
- Before committing, check:

```bash
git status --short
git diff --check
```

- Leave unrelated untracked files alone unless the user explicitly asks.

## Refactor Checklist

Before adding or changing code, ask:

1. Is there an existing hook, service, utility, or Rust module that already owns this?
2. Will this make `App.tsx`, `App.css`, or a store more responsible than it should be?
3. Does this create a second path for the same data or IPC operation?
4. Are constants named and centralized?
5. Are logs at the right level?
6. Is the test boundary aligned with the code boundary?

If the answer is uncertain, make the smallest cohesive change and leave a short note in the PR or commit summary.
