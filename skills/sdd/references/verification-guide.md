# Verification Guide

How to verify that implementation matches the spec. This is a review activity, not a coding phase.

## When to Verify

- After all tasks are marked complete
- After a significant batch of tasks is done (partial verification)
- When the user asks "does my code match the spec?"
- Before declaring a feature done

## Verification Process

### Step 1: Task Completeness

Check that all tasks are done:

```
Read tasks.md
├── Count total tasks
├── Count completed [x]
├── List incomplete [ ]
└── Flag: CRITICAL if core tasks incomplete
```

### Step 2: Spec Compliance Matrix

For EACH acceptance scenario in requirements.md, find implementation evidence:

| Requirement | Scenario | Evidence | Status |
|---|---|---|---|
| Story 1 | Happy path login | `AuthService.swift:42` handles credential validation | COMPLIANT |
| Story 1 | Invalid password | `AuthService.swift:55` returns `.invalidCredentials` | COMPLIANT |
| Story 2 | Export CSV | No export logic found in codebase | MISSING |
| Story 2 | Empty dataset | `CSVExporter.swift:23` returns empty header row | PARTIAL |

Status values:
- **COMPLIANT** — implementation clearly satisfies the scenario
- **PARTIAL** — partially addressed, some aspect missing
- **MISSING** — no implementation evidence found
- **DEVIATED** — implemented differently than spec (may be valid improvement)

### Step 3: Design Decision Adherence

For each decision in design.md, check if the choice was followed:

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Use CSS custom properties | Yes | `theme.css` uses `var()` throughout |
| Repository pattern | Deviated | Used direct Core Data access; see note |

Deviations are not automatically bad. But they must be documented.
If a deviation is justified, update the design doc.

### Step 4: Issue Classification

Classify findings by severity:

**CRITICAL** — Must fix. Requirement not met or behavior incorrect.
- Missing scenario implementation
- Behavior contradicts spec
- Breaking existing functionality

**WARNING** — Should fix. Spec compliance is incomplete.
- Partial scenario coverage
- Design deviation without justification
- Missing edge case handling

**SUGGESTION** — Nice to have. Not blocking.
- Test coverage improvement opportunities
- Code style inconsistencies
- Documentation gaps

### Step 5: Verdict

| Verdict | Meaning |
|---------|---------|
| **PASS** | All scenarios compliant. No critical issues. |
| **PASS WITH WARNINGS** | All scenarios compliant but warnings exist. |
| **FAIL** | One or more scenarios missing or incorrect. |

## Verification Output Template

```markdown
## Verification: {Feature Name}

### Task Completeness
{N}/{total} tasks complete.
{List incomplete tasks if any.}

### Spec Compliance

| Requirement | Scenario | Evidence | Status |
|---|---|---|---|
| ... | ... | ... | ... |

**Compliance: {N}/{total} scenarios compliant**

### Design Adherence

| Decision | Followed? | Notes |
|---|---|---|
| ... | ... | ... |

### Issues

**CRITICAL:**
{List or "None"}

**WARNING:**
{List or "None"}

**SUGGESTION:**
{List or "None"}

### Verdict: {PASS / PASS WITH WARNINGS / FAIL}

{One-line summary.}
```

## Rules

- Read actual source code — don't trust summaries or assumptions
- Compare against requirements first (behavioral), design second (structural)
- Be objective — report what IS, not what should be
- Do NOT fix issues — only report them. The developer decides what to do.
- If a deviation from spec is actually an improvement, note it as DEVIATED, not MISSING
- Update spec if the deviation is accepted (spec stays source of truth)
