---
description: Rehydrate context quickly when starting or resuming work.
---
Run the pickup checklist:

1) **Docs**: read AGENTS.MD + relevant project docs.
2) **Repo state**: `git status -sb`; check for local commits; confirm current branch/PR.
3) **CI/PR**: `gh pr view --comments --files` (or derive PR from branch) and note failing checks.
4) **Processes**: check for live tmux sessions:
   - `tmux list-sessions`
   - If sessions exist: `tmux capture-pane -p -J -t <session>:<window>.<pane> -S -200`
5) **Todos**: `todo list` — check for open or in-progress items.
6) **Tests/checks**: note what last ran (from handoff notes or CI) and what to run first.
7) **Plan**: list next 2–3 actions as bullets, then execute.

Output format: concise bullet summary; include copy/paste tmux commands when live sessions are present.
