---
name: doc-system
description: >-
  Product documentation system design and maintenance principles.
  Use when: creating any new file under docs/ (specs, drafts, milestones, or any doc),
  setting up docs for a new project, restructuring existing docs,
  maintaining docs (adding specs / milestones / mockup screens), reviewing doc architecture quality.
  Trigger words: "文件", "doc", "docs", "doc system", "documentation", "set up docs", "organize docs", "doc architecture", "spec management", "milestone management", "mockup index".
---

# Product Documentation System — Design & Maintenance Guide

A documentation framework built on **on-demand loading + single source of truth + open-closed principle**.
This is a thinking model, not a folder template. Structure adapts to project scale; principles don't.

## Core Principles

### 1. On-Demand Loading (Lazy Loading)
Readers (human or AI) should never load the entire doc library just to find one rule.
Design goal: **three hops max** to reach target content.

- Hop 1: INDEX.md (routing table) → which file to open
- Hop 2: That file's frontmatter / table of contents → locate the section
- Hop 3: Actual content

If a file is frequently read for just one small section, that's a signal to split.

### 2. Single Source of Truth
Every rule and definition lives in exactly one place. Everything else links to it.

- Specs are the sole source of truth for rules
- Milestones reference specs — never duplicate rule content
- Mockup README references specs — never describes behavior

Violation test: if changing one rule requires editing two files' body text, the architecture is broken.

### 3. Open-Closed
Adding a feature = add a new file + one line in the index. No structural changes to existing files.

- New spec → add file to `specs/` + one row in `INDEX.md`
- New milestone → add file to `milestones/vX.X/` + one row in `_index.md`
- New mockup screen → add frame in HTML + one row in README

### 4. Separation of Concerns
- **Spec** (what to do): product rules, behavior definitions, data schemas
- **Milestone** (when to do it, progress): version planning, checklists, status tracking
- **Mockup** (what it looks like): visual layout, component styles
- **Platform tech docs** (how to do it): architecture, tech stack, audits — live in each platform repo

### 5. Version Ownership
Specs carry no version numbers. A spec is "current truth" — always reflects the latest state.
"Which version introduced this feature?" → check the milestone file (inherently versioned by its folder path).
"What changed in this release?" → check the milestone file or `git log`.
Historical versions → git tags.

### 6. Lean Doc Style (Required)
Keep docs fast to scan and low-token.

- No emoji in docs
- No ASCII wireframe/mockup diagrams in specs
- Use short sections + bullets/tables
- Keep visuals in `mockup/`; specs describe behavior only

---

## Directory Structure

```
{project}-doc/                        ← Product doc repo (cross-platform, shared)
│
├── INDEX.md                          ← Central routing table (single entry point)
├── AGENTS.md                         ← AI agent rules
│
├── specs/                            ← Product specifications (current truth)
│   ├── {topic-a}.md
│   ├── {topic-b}.md
│   └── ...
│
├── milestones/                       ← Version planning & progress tracking
│   ├── _index.md                     ← All-version overview + cross-platform progress
│   ├── v1.0/
│   │   ├── _index.md                 ← Version milestone overview (frozen when done)
│   │   ├── {feature-a}.md
│   │   └── ...
│   ├── v1.1/
│   │   ├── _index.md
│   │   └── ...
│   └── ...
│
├── drafts/                           ← Undecided / exploratory requirements
│   └── {idea-name}.md
│
└── mockup/                           ← Visual wireframes
    ├── README.md                     ← Screen Index (line number lookup + spec links)
    └── (mockup files)
```

```
{project}-{platform}/docs/           ← Platform tech docs (no product specs here)
├── tech-stack.md
├── architecture/
│   └── ...
└── (audit reports, remediation plans, etc.)
```

**Single-platform projects**: no need for a separate `{project}-doc/` repo. Place the same structure directly under `docs/` in the project repo.

---

## INDEX.md Design

INDEX.md is the entry point for the entire doc system. It contains no business content — routing only.

### Required Sections

```markdown
# {Project} — Documentation Index

## Start Here
Suggested reading order (3 files max) to get up to speed.

## Specs
Table: File | Summary | When to Read
One row per spec — one-line summary + when to read it.

## Milestones
Link to milestones/_index.md.

## Drafts (Undecided)
List drafts, or state "none currently".

## References
Links to Mockup and other supporting resources.
```

### Frontmatter (Required)

INDEX.md itself also requires frontmatter, same as specs:

```yaml
---
summary: Central routing table for all project documentation
read_when:
  - First time entering the project
  - Looking for a specific doc
---
```

