---
name: ralph-wiggum
description: Long-running iterative development loops with pacing control and verifiable progress. Use ONLY when you expect ≥3 build→fix→verify cycles where each iteration's output determines the next step (e.g., migrating a large codebase, debugging flaky tests, exploratory refactors). Do NOT use for tasks that can be planned upfront and executed in one pass — even if they involve many files or steps. Multi-file features with clear specs → direct execution, not Ralph.
---

# Ralph Wiggum v3 — Long-Running Development Loops

Use Ralph for complex work that needs repeated plan→execute→verify cycles.

## Start a Loop

### Via command

```bash
/ralph start <name|path> [options]
```

Options:
- `--mode plan|build` (default: `build`)
- `--template <path>` custom prompt template
- `--items-per-iteration N`
- `--reflect-every N`
- `--max-iterations N` (default: `50`)

Examples:
- `/ralph start auth-refactor`
- `/ralph start migration --mode plan --reflect-every 5`
- `/ralph start .ralph/bugfix.md --template .ralph/my-template.md`

### Via tool (`ralph_start`)

```ts
ralph_start({
  name: "loop-name",
  taskContent: "# Task\n\n## Goals\n- Goal 1\n\n## Checklist\n- [ ] Item 1",
  maxIterations: 50,
  itemsPerIteration: 3,
  reflectEvery: 10,
  mode: "build",          // optional; default build
  promptTemplate: "..."   // optional
})
```

## Core Iteration Flow

1. Ralph keeps a state file at `.ralph/<name>.state.json`.
2. Task markdown lives at `.ralph/<name>.md` (or provided path).
3. Agent does work, updates checklist/task notes, then calls `ralph_done`.
4. Ralph advances to next iteration and injects next prompt.
5. Loop ends via completion marker, abort marker, manual stop, or max-iteration cap.

## Commands

- `/ralph start <name|path> [options]`
- `/ralph stop`
- `/ralph resume <name>`
- `/ralph status`
- `/ralph list [--archived]`
- `/ralph cancel <name>`
- `/ralph archive <name>`
- `/ralph clean [--all]`
- `/ralph nuke [--yes]`
- `/ralph hint <text> [--sticky]`
- `/ralph hint --clear`
- `/ralph hints`
- `/ralph rotate`
- `/ralph mode <plan|build>`
- `/ralph-stop` (idle-only hard stop)

## Marker Protocol (Strict)

Markers are recognized **only** when the exact marker is on its own line (not quoted, not inline sentence, not code fence):

- `<promise>COMPLETE</promise>`
- `<promise>ABORT</promise>`

If marker text appears inline (e.g. in prose), it is ignored.

## Checkpoint Behavior

When reflection triggers (`reflectEvery`):
- Ralph validates checkpoint content in task file.
- If invalid: first failure = retry prompt.
- If invalid again: loop pauses.
- If valid: snapshot updates and loop continues.

## Mode Behavior

- `build` mode: normal implementation loop.
- `plan` mode: planning-only; system guidance forbids implementation changes and prioritizes analysis/task updates.
- Switch live mode with `/ralph mode plan|build`.

## Context Health / Stability Signals

Ralph tracks:
- compaction count (`session_compact`)
- session rotations (`/ralph rotate`)
- per-iteration tool calls/files touched
- struggle streak (consecutive no-progress iterations)

Widget shows health hints:
- `Compactions: N`
- `Rotations: N`
- `⚠️ No progress ×N — try /ralph hint or /ralph rotate`
- `💡 hint(s)`

## Struggle Detection

If checklist completed count does not increase for 3+ iterations:
- Ralph flags struggle state.
- Widget shows warning and suggests `/ralph hint` or `/ralph rotate`.

## Notes

- ESC interrupts streaming; send a normal message to continue.
- Use `/ralph-stop` only when idle if you want to end immediately.
- History/log files are additive:
  - `.ralph/<name>.history.json`
  - `.ralph/<name>.log`
