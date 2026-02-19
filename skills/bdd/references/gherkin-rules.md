# Gherkin Rules Reference

Use this reference when the task requires strict syntax, formatting, and scenario quality checks.

## 1) Core BDD Framing

- Treat scenarios as behavior specifications and communication artifacts, not just tests.
- Start from business value:
  - Role
  - Capability
  - Outcome
- Keep each scenario focused on one behavior.

Canonical story framing:

```text
As a <role>
I want <capability>
so that <business value>
```

Canonical scenario framing:

```text
Given <initial context>
When <event occurs>
Then <observable outcome>
```

## 2) Gherkin Keywords

Primary keywords:

- `Feature`
- `Rule`
- `Scenario` or `Example`
- `Given`, `When`, `Then`
- `And`, `But`, `*`
- `Background`
- `Scenario Outline`
- `Examples`

Secondary elements:

- Doc String: `"""`
- Data Table: `|`
- Tag: `@tag`
- Comment: `#`

## 3) Step Semantics and Order

- `Given`: context/state already true before the event.
- `When`: the triggering event or action.
- `Then`: observable outcome from the event.
- `And`/`But`: continue the previous semantic type.

Strict ordering rule:

- Keep Given -> When -> Then order.
- Avoid jumping backward (for example, no `Given` after `When`).
- Multiple independent `When` events usually indicate multiple behaviors and should be split.

## 4) Declarative Writing Rules

Prefer declarative behavior language over implementation mechanics.

Quick check:

- Ask: "Would this step text need to change if implementation changes?"
- If yes, rewrite it to express behavior intent.

Prefer:

- domain actions
- user goals
- business outcomes

Avoid:

- click-by-click UI details
- internal API/database mechanics in scenario text

## 5) Observability Rule for Then

- `Then` should validate externally observable results (UI text, response, emitted message, report, notification).
- Do not assert internal-only state in scenario wording (for example, DB row structure) unless that is the external contract.

## 6) Feature and Rule Structure

- One `Feature` per `.feature` file.
- `Feature` must be the first major keyword in the file.
- Use `Rule` to group scenarios that belong to a shared business rule.
- Scenario titles should communicate how they differ from sibling scenarios.

## 7) Background Guidelines

Use `Background` only when setup is shared by most scenarios.

Constraints:

- Keep it short (target <= 4 lines).
- Include context, not hidden workflows.
- Keep scenarios short enough that readers can still see background + scenario together.
- Use only one `Background` per `Feature` or per `Rule` scope.

## 8) Scenario Outline Guidelines

Use `Scenario Outline` only when:

- behavior is identical
- only example data changes

Rules:

- Keep each row meaningful (ideally one equivalence class).
- Avoid example explosion.
- Avoid combining outline-heavy scenarios with slow UI-level test paths.

## 9) Step Argument Rules

Doc Strings:

- Use triple quotes for multi-line payloads.
- Optional content type marker is allowed (for example, `"""json`).

Data Tables:

- Use `|` columns consistently aligned for readability.
- Escape special characters when needed (`\n`, `\|`, `\\`).

## 10) Matching Caveat (Important)

Step-definition matching ignores the keyword token (`Given`/`When`/`Then`).

Implication:

- Repeating the same phrase under different keywords creates ambiguity.
- Different semantic roles need different wording.

Example:

```gherkin
Given my account has a balance of $430
Then my account should have a balance of $430
```

## 11) Style Heuristics

Use these as practical guardrails:

| Metric | Recommendation |
|---|---|
| Steps per scenario | Target 3-5, hard limit <10 |
| Ands per section | Usually <= 2-3 |
| Scenarios per feature | Around 12 before splitting |
| Scenarios per story slice | Around 5-6 before splitting |
| Background size | Keep <= 4 lines |
| Step line length | Keep readable, roughly 80-120 chars |

Formatting norms:

- Capitalize Gherkin keywords.
- Avoid terminal punctuation in step lines.
- Keep single spaces between words.
- Keep consistent indentation under section headers.
- Keep tags lower-case and standardized.

## 12) Language and Naming

- Use domain language from stakeholders.
- Prefer explicit named actors over ambiguous pronouns in multi-actor scenarios.
- Keep tense stable (present tense is usually clearest).
- Keep naming concise but specific:
  - Feature title = business capability
  - Scenario title = distinguishing behavior outcome

## 13) Tags and Organization

Common tag groups:

- test level: `@smoke`, `@regression`, `@e2e`, `@integration`
- priority: `@critical`, `@p1`
- domain: `@billing`, `@auth`
- status: `@wip`, `@manual`

Organization guidance:

- Group `.feature` files by domain capability, not by technical layer.
- Do not organize primarily by temporary sprint/story IDs.

## 14) Example Mapping to Gherkin

Use this conversion:

- Story card -> `Feature`
- Rule card -> `Rule`
- Example card -> `Scenario`
- Open question card -> assumption/open question section outside final Gherkin

If unresolved questions are high, do not force detailed scenarios yet.

## 15) Complexity Signal

BDD is strongest in "complicated but knowable" spaces.

- Low uncertainty: keep scenarios lean.
- Medium uncertainty: use full BDD conversation + concrete examples.
- High uncertainty: run spikes/prototypes first, then formalize Gherkin.
