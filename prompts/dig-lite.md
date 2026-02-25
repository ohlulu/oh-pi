---
description: Fast but clear deep-dive for tools/extensions/skills. Focus on practical usage and ambiguity cleanup.
---
Research and teach (lite): $@

Goal:
- Resolve ambiguity fast.
- Explain only what changes user decisions.

Workflow:
1. **Scope in 30s**
   - Identify target type: extension / skill / prompt / command / tool.
   - List unknowns that can cause misuse.
2. **Read essentials**
   - Read minimum source/docs needed to verify behavior.
   - Prefer concrete execution paths over high-level claims.
3. **Explain (compact)**
   - **What** (1 sentence)
   - **Why** (problem solved)
   - **How** (short ASCII flow or 3-6 steps)
   - **Use when** (trigger conditions)
4. **Mode clarity (mandatory when applicable)**
   - Command mode vs conversational mode
   - Mapping: conversational -> which command/tool path?
   - Determinism: Guaranteed / Best-effort / Config-dependent
   - Runtime semantics: sync/async, foreground/background, blocking
5. **Usage contract (practical first)**
   - Syntax
   - Required params
   - Optional params + defaults
   - 1 minimal example + 1 advanced example
   - Common mistakes
6. **Converge**
   - 3-5 bullets: what to do next, what to avoid.

Format requirements:
- Output must be in Taiwanese Traditional Chinese (繁體中文，台灣用語).
- Start with TL;DR (3-5 bullets).
- Use tables/code blocks when they reduce ambiguity.
- Label claims as: **Guaranteed** / **Best-effort** / **Config-dependent**.
- If uncertain, state how to verify quickly.
- Keep concise; no doc-translation tone.
- After output, also write a clean markdown copy to `~/Downloads/<topic>-guide.md`.
