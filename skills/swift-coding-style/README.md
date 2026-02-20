# Swift Coding Style

Coding conventions for writing, reviewing, or refactoring `.swift` files.

## What It Does

- Guides type design, protocol usage, error handling, and API naming
- Enforces preferences like `some` over `any`, exhaustive `switch`, immutability-first
- Covers file organization (private members, MARK comments, error type placement)

## When to Use

- Writing new Swift code
- Reviewing Swift PRs
- Refactoring existing Swift files

## Highlights

### Types

- **Default to `some`** (opaque), use `any` (existential) only for heterogeneous storage
- **Exhaustive switch** — list all cases, use `@unknown default` only for non-frozen enums
- **Immutability first** — default to `let` and `struct`, justify any `var`
- **Eliminate illegal states** — use enums with associated values instead of bool + optional combos
- **Never store derived data** — if it can be computed, make it a computed property

### Protocols

- Start with protocols, not classes
- But don't over-abstract — explore with concrete types first, then abstract
- Rule of Three: extract into reusable component only after 3 occurrences

### Error Handling

- `Optional` → absence is normal
- `throws` → expected but exceptional failures
- `assert` → debug-only internal checks
- `precondition` → public API contract violations (active in release)
- `fatalError` → truly unrecoverable

### API Design

- Clarity at point of use > brevity
- Mutating = imperative verb (`sort()`), non-mutating = noun (`sorted()`)
- Booleans read as assertions (`isEmpty`, `intersects`)

### File Organization

- Private members at **end of file** in a separate `extension`
- `// MARK: -` only when file exceeds 300 lines
- Error types nested inside their concrete implementation
