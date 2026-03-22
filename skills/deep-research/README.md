# Deep Research

Autonomous multi-step web research with source triangulation. Searches, evaluates, cross-verifies, and synthesizes a cited Markdown report.

## Usage

Ask the agent to research a topic:

```
Research the best state management approaches for SwiftUI in 2026
Deep dive into Swift 6 concurrency migration strategies
Compare Tuist vs SPM for modular iOS projects
調查 iOS app 的 crash reporting 方案
```

## What It Does

- Classifies queries by domain (academic, dev, comparison, general) and selects search strategies
- Generates 3–5 diverse search queries, dispatches up to 3 parallel workers via Brave Search
- Evaluates source quality, fetches top pages, and cross-verifies claims across sources
- Produces a structured, cited report with evidence ratings and conflict notes
- Deep mode (`--deep`) runs up to 3 search rounds, filling gaps from previous rounds

## When to Use

- Comparing technologies or approaches with evidence
- Investigating a question that needs multiple sources
- Surveying best practices or ecosystem state
- Any task where "just Google it" isn't enough — you need triangulated evidence

## When NOT to Use

- Questions answerable from project code or docs (read the code instead)
- Simple factual lookups (use a single web search)
- Opinion-gathering (this produces evidence, not polls)

## Key Rules

- Requires `BRAVE_API_KEY` in environment
- All web content treated as untrusted evidence — claims need ≥3 authoritative sources for recommendations
- Report language matches query language
- Single-source claims are flagged, not silently accepted
- `--no-confirm` skips ambiguity clarification; `--output path` sets custom report location

## References

- `references/methodology.md` — worker task template and safety rules
- `references/report-format.md` — report template, citation rules, and quality gates
