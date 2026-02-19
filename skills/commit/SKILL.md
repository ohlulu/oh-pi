---
name: commit
description: Analyze changes and produce a Conventional Commits message, then commit via `~/.pi/agent/shared/scripts/committer`. Use when asked to commit, write a commit message, or review changes before committing.
---

# Commit

Guide the agent through a structured commit workflow: analyze changes → craft a Conventional Commit message → commit with `~/.pi/agent/shared/scripts/committer`.

## When to Use

- User asks to commit or submit changes.
- User asks to write or review a commit message.
- A task is complete and needs a closing commit.

## When Not to Use

- Browsing git log/status without intent to commit.
- Writing PR descriptions or release notes.
- Rebase, merge, or other git operations.

## Workflow

### 1. Scan changes

```bash
git status
git diff
git diff --staged
```

Understand **what** changed and **why**.

### 2. Classify the commit type

Pick exactly one type per commit:

| Type | Use when |
|------|----------|
| `feat` | Adding new functionality visible to users |
| `fix` | Correcting a bug |
| `refactor` | Restructuring code without changing behavior |
| `docs` | Documentation only |
| `style` | Formatting, whitespace, linting (no logic change) |
| `test` | Adding or updating tests |
| `perf` | Performance improvement |
| `build` | Build system or dependency changes |
| `ci` | CI/CD configuration changes |
| `chore` | Maintenance tasks that don't fit above |

If changes span multiple types, split into separate commits.

### 3. Determine scope (optional)

Infer scope from the changed module, feature area, or directory.
Omit scope when the change is project-wide or the scope is obvious from context.

Examples: `feat(auth):`, `fix(parser):`, `docs(readme):`

### 4. Detect breaking changes

If the change removes/renames public API, changes function signatures, or alters observable behavior:
- Add `!` after type/scope: `feat(api)!: ...`
- Add `BREAKING CHANGE: <description>` in the footer

### 5. Write the message

Format:

```
<type>[(<scope>)][!]: <subject>

[body]

[footer]
```

Rules:
- **Subject**: imperative mood, lowercase start, ≤ 72 chars, no trailing period
- **Body** (optional): blank line after subject, explain **why** not what, wrap at 72 chars
- **Footer** (optional): `BREAKING CHANGE:` or issue references

### 6. List files explicitly

Enumerate every file path to commit. Never use `.` — always list specific paths.

### 7. Commit

```bash
~/.pi/agent/shared/scripts/committer "<type>[(<scope>)][!]: <subject>" file1 file2 ...
```

Always use `~/.pi/agent/shared/scripts/committer`. Never run `git commit` directly.

## Rules (Must Follow)

- One commit, one logical unit of work.
- Always use `~/.pi/agent/shared/scripts/committer` with explicit file paths.
- Never stage `.` — list specific files.
- Subject line ≤ 72 characters, imperative mood, lowercase start, no period.
- Type must be one of: `feat|fix|refactor|build|ci|chore|docs|style|perf|test`.
- If changes serve different purposes, recommend splitting into multiple commits.
- Verify no unrelated files are included before committing.

## References

- Conventional Commits spec and examples: [references/conventional-commits.md](references/conventional-commits.md)
- Committer script: `~/.pi/agent/shared/scripts/committer` — safe git commit wrapper that stages only listed files
