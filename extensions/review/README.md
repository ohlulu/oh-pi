# Review (Extension)

Code review tool. Opens a fresh session branch, runs a focused review, then returns you to where you were.

## Usage

Type `/review` to open the interactive selector and pick what to review. Or jump straight to a sub-command:

```
/review uncommitted
/review pr 123
/review branch main
```

Type `/end-review` when done to summarize findings and return to your original session.

## How It Works

1. `/review` opens a selector — pick what to review
2. Optionally opens a fresh session branch (so review context doesn't pollute your main conversation)
3. Switches to `gpt-5.3-codex` for the review (falls back to current model if no API key)
4. Agent performs the review
5. `/end-review` summarizes findings and returns to your original session

## Commands

| Command | What it does |
|---------|-------------|
| `/review` | Start a code review (interactive selector) |
| `/review uncommitted` | Review uncommitted changes |
| `/review branch <name>` | Review current branch vs a base branch |
| `/review commit <sha>` | Review a specific commit |
| `/review folder <paths>` | Review specific files/folders (alias: `file`, `path`) |
| `/review custom <text>` | Review with custom instructions |
| `/review pr <number\|url>` | Checkout and review a PR |
| `/review <path>` | Pass a path directly — auto-detected if it exists on disk |
| `/end-review` | Finish review, optionally summarize, return to origin |

## Review Presets

The interactive selector auto-detects a smart default:
- Has uncommitted changes → suggests "uncommitted"
- On a feature branch → suggests "base branch"
- Otherwise → suggests "commit"

## File & Folder Reviews

- Works **outside git repos** — no `.git` directory required
- Paths support quoting (`"path with spaces"`, `'another'`) and backslash-escaped spaces
- Tilde (`~/`) is expanded to `$HOME`
- Pass paths directly without a subcommand: `/review ./src ~/project` — if all paths exist on disk, treated as folder review

## PR Reviews

When reviewing a PR:
- Checks for uncommitted changes first (blocks if dirty)
- Fetches PR info via `gh`
- Checks out the PR branch
- Reviews against the PR's base branch

## Session Flow

- Review runs in a **branched session** — your original conversation is untouched
- `/end-review` can summarize the review branch before returning
- Model is restored to whatever you were using before

## Source Files

- `index.ts` — commands, session management, UI
- `git.ts` — git helpers (branches, commits, PR checkout)
- `prompts.ts` — review prompt templates and rubric
