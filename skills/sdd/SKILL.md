---
name: sdd
description: >-
  Spec-Driven Development: structured feature planning through Requirements, Design, Tasks, and Verification.
  Use when planning a new feature, breaking down complex changes, writing requirements or design docs,
  creating task breakdowns, or verifying implementation against specs.
  NOT for: trivial fixes, single-file edits, or exploratory prototypes where the end state is unknown.
  Trigger words: "spec", "plan a feature", "requirements", "design doc", "task breakdown",
  "SDD", "spec-driven", "verify against spec", "write a spec".
---

# Spec-Driven Development (SDD)

Plan before you code. Declare intent, then validate implementation.

Spec is the source of truth. Code is derived from spec, not the other way around.

## When to Use

- Planning a new feature or significant change
- Breaking down a complex requirement into actionable work
- Creating or reviewing requirements, design, or task documents
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
Requirements capture user-visible behavior; design captures technical approach.
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
   Design (HOW)               How to build it
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

Content:
- Feature summary (one paragraph)
- User stories (As a / I want / So that)
- Acceptance criteria using Given/When/Then scenarios
- Non-functional requirements (performance, security, accessibility)
- Requirement strength using RFC 2119 keywords (MUST/SHALL/SHOULD/MAY)

Detailed format and rules: [references/requirements-guide.md](references/requirements-guide.md)

### Phase 2: Design

Captures HOW the system will be built.

Produce: `design.md`

Content:
- Technical approach (one paragraph)
- Architecture decisions (ADR-style: Choice / Alternatives / Rationale)
- Data flow and component interactions
- Interfaces and contracts (types, API shapes)
- File changes table (what files to create/modify/delete)
- Testing strategy

Detailed format and rules: [references/design-guide.md](references/design-guide.md)

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
- Design decision adherence check
- Task completion status
- Issues found (CRITICAL / WARNING / SUGGESTION)

Detailed format and rules: [references/verification-guide.md](references/verification-guide.md)

## Output Structure

SDD artifacts live alongside project docs:

```
docs/specs/{feature-name}/
├── requirements.md
├── design.md
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
SDD does not manage INDEX.md, milestones, or mockups — that's doc-system's job.

## Delta Specs (For Changes to Existing Behavior)

When modifying existing behavior (not greenfield), requirements should describe
what's changing using delta sections:

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

This makes changes reviewable and prevents accidental scope creep.

## Quality Gates

Before advancing to the next phase, check:

**Requirements:**
- [ ] Every requirement has at least one Given/When/Then scenario
- [ ] Scenarios are declarative (behavior, not UI mechanics)
- [ ] No implementation details leaked into requirements
- [ ] RFC 2119 keywords used consistently
- [ ] Edge cases and error states considered

**Design:**
- [ ] Every architecture decision has a rationale
- [ ] Design addresses all requirements
- [ ] File paths are concrete, not abstract
- [ ] Existing codebase patterns followed (or deviation justified)

**Tasks:**
- [ ] Every task references the requirement(s) it satisfies
- [ ] Tasks are specific, actionable, and verifiable
- [ ] Dependency order is correct
- [ ] No task is too vague ("implement feature") or too large

**Verification:**
- [ ] Every scenario has implementation evidence
- [ ] Design decisions were followed (or deviations documented)
- [ ] All tasks marked complete

## Anti-Patterns

| Anti-Pattern | Symptom | Fix |
|---|---|---|
| Spec-after-code | Spec written to match existing code | Write spec first, always |
| Spec-as-novel | 2000-word requirements nobody reads | Keep lean; bullets > prose |
| Phantom requirements | Requirements with no scenarios | Every req needs Given/When/Then |
| Design-free tasks | Tasks created without design phase | Always design before tasking |
| Vibe tasking | "Implement the feature" as a task | Break into file-level actions |
| Spec drift | Code diverges from spec silently | Run verification after implementation |
| Over-specification | Specifying internal implementation details | Spec describes behavior, not internals |

## References

- Requirements format and rules: [references/requirements-guide.md](references/requirements-guide.md)
- Design format and rules: [references/design-guide.md](references/design-guide.md)
- Task breakdown rules: [references/tasks-guide.md](references/tasks-guide.md)
- Verification process: [references/verification-guide.md](references/verification-guide.md)
