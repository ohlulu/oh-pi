# Update Changelog

Curate user-facing changes from git history and write them into `CHANGELOG.md`.

## Usage

Ask the agent to update the changelog:

```
Update the changelog
Prepare release notes since the last tag
```

## What It Does

- Finds the latest tag, collects commits since then
- Filters for user-facing changes only (no internal refactors or typo fixes)
- Writes entries under `## Unreleased` section
- Preserves existing changelog style and entries

## When to Use

- Asked to update the changelog
- Preparing a release
- Accumulating notable changes after a batch of commits

## What Gets Included

✅ Shipped features, bug fixes, breaking changes, notable UX tweaks

❌ Internal refactors, dependency bumps (unless security), minor doc edits, features added then removed in same window

## Entry Order

1. Breaking changes
2. Features
3. Fixes
4. Misc

## Style

- Past-tense verbs or short descriptors
- Include PR/issue numbers when available (`#123`)
- No raw commit hashes
- Backticks for code references
- Match existing bullet style (`*` vs `-`)

## Example

```markdown
## Unreleased
- Added configurable status probe refresh interval. #123
- Fixed menu bar icon dimming on sleep/wake. #128
- Improved error reporting when task claim expires.
```
