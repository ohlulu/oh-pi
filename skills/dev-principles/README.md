# Development Principles

Language-agnostic guidelines for writing clean, maintainable code. No specific architecture enforced — just solid fundamentals.

## Usage

Ask the agent to review code quality or design decisions:

```
Review this code for quality and design
Is this over-engineered?
How should I structure this module?
```

## What It Does

- Provides a checklist of design principles to follow
- Helps evaluate whether code is over-engineered or under-designed
- Guides refactoring decisions

## When to Use

- Designing new modules
- Reviewing code quality
- Refactoring for clarity
- Debating "should I abstract this?"

## Key Principles

### General

- **YAGNI** — Only build what's needed *right now*. Delete speculative code.
- **Fail Fast** — Surface errors early. Silent failures are worse than loud crashes.
- **Work → Right → Fast** — Get it working, clean it up, then optimize (with profiling data).
- **No Premature Optimization** — No profiling = no optimization.
- **Comments explain *why*, not *what*** — If a comment explains what code does, extract it into a well-named method.

### SOLID (highlights)

- **SRP** — One type, one reason to change. If testing requires unrelated deps, split it.
- **OCP** — Extend via new abstractions, not by modifying existing code.
- **ISP** — Design interfaces around behaviors, not objects. Single-method interfaces are fine.

### Design Patterns

- **CQS** — Methods either mutate state (command) or return data (query), never both.
- **Law of Demeter** — Talk to direct collaborators, not `a.b.c.d`. Tell, don't ask.
