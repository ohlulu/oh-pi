# AGENTS.md

Ohlulu owns this. Start: say hi + 1 motivating line. Work style: telegraph; noun-phrases ok; drop grammar; min tokens.


## Agent Protocol
- Workspace: `~/Developer`. Folder pattern: `~/Developer/<owner>/<project-name>`.
- "MacBook" / "Mac Studio" => SSH there; find hosts/IPs via `tailscale status`.
- PRs: use `gh pr view/diff` (no URLs).
- "Make a note" => edit AGENTS.md (shortcut; not a blocker).
- Guardrails: use `trash` for deletes (never `rm -rf`).
- Need upstream file: stage in `/tmp/`, then cherry-pick; never overwrite tracked.
- Bugs: add regression test when it fits.
- Keep files <~500 LOC; up to 700 allowed if justified; split/refactor as needed.
- Commits: Conventional Commits (`feat|fix|refactor|build|ci|chore|docs|style|perf|test`).
- Subagents: read `~/.pi/agent/docs/subagent.md`.
- Editor: `cursor <path>`.
- CI: `gh run list/view` (rerun/fix til green).
- Prefer end-to-end verify; if blocked, say what's missing.
- New deps: quick health check (recent releases/commits, adoption).
- Slash cmds: `~/.pi/agent/prompts/`.
- Decisions: `ask_me`/`ask_me_batch`; no assumptions pre-result; post-result update decision log. ✍️ custom input always on — no "Other/其他" option.
- Web: search early; quote exact errors; prefer 2024-2025 sources; fallback Firecrawl (`pnpm mcp:*`).
- Oracle: run `npx -y @steipete/oracle --help` once/session before first use.
- Style: telegraph. Drop filler/grammar. Min tokens (global AGENTS + replies).

## Screenshots ("use a screenshot")
- Pick newest PNG in `~/Desktop` or `~/Downloads`.
- Verify it's the right UI (ignore filename).
- Size: `sips -g pixelWidth -g pixelHeight <file>` (prefer 2×).
- Optimize: `imageoptim <file>` (install: `brew install imageoptim-cli`).
- Replace asset; keep dimensions; commit; run gate; verify CI.

## Important Locations
- Sparkle keys: ~/Library/CloudStorage/Dropbox/Backup/Sparkle

## Docs
- docs-list extension auto-injects project doc index on first turn (if `docs/` exists); read matching docs before coding.
- Follow links until domain makes sense; honor `Read when` hints.
- Keep notes short; update docs when behavior/API changes (no ship w/o docs).
- Always add `summary` & `read_when` hints on docs.
- Front matter format: see `rules/docs-format.md`.

## Flow & Runtime
- Use repo's package manager/runtime; no swaps w/o approval.
- Use subagents background for long jobs.
- Model selection: Haiku for lightweight/frequent agents; Sonnet for main dev + orchestration; Opus for deep reasoning/architecture.
- Context window: avoid last 20% for large refactors/multi-file features; single-file edits are low sensitivity.
- Complex tasks: use Plan Mode + ultrathink; multiple critique rounds; split-role sub-agents.
- Auto-dispatch agents (no user prompt needed): complex features → planner.
- ALWAYS parallelize independent agent tasks; never run sequentially when concurrent is possible.

## Build / Test
- Before handoff: run full gate (lint/typecheck/tests/docs).
- CI red: `gh run list/view`, rerun, fix, push, repeat til green.
- Keep it observable (logs, panes, tails, MCP/browser tools).
- Release: read `docs/RELEASING.md` (or find best checklist if missing).
- Reminder: check ~/.profile for missing env keys (e.g. SPARKLE_PRIVATE_KEY_FILE); Sparkle keys live in ~/Library/CloudStorage/Dropbox/Backup/Sparkle.

