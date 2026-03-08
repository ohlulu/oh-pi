# Tasks Guide

How to break down a plan into actionable implementation steps.

## Document Template

```markdown
# Tasks: {Feature Name}

## Phase 1: {Phase Name} (e.g., Foundation / Infrastructure)

- [ ] 1.1 {Concrete action — what file, what change}
  - _Requirements: {req reference}_
- [ ] 1.2 {Concrete action}
  - _Requirements: {req reference}_

## Phase 2: {Phase Name} (e.g., Core Implementation)

- [ ] 2.1 Write tests for {component} — {specific scenarios}
  - Tests MUST fail (RED)
  - _Requirements: {req reference}_
- [ ] 2.2 Implement {component} — make tests pass (GREEN)
  - _Requirements: {req reference}_
- [ ] 2.3 Refactor if needed (REFACTOR)

## Phase 3: {Phase Name} (e.g., Integration / Wiring)

- [ ] 3.1 Write tests for {integration scenario}
  - _Requirements: {req reference}_
- [ ] 3.2 Wire components — make tests pass
  - _Requirements: {req reference}_

## Phase 4: {Phase Name} (e.g., Cleanup / Polish)

- [ ] 4.1 {Update docs / remove temporary code}
```

## Phase Organization

Organize tasks into phases by dependency order:

| Phase | Purpose | Examples |
|-------|---------|---------|
| Foundation | Things other tasks depend on | New types, protocols, config, DB schema |
| Core | Main business logic | Services, domain rules, data transformations |
| Integration | Connect components | Routes, UI wiring, dependency injection |
| Cleanup | Polish and documentation | Remove dead code, update docs, lint fixes |

Not every feature needs all 4 phases. Use as many as the change warrants.

## Test-First Rule (TDD)

**Tests are NOT a separate phase.** Every implementation phase follows RED → GREEN → REFACTOR:

1. **RED** — Write tests first. They must fail (proves the test is meaningful).
2. **GREEN** — Write the minimum implementation to make tests pass.
3. **REFACTOR** — Clean up while tests stay green.

Within each phase, test tasks MUST appear before their corresponding implementation tasks. A phase that produces testable logic without tests is incomplete.

**Exception**: Pure config tasks (xcconfig, .gitignore, Info.plist keys) and UI-only tasks (SwiftUI views with no logic) may skip test-first when there's nothing meaningful to assert. Preview snapshots should still be added for UI tasks.

## Task Quality Criteria

Every task MUST be:

| Criteria | Good | Bad |
|----------|------|-----|
| **Specific** | Create `Sources/Export/CSVExporter.swift` with `export(_:)` method | Add export |
| **Actionable** | Add `validateToken()` method to `AuthService` | Handle tokens |
| **Verifiable** | Test: `POST /login` returns 401 without valid token | Make sure it works |
| **Small** | One file or one logical unit of work | Implement the feature |
| **Traceable** | References Requirement 2, Scenario "successful export" | (no reference) |

## Requirement Traceability

Every task MUST reference the requirement(s) it satisfies.

This serves two purposes:
1. **Completeness check** — if a requirement has no task, something is missing
2. **Verification** — when checking implementation, you know which spec to verify against

Format: `_Requirements: Story 2, Scenario "successful export"_`

## Dependency Rules

- Phase N tasks MUST NOT depend on Phase N+1 tasks
- Within a phase, list tasks in dependency order
- If two tasks are independent, they can be in the same phase
- If a task depends on something outside this feature, note it explicitly

## Task Sizing

Each task should be completable in one focused session.

Signs a task is too big:
- Description uses "and" to join two unrelated actions
- Touches more than 2-3 files
- Would take more than ~30 minutes to implement

Signs a task is too small:
- Could be a sub-step of another task (e.g., "create file" + "add import")
- Has no meaningful verification on its own

## Progress Tracking

Mark tasks complete as they're implemented:

```markdown
- [x] 1.1 Create `ExportService` protocol ← done
- [x] 1.2 Add `ExportFormat` enum
- [ ] 2.1 Implement `CSVExporter` ← next
- [ ] 2.2 Implement `JSONExporter`
```

When all subtasks in a phase are complete, the phase is complete.
When all phases are complete, the feature is ready for verification.

## Completeness Checklist

- [ ] Every requirement from requirements.md has at least one task
- [ ] Every task references its requirement(s)
- [ ] Tasks use concrete file paths
- [ ] Dependency order is correct (no forward references)
- [ ] No vague tasks ("implement feature", "add tests")
- [ ] Each task is completable in one session
- [ ] Testing tasks reference specific scenarios from requirements
- [ ] Every phase with testable logic has test tasks BEFORE implementation tasks
- [ ] No standalone "Testing" phase at the end (tests are co-located with implementation)
