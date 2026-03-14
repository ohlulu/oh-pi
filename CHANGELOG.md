# Changelog

## Unreleased

## 2026.03.14-1

### Extensions

- Updated `ralph-wiggum` — added deferred `doneRequested` drain for reliable iteration handoff; added `statusDetail` lifecycle transitions (`starting` → `active` → `completing`); final iteration accounting in `completeLoop`/`stopLoop`; condensed HELP text; added queue-race regression test suite.

### Skills

- Added `app-store-screenshots` — App Store screenshot generator: Next.js page rendering iPhone/iPad marketing screenshots with `html-to-image` export at Apple-required resolutions; copy-first workflow; included iPhone mockup asset.
- Added `postmortem` — blameless incident review: 5-Whys root cause analysis, structured template, supports project-level and global placement, pattern detection across postmortems.
- Added `ui-design-principles` — platform-agnostic UI design principles: typography, color, spacing, motion, interaction, adaptive layout, UX writing; includes "AI slop" anti-pattern checklist; 7 reference docs.
- Updated `sdd` — added handoff audit checklist item and anti-pattern for ambiguous specs.
- Updated `swift-concurrency` — restructured reference docs (removed `approachable-concurrency` and `swiftui-concurrency`; content consolidated into remaining refs).
- Updated `swiftui-expert-skill` — restructured reference docs (removed `modern-apis` and `text-formatting`; added `latest-apis`, `charts`, `charts-accessibility`, `accessibility-patterns`, `macos-scenes`, `macos-views`, `macos-window-styling`).
- Removed `bdd` skill.

### Prompts

- Added `/ceo-review` — CEO/founder-mode plan review with three modes: scope expansion, hold scope, scope reduction.

### Docs

- Added 3 postmortems: Tuist binary xcframework silent link failure, Crashlytics dSYM silent failure, StoreKit config not in project.
- Removed `docs/tuist.md` (content superseded by postmortem).

### Config

- Updated `AGENTS.md` — added "Codex will review your code" note.

## 2026.03.09-1

### Docs

- Updated `docs/tools.md` — clarified `mcporter` config discovery and listed configured MCP servers.
- Added `docs/tuist.md` — documented Tuist's binary xcframework transitive dependency pitfall and the `-ObjC` workaround.

### Config

- Updated `AGENTS.md` — prefer `npx mcporter call XcodeBuildMCP.<tool>` for Xcode build/test/debug; discover available MCP tools first with `npx mcporter list XcodeBuildMCP --schema`.

## 2026.03.08-1

### Extensions

- Updated `ralph-wiggum` — moved state storage from `.ralph/` to `.pi/ralph/`; added checklist guard: `ralph_done` now issues a soft warning when the checklist count is unchanged since the previous iteration, prompting the agent to update the task file before advancing (second consecutive call without progress passes through automatically); strengthened prompt templates with mandatory task-file update instructions and clearer consequence notes.

### Skills

- Updated `sdd` — renamed "Design" phase to "Plan" (`design.md` → `plan.md`, `design-guide.md` → `plan-guide.md`); added Chinese trigger words; added approval gate presentation note (explain each phase in plain Chinese before user approves); added Handoff to doc-system section (INDEX.md entry + milestone `_index.md` link after Tasks approval); expanded Spec Evolution section with explicit edit-in-place vs. delta workflow decision tree; added Small Change and Large Change (delta) sub-workflows; strengthened anti-patterns and quality gates.
- Updated `doc-system` — added decision table for when to create a separate milestone file vs. index-row-only entry; added anti-pattern for duplicate checklists (milestone file with checklist when `tasks.md` already exists).
- Updated `ralph-wiggum` — updated file path references from `.ralph/` to `.pi/ralph/`.

### Config

