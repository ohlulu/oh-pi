# Report Format Reference

Normative guide for report structure, citation rules, and quality gates.

## Report Template

```
# Research: {Topic}

**Date**: {YYYY-MM-DD}
**Mode**: Quick | Deep
**Queries executed**: {N approximate}
**Sources consulted**: {N kept} / {N total}
{If degraded: **⚠️ Note**: {N} of {M} search angles failed. Coverage may be incomplete.}
{If --no-confirm on broad query: **ℹ️ Note**: Query was broad; results may not match your specific intent.}

## Summary

{2-5 sentence direct answer. Language matches user query.}

## Findings

1. **{Title}** — {Explanation with details.} [Source A](url), [Source B](url)

2. **{Title}** — {Explanation.} [Source C](url)
   > ⚠️ Single-source — not independently verified.

## Comparison

{If applicable: Markdown table. Non-trivial cells cite sources. Unknown cells marked "—".}

## Conflicts & Caveats

- {Source A claims X; Source B claims Y. Source A is official docs (higher authority).}
- {Agent conclusion (uncited): based on evidence above, X appears more likely.}

## Sources

### Kept
- [{Title}]({url}) — {Type: official docs | paper | blog | forum} — {Why relevant}

### Dropped
- {Title} ({url}) — {Why excluded: outdated / SEO filler / paywalled / redundant / AI-generated}

## Gaps

- {What couldn't be answered}
- {Suggested next steps}
```

## Citation Rules

- **Inline placement**: citation immediately follows the claim, not at paragraph end.
- **Multi-source**: `[A](url), [B](url)` — comma-separated.
- **Conflicting**: present both inline: `[A](url) claims X; [B](url) claims Y`.
- **Direct quotes**: use `>` blockquote with source attribution.
- **Comparison table**: cite non-trivial factual cells. Obvious facts (e.g., "Open source: Yes") need no cite.
- **Repeated citations**: use short title after first: `[A]` instead of `[Title A](url)`.
- **Agent conclusions**: mark as uncited: "Based on the evidence above, ..."

## Prose Quality Gates

- **≥80% prose / <20% bullet lists**. Findings are paragraphs, not bullet walls.
- Vary sentence structure. Avoid starting consecutive findings with the same pattern.
- Use specific numbers, dates, and version identifiers — not vague language.
- Distinguish between source claims (cited) and agent conclusions (uncited).

## Evidence Thresholds

- **Recommendation**: SHOULD require ≥3 distinct authoritative sources. If fewer, use hedged language ("evidence suggests" not "you should use").
- **Single-source claims**: MUST flag with ⚠️.
- **Unresolved conflicts**: MUST block strong recommendation language. Present both sides.
- **Zero reliable sources found**: emit "Searches completed but no reliable sources were found." with Gaps listing what was tried.
