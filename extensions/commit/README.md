# Commit (Extension)

Spawns an isolated Haiku subprocess to analyze changes and commit — cheap, fast, no context pollution.

## Usage

```
/commit
/commit <optional hint about what changed>
```

Type `/commit` and a lightweight `pi` subprocess handles git analysis and committing. Your current session stays untouched.

## How It Works

1. Checks you're in a git repo with uncommitted changes
2. Snapshots current HEAD
3. Spawns `pi --mode json` with `claude-haiku-4-5`, bash-only, no extensions
4. Subprocess reads the commit skill and runs the full commit workflow
5. On exit, compares HEAD to count new commits and notifies you

## Commands

| Command | What it does |
|---------|-------------|
| `/commit` | Start commit via isolated subprocess |
| `/commit <hint>` | Pass extra context to the commit agent |

## Source Files

- `index.ts` — subprocess spawning, git snapshot, result reporting
