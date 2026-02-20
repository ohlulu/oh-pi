# Ralph Wiggum (Extension)

Drives long-running, multi-iteration development loops. The agent works in cycles: do a chunk → call `ralph_done` → Ralph injects the next prompt → repeat until done.

## Usage

Start a loop:

```
/ralph start <name>
/ralph start <name> --mode plan --reflect-every 5 --max-iterations 20
```

Check status, inject hints, or stop mid-loop:

```
/ralph status
/ralph hint "focus on error handling"
/ralph stop
```

## How It Works

1. You start a loop (`/ralph start my-feature` or agent calls `ralph_start`)
2. Ralph creates a task file (`.ralph/<name>.md`) and state file (`.ralph/<name>.state.json`)
3. Each iteration: agent works → updates checklist → calls `ralph_done`
4. Ralph advances iteration, injects next prompt, agent continues
5. Loop ends via `<promise>COMPLETE</promise>`, `<promise>ABORT</promise>`, `/ralph stop`, or hitting max iterations

## File Structure

```
.ralph/
├── my-feature.md              ← task description + checklist
├── my-feature.state.json      ← iteration count, mode, hints, etc.
├── my-feature.history.json    ← structured history (JSON array)
├── my-feature.log             ← human-readable log (append-only)
└── archive/                   ← archived loops
```

## Commands

| Command | What it does |
|---------|-------------|
| `/ralph start <name> [options]` | Start a new loop |
| `/ralph stop` | Pause the current loop |
| `/ralph resume <name>` | Resume a paused loop |
| `/ralph status` | Show all loops |
| `/ralph list [--archived]` | List loops |
| `/ralph hint <text> [--sticky]` | Inject guidance without stopping |
| `/ralph hints` | List active hints |
| `/ralph hint --clear` | Clear all hints |
| `/ralph mode plan\|build` | Switch mode |
| `/ralph rotate` | Fresh context window |
| `/ralph cancel <name>` | Delete loop state |
| `/ralph archive <name>` | Archive a paused loop |
| `/ralph clean [--all]` | Clean completed loops |
| `/ralph nuke [--yes]` | Delete entire .ralph/ |
| `/ralph-stop` | Hard stop when idle |

### Start Options

| Flag | Default | Description |
|------|---------|-------------|
| `--mode plan\|build` | `build` | Plan = analysis only, Build = implement |
| `--reflect-every N` | `0` | Checkpoint every N iterations |
| `--max-iterations N` | `50` | Auto-stop cap |
| `--items-per-iteration N` | `0` | Suggest N items per turn |
| `--template <path>` | built-in | Custom prompt template |

## Modes

- **build** — normal implementation + testing
- **plan** — analysis only, no code changes, just update the task file

Switch live: `/ralph mode plan` or `/ralph mode build`

## Checkpoints

When `reflectEvery` is set, Ralph periodically validates the task file:
- Must have been modified since last snapshot
- Must contain `## Checkpoint` with 5 subsections: Completed, Failed Approaches, Key Decisions, Current State, Next Steps
- First validation failure → retry prompt. Second failure → loop pauses.

## Hints

Inject guidance while the loop is running:

```bash
/ralph hint "Focus on error handling"         # one-shot (used once)
/ralph hint "Always run tests" --sticky       # every iteration
/ralph hint --clear                           # clear all
```

Max 20 hints, 300 chars each.

## Struggle Detection

If checklist progress stalls for 3+ consecutive iterations, the widget shows a warning. Try `/ralph hint` or `/ralph rotate`.

## Widget

The TUI shows a status widget with: loop name, mode, iteration count, checklist progress bar, next reflection, compaction/rotation counts, and active hints.

## Source Architecture

```
extensions/ralph-wiggum/
├── index.ts           ← entry: registers commands/tools/events
├── types.ts           ← constants, types, factory
├── state/             ← CRUD, migration, locking
├── prompt/            ← markers, templates, renderer
├── runtime/           ← iteration, checkpoint, history, struggle
├── commands/          ← start, stop, resume, hint, rotate, mode
├── tools/             ← ralph_start, ralph_done (agent-callable)
└── ui/                ← TUI widget + progress bar
```

Dependencies flow: `index.ts` → `commands/` / `tools/` → `runtime/` / `prompt/` → `state/` / `types.ts`
