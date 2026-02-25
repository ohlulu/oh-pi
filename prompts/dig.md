---
description: Deeply research a topic/tool/file and teach it clearly, including mode mapping and practical usage contracts.
---
Research and teach: $@

Before deep dive:
- Identify target type(s): extension / skill / prompt template / command / tool / SDK API.
- List assumptions and unknowns first.
- If behavior may differ by mode, track modes explicitly: command, conversational, and API/RPC.

Workflow:
1. **Deep Dive** — Read relevant source code, docs, and git history (if needed) to build full context. Do not stay at surface level; trace implementation details and design intent.
2. **System Map** — Summarize architecture boundaries: where config comes from, where execution happens, what is persisted, and what is returned.
3. **Explain** — Teach with this structure:
   - **What it is** — One-sentence plain-language definition.
   - **Why it exists** — What problem it solves; what happens without it.
   - **How it works** — Use an ASCII flowchart or step-by-step breakdown.
   - **When to use it** — Concrete scenarios and trigger conditions.
   - **Practical example** — In my environment, what to run and how to use it.
4. **Interaction Modes (mandatory when applicable)**
   - **Command mode** — Exact command syntax, who executes, what context/session it uses.
   - **Conversational mode** — Natural-language trigger behavior and limits.
   - **Mode mapping** — Conversational behavior maps to which command/tool path?
   - **Determinism** — What is guaranteed vs best-effort?
   - **Execution semantics** — Sync vs async, foreground vs background, blocking behavior.
5. **Usage Contract**
   - Provide invocation grammar.
   - Explain each parameter: required/optional, default, valid values, precedence, and side effects.
   - Include at least one minimal example and one advanced example.
6. **Compare** (if similar concepts exist) — Use a table to highlight key differences.
7. **Converge** — Give a clear conclusion + what I should do next (or what I can skip).

Format requirements:
- Output must be in Taiwanese Traditional Chinese (繁體中文，台灣用語).
- Start with a short TL;DR (3-5 bullets), then deep dive.
- Use tables, flowcharts, and code blocks where helpful.
- For commands/tools, prefer a table: Syntax / Required params / Optional params / Defaults / Common mistakes.
- Clearly label statements as **Guaranteed**, **Best-effort**, or **Config-dependent**.
- If uncertain, say what is unconfirmed and how to verify.
- Avoid dumping too much text at once; structure in paced sections.
- Use plain language; avoid official-doc translation tone.
- After output, also write a clean markdown copy to `~/Downloads/<topic>-guide.md`.
