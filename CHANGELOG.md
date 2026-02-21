# Changelog

## Unreleased

## 2026.02.21-1

### Docs

- Added `docs/tools.md` — CLI tools reference for Ohlulu's machines (peekaboo, gh, oracle, mcporter, xcp, tuist, lldb, axe, tmux).

### Config

- Cleaned up `AGENTS.md`: removed outdated shortcuts; consolidated TCC signing warning into Agent Protocol; added pointer to `docs/tools.md`.

## 2026.02.20-1

### Extensions

- Added `commit` — `/commit` and `/end-commit` commands; auto-branches to a cheap model (Haiku/Flash) when running on an expensive model to save tokens.
- Added `mpd` — `/mpd` Merge-Push-Delete: merges current feature branch into default, pushes, and deletes local branch in one shot.
- Updated `review` — added file/path review (aliases: `file`, `path`); quote-aware path parsing (single/double quotes, backslash escapes); tilde expansion; works outside git repos.

### Skills

- Added `google-sheets` — Google Sheets API via curl; reads, writes, appends, and batch-updates spreadsheet data without an SDK.
- Updated `ralph-wiggum` — refined trigger criteria: start with direct execution by default; escalate to Ralph only after 2+ failed hypotheses or repeated blockers.
- Updated `swift-concurrency` — added `approachable-concurrency` reference doc (Swift 6.2 main-actor-by-default); expanded `swiftui-concurrency` reference; added reference index.
- Added `swiftui-ui-patterns` — SKILL.md with 20+ component reference docs (list, navigation, sheets, forms, grids, controls, haptics, menu bar, and more).

### Prompts

- Removed `/mcp` template.

### Shared

- Added `shared/scripts/committer` — safe `git commit` wrapper; enforces Conventional Commits format and explicit file listing.
- Added `shared/scripts/docs-list.ts` — lists project `docs/` with front-matter validation.

### Docs

- Added `docs/subagent.md` — subagent coordination via tmux + Claude Code CLI; covers one-shot, interactive, and supervisor patterns.

## 2026.02.19-1

Initial release — personal pi agent resources collection.

### Extensions

- Added `ask-me` interactive single-choice decision tool.
- Added `ask-me-batch` batch version for multiple questions in one pass.
- Added `context` — `/context` command to display context window usage, extensions, skills, and session cost.
- Added `done-sound` — plays a system sound when the agent finishes (macOS).
- Added `inject-docs` — auto-injects project `docs/` index on session start.
- Added `lazygit` — `/lazygit` command to launch lazygit inside the TUI.
- Added `notify` — native macOS desktop notification when the agent finishes.
- Added `open-with` — `/finder` and `/cursor` commands.
- Added `ralph-wiggum` — long-running iterative dev loops with plan/build modes, checkpoints, hints, and struggle detection.
- Added `review` — `/review` code review extension with git diff, branch, commit, folder, and PR support.
- Added `tab-status` — terminal tab title reflects agent status (idle/working/error).
- Added `todo` — file-based todo management with agent tool and `/todos` TUI command.
- Added `worktree` — `/wt` git worktree management with sync and template variables.
- Added `yazi` — `/yazi` command to launch yazi file manager inside the TUI.

### Skills

- Added `bdd` — BDD Gherkin specification writing and review.
- Added `clean-architecture` — dependency direction and layer boundary thinking framework.
- Added `commit` — structured Conventional Commits workflow with `committer` script.
- Added `dev-principles` — language-agnostic development principles (YAGNI, SOLID, CQS).
- Added `ralph-wiggum` — skill companion for the ralph-wiggum extension.
- Added `swift-coding-style` — Swift coding conventions and type design guidelines.
- Added `swift-concurrency` — async/await, actors, Sendable, Swift 6 migration with 14 reference docs.
- Added `swiftui-expert-skill` — state management, view composition, performance, modern APIs, animations.
- Added `swiftui-liquid-glass` — iOS 26+ Liquid Glass API guidance.
- Added `swiftui-performance-audit` — diagnose and fix SwiftUI runtime performance issues.
- Added `update-changelog` — curate user-facing changes into CHANGELOG.md.

### Prompts

- Added `/dig` — deep-dive research and explanation in teaching style.
- Added `/handoff` — package current state into a handoff report.
- Added `/mcp` — merge → close branch → push quick flow.
- Added `/pickup` — rehydrate context when resuming work.
- Added `/spec-workshop` — requirements spec workshop (Chinese).
- Added `/tech-stack-decision` — tech stack decision workshop (Chinese).
- Added `review-rubric` shared prompt for code review scoring guidelines.

### Config

- Added `AGENTS.md` global agent instructions.
- Added bilingual readme (English + Chinese) with `/dig` workflow guide.
- Added README.md for all skills and folder-type extensions.
