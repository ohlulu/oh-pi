# sdd

Spec-Driven Development — plan before you code. Structured feature planning through Requirements, Plan, Tasks, and Verification phases, each requiring explicit approval before proceeding.

## Usage

Ask the agent to plan a feature using SDD:

```
Plan the CSV export feature
Write a spec for the authentication redesign
Break down this feature into tasks
Verify the implementation against the spec
規劃 CSV 匯出功能
寫規格 / 拆任務 / 驗證規格
```

## What It Does

- Guides through four sequential phases: Requirements → Plan → Tasks → Verification
- Produces one document per phase: `requirements.md`, `plan.md`, `tasks.md`
- Enforces approval gates between phases — explains each phase in plain Chinese before user approves
- Captures user-visible behavior (WHAT) before technical approach (HOW)
- Uses RFC 2119 keywords (MUST/SHALL/SHOULD/MAY) in requirements
- Documents architecture decisions with rationale and rejected alternatives
- Outputs artifacts to `docs/specs/{feature-name}/`
- Handles spec evolution: edit-in-place for small changes, delta workflow for large ones
- Hands off to doc-system after Tasks approval (INDEX.md + milestone entry)

## When to Use

- Planning a new feature or significant change
- Breaking down a complex requirement into actionable work
- Writing requirements, plan docs, or task breakdowns
- Verifying that implementation matches declared spec

## When NOT to Use

- Trivial bug fixes or single-file edits (just do it)
- Highly uncertain domains needing a spike first (explore, then spec)
- Pure refactoring with no behavior change
- Doc organization work (use doc-system skill instead)

## Key Rules

- Spec is the source of truth — code is derived from spec, not the reverse
- Each phase requires explicit user approval before proceeding; explain in plain Chinese at each gate
- Requirements describe behavior, not implementation mechanics
- Every requirement needs at least one Given/When/Then scenario
- Tasks must reference the requirement(s) they satisfy
- After Tasks approval: add spec to INDEX.md and link milestone `_index.md` row to spec (no separate milestone file)
- Spec evolution: small change → edit in-place; large change → delta workflow then merge markers

## References

- `references/requirements-guide.md` — requirements format and rules
- `references/plan-guide.md` — plan format and rules
- `references/tasks-guide.md` — task breakdown rules
- `references/verification-guide.md` — verification process
