# BDD Anti-Patterns and Rewrite Examples

Use this reference when reviewing or rewriting weak Gherkin scenarios.

## 1) Fast Diagnosis Checklist

- Does the scenario test one behavior only?
- Is wording declarative (intent) rather than imperative (UI mechanics)?
- Are all details necessary to understand the behavior?
- Is the expected result observable to users or external systems?
- Are titles specific enough to distinguish one scenario from another?

If any answer is "no", rewrite before implementation.

## 2) Anti-Pattern Catalog (15)

| # | Anti-pattern | Why it hurts | Rewrite direction |
|---|---|---|---|
| 1 | Writing scenarios after code is done | Loses discovery and alignment value | Write examples before implementation |
| 2 | Scenarios authored in isolation | Single viewpoint, weak automation fit | Use cross-role collaboration (Three Amigos) |
| 3 | Incidental details | Noise hides behavior intent | Keep only behavior-relevant context |
| 4 | Multiple business rules in one scenario | Ambiguous failures and ownership | Split into one rule/behavior per scenario |
| 5 | Poor or missing scenario titles | Hard to understand coverage | Title by behavior difference |
| 6 | Tautological feature narrative | No business value clarity | State real value and policy context |
| 7 | UI-driven scripting by default | Brittle, high maintenance, low domain clarity | Describe domain behavior; hide mechanics |
| 8 | Ambiguous first-person actor | Confusion in multi-actor flows | Use explicit actor names/roles |
| 9 | Keeping obsolete/noise scenarios | Bloated suite and low signal | Remove scenarios covered by stronger examples |
| 10 | Overusing Scenario Outline | Data explosion and slow suite | Use only for true same-behavior variations |
| 11 | No business conversation before writing | Dry examples, wrong assumptions | Hold discovery conversation first |
| 12 | Blurred Given/When/Then boundaries | Semantic confusion and poor diagnostics | Restore strict role of each section |
| 13 | Overly abstract scenarios | Not executable as examples | Add concrete values and outcomes |
| 14 | Multiple distinct `When` events | Multiple workflows in one scenario | Split by event/outcome pair |
| 15 | Independent `Then` outcomes bundled together | One failure masks unrelated rules | Split into separate scenarios unless outcomes are inseparable |

## 3) Rewrite Patterns

### A) Multi-behavior Scenario

Bad:

```gherkin
Scenario: Search and image search
  Given a user is on the home page
  When the user searches for "panda"
  Then text results are shown
  When the user opens Images
  Then image results are shown
```

Better (split):

```gherkin
Scenario: Text search from home page
  Given a user is on the home page
  When the user searches for "panda"
  Then text results for "panda" are shown

Scenario: Image search from results page
  Given text results for "panda" are shown
  When the user opens the Images tab
  Then image results for "panda" are shown
```

### B) Imperative UI Scripting

Bad:

```gherkin
Scenario: Free subscriber can read free content
  Given users with free plans can access free content
  When the user clicks the email field
  And the user types "free@example.com"
  And the user clicks the password field
  And the user types "secret"
  And the user clicks "Submit"
  Then free content is visible
```

Better (declarative):

```gherkin
Scenario: Free subscriber can read free content
  Given Frieda has a free subscription
  When Frieda signs in with valid credentials
  Then she can access free content
```

### C) Incidental Details

Bad:

```gherkin
Scenario: Check account balance
  Given Matt signs up with password "password"
  And password confirmation is "password"
  And Matt deposited "$60"
  And Matt deposited "$40"
  When Matt checks the account balance
  Then the account balance is "$100"
```

Better:

```gherkin
Scenario: Check account balance
  Given Matt's account balance is "$100"
  When Matt checks the account balance
  Then the account balance is "$100"
```

### D) Too Abstract to Execute

Bad:

```gherkin
Scenario: Withdraw money
  Given I have an account
  When I withdraw some money
  Then the balance should be reduced accordingly
```

Better:

```gherkin
Scenario: Successful cash withdrawal
  Given Alex's account balance is "$100"
  When Alex withdraws "$30"
  Then the account balance is "$70"
```

### E) Ambiguous Actor Pronoun

Bad:

```gherkin
Scenario: Retweet post
  Given I posted "Hello"
  When I retweet "Hello"
  Then I see the retweet in my timeline
```

Better:

```gherkin
Scenario: User retweets another user's post
  Given Aslak posted "Hello"
  And Priya follows Aslak
  When Priya retweets "Hello"
  Then Priya sees the retweet in her timeline
```

## 4) Practical Split Heuristics

Split a scenario when:

- there are two distinct user intents
- there are independent outcomes that can fail separately
- multiple `When` clauses represent separate events
- setup and assertions become hard to scan without scrolling

Keep combined only when outcomes are tightly coupled and inseparable from one event.

## 5) Review Language Suggestions

Helpful review comments:

- "This scenario appears to test two behaviors; split after the first `Then`."
- "This wording is implementation-coupled; rewrite to describe behavior intent."
- "These Given details look incidental; can they be moved into step definitions?"
- "Outcome is internal-only. Can we assert a user-visible or external effect instead?"
- "Scenario title does not express the differentiating rule; rename for report readability."
