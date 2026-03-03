# sdd

Spec-Driven Development — plan before you code. Structured feature planning through Requirements, Design, Tasks, and Verification phases, each requiring explicit approval before proceeding.

## Usage

Ask the agent to plan a feature using SDD:

```
Plan the CSV export feature
Write a spec for the authentication redesign
Break down this feature into tasks
Verify the implementation against the spec
```

## What It Does

- Guides through four sequential phases: Requirements → Design → Tasks → Verification
- Produces one document per phase: `requirements.md`, `design.md`, `tasks.md`
- Enforces approval gates between phases — never skips ahead
- Captures user-visible behavior (WHAT) before technical approach (HOW)
- Uses RFC 2119 keywords (MUST/SHALL/SHOULD/MAY) in requirements
- Documents architecture decisions ADR-style with rejected alternatives
- Outputs artifacts to `docs/specs/{feature-name}/`

## When to Use

- Planning a new feature or significant change
- Breaking down a complex requirement into actionable work
- Writing requirements, design docs, or task breakdowns
- Verifying that implementation matches declared spec

## When NOT to Use

- Trivial bug fixes or single-file edits (just do it)
- Highly uncertain domains needing a spike first (explore, then spec)
- Pure refactoring with no behavior change
- Doc organization work (use doc-system skill instead)

## Key Rules

- Spec is the source of truth — code is derived from spec, not the reverse
- Each phase requires explicit user approval before proceeding
- Requirements describe behavior, not implementation mechanics
- Every requirement needs at least one Given/When/Then scenario
- Tasks must reference the requirement(s) they satisfy

## References

- `references/requirements-guide.md` — requirements format and rules
- `references/design-guide.md` — design format and rules
- `references/tasks-guide.md` — task breakdown rules
- `references/verification-guide.md` — verification process
