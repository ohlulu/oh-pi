---
name: clean-architecture
description: >-
  Clean Architecture mindset and dependency principles. Load this skill when:
  designing new modules or features, reviewing or refactoring layer boundaries,
  deciding where code should live (domain vs infrastructure vs UI),
  spotting business logic leaking into views or frameworks,
  evaluating import statements and dependency direction,
  questioning whether an abstraction is earning its keep,
  or creating new files or types that need a home in the codebase.
  This is a thinking framework — not a pattern catalog or folder convention.
---

# Clean Architecture — Mindset Guide

## Core Philosophy

Every system splits into **policy** (business rules — why the system exists) and
**details** (databases, UI, frameworks — mechanisms that serve the policy).
Architecture makes policy central and details peripheral, so detail decisions
can be deferred, swapped, or removed without rewriting the rules that matter.
Good architecture maximises the decisions *not yet made*.

## Thinking Principles

### 1. The Dependency Rule

Source-code dependencies point **inward**, toward higher-level policy. Inner
layers never name, import, or know about outer layers. When an inner layer needs
an outer capability, it defines an abstraction the outer layer conforms to.
Change does not propagate in the direction of a dependency — so pointing every
dependency toward business rules shields them from infrastructure churn.

### 2. The consumer owns the abstraction

An interface is shaped by the layer that *uses* it, not the layer that
implements it. Ask "what does my domain need?" not "what does my infrastructure
expose?" If an interface leaks infrastructure types (e.g. a DB cursor), the
consumer does not own it.

### 3. Architecture screams intent

Top-level structure should tell a reader what the system *does* — "point-of-sale
system," "health-care platform" — not what toolkit it uses. If your project
screams "SwiftUI" or "Rails" instead of "Orders" or "Patients," the framework
has become the architecture.

### 4. Infrastructure is a replaceable plugin

Database, network, UI framework, persistence format — all plugins that attach to
the core. Test: *could you defer the database choice and still write every
business rule today?*

### 5. Each layer changes for its own reason

| Layer | Changes when… |
|---|---|
| Domain | Business rules / invariants change |
| Application | Workflow / orchestration changes |
| Adapters | External interface shape changes |
| Infrastructure | Technology choice changes |

A file that changes for another layer's reason lives in the wrong place.

### 6. Boundaries are dependency graphs, not folder names

A boundary is a compile-time guarantee one side cannot see the other. Judge by
**import graphs and module visibility**, not directories. Perfect folders with
broken imports mean broken architecture.

## Layer Thinking

Layers are a *consequence* of the dependency rule, not its cause. The count is
not fixed — use as many as complexity warrants; what matters is direction.

- **Domain** — Pure rules, no I/O, no framework imports. *"Would this be true
  if delivered via CLI instead of an app?"*
- **Application** — Orchestrates domain to fulfil a user goal. Knows *what*
  happens, never *how* infrastructure does it.
- **Adapters** — Translates between internal language and the external world.
  Never invents rules, never touches infrastructure directly.
- **Infrastructure** — Concrete technology. Implements inner-layer abstractions.
  Contains no business decisions.

Outer (UI, Infrastructure) -> Adapters -> Application -> Domain

## Red Flags
- Domain imports a UI or persistence framework
- A view / controller contains a business-decision `if`
- Application layer calls a concrete network / storage API
- An adapter invents a business rule instead of translating
- A schema change forces domain changes
- An interface mirrors infrastructure's API, not domain's need (leaky abstraction)
- A "shared" module becomes a grab-bag every layer imports
- A simple feature touches files across many layers for no clear reason (accidental indirection)

## When This Mindset May Not Apply
- Short-lived prototype or throwaway script
- Pure CRUD with no meaningful business logic to protect
- Small team + small codebase where indirection cost > boundary benefit
- An abstraction would be a one-method proxy with no realistic second
  implementation and no testability gain — that is ceremony, not architecture

The goal is not to use Clean Architecture. The goal is to protect what matters
at a cost that makes sense.

## Ask yourself
1. **Where does this logic belong?** Could it exist without the current UI or DB?
2. **What breaks if we swap the framework?** That part needs an inner-owned abstraction.
3. **Does the dependency point inward?** Check imports — inner importing outer = violation.
4. **Is this file changing for its own layer's reason?** If not, a boundary is missing.
5. **Can I test this without infrastructure?** If not, a boundary or abstraction is misplaced.
6. **Does the abstraction serve domain or infrastructure?**
7. **Is this indirection earning its keep?** No testability, swappability, or clarity gain → remove it.