---
summary: Subagent coordination via tmux + Claude Code CLI. Covers one-shot, interactive, and supervisor patterns.
read_when:
  - Coordinating subagents or running tmux-based agent sessions.
  - Delegating tasks to background agents.
---

# Claude Subagent Quickstart

## CLI Basics
- Launch long-running subagents inside tmux so the session can persist. Example:

  ```bash
  tmux new-session -d -s claude-haiku 'claude --model haiku'
  tmux attach -t claude-haiku
  ```

  Once inside the session, run `/model` to confirm the active alias and switch models if needed.
- Always switch to the fast Haiku model upfront (`claude --model haiku --dangerously-skip-permissions …` or `/model haiku` in-session) to keep turnaround fast.
- Two modes:
  - **One-shot tasks** (single summary, short answer): run `claude --model haiku --dangerously-skip-permissions --print …` in a tmux session, wait with `sleep 30`, then read the output buffer.
  - **Interactive tasks** (multi-file edits, iterative prompts): start `claude --model haiku --dangerously-skip-permissions` in tmux, send prompts with `tmux send-keys`, and capture completed responses with `tmux capture-pane`. Expect to sleep between turns so Haiku can finish before you scrape the pane.

## One-Shot Prompts
- The CLI accepts the prompt as a trailing argument in one-shot mode. Multi-line prompts can be piped: `echo "..." | claude --print`.
- Add `--output-format json` when you need structured fields (e.g., summary + bullets) for post-processing.
- Keep prompts explicit about reading full files: "Read docs/example.md in full and produce a 2–3 sentence summary covering all sections."

## Bulk Markdown Conversion
- Produce the markdown inventory first and feed batches of filenames to your Claude session.
- For each batch, issue a single instruction like "Rewrite these files with YAML front matter summaries, keep all other content verbatim." Haiku can loop over multi-file edits when you provide the explicit list.
- After Claude reports success, diff each file locally (`git diff docs/<file>.md`) before moving to the next batch.

## Parallel Dispatch

Launch multiple subagents for independent tasks (AGENTS.md: "ALWAYS parallelize independent agent tasks"):

```bash
tmux new-session -d -s lint  'claude --model haiku --dangerously-skip-permissions --print "Run pnpm lint and fix all issues"'
tmux new-session -d -s test  'claude --model haiku --dangerously-skip-permissions --print "Run pnpm test and report failures"'
tmux new-session -d -s docs  'claude --model haiku --dangerously-skip-permissions --print "Add front matter to all docs/*.md missing it"'

# Wait, then collect results
sleep 60
for s in lint test docs; do
  echo "=== $s ==="
  tmux capture-pane -p -J -t "$s" -S -200
done
```

## Supervisor Loop (Ralph pattern)

> **Note:** This describes a supervisor-worker architecture for reference. The scripts (`ralph.ts`, `agent-send.ts`) are not bundled here — implement if needed.

- A supervisor script spins up tmux sessions, auto-wakes the worker, and calls Claude as the supervisor via `claude --dangerously-skip-permissions`.
- Supervisor responses must end with either `CONTINUE`, `SEND: <message>`, or `RESTART`; the script parses these tokens to decide the next action.
- Queue instructions to a running agent session by injecting text via `tmux send-keys`.
- Progress can be tracked in a markdown file (e.g., `.ralph/progress.md`).

## tmux Quick Reference

```bash
tmux list-sessions                              # List active sessions
tmux new-session -d -s <name> '<command>'       # Start detached
tmux attach -t <name>                           # Attach (interactive)
tmux send-keys -t <name> "command" Enter        # Send input
tmux capture-pane -p -J -t <name> -S -200       # Read last 200 lines
tmux kill-session -t <name>                      # Clean up
```

## Guidelines

- Always use `--dangerously-skip-permissions` for subagents.
- Use `--print` for one-shot tasks; skip it for interactive.
- Clean up tmux sessions when done (`tmux kill-session -t <name>`).
- Check results before trusting — subagents use weaker models.
- Don't nest subagents (subagent spawning subagent). Keep it flat.
- Sleep duration is a guess; check output, re-wait if incomplete.
