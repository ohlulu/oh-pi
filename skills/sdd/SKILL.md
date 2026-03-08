---
name: sdd
description: >-
  Spec-Driven Development: structured feature planning through Requirements, Plan, Tasks, and Verification.
  Use when planning a new feature, breaking down complex changes, writing requirements or plan docs,
  creating task breakdowns, or verifying implementation against specs.
  NOT for: trivial fixes, single-file edits, or exploratory prototypes where the end state is unknown.
  Trigger words: "spec", "plan a feature", "requirements", "plan doc", "task breakdown",
  "SDD", "spec-driven", "verify against spec", "write a spec",
  "規格", "規劃功能", "需求", "寫規格", "拆任務", "技術方案", "驗證規格",
  "功能規劃", "寫 spec", "spec 驅動", "寫需求", "任務拆解".
---

# Spec-Driven Development (SDD)

Plan before you code. Declare intent, then validate implementation.

Spec is the source of truth. Code is derived from spec, not the other way around.

## When to Use

- Planning a new feature or significant change
- Breaking down a complex requirement into actionable work
- Creating or reviewing requirements, plan, or task documents
- Verifying that implementation matches the declared spec
- Turning vague ideas into structured, reviewable plans

## When Not to Use

- Trivial bug fixes or single-file edits (just do it)
- Highly uncertain domains where you need to spike/prototype first (explore, then spec)
- Pure refactoring with no behavior change (no spec needed)
- Existing spec documents that just need doc-system organization (use doc-system skill)

## Core Principles

### 1. Spec-as-Source

The specification is the authoritative definition of what the system should do.
Code implements the spec. Tests verify the spec. Docs describe the spec.
If code and spec disagree, the spec wins (or the spec needs updating).

### 2. Intent Before Mechanism

Declare WHAT the system should do before deciding HOW.
Requirements capture user-visible behavior; plan captures technical approach.
Never jump to implementation without a clear spec.

### 3. Iterative Approval Gates

Each phase requires explicit user approval before proceeding.
Draft → Review → Revise → Approve → Next Phase.
Never skip ahead. Changing direction is cheap at the spec level, expensive at the code level.

### 4. Living Documents

Specs are not write-once artifacts. They evolve with the project.
When implementation reveals new requirements, update the spec first, then the code.

### 5. Lean and Scannable

Specs are thinking tools, not novels. Keep them short, structured, and skimmable.
Bullets and tables over prose. Domain language over jargon.

## Workflow

```
 Requirements (WHAT)          What the system should do
       │                      User stories + acceptance scenarios
       ▼ ── approval gate ──
     Plan (HOW)               How to build it
       │                      Architecture decisions + interfaces
       ▼ ── approval gate ──
    Tasks (DO)                 What to implement
       │                      Phased checklist + dependencies
       ▼ ── approval gate ──
  Verification (CHECK)        Does the code match the spec?
                              Spec compliance review
```

Each phase produces one document. User approves before advancing.

## Phase Details

### Phase 1: Requirements

Captures WHAT the system should do from the user's perspective.

Produce: `requirements.md`

Presentation: 產出文件以英文為主。但在 approval gate 向 user 說明時，用中文白話文完整描述每個需求背景、使用情境、驗收條件，讓 user 不需要自己翻文件就能理解全貌並做決定。

Content:
- Feature summary (one paragraph)
- User stories (As a / I want / So that)
- Acceptance criteria using Given/When/Then scenarios
- Non-functional requirements (performance, security, accessibility)
- Requirement strength using RFC 2119 keywords (MUST/SHALL/SHOULD/MAY)

Detailed format and rules: [references/requirements-guide.md](references/requirements-guide.md)

### Phase 2: Plan

Captures HOW the system will be built.

Produce: `plan.md`

Presentation: 產出文件以英文為主。但在 approval gate 向 user 說明時，用中文白話文完整描述技術方案、架構決策理由、資料流向，讓 user 不需要自己翻文件就能理解全貌並做決定。

Content:
- Technical approach (one paragraph)
- Architecture decisions (ADR-style: Choice / Alternatives / Rationale)
- Data flow and component interactions
- Interfaces and contracts (types, API shapes)
- File changes table (what files to create/modify/delete)
- Testing strategy

Detailed format and rules: [references/plan-guide.md](references/plan-guide.md)

### Phase 3: Tasks

Breaks down into actionable implementation steps.

Produce: `tasks.md`

