# UI Design Principles

Platform-agnostic UI design principles covering typography, color, spacing, motion, interaction states, adaptive layout, and UX writing.

## Usage

Ask the agent to apply design principles:

```
Review this UI for design quality
What's wrong with this layout?
Help me pick a color palette
Critique this interface
```

## What It Does

- Provides a design direction framework (purpose, tone, differentiation)
- Identifies "AI slop" anti-patterns (generic cards, default fonts, gradient clichés)
- Guides typography, color, layout, motion, and interaction decisions
- References detailed sub-topics via modular reference files

## When to Use

- Building, reviewing, or critiquing any user-facing interface
- Choosing typography, color palettes, or spacing systems
- Evaluating whether a design feels generic or intentional

## Key Rules

- Commit to a design direction before opening the editor
- If someone would say "AI made this" — redesign
- Bold maximalism and refined minimalism both work; the key is intentionality
- 60-30-10 rule: neutral → secondary → accent
- One well-orchestrated entrance beats scattered micro-interactions

## References

- `reference/typography.md` — scale, hierarchy, pairing, readability
- `reference/color.md` — palette structure, tinted neutrals, dark mode, contrast
- `reference/spatial-design.md` — spacing systems, grids, visual hierarchy, depth
- `reference/motion.md` — timing, easing, stagger, reduced-motion
- `reference/interaction.md` — 8 states, forms, loading, destructive actions
- `reference/adaptive-design.md` — screen sizes, input methods, safe areas
- `reference/ux-writing.md` — labels, errors, empty states, voice, i18n
