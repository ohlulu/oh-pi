# Postmortem

Blameless, structured review of coding mistakes, incidents, and bad decisions. Produces a permanent record with root cause analysis, timeline, and actionable lessons.

## Usage

Ask the agent to conduct a postmortem:

```
Do a postmortem on this bug
What went wrong with the auth migration?
檢討 / 覆盤 / 事後分析
```

## What It Does

- Gathers context from git history, logs, and thread discussion
- Conducts 5-Whys analysis to find systemic root cause
- Creates a structured postmortem file in `docs/postmortem/`
- Checks existing postmortems for recurring patterns
- Supports both project-level and global (`~/.pi/agent/docs/postmortem/`) placement

## When to Use

- A bug shipped because of a preventable mistake
- Significant time wasted on a wrong approach
- Production incident (outage, data loss, security)
- User explicitly asks for a retro / postmortem

## When NOT to Use

- Normal debugging (use inline root-cause analysis)
- Minor typos or trivial fixes with no systemic lesson
- Planning future work (use SDD skill)

## Key Rules

- Always blameless — describe what happened to the system, not who
- Root cause must be systemic (process / tool / knowledge gap)
- Must include at least one concrete action item with clear "done" condition
- Never skip the 5-Whys
- Keep under 250 lines

## References

- `references/template.md` — postmortem file template
