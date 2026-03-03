# Mockup Screen Index

## Problem

Mockups are typically large files (HTML / Figma exports). Loading them whole wastes context and causes AI to hallucinate UI elements from other screens.

## Solution: Screen Index

Build a lookup table in `mockup/README.md` so readers can load specific screens on demand.

## README.md Structure

```markdown
# Mockup

## Update Rules
Update specs before updating mockup (or in the same commit).
Prefix exploratory / undecided frames with [WIP] in the frame label.

## Common CSS (shared by all screens)
| Section | Lines |
|---------|-------|
| Reset + Tokens | 1-60 |
| Phone | 212-238 |
| ... | ... |

## Screen Index

### {Group A}
| ID | Name | HTML Lines | Extra CSS | Related Specs |
|----|------|-----------|-----------|---------------|
| A1 | xxx | 109-185 | Search Bar(374-387), List Row(424-454) | [spec §X](...) |
| A2 | xxx | 186-228 | ... | ... |
```

## On-Demand Loading Flow

```
1. INDEX.md → specs/app-structure.md
2. app-structure.md → "see mockup A1" → mockup/README.md#a1
3. README.md → HTML lines 109-185, CSS: Common + List Row(424-454)
4. Read mockup.html offset=109 limit=77
5. Read mockup.css offset=1 limit=60      (common tokens)
6. Read mockup.css offset=424 limit=31    (list row)
```