### Guidelines
- Keep it extremely concise — fits on one screen
- Only links and summaries — no rule content
- Update whenever a spec or milestone is added

---

## Spec File Standards

### Frontmatter (Required)

```yaml
---
summary: One-line summary (reader / AI uses this to decide whether to open)
read_when:
  - Scenario 1
  - Scenario 2
---
```

**Language rule**: `summary` and `read_when` are always written in English (used for AI routing). Body content follows the project's primary language.

### Presentation Rules (Required)
- Plain text structure only (no emoji, no ASCII layout diagrams)
- Keep sections compact; prefer bullets/tables over long prose
- Link to mockup files for visuals; do not embed text-art

### In-Text Reference Rules
- Reference other specs: `[business-rules §2a](./business-rules.md#2a-field-extraction)`
- Reference mockup: `[mockup A1](../mockup/README.md#a1)`
- **Anchor-level linking**: always link to specific sections, not just files

### Related Section (Bottom of File)
List related files + one-line explanation of the relationship:

```markdown
## Related
- [db-schema.md](./db-schema.md) ← Sync when Friend fields change
- [user-flow.md](./user-flow.md#flow-2a) ← Friend CRUD operation flow
```

### When to Split
- File exceeds 300-400 lines → consider splitting into sub-sections
- Frequently read for just one section → split
- Method: create subfolder + `_index.md` as table of contents

```
specs/
  business-rules/
    _index.md            ← Section directory
    required-fields.md
    field-extraction.md
    cooldown.md
    ...
```

---

## Milestone Standards

### milestones/_index.md — All-Version Overview

```markdown
# Milestones Overview

## v1.0 — Released
One-line description.
→ [Detail](./v1.0/_index.md)

## v1.1 — In Progress
| Feature | Spec | iOS | Android |
|---------|------|-----|---------|
| Feature A | [§X](../specs/xxx.md#x) | Done | In Progress |

→ [Detail](./v1.1/_index.md)
```

For cross-platform projects, track per-platform progress in the table columns.

### Version Subfolder _index.md

That version's milestone overview. Mark as Released and freeze when complete.

### Milestone Files

```markdown
# Feature Name

**Version**: v1.1
**Status**: In Progress
**Spec**: [business-rules §13](../../specs/business-rules.md#13)
**Mockup**: [C1 Record List](../../mockup/README.md#c1)

## Scope
What to build (reference specs — never duplicate rule content)

## Checklist
- [ ] task A
- [ ] task B

## Completion Criteria
Definition of done
```

### Naming Conventions
- v1.0 waterfall phase: sequential IDs are fine (m0-foundation, m1-shell...)
- Later versions: use feature names (csv-export, friend-groups...), not sequential IDs

---

## Mockup Management

Mockups are large files — loading them whole wastes context. Use a Screen Index in `mockup/README.md` for on-demand loading.

→ [Screen Index design & README structure](./references/mockup/screen-index.md)
→ [Line number maintenance script](./references/mockup/update-script.md)

---

## Drafts Management

Undecided requirements go in `drafts/`. Move to `specs/` and create a milestone when finalized.

- One file per idea
- List in INDEX.md Drafts section, clearly marked "undecided"
- Finalized = move to specs/ + remove from Drafts section + add to Specs table

---

## Maintenance Checklist

| Event | Action |
|-------|--------|
| New feature finalized | `drafts/` → `specs/` + add milestone file + update `INDEX.md` |
| Spec modified | Edit spec → check Related section files |
| Mockup modified | Edit spec first → edit mockup → run script to update README line numbers |
| Version released | Set `milestones/vX.X/_index.md` status to Released, freeze |
| New version planned | Create `milestones/vX.X/` + `_index.md` + add section to milestone overview |

---

## Red Flags (Architecture Smell)

- Changing one rule requires editing two files' body text → single source of truth violated
- Milestone describes business logic in detail instead of referencing specs → will drift
- AI needs to load entire doc library to start working → INDEX or splitting is insufficient
- Spec contains version numbers → turns into a mini changelog, readability collapses
- Mockup updated but spec not synced (or vice versa) → process issue
- INDEX.md exceeds one screen → too fat, needs pruning
- A spec exceeds 400 lines with no sub-splitting → consider breaking into sections

## When NOT to Use This System

- Projects with fewer than 5 doc files → a single README is enough
- Pure technical docs (API docs, SDK reference) → use a doc generator, not handwritten markdown
- Short-lived prototypes → not worth the doc architecture investment
