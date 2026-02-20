# oh-pi

English / [中文版](https://github.com/ohlulu/oh-pi/blob/main/readme-zh.md)

A curated collection of personal [pi](https://github.com/badlogic/pi) agent resources — extensions, skills, and prompt templates, tailored for my own workflow.

> **⚠️ This is a personal configuration.**
> It is designed around my specific habits, tools, and tech stack (Swift / SwiftUI / macOS).
> I recommend browsing the contents and **cherry-picking** what fits your needs — copy individual files rather than installing the whole package via `pi install`.

## Table of Contents

- [Extensions](#extensions)
- [Skills](#skills)
- [Prompt Templates](#prompt-templates)
- [Shared Prompts](#shared-prompts)
- [AGENTS.md](#agentsmd)
- [Usage](#usage)

## Extensions

Reusable pi extensions that add tools, commands, and event hooks to the agent.

| Name | Description |
|------|-------------|
| [ask-me](https://github.com/ohlulu/oh-pi/blob/main/extensions/ask-me.ts) | Interactive single-choice tool — lets the LLM ask the user a question with selectable options. |
| [ask-me-batch](https://github.com/ohlulu/oh-pi/blob/main/extensions/ask-me-batch.ts) | Batch version of ask-me — multiple questions in one pass. |
| [context](https://github.com/ohlulu/oh-pi/blob/main/extensions/context.ts) | `/context` command — displays context window usage, loaded extensions, skills, and session cost. |
| [done-sound](https://github.com/ohlulu/oh-pi/blob/main/extensions/done-sound.ts) | Plays a system sound when the agent finishes (macOS). |
| [inject-docs](https://github.com/ohlulu/oh-pi/blob/main/extensions/inject-docs.ts) | Auto-injects the project `docs/` index into the first agent turn on session start. |
| [lazygit](https://github.com/ohlulu/oh-pi/blob/main/extensions/lazygit.ts) | `/lazygit` command — launches lazygit inside the TUI. |
| [notify](https://github.com/ohlulu/oh-pi/blob/main/extensions/notify.ts) | Sends a native macOS desktop notification when the agent finishes. |
| [open-with](https://github.com/ohlulu/oh-pi/blob/main/extensions/open-with.ts) | `/finder` and `/cursor` commands — open cwd in Finder or Cursor editor. |
| [ralph-wiggum](https://github.com/ohlulu/oh-pi/tree/main/extensions/ralph-wiggum) | Long-running iterative dev loops with plan → execute → verify cycles, pacing, and checkpoints. |
| [review](https://github.com/ohlulu/oh-pi/tree/main/extensions/review) | `/review` command — interactive code review based on git diff / PR. |
| [tab-status](https://github.com/ohlulu/oh-pi/blob/main/extensions/tab-status.ts) | Updates terminal tab title with agent status (☘️ idle · 🔄 working · 🛑 error). |
| [todo](https://github.com/ohlulu/oh-pi/tree/main/extensions/todo) | File-based todo management tool — the agent can create, update, and query todos. |
| [worktree](https://github.com/ohlulu/oh-pi/tree/main/extensions/worktree) | `/wt` command — git worktree management. |
| [yazi](https://github.com/ohlulu/oh-pi/blob/main/extensions/yazi.ts) | `/yazi` command — launches yazi file manager inside the TUI. |

## Skills

On-demand capability packages loaded by the agent when a task matches.

| Name | Description |
|------|-------------|
| [bdd](https://github.com/ohlulu/oh-pi/tree/main/skills/bdd) | Write and review BDD specifications using Gherkin. |
| [clean-architecture](https://github.com/ohlulu/oh-pi/tree/main/skills/clean-architecture) | Clean Architecture mindset — dependency direction, layer boundaries, abstraction decisions. |
| [commit](https://github.com/ohlulu/oh-pi/tree/main/skills/commit) | Structured Conventional Commits workflow — analyze changes, craft message, commit. |
| [dev-principles](https://github.com/ohlulu/oh-pi/tree/main/skills/dev-principles) | Language-agnostic development principles and design guidelines. |
| [ralph-wiggum](https://github.com/ohlulu/oh-pi/tree/main/skills/ralph-wiggum) | Skill companion for the ralph-wiggum extension — iterative loop pacing. |
| [swift-coding-style](https://github.com/ohlulu/oh-pi/tree/main/skills/swift-coding-style) | Swift coding conventions — opaque vs existential types, naming, structure. |
| [swift-concurrency](https://github.com/ohlulu/oh-pi/tree/main/skills/swift-concurrency) | Swift Concurrency best practices — async/await, actors, Sendable, migration to Swift 6. |
| [swiftui-expert-skill](https://github.com/ohlulu/oh-pi/tree/main/skills/swiftui-expert-skill) | SwiftUI best practices — state management, view composition, performance, modern APIs. |
| [swiftui-liquid-glass](https://github.com/ohlulu/oh-pi/tree/main/skills/swiftui-liquid-glass) | iOS 26+ Liquid Glass — `.glassEffect`, glass buttons, morphing transitions. |
| [swiftui-performance-audit](https://github.com/ohlulu/oh-pi/tree/main/skills/swiftui-performance-audit) | Audit SwiftUI runtime performance — slow rendering, excessive updates, layout thrash. |
| [update-changelog](https://github.com/ohlulu/oh-pi/tree/main/skills/update-changelog) | Update CHANGELOG.md with user-facing changes since the last release. |

### Third-Party Skills (pi-skills)

The [`skills/pi-skills/`](https://github.com/ohlulu/oh-pi/tree/main/skills/pi-skills) directory contains skills from [badlogic/pi-skills](https://github.com/badlogic/pi-skills) — including brave-search, browser-tools, Google CLI tools, transcription, and more. See the original repo for documentation and updates.

## Prompt Templates

Slash-command prompt templates — type `/name` in the editor to expand.

| Command | Description |
|---------|-------------|
| [/dig](https://github.com/ohlulu/oh-pi/blob/main/prompts/dig.md) | Deep-dive into a topic — research and explain in a teaching style. |
| [/handoff](https://github.com/ohlulu/oh-pi/blob/main/prompts/handoff.md) | Package current state into a handoff report for the next agent. |
| [/mcp](https://github.com/ohlulu/oh-pi/blob/main/prompts/mcp.md) | Quick flow: merge → close branch → push. |
| [/pickup](https://github.com/ohlulu/oh-pi/blob/main/prompts/pickup.md) | Rehydrate context when starting or resuming work. |
| [/spec-workshop](https://github.com/ohlulu/oh-pi/blob/main/prompts/spec-workshop.md) | Requirements spec workshop — structured discussion before implementation (Chinese). |
| [/tech-stack-decision](https://github.com/ohlulu/oh-pi/blob/main/prompts/tech-stack-decision.md) | Tech stack decision workshop — architecture, packages, toolchain evaluation (Chinese). |

## Shared Prompts

Reusable prompt fragments referenced by extensions or other prompts.

| Name | Description |
|------|-------------|
| [review-rubric](https://github.com/ohlulu/oh-pi/blob/main/shared/prompts/review-rubric.md) | Code review scoring guidelines — what to flag, severity levels, and review structure. |

## AGENTS.md

[`AGENTS.md`](https://github.com/ohlulu/oh-pi/blob/main/AGENTS.md) contains my global agent instructions — workflow rules, tool usage, coding conventions, and guardrails.

> **Note:** `AGENTS.md` is **not** auto-loaded by pi packages. To use it, manually copy it to your global or project config:
>
> ```bash
> # Global
> cp AGENTS.md ~/.pi/agent/AGENTS.md
>
> # Project
> cp AGENTS.md .pi/agent/AGENTS.md
> ```

## Usage

**Recommended: cherry-pick what you need.**

```bash
# Copy a single extension
cp oh-pi/extensions/done-sound.ts ~/.pi/agent/extensions/

# Copy a skill
cp -r oh-pi/skills/swift-concurrency ~/.pi/agent/skills/

# Copy a prompt template
cp oh-pi/prompts/handoff.md ~/.pi/agent/prompts/
```

If you still want to install as a package (not recommended for personal configs):

```bash
pi install /path/to/oh-pi
```

## Acknowledgments

Inspiration and reference from these projects:

- [steipete/agent-scripts](https://github.com/steipete/agent-scripts)
- [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff)
- [ClaytonFarr/ralph-playbook](https://github.com/ClaytonFarr/ralph-playbook)
- [Th0rgal/open-ralph-wiggum](https://github.com/Th0rgal/open-ralph-wiggum)
- [michaelshimeles/ralphy](https://github.com/michaelshimeles/ralphy)
- [tmustier/pi-extensions](https://github.com/tmustier/pi-extensions)
- [arosstale/pi-pai](https://github.com/arosstale/pi-pai)
- [SwiftLee - AvdLee](https://github.com/AvdLee)