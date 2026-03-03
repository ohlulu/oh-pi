# Tasks Guide

How to break down a design into actionable implementation steps.

## Document Template

```markdown
# Tasks: {Feature Name}

## Phase 1: {Phase Name} (e.g., Foundation / Infrastructure)

- [ ] 1.1 {Concrete action — what file, what change}
  - _Requirements: {req reference}_
- [ ] 1.2 {Concrete action}
  - _Requirements: {req reference}_

## Phase 2: {Phase Name} (e.g., Core Implementation)

- [ ] 2.1 {Concrete action}
  - _Requirements: {req reference}_
- [ ] 2.2 {Concrete action}
  - _Requirements: {req reference}_

## Phase 3: {Phase Name} (e.g., Integration / Wiring)

- [ ] 3.1 {Concrete action}
  - _Requirements: {req reference}_

## Phase 4: {Phase Name} (e.g., Testing)

- [ ] 4.1 Write tests for {specific scenario from requirements}
  - _Requirements: {req reference}_
- [ ] 4.2 Write tests for {specific scenario}
  - _Requirements: {req reference}_

## Phase 5: {Phase Name} (e.g., Cleanup / Polish)

- [ ] 5.1 {Update docs / remove temporary code}
```

## Phase Organization

Organize tasks into phases by dependency order:

| Phase | Purpose | Examples |
|-------|---------|---------|
| Foundation | Things other tasks depend on | New types, protocols, config, DB schema |
| Core | Main business logic | Services, domain rules, data transformations |
| Integration | Connect components | Routes, UI wiring, dependency injection |
| Testing | Verify against spec scenarios | Unit tests, integration tests |
| Cleanup | Polish and documentation | Remove dead code, update docs, lint fixes |

Not every feature needs all 5 phases. Use as many as the change warrants.

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
