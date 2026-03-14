---
name: postmortem
description: >-
  Blameless postmortem for coding mistakes, incidents, and bad decisions.
  Creates a structured review in docs/postmortem/ with root cause analysis,
  timeline, and actionable lessons. Use when: a bug was caused by a preventable
  mistake, a wrong approach wasted significant time, an incident occurred in
  production, or the user explicitly asks to do a postmortem / retro / review
  a mistake. Trigger words: "postmortem", "retro", "what went wrong",
  "review this mistake", "lesson learned", "檢討", "覆盤", "事後分析".
---

# Postmortem

Blameless, structured review of what went wrong, why, and how to prevent recurrence.
Produces a permanent record in `docs/postmortem/` for future reference.

## Core Philosophy

- **Blameless**: focus on systems, processes, and knowledge gaps — not personal fault.
- **Root-cause obsessed**: surface fixes are not lessons. Dig until you hit the systemic cause.
- **Action-oriented**: every postmortem must produce at least one concrete, verifiable action item.
- **Brief**: a postmortem nobody reads teaches nothing. Keep it scannable.

## When to Use

- A bug shipped because of a preventable mistake.
- Significant time wasted on a wrong approach or misunderstanding.
- Production incident (outage, data loss, security issue).
- A pattern of repeated mistakes that needs formal documentation.
- User explicitly asks for a postmortem / retro / 檢討 / 覆盤.

## When Not to Use

- Normal debugging (use root-cause analysis inline).
- Minor typos or trivial fixes with no systemic lesson.
- Planning future work (use SDD skill instead).

## Workflow

### 1. Gather context

Before writing, collect the facts:

```bash
# Recent commits that show the mistake and fix
git log --oneline -20

# The diff that introduced the issue (if identifiable)
git diff <bad-commit>^ <bad-commit>

# The diff that fixed it
git diff <fix-commit>^ <fix-commit>
```

Also review:
- Error logs, test failures, or CI output
- Chat/thread context about the incident
- Any related docs or specs that were misunderstood

### 2. Conduct 5-Whys analysis

Ask "why?" repeatedly until you reach a systemic root cause.

```
Why did the bug ship?     → Tests didn't cover this path.
Why no test coverage?     → The edge case wasn't in the spec.
Why not in the spec?      → We didn't consider timezone differences.
Why not considered?       → No checklist for time-sensitive features.
Why no checklist?         → We haven't documented date/time pitfalls.
                          → ROOT CAUSE: missing domain knowledge documentation.
```

Stop when you reach something **actionable and systemic** (a process, tool, or knowledge gap — not a person's oversight).

### 3. Ask the user to confirm findings and placement

Use `ask_me` to present:
- Your understanding of what happened
- The root cause you identified
- Proposed action items

Then use `ask_me` to confirm **where to place** the postmortem:

| Option | Location | When to use |
|--------|----------|-------------|
| **Project** | `docs/postmortem/` (project root) | Lesson is specific to this codebase / stack |
| **Global** | `~/.pi/agent/docs/postmortem/` | Lesson applies across projects (tooling, workflow, general dev practice) |

Suggest one based on the root cause, but always let the user decide.

### 4. Create the postmortem file

**Location**: the directory chosen in Step 3.

**Filename**: `YYYY-MM-DD-<slug>.md` (date of the incident or discovery).

```bash
# project-level
mkdir -p docs/postmortem

# or global
mkdir -p ~/.pi/agent/docs/postmortem
```

Follow the structure in → [references/template.md](references/template.md)

### 5. Review existing postmortems for patterns

Check **both** locations for recurring root causes:

```bash
ls docs/postmortem/ 2>/dev/null
ls ~/.pi/agent/docs/postmortem/ 2>/dev/null
```

If similar root causes appear across multiple postmortems (project or global), flag the pattern to the user. Recurring root causes signal a deeper systemic issue.

### 6. Commit the postmortem

Use the `commit` skill. Commit in the repo where the file lives:

- **Project**: commit in project repo → `docs(postmortem): <slug> — <one-line summary>`
- **Global**: commit in `~/.pi/agent` repo (if tracked) → `docs(postmortem): <slug> — <one-line summary>`

## File Standards

### Front Matter (Required)

```yaml
---
summary: One-line description of what went wrong and the key lesson
incident_date: YYYY-MM-DD
tags:
  - <category>  # e.g., concurrency, api-design, testing, config, dependency
root_cause: One-line root cause summary
status: resolved | monitoring | open
---
```

| Field | Purpose |
|-------|---------|
| `summary` | Quick scan line — what happened + key takeaway |
| `incident_date` | When the mistake was made or discovered |
| `tags` | Categories for pattern detection across postmortems |
| `root_cause` | One-line systemic cause (not symptom) |
| `status` | Whether all action items are complete |

## Rules (Must Follow)

- Always blameless — describe what happened to the system, not who messed up.
- Must include at least one concrete action item with a clear "done" condition.
- Root cause must be systemic (process/tool/knowledge gap), not "I made a mistake."
- Keep the document under 250 lines — aim for concise; every line should earn its place.
- Tags must be consistent across postmortems (check existing ones for vocabulary).
- Never skip the 5-Whys — shallow postmortems are worse than none.

## References

- [File template](references/template.md)
