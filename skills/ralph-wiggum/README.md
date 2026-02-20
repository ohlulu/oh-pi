# Ralph Wiggum (Skill)

Teaches the agent how to work inside a Ralph loop — long-running, multi-iteration development tasks.

## What It Does

- Tells the agent when and how to use Ralph loops
- Documents all commands, markers, modes, and checkpoint behavior
- Helps the agent decide: "Should I use Ralph or just do this directly?"

## When to Use

Use Ralph when you expect **≥3 build→fix→verify cycles** where each iteration's output determines the next step. Think: large migrations, debugging flaky tests, exploratory refactors.

**Don't** use Ralph for tasks you can plan upfront and execute in one pass — even if they touch many files.

## Quick Reference

### Start a loop

```bash
/ralph start my-feature
/ralph start migration --mode plan --reflect-every 5
```

Or via tool: call `ralph_start` with `name`, `taskContent`, and optional flags.

### During a loop

- Agent works → updates checklist → calls `ralph_done` → next iteration auto-injects
- `/ralph hint "focus on X"` — inject guidance without stopping
- `/ralph rotate` — fresh context window if things get stuck

### End a loop

- Agent outputs `<promise>COMPLETE</promise>` on its own line
- Or `<promise>ABORT</promise>` to bail
- Or `/ralph stop` to pause manually

### Modes

- `build` — normal implementation
- `plan` — analysis only, no code changes

## Related

- Extension: `~/.pi/agent/extensions/ralph-wiggum/` — the runtime that drives the loop
- Full guide: see the extension's README for lifecycle, architecture, and internals
