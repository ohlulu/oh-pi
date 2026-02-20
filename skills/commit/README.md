# Commit

Walks through a structured commit workflow: analyze changes → write a Conventional Commits message → commit via the `committer` script.

## Usage

Ask the agent to commit changes:

```
Commit my changes
```

Or the agent loads this skill automatically when it detects a commit is needed.

## What It Does

- Scans `git diff` / `git status` to understand what changed
- Picks the right commit type (`feat`, `fix`, `refactor`, etc.)
- Writes a clean commit message following Conventional Commits spec
- Commits using `~/.pi/agent/shared/scripts/committer` with explicit file paths

## When to Use

- Ready to commit changes
- Need help writing a good commit message
- Reviewing staged changes before committing

## Key Rules

- One commit = one logical unit of work
- Always use `committer` script — never raw `git commit`
- Always list specific files — never stage `.`
- Subject: imperative mood, lowercase, ≤ 72 chars, no period
- If changes span multiple types → split into separate commits

## Commit Types

| Type | When |
|------|------|
| `feat` | New user-facing functionality |
| `fix` | Bug fix |
| `refactor` | Code restructure, no behavior change |
| `docs` | Documentation only |
| `style` | Formatting / whitespace |
| `test` | Adding or updating tests |
| `perf` | Performance improvement |
| `build` | Build system / dependencies |
| `ci` | CI/CD config |
| `chore` | Maintenance that doesn't fit above |

## References

- `references/conventional-commits.md` — spec and examples
- `~/.pi/agent/shared/scripts/committer` — the commit script
