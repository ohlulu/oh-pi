# Requirements Guide

How to write clear, testable, behavior-focused requirements.

## Document Template

```markdown
# Requirements: {Feature Name}

## Summary

{One paragraph: what problem this solves, who benefits, and why it matters.}

## User Stories

### Story 1: {Capability Title}

As a {role},
I want {capability},
so that {business value}.

#### Acceptance Criteria

##### Scenario: {The one where ...}

- GIVEN {essential context / precondition}
- WHEN {single triggering event}
- THEN {observable outcome}
- AND {additional observable outcome}

##### Scenario: {Edge case or error state}

- GIVEN {context}
- WHEN {event}
- THEN {outcome}

### Story 2: ...

## Non-Functional Requirements

| Category | Requirement | Strength |
|----------|-------------|----------|
| Performance | {e.g., Response time < 200ms for 95th percentile} | MUST |
| Security | {e.g., All inputs sanitized against XSS} | MUST |
| Accessibility | {e.g., WCAG 2.1 AA compliance} | SHOULD |

## Open Questions

- {Unresolved question that needs stakeholder input}
```

## RFC 2119 Keywords

Use these to express requirement strength. Always capitalize.

| Keyword | Meaning |
|---------|---------|
| **MUST / SHALL** | Absolute requirement. No exceptions. |
| **MUST NOT / SHALL NOT** | Absolute prohibition. |
| **SHOULD** | Recommended. Exceptions need justification. |
| **SHOULD NOT** | Discouraged. May be acceptable with justification. |
| **MAY** | Optional. |

## EARS Format (Optional Enhancement)

For requirements that need more structural precision, use EARS syntax:

| Pattern | Template |
|---------|----------|
| Event-driven | WHEN {event}, the system SHALL {response} |
| Conditional | IF {precondition}, THEN the system SHALL {response} |
| State-driven | WHILE {state}, the system SHALL {behavior} |
| Scoped | WHERE {context}, the system SHALL {behavior} |
| Unconditional | The system SHALL {behavior} |

EARS and Given/When/Then serve different purposes:
- **EARS** = concise requirement statement (one line per rule)
- **Given/When/Then** = detailed acceptance scenario (testable example)

Use EARS for the requirement declaration. Use Given/When/Then for the acceptance criteria.

## Scenario Writing Rules

### Core Semantics

- **Given** = context/state that exists before the event. Not an action.
- **When** = the single triggering event. One per scenario.
- **Then** = observable outcome. Must be verifiable from outside the system.
- **And/But** = continues the previous section's semantic role.

### Declarative Over Imperative

Describe behavior intent, not UI mechanics.

Ask: "Would this step text change if the implementation changes?"
If yes → rewrite to express behavior, not mechanism.

Bad:
```
WHEN the user clicks the email field
AND types "user@example.com"
AND clicks the password field
AND types "secret123"
AND clicks "Submit"
```

Good:
```
WHEN the user signs in with valid credentials
```

### One Scenario, One Behavior

Each scenario tests exactly one behavior with one primary intent.
If you have two WHEN clauses or independent THEN outcomes → split.

### Concrete Over Abstract

Use specific values that clarify the behavior.

Bad: `GIVEN the user has some items in the cart`
Good: `GIVEN the user has 3 items totaling $45.00 in the cart`

### Observable Outcomes

THEN assertions must be externally observable (UI state, API response, notification, file output).
Do not assert internal implementation details (DB row structure, variable values).

Exception: if the internal state IS the contract (e.g., database schema spec).

### Named Actors

In multi-actor scenarios, use explicit names instead of ambiguous pronouns.

Bad: `GIVEN I posted "Hello" / WHEN I retweet "Hello"`
Good: `GIVEN Aslak posted "Hello" / WHEN Priya retweets "Hello"`

### Style Targets

| Metric | Target |
|--------|--------|
| Steps per scenario | 3-5 (hard limit < 10) |
| And/But per section | <= 2-3 |
| Scenarios per story | ~5-6 before considering split |

## Common Anti-Patterns

| Anti-Pattern | Why It Hurts | Fix |
|---|---|---|
| Multi-behavior scenario | Ambiguous failures | Split at the second WHEN |
| UI scripting | Brittle, hides intent | Rewrite as domain behavior |
| Incidental details | Noise obscures behavior | Keep only behavior-relevant context |
| Too abstract | Not executable as examples | Add concrete values |
| Spec after code | Loses discovery value | Write scenarios before implementation |
| Missing scenario titles | Hard to understand coverage | Title by behavior difference |
| Tautological story narrative | No business clarity | State real value, not restatement |

## Completeness Checklist

- [ ] Every user story has at least one happy-path scenario
- [ ] Error states and edge cases have scenarios
- [ ] No implementation details in requirements
- [ ] RFC 2119 keywords used for every requirement statement
- [ ] All scenarios are deterministic and independent
- [ ] Domain language used consistently (no implementation jargon)
- [ ] Non-functional requirements listed with strength keywords
- [ ] Open questions captured (not silently assumed)