## Git
- Safe by default: `git status/diff/log`. Push only when user asks.
- Ship small commits.
- `git checkout` ok for PR review / explicit request.
- Branch changes require user consent.
- Destructive ops forbidden unless explicit (`reset --hard`, `clean`, `restore`, `rm`, …).
- Remotes under `~/Developer`: prefer HTTPS; flip SSH->HTTPS before pull/push.
- Don't delete/rename unexpected stuff; stop + ask.
- No repo-wide S/R scripts; keep edits small/reviewable.
- Avoid manual `git stash`; if Git auto-stashes during pull/rebase, that's fine (hint, not hard guardrail).
- If user types a command ("pull and push"), that's consent for that command.
- No amend unless asked.
- Big review: `git --no-pager diff --color=never`.
- Multi-agent: check `git status/diff` before edits.
- Attribution: disabled globally via `~/.pi/agent/settings.json`.
- PRs: analyze full commit history; `git diff [base-branch]...HEAD`; draft summary; include test plan; push with `-u` if new branch.

## Language/Stack Notes
- Swift: use workspace helper/daemon; validate `swift build` + tests; keep concurrency attrs right.
- TypeScript: use repo PM; run `docs:list`; keep files small; follow existing patterns.

## macOS Permissions / Signing (TCC)
- Never re-sign / ad-hoc sign / change bundle ID as "debug" without explicit ok (can mess TCC).

## Critical Thinking
- Fix root cause (not band-aid).
- Unsure: read more code; if still stuck, ask w/ short options.
- Conflicts: call out; pick safer path.
- Unrecognized changes: assume other agent; keep going; focus your changes. If it causes issues, stop + ask user.
- Leave breadcrumb notes in thread.
- Before declaring done: ask "what else tracks or depends on what I just changed?" — find and update all dependents (indexes, registries, cross-refs, manifests, docs). Primary task done ≠ done.

## Tools

Read ~/.pi/agent/tools.md for the full tool catalog if it exists.



### peekaboo
Screen tools: `peekaboo`. Cmds: capture, see, click, list, tools, permissions status.
Needs Screen Recording + Accessibility. Docs: `peekaboo --help`.

### trash
- Move files to Trash: `trash …` (system command).

### bin/docs-list / scripts/docs-list.ts
- Optional. Lists `docs/` + enforces front-matter. Ignore if `bin/docs-list` not installed. Rebuild: `bun build scripts/docs-list.ts --compile --outfile bin/docs-list`.

### xcp
- Xcode project/workspace helper for managing targets, groups, files, build settings, and assets; run `xcp --help`.

### tuist
- Generates Xcode projects from manifest files; run `tuist --help`.

### lldb
- Use `lldb` inside tmux to debug native apps; attach to the running app to inspect state.

### axe
- Simulator automation CLI for describing UI (`axe describe-ui --udid …`), tapping (`axe tap --udid … -x … -y …`), typing, and hardware buttons. Use `axe list-simulators` to enumerate devices.

### oracle
- Bundle prompt+files for 2nd model. Use when stuck/buggy/review.
- Run `npx -y @steipete/oracle --help` once/session (before first use).

### mcporter / iterm / firecrawl / XcodeBuildMCP
- MCP launcher: `npx mcporter <server>` (see `npx mcporter --help`). Common: `iterm`, `firecrawl`, `XcodeBuildMCP`.

### gh
- GitHub CLI for PRs/CI/releases. Given issue/PR URL (or `/pull/5`): use `gh`, not web search.
- Examples: `gh issue view <url> --comments -R owner/repo`, `gh pr view <url> --comments --files -R owner/repo`.

### Prompt Templates (Slash Commands)
- Global: `~/.pi/agent/prompts/`. Project-local: `.pi/prompts/`.
- Common: `/handoff`, `/pickup`.

### tmux
- Use only when you need persistence/interaction (debugger/server).
- Quick refs: `tmux new -d -s codex-shell`, `tmux attach -t codex-shell`, `tmux list-sessions`, `tmux kill-session -t codex-shell`.

<frontend_aesthetics>
Avoid "AI slop" UI. Be opinionated + distinctive.

Do:
- Typography: pick a real font; avoid Inter/Roboto/Arial/system defaults.
- Theme: commit to a palette; use CSS vars; bold accents > timid gradients.
- Motion: 1-2 high-impact moments (staggered reveal beats random micro-anim).
- Background: add depth (gradients/patterns), not flat default.

Avoid: purple-on-white clichés, generic component grids, predictable layouts.
</frontend_aesthetics>
