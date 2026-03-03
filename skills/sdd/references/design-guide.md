# Design Guide

How to write technical design documents with clear decisions and rationale.

## Document Template

```markdown
# Design: {Feature Name}

## Technical Approach

{Concise description of the overall strategy. One paragraph.
How does this solve the problem stated in requirements?}

## Architecture Decisions

### Decision: {Decision Title}

**Choice**: {What we chose}
**Alternatives considered**: {What we rejected and why}
**Rationale**: {Why this choice wins}

### Decision: {Decision Title}

**Choice**: ...
**Alternatives considered**: ...
**Rationale**: ...

## Data Flow

{How data moves through the system for this feature.
Use simple diagrams when helpful.}

    User Action ──→ Service Layer ──→ Repository ──→ Storage
         │                                            │
         └────────── Response ◀───────────────────────┘

## Interfaces / Contracts

{New or modified interfaces, API contracts, type definitions.
Use code blocks in the project's language.}

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `path/to/new-file.ext` | Create | {What this file does} |
| `path/to/existing.ext` | Modify | {What changes and why} |
| `path/to/old-file.ext` | Delete | {Why it's removed} |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | {Specific logic} | {Framework / method} |
| Integration | {Component interaction} | {Framework / method} |
| E2E | {User flow} | {Framework / method} |

## Migration / Rollout

{Data migration, feature flags, phased rollout.
If not applicable: "No migration required."}

## Open Questions

- [ ] {Unresolved technical question}
- [ ] {Decision that needs team input}
```

## ADR-Style Decisions

Every architecture decision MUST have:

1. **Choice** — What was selected
2. **Alternatives** — What was considered (at least one alternative)
3. **Rationale** — Why this choice over others

Without rationale, a decision is just an assertion. Future maintainers (human or AI)
need the "why" to know when the decision should be revisited.

### Good Rationale Examples

```markdown
**Choice**: Use CSS custom properties for theming
**Alternatives**: Tailwind dark: variant; separate stylesheets
**Rationale**: CSS vars allow runtime switching without class toggling,
support arbitrary themes beyond light/dark, and work with existing
component library that uses var() references.
```

```markdown
**Choice**: Repository pattern with protocol
**Alternatives**: Direct Core Data access; GRDB
**Rationale**: Protocol boundary allows swapping persistence layer
in tests and future migration. Team already uses this pattern
in UserRepository. Consistency > novelty.
```

### Bad Rationale

- "It's the best approach" (says nothing)
- "Everyone uses it" (popularity ≠ fitness)
- "It's modern" (recency bias)

## Design Writing Rules

### Read the Codebase First

Before designing, read actual code in affected areas:
- Entry points and module structure
- Existing patterns and conventions
- Dependencies and interfaces

Never design in a vacuum. The codebase is the ground truth of current state.

### Follow Existing Patterns

If the codebase uses a specific pattern, follow it unless the change explicitly
addresses that pattern. Note the deviation if you must break convention.

### Concrete File Paths

Use actual file paths, not abstract descriptions.

Bad: "Create a new service for authentication"
Good: "Create `Sources/AuthService/TokenValidator.swift`"

### Simple Diagrams

ASCII diagrams are fine. Keep them readable over pretty.
If a diagram needs more than 10 lines, the architecture might be too complex
for one design document — consider splitting.

### Interface Definitions

Define interfaces in the project's language. These become contracts
that implementation must satisfy.

```swift
protocol ExportService {
    func export(_ records: [Record], format: ExportFormat) async throws -> Data
}

enum ExportFormat {
    case csv, json
}
```

## Completeness Checklist

- [ ] Every requirements scenario addressable by this design
- [ ] At least one architecture decision with rationale
- [ ] Concrete file paths in the file changes table
- [ ] Testing strategy covers unit + at least one higher level
- [ ] Existing codebase patterns acknowledged and followed (or deviation justified)
- [ ] No hand-waving ("implement as needed" is not a design)
- [ ] Open questions listed explicitly (not silently assumed)
