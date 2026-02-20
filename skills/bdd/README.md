# BDD Gherkin Writing

Helps you write clean, business-readable Gherkin `.feature` files.

## What It Does

- Turns requirements / user stories into proper Given/When/Then scenarios
- Reviews existing `.feature` files for clarity, structure, and anti-patterns
- Keeps scenarios focused: one scenario = one behavior

## When to Use

- Drafting or reviewing `.feature` files
- Converting acceptance criteria into BDD scenarios
- Cleaning up messy or overly imperative Gherkin

## When NOT to Use

- Writing actual test code (XCTest, Jest, Playwright, etc.)
- Pure unit/integration test authoring without Gherkin

## Key Rules

- One scenario, one behavior — no multi-behavior scenarios
- `Given` = context, `When` = event, `Then` = observable outcome
- Declarative, not imperative — describe *what*, not click-by-click *how*
- Keep scenarios short: aim for 3–5 steps, hard cap at 10
- Use `Scenario Outline` only when the *same behavior* varies by data

## References

- `references/gherkin-rules.md` — syntax and style rules
- `references/anti-patterns-and-examples.md` — common mistakes and rewrites
