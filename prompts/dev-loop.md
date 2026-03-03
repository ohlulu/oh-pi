---
description: Automated dev loop — claim todo, branch, develop, code review, merge, repeat.
---
Execute an automated development loop. Follow these steps **in order** for each todo item.

## Workflow

### 1. Pick a todo
- Run `todo list` to find open items.
- If `$@` is specified, pick the matching todo. Otherwise, pick the highest-priority open item.
- Claim it: `todo claim <id>`.

### 2. Create branch
- `git checkout main && git pull`
- `git checkout -b feat/<short-slug>` (derive slug from todo title).

### 3. Develop
- Implement the todo requirements.
- Run the project's lint / typecheck / test gate before proceeding.
- Commit with conventional commits (small, compilable units).

### 4. Code review
- Tell the user:
  > Please run: `/review branch main`
- **STOP and wait** for the user to trigger the review.
- The review summary will appear in context after it completes.

### 5. Act on review
When the review summary appears, read the **verdict**:
- **"correct"** (no blocking issues) → proceed to step 6.
- **"needs attention"** (has blocking issues) → fix the P0/P1 findings, commit, then go back to step 4.
- Maximum **3 review cycles** per todo. If still failing after 3, report to the user and stop.

### 6. Merge
- `git checkout main && git merge --no-ff feat/<branch>`
- Delete the feature branch: `git branch -d feat/<branch>`

### 7. Close & repeat
- `todo update <id> --status done`
- Go to step 1 for the next todo.
- If no more open todos, report completion.

## Rules
- Each todo is one unit of work. Do not batch multiple todos.
- Keep commits small and compilable — one per logical change.
- If a todo is unclear or blocked, `todo update <id> --status blocked` and move to the next.
- Use relevant skills (swift-coding-style, dev-principles, etc.) during development.
- If `$@` contains additional instructions, apply them as constraints throughout.

Task / constraints: $@