Content:
- Phased checklist with hierarchical numbering
- Each task references requirements it satisfies
- Dependency-ordered (Phase 1 tasks don't depend on Phase 2)
- Each task completable in one session

Detailed format and rules: [references/tasks-guide.md](references/tasks-guide.md)

### Phase 4: Verification

Reviews whether implementation matches the spec. This is a review activity, not a coding phase.

Produce: verification section in existing docs or standalone review.

Content:
- Spec compliance matrix (each scenario → implementation evidence)
- Plan decision adherence check
- Task completion status
- Issues found (CRITICAL / WARNING / SUGGESTION)

Detailed format and rules: [references/verification-guide.md](references/verification-guide.md)

## Output Structure

SDD artifacts live alongside project docs:

```
docs/specs/{feature-name}/
├── requirements.md
├── plan.md
└── tasks.md
```

If the project uses doc-system, this integrates naturally under `docs/specs/`.
When the feature ships, requirements content can feed into the main product spec.

For projects without a `docs/` structure, adapt the location to project conventions.

## Relationship with doc-system

| Concern | doc-system | SDD |
|---------|-----------|-----|
| Purpose | Organize and route documentation | Plan and validate a feature change |
| Spec meaning | Long-lived product truth | Development-time planning artifact |
| Lifecycle | Permanent, evolves with product | Temporary per-change, archivable |
| Directory | `docs/specs/` (flat, one file per topic) | `docs/specs/{feature-name}/` (trio per feature) |

SDD produces artifacts. doc-system organizes them.
When a feature ships, the requirements may merge into a product-level spec file.

### Handoff to doc-system

SDD is responsible for producing specs. Integrating them into the doc system is a required handoff step — not optional, not "someone else's job."

**After Phase 3 (Tasks approved):**
1. Add the new spec to `INDEX.md` Specs table (one row)
2. Add/update the milestone `_index.md` entry — link directly to the spec, do NOT create a separate milestone file (the SDD tasks.md already serves as the checklist)

**After Phase 4 (Verification / feature ships):**
1. Update milestone `_index.md` status to Done
2. Update milestone overview (`milestones/_index.md`) if it has a summary table

**Rule: no separate milestone file when SDD spec exists.** The milestone `_index.md` row links to the spec. The spec's `tasks.md` is the single checklist. A separate milestone file with its own checklist violates single source of truth.

## Spec Evolution

Spec is current truth. No version numbers in spec files.
History lives in git. "What changed?" → `git log` or `git diff`.

### Deciding the Approach

```
Is there an existing spec for this feature?
├── No  → Create new spec (greenfield): full Requirements → Plan → Tasks
└── Yes → How big is the change?
    ├── Small (tweak a few scenarios)  → Edit in-place
    └── Large (add/remove whole requirements) → Delta workflow
```

### Small Change: Edit In-Place

Modify the existing `requirements.md` directly.
Update `plan.md` and `tasks.md` to match.
Git diff is your change record.

```
1. Edit requirements.md (add/modify/remove scenarios)
2. Update plan.md if architecture is affected
3. Update tasks.md with new/changed tasks
4. Implement → Verify
```

### Large Change: Delta Workflow

Write a delta section describing ADDED / MODIFIED / REMOVED requirements.
This makes the change scope explicit and reviewable before touching any code.

```markdown
## ADDED Requirements
### Requirement: CSV Export
The system SHALL support exporting data to CSV format.

## MODIFIED Requirements
### Requirement: Data Export
The system SHALL support multiple export formats.
(Previously: The system SHALL support JSON export only.)

## REMOVED Requirements
### Requirement: Legacy XML Export
(Reason: No active consumers; deprecated since v2.1)
```

Delta workflow steps:

```
1. Write delta sections in requirements.md (or a temporary delta.md)
2. Review delta with stakeholders → approval gate
3. Update plan.md for the changed requirements
4. Update tasks.md with implementation steps
5. Implement → Verify
6. Merge delta into requirements.md (remove ADDED/MODIFIED/REMOVED markers)
   → Spec returns to "current truth" state
```

After merge, the spec reads as if it was always this way.
The delta markers are a workflow tool, not permanent structure.

### What NOT to Do

- Don't create `dark-mode-v2/` alongside `dark-mode/` → truth splits, drift guaranteed
- Don't keep delta markers permanently → spec becomes unreadable changelog
- Don't skip the delta for large changes → you lose reviewability of scope

## Quality Gates

Before advancing to the next phase, check:

**Requirements:**
- [ ] Every requirement has at least one Given/When/Then scenario
- [ ] Scenarios are declarative (behavior, not UI mechanics)
- [ ] No implementation details leaked into requirements
- [ ] RFC 2119 keywords used consistently
- [ ] Edge cases and error states considered

**Plan:**
- [ ] Every architecture decision has a rationale
- [ ] Plan addresses all requirements
- [ ] File paths are concrete, not abstract
- [ ] Existing codebase patterns followed (or deviation justified)

**Tasks:**
- [ ] Every task references the requirement(s) it satisfies
- [ ] Tasks are specific, actionable, and verifiable
- [ ] Dependency order is correct
- [ ] No task is too vague ("implement feature") or too large

**Verification:**
- [ ] Every scenario has implementation evidence
- [ ] Plan decisions were followed (or deviations documented)
- [ ] All tasks marked complete

## Anti-Patterns

| Anti-Pattern | Symptom | Fix |
|---|---|---|
| Spec-after-code | Spec written to match existing code | Write spec first, always |
| Spec-as-novel | 2000-word requirements nobody reads | Keep lean; bullets > prose |
| Phantom requirements | Requirements with no scenarios | Every req needs Given/When/Then |
| Plan-free tasks | Tasks created without plan phase | Always plan before tasking |
| Vibe tasking | "Implement the feature" as a task | Break into file-level actions |
| Spec drift | Code diverges from spec silently | Run verification after implementation |
| Over-specification | Specifying internal implementation details | Spec describes behavior, not internals |

## References

- Requirements format and rules: [references/requirements-guide.md](references/requirements-guide.md)
- Plan format and rules: [references/plan-guide.md](references/plan-guide.md)
- Task breakdown rules: [references/tasks-guide.md](references/tasks-guide.md)
- Verification process: [references/verification-guide.md](references/verification-guide.md)
