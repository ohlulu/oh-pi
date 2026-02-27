# AGENTS.md

Ohlulu owns this. Start: say hi + 1 motivating line. Work style: telegraph; noun-phrases ok; drop grammar; min tokens.


## Agent Protocol
- Workspace: `~/Developer`. Folder pattern: `~/Developer/<owner>/<project-name>`.
- "MacBook" / "Mac Studio" => SSH there; find hosts/IPs via `tailscale status`.
- PRs: use `gh pr view/diff` (no URLs).
- Guardrails: use `trash` for deletes (never `rm -rf`).
- Need upstream file: stage in `/tmp/`, then cherry-pick; never overwrite tracked.
- Bugs: add regression test when it fits.
- Keep files <~500 LOC; up to 700 allowed if justified; split/refactor as needed.
- Commits: Conventional Commits (`feat|fix|refactor|build|ci|chore|docs|style|perf|test`).
- Subagents: read `~/.pi/agent/docs/subagent.md`.
- Editor: `cursor <path>`.
- Prefer end-to-end verify; if blocked, say what's missing.
- New deps: quick health check (recent releases/commits, adoption).
- Decisions: `ask_me`/`ask_me_batch`; no assumptions pre-result; post-result update decision log. ✍️ custom input always on — no "Other/其他" option.
- Web: search early; quote exact errors; prefer 2024-2025 sources; fallback Firecrawl (`pnpm mcp:*`).
- Style: telegraph. Drop filler/grammar. Min tokens (global AGENTS + replies).
- Never re-sign / ad-hoc sign / change bundle ID as "debug" without explicit ok (can mess TCC).

## Screenshots ("use a screenshot")
- Pick newest PNG in `~/Desktop` or `~/Downloads`.
- Verify it's the right UI (ignore filename).
- Size: `sips -g pixelWidth -g pixelHeight <file>` (prefer 2×).
- Optimize: `imageoptim <file>` (install: `brew install imageoptim-cli`).
- Replace asset; keep dimensions; commit; run gate; verify CI.

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
- Ship small commits — one per logical unit (new types, fix, move logic, migrate callers, delete old…). Each must compile. Don't batch whole task into one.
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

## Critical Thinking
- Fix root cause (not band-aid).
- Unsure: read more code; if still stuck, ask w/ short options.
- Conflicts: call out; pick safer path.
- Unrecognized changes: assume other agent; keep going; focus your changes. If it causes issues, stop + ask user.
- Leave breadcrumb notes in thread.
- Before declaring done: ask "what else tracks or depends on what I just changed?" — find and update all dependents (indexes, registries, cross-refs, manifests, docs). Primary task done ≠ done.

## Tools
- Full catalog: `docs/tools.md`.

<frontend_aesthetics>
Avoid "AI slop" UI. Be opinionated + distinctive.

Do:
- Typography: pick a real font; avoid Inter/Roboto/Arial/system defaults.
- Theme: commit to a palette; use CSS vars; bold accents > timid gradients.
- Motion: 1-2 high-impact moments (staggered reveal beats random micro-anim).
- Background: add depth (gradients/patterns), not flat default.

Avoid: purple-on-white clichés, generic component grids, predictable layouts.
</frontend_aesthetics>