- Updated `AGENTS.md` — added Skills section: agents must scan `<available_skills>` descriptions on turn 1 before reading any project file; strengthened root-cause mandate (articulate root cause in 1–2 sentences before writing any fix); relaxed commit-as-you-go wording to crossing-module-boundary heuristic.

## 2026.03.03-1

### Extensions

- Updated `worktree` — added `/wt rebase` command (rebases current worktree branch onto local `main` with `--autostash`, detects and reports conflicts); added shell-escaping for template variables in sync command; clarified template variable availability (`parentDir` only supports `{{main}}` and `{{project}}`).
- Updated `review` — head commit selector now filters to commits strictly newer than the selected base; fixed scoped package path stripping (e.g. `@scope/pkg` preserved, only pi file-mention `@`-paths are stripped); custom review type no longer requires a git repo.
- Updated `commit` — removed spurious "Thinking…" progress phase on `turn_start` events.

### Skills

- Added `doc-system` — product documentation system design and maintenance principles: on-demand loading, single source of truth, open-closed structure, mockup screen index management.
- Added `sdd` — Spec-Driven Development: structured feature planning through Requirements → Design → Tasks → Verification, with approval gates between phases.
- Removed `bdd` skill.

### Prompts

- Added `/brainstorming` — turns ideas into fully formed designs through Diverge → Converge → Reflect dialogue; hard-gates implementation until design is approved.
- Added `/dev-loop` — automated development loop: claim todo, branch, develop, code review, merge, repeat.
- Updated `/tech-stack-decision` — translated from Chinese to English; now language-agnostic.

### Config

- Updated `AGENTS.md` — strengthened commit-as-you-go rule (staged diff >~150 lines or 3+ uncommitted logical changes = violation); added rule to read `doc-system` skill before creating or moving any file under `docs/`.
- Updated `shared/scripts/docs-list.ts` — improved front-matter validation and listing logic.
- Added `shared/bin/docs-list` — compiled binary wrapper for the docs-list script.

## 2026.02.26-1

### Extensions

- Updated `commit` — real-time progress notifications via JSON event stream (reading diff, staging, committing…); added 2-minute hard timeout with SIGTERM → SIGKILL escalation; added `--no-skills` and `--no-prompt-templates` flags to subprocess.
- Updated `review` — bumped commit history limit to 100 in commit and range selectors; fixed `@`-prefix stripping to handle all file-mention tokens correctly.

### Shared

- Added `nanobanana` script — image editing via Gemini's image generation API; pass an image path and a text prompt, get an edited image back.

### Docs

- Updated `docs/tools.md` — added `nanobanana` tool reference.

## 2026.02.25-1

### Extensions

- Updated `review` — added commit range review (`/review range <base> <head>`); interactive two-step selector for picking base and head commits.

## 2026.02.24-1

### Extensions

- Rewrote `commit` — now spawns an isolated `pi` subprocess with Haiku instead of branching/model-switching; removed `/end-commit` command.
- Updated `review` — git-dependent presets are hidden when not in a git repo; smart default falls back to "folder" outside git repos; switched review model to `gpt-5.3-codex`.
- Converted `mpd` from multi-file extension (directory) to single-file extension.
- Removed `notify` extension.
- Updated `todo` — formatting cleanup and minor prompt tweaks.

### Skills

- Added `swift-testing-expert` — Swift Testing guidance with 10 reference docs covering #expect/#require macros, traits/tags, parameterized tests, async waiting, parallelization, XCTest migration, and Xcode workflows.
- Removed `google-sheets` skill (symlink).

### Prompts

- Added `/dig-lite` — fast deep-dive focused on resolving ambiguity and decision-impacting info.
- Updated `/dig` — revised workflow and output structure.
- Updated `review-rubric` shared prompt.

### Docs

- Removed `docs/subagent.md` (subagent coordination now handled by pi's built-in features).
- Updated `docs/tools.md`.

### Config

- Updated `AGENTS.md` — expanded commit guidelines (one per logical unit, each must compile).

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
