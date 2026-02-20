# Changelog

## Unreleased

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
