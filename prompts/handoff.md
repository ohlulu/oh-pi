---
description: Package current state so the next agent (or future you) can resume quickly.
---
Generate a handoff report. Include (in order):

1) **Scope/status**: what you were doing, what's done, what's pending, and any blockers.
2) **Working tree**: `git status -sb` summary and whether there are local commits not pushed.
3) **Branch/PR**: current branch, relevant PR number, CI status if known.
4) **Running processes**: list tmux sessions/panes and how to attach:
   - `tmux list-sessions`
   - `tmux capture-pane -p -J -t <session>:<window>.<pane> -S -200`
   - Note dev servers, tests, debuggers, background scripts.
5) **Todos**: list any open items from the todo tool (`todo list`).
6) **Tests/checks**: which commands were run, results, and what still needs to run.
7) **Next steps**: ordered bullets the next agent should do first.
8) **Risks/gotchas**: any flaky tests, credentials, feature flags, or brittle areas.

Output format: concise bullet list; include copy/paste tmux commands for any live sessions.
