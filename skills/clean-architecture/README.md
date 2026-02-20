# Clean Architecture

A thinking framework for where code should live and which way dependencies should point. Not a folder convention or pattern catalog.

## What It Does

- Guides decisions about layer boundaries and dependency direction
- Spots business logic leaking into views or frameworks
- Questions whether abstractions are earning their keep

## When to Use

- Designing new modules or features
- Reviewing / refactoring layer boundaries
- Deciding domain vs infrastructure vs UI placement
- Evaluating import graphs

## Core Ideas

1. **Dependency Rule** — imports point inward, toward business rules. Inner layers never know about outer layers.
2. **Consumer owns the abstraction** — interfaces are shaped by who *uses* them, not who implements them.
3. **Architecture screams intent** — top-level structure should say "Orders" or "Patients", not "SwiftUI" or "Rails".
4. **Infrastructure is a plugin** — DB, network, UI framework = swappable details around stable business rules.

## Red Flags

- Domain importing a UI or persistence framework
- A view containing a business-decision `if`
- An interface that mirrors infrastructure's API instead of domain's need
- A "shared" module that every layer imports as a grab-bag

## When It Doesn't Apply

- Throwaway prototypes
- Pure CRUD with no meaningful business logic
- When the abstraction cost exceeds the boundary benefit
