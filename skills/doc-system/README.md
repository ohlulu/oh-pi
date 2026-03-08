# doc-system

Product documentation system design and maintenance principles — on-demand loading, single source of truth, open-closed structure.

## Usage

Ask the agent to set up or maintain your documentation:

```
Set up a docs system for this project
Create a new spec file for the authentication feature
I want to add a new screen to the mockup index
Organize the docs/ folder
```

## What It Does

- Defines a layered doc structure: `specs/`, `milestones/`, `drafts/`, `mockup/`
- Designs `INDEX.md` as the central routing table — three hops max to any content
- Enforces single source of truth: specs own rules, milestones reference specs
- Applies open-closed principle: new features = new files, no structural changes to existing ones
- Generates frontmatter with `summary` and `read_when` for AI-assisted routing
- Manages mockup screen indexes and line-number maintenance scripts

## When to Use

- Creating any new file under `docs/`
- Setting up docs for a new project
- Restructuring or auditing existing documentation
- Maintaining docs (adding specs, milestones, or mockup screens)
- Reviewing doc architecture quality

## When NOT to Use

- Projects with fewer than 5 doc files (a single README is enough)
- Pure technical API/SDK reference docs (use a doc generator instead)
- Short-lived prototypes (not worth the architecture investment)

## Key Rules

- `summary` and `read_when` frontmatter always written in English
- No emoji, no ASCII wireframe diagrams in specs
- Specs carry no version numbers — they reflect current truth
- Milestones reference specs; never duplicate rule content
- **No separate milestone file when SDD spec exists** — link milestone `_index.md` row to the spec; `tasks.md` is the single checklist
- Milestone file with its own checklist AND a `tasks.md` = duplicate checklist = doc drift
- INDEX.md must fit on one screen — routing only, no business content

## References

- `references/mockup/screen-index.md` — screen index design and README structure
- `references/mockup/update-script.md` — line number maintenance script for mockup indexes
