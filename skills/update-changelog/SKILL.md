---
name: update-changelog
description: "Update CHANGELOG.md with user-facing changes since the last release. Use when asked to update changelog, draft release notes, or prepare a release."
---

# Update Changelog

Curate user-facing changes from git history and record them in `CHANGELOG.md` under the Unreleased section.

## When to Use

- User asks to update the changelog.
- Preparing a release (pre-release step).
- Accumulating notable changes after a batch of commits.

## When Not to Use

- Writing commit messages (use the `commit` skill).
- Drafting PR descriptions unrelated to release notes.

## Workflow

### 1. Determine baseline version

If no baseline is provided:

```bash
git describe --tags --abbrev=0
```

This returns the most recent tag — that's the starting point.

### 2. Collect commits since baseline

```bash
git log <tag>..HEAD --oneline --reverse
```

Skim diffs as needed (`git diff <tag>..HEAD -- <file>`) to understand user-visible impact.

### 3. Curate entries (user-facing only)

**Include:**
- Shipped features, bug fixes, breaking changes
- Notable UX or behavior tweaks

**Exclude:**
- Internal refactors, typo-only edits
- Dependency bumps without user impact
- Minor documentation updates
- Features added then removed in the same window (never shipped — don't mention)

**Order by impact:**
1. Breaking changes
2. Features
3. Fixes
4. Misc

**References:**
- Add PR/issue numbers when available (`#123`)
- Never include raw commit hashes

### 4. Edit CHANGELOG.md

- If `CHANGELOG.md` doesn't exist, check for `CHANGELOG` (no extension).
- Ensure an `## Unreleased` section exists at the top; create it if missing.
- Preserve the existing style (`## Unreleased` vs `## [Unreleased]`, bullet style `*` vs `-`, spacing).
- Append new entries under Unreleased; do not replace existing entries.
- Group related changes together when appropriate.

### 5. Sanity checks

- Markdown renders correctly.
- No duplicate entries.
- Wording is concise, past-tense verbs or short descriptors.
- Code references use backticks.

### 6. Post-release bookkeeping

If a release just shipped (Unreleased section was converted to a version):
- Add a fresh `## Unreleased` section at the top.
- This prevents new changes from landing in the shipped section.

## Style Guidelines

- Start each entry with a past-tense verb or descriptive phrase.
- Keep entries concise but descriptive enough to understand the change.
- Use backticks for code references (e.g., `someFunction`).
- Match the repo's existing bullet style and heading conventions.

## Examples

### Good entries

```markdown
## Unreleased
- Added configurable status probe refresh interval. #123
- Fixed menu bar icon dimming on sleep/wake. #128
- Improved error reporting when task claim expires.
```

### Bad entries

- `Fixed bug` — too vague
- `Updated dependencies` — not user-facing (unless security fix)
- `Refactored internal code structure` — internal, users don't care
- `Fixed typo in comment` — insignificant

## Notes

- Read the repo's `AGENTS.md` first if it exists — it may have project-specific changelog rules.
- If a repo-local release doc exists (e.g., `docs/RELEASING.md`), follow its conventions.
- When in doubt about whether a change is significant, err on the side of including it.
