# Todo (Extension)

File-based todo management in `.pi/todos/`. Each todo is a markdown file with YAML front matter. Works both as an agent tool and an interactive TUI command.

## Usage

Type `/todos` in the pi editor to open the interactive todo browser.

The agent can also manage todos autonomously — it calls the `todo` tool when it needs to create, update, or query tasks.

## How It Works

- Todos are stored as individual files in `.pi/todos/`
- Each file has YAML front matter (title, status, tags, dependencies) + markdown body
- Agent uses the `todo` tool; humans use the `/todos` command
- Supports dependencies between todos, assignment/claiming, and garbage collection

## Agent Tool — `todo`

Actions: `list`, `list-all`, `get`, `create`, `update`, `append`, `delete`, `claim`, `release`

```
todo create   — title required, optional body/tags/status/depends_on
todo update   — id required, change any field (body replaces)
todo append   — id required, adds to body (doesn't replace)
todo claim    — lock a todo to current session (prevents conflicts)
todo release  — unlock a claimed todo
todo delete   — remove a todo permanently
todo list     — open + assigned todos only
todo list-all — everything including closed
todo get      — full detail for one todo
```

## TUI Command — `/todos`

Interactive list with keyboard navigation:

- Browse all todos with search/filter
- Select a todo → action menu (view, work, refine, close/reopen, delete, copy path/text)
- **Work** — sets editor text to start working on the todo, auto-creates a `feature/` branch
- **Refine** — sets editor text to ask clarifying questions before rewriting the todo
- Toggle closed/done visibility

## Dependencies

- Set via `depends_on` on create/update (accepts `TODO-<hex>` or raw hex)
- Blocked todos show their blocker IDs
- Dependency cycles and self-references are rejected

## Assignment / Claiming

- `claim` locks a todo to the current session
- `release` unlocks it
- Closed/done todos auto-release
- `force: true` overrides another session's claim

## Source Files

- `index.ts` — extension entry, tool + command registration
- `models.ts` — types, validation, serialization, tree rendering
- `storage.ts` — file I/O, locking, garbage collection
- `ui.ts` — TUI components (selector, action menu, detail overlay)
