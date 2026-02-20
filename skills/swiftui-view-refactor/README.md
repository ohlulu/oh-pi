# SwiftUI View Refactor

Refactor and review SwiftUI view files for consistent structure, dependency injection, and Observation usage.

## Usage

Ask the agent to clean up SwiftUI views:

```
Refactor this SwiftUI view to follow standard ordering
Clean up the view model pattern in ProfileView
Split this large view body into subviews
```

## What It Does

- Enforces a consistent property ordering (environment → lets → state → computed → init → body → helpers)
- Promotes MV (Model-View) patterns over unnecessary view models
- Splits large view bodies into focused subviews
- Fixes view model initialization (non-optional `@State`, dependency injection via `init`)
- Ensures correct `@Observable` / `@State` usage
- Stabilizes the view tree by avoiding top-level conditional branch swapping

## When to Use

- Cleaning up a SwiftUI view's layout and ordering
- Standardizing how dependencies and `@Observable` state are initialized
- Reviewing view model patterns for correctness
- Splitting oversized view files (300+ lines)

## When NOT to Use

- Changing business logic or layout behavior — this skill preserves existing behavior
- Introducing new features or screens

## Key Rules

- Default to MV: views express state, models/services own logic
- Never introduce a view model unless existing code already uses one
- Keep `body` short; extract sections into subviews or computed view properties
- Avoid top-level `if/else` branch swapping in `body`
- Files over ~300 lines: split with extensions and `// MARK:` groups

## References

- `references/mv-patterns.md` — MV-first rationale and patterns
