---
name: bdd
description: Write and review Behavior-Driven Development (BDD) specifications using Gherkin. Use when drafting `.feature` files, turning requirements into scenarios, reviewing Cucumber/Behave/SpecFlow specs, or improving unclear Given/When/Then wording. NOT for implementing unit or integration test code in XCTest, Jest, Vitest, or Playwright.
---

# BDD Gherkin Writing

This skill helps produce clear, business-readable, executable Gherkin specifications.

## When to Use

- The user asks to create, refine, or review Gherkin `.feature` files.
- Requirements, user stories, or acceptance criteria need conversion into BDD scenarios.
- Existing scenarios are hard to read, too imperative, or mix multiple behaviors.
- The team needs living documentation aligned with business rules.

## When Not to Use

- Writing framework-specific test implementation code (XCTest/Jest/Vitest/Playwright).
- Pure low-level API or unit test authoring without Gherkin artifacts.
- Highly uncertain domains (complexity 4-5) where rapid spikes/prototypes are needed first.

## Workflow

1. Clarify business intent
   - Capture role, capability, and value.
   - Identify business rules and expected outcomes.
2. Shape feature structure
   - Keep one feature per `.feature` file.
   - Group scenarios under `Rule` when multiple rules exist.
3. Draft scenarios
   - Apply the cardinal rule: one scenario, one behavior.
   - Use declarative wording (what behavior, not UI mechanics).
   - Keep Given/When/Then semantics and order.
4. Add variation only when needed
   - Use `Scenario Outline` only for the same behavior across data examples.
   - Avoid outline overuse that explodes test count.
5. Run quality gate
   - Check observability, readability, determinism, and style.
   - Remove incidental details unrelated to the behavior.
6. Deliver
   - Provide final `.feature` content plus assumptions and open questions.

## Authoring Rules (Must Follow)

- One Scenario, One Behavior (single primary behavior focus).
- `Given` defines context state; `When` defines the event; `Then` defines observable outcomes.
- `Then` validates externally observable results, not internal implementation details.
- Prefer declarative statements. If wording must change whenever implementation changes, rewrite it.
- Use present tense and stable domain language.
- Prefer named actors over ambiguous first-person wording in multi-actor contexts.
- Use concrete values where they clarify behavior; avoid vague phrasing like "some money".
- Keep scenarios short: target 3-5 steps, hard limit under 10.
- Keep `Background` short (<= 4 lines) and only for truly shared context.

## Output Template

```gherkin
Feature: <Business capability title>
  In order to <business value>
  As a <role>
  I want <capability>

  Rule: <Business rule>

    Scenario: <The one where ...>
      Given <essential context>
      When <single event>
      Then <observable outcome>
      And <related observable outcome>
```

For data-driven versions of the same behavior:

```gherkin
Scenario Outline: <Behavior under different examples>
  Given <context with <param>>
  When <event with <param>>
  Then <observable result with <param>>

  Examples:
    | param1 | param2 | expected |
    | ...    | ...    | ...      |
```

## Quality Checklist

- [ ] Scenario title clearly differentiates this behavior from others.
- [ ] Scenario focuses on one behavior and one intent.
- [ ] No incidental details that do not contribute to understanding.
- [ ] No click-by-click UI scripting unless UI interaction itself is the behavior.
- [ ] `Then` steps verify user-visible or externally visible outcomes.
- [ ] Scenarios are deterministic and independent from each other.
- [ ] Vocabulary stays in domain language, not implementation jargon.

## Escalation Guidance

- If unknowns accumulate, run Example Mapping before finalizing Gherkin.
- If complexity is very high (4-5), recommend spike/prototype before detailed BDD specs.
- If domain terminology is inconsistent, create a shared glossary first.

## References

- Syntax and style rules: [references/gherkin-rules.md](references/gherkin-rules.md)
- Anti-patterns and rewrites: [references/anti-patterns-and-examples.md](references/anti-patterns-and-examples.md)

**Remember**: BDD scenarios are communication artifacts first, executable tests second.
