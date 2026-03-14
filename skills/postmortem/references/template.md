# Postmortem File Template

Use this structure when creating a new file in `docs/postmortem/`.

---

```markdown
---
summary: <One-line: what went wrong + key lesson>
incident_date: <YYYY-MM-DD>
tags:
  - <tag1>
  - <tag2>
root_cause: <One-line systemic cause>
status: <resolved | monitoring | open>
---

# <Title: short descriptive name>

## What Happened

Brief factual description of the incident or mistake.
2-5 sentences max. Focus on observable behavior, not blame.

## Timeline

| When | What |
|------|------|
| <time/commit> | <event> |
| ... | ... |

Keep it short — only key moments (discovery, wrong turn, fix).

## Root Cause Analysis (5 Whys)

1. **Why** did [symptom]? → [answer]
2. **Why** [answer 1]? → [answer]
3. **Why** [answer 2]? → [answer]
4. **Why** [answer 3]? → [answer]
5. **Why** [answer 4]? → **Root cause: [systemic issue]**

## Resolution

What was actually done to fix the issue. Code changes, config changes, reverts, etc.
Be specific — reference commits or files when relevant.

## Why This Solution

Why this approach over alternatives. What trade-offs were considered.
If there were other options explored and rejected, briefly note why.

## What Went Well

- Things that helped detect or fix the issue quickly
- Existing safeguards that limited the blast radius

## Action Items

| Action | Type | Status |
|--------|------|--------|
| <concrete task with done condition> | prevent / detect / mitigate | [ ] |
| ... | ... | [ ] |

**Action types:**
- **prevent**: stop this class of issue from happening
- **detect**: catch it faster next time
- **mitigate**: reduce impact when it does happen

## Lessons Learned

Key takeaways in 1-3 bullet points. Generalizable beyond this specific incident.

- ...
```
