---
name: dev-principles
description: >-
  Language-agnostic development principles and design guidelines. Load when
  designing new modules, reviewing code quality, refactoring for clarity,
  questioning whether code is over-engineered, or evaluating separation of
  concerns.
---

# Development Principles

## General Principles

### YAGNI (You Aren't Gonna Need It)
- Only implement what is needed **right now**
- Never build for "we might need this later"
- Delete speculative code ruthlessly

### Fail Fast
- Errors should surface as early as possible
- Crash early in development; handle gracefully in production
- A silent failure is worse than a loud crash

### Make It Work → Make It Right → Make It Fast
1. **Work** — Get it functioning correctly
2. **Right** — Refactor into clean, maintainable code
3. **Fast** — Optimize only when profiling proves it necessary

Never skip steps. Never start at step 3.

### No Premature Optimization
- Measure first, optimize second
- No profiling data = no optimization
- Readable code beats "clever" code every time

### Explain *Why*, Not *What*
If a comment explains what code does, extract it into a well-named method.
Comments are for **why** — non-obvious decisions, trade-offs, or constraints
the code can't express on its own.

---

## SOLID Principles

### Single Responsibility (SRP)
A type should have one, and only one, reason to change.

- If a type handles networking **and** parsing **and** UI updates, it has
  three reasons to change — split until each piece changes for exactly one reason
- If testing requires setting up multiple unrelated dependencies, it's a signal
  to split

### Open/Closed (OCP)
Open for extension, closed for modification.

- Add behavior through new abstractions or extensions, not by modifying existing
  code
- When the set of cases is expected to grow, prefer polymorphism over branching
- Use finite enumerations only when the state set is truly stable

### Interface Segregation (ISP)
Clients should not be forced to depend on interfaces they don't use.

- Design interfaces around behaviors/roles, not objects
- A single-method interface is perfectly valid
- If a conformer implements some methods as no-ops, it's a signal to split

---

## Design Patterns & Practices

### Command-Query Separation (CQS)
Every method should either be a command (mutates state, returns no meaningful
value) or a query (returns data, no side effects), **never both**.

Exception: performance-critical atomic operations (e.g., `fetchAndIncrement`).

### Law of Demeter
- An object should only talk to its direct collaborators, not reach through to
  access internals
- Chained access like `a.b.c.d` is a refactoring signal
- **Tell, Don't Ask** — tell objects what you want; let them decide how
