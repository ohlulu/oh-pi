---
name: ui-design-principles
description: >-
  Platform-agnostic UI design principles: typography, color, spacing, motion,
  interaction states, adaptive layout, UX writing, visual hierarchy,
  accessibility, dark mode, and design systems. Load when building, reviewing,
  or critiquing any user-facing interface.
---

# UI Design Principles

Platform-agnostic. Keep the thinking; adapt implementation to your stack.

Consult reference files for depth:

| Reference | Covers |
|-----------|--------|
| [typography](reference/typography.md) | Scale, hierarchy, pairing, readability |
| [color](reference/color.md) | Palette structure, tinted neutrals, dark mode, contrast |
| [spatial-design](reference/spatial-design.md) | Spacing systems, grids, visual hierarchy, depth |
| [motion](reference/motion.md) | Timing, easing, stagger, reduced-motion |
| [interaction](reference/interaction.md) | 8 states, forms, loading, destructive actions |
| [adaptive-design](reference/adaptive-design.md) | Screen sizes, input methods, safe areas |
| [ux-writing](reference/ux-writing.md) | Labels, errors, empty states, voice, i18n |

---

## Design Direction

Commit to a direction before opening the editor:

- **Purpose** — What problem? Who uses it?
- **Tone** — Brutally minimal? Playful? Editorial? Luxury? Pick one and execute with conviction.
- **Differentiation** — What's the one thing someone will remember?

Bold maximalism and refined minimalism both work. The key is **intentionality, not intensity**.

---

## Anti-Patterns — The "AI Slop" Test

If you showed this interface to someone and said "AI made this," would they believe you immediately? If yes, redesign.

### Typography
- ❌ Default / overused typefaces with no personality
- ❌ Monospace as lazy shorthand for "developer / technical"
- ❌ Large icons with rounded corners above every heading — templated, adds nothing

### Color
- ❌ Gray text on colored backgrounds — looks washed out; use a shade of the background color
- ❌ Pure black / pure white — always tint; pure extremes don't exist in nature
- ❌ The AI palette: cyan-on-dark, purple-to-blue gradients, neon on dark
- ❌ Gradient text for "impact" — decorative, not meaningful
- ❌ Default to dark mode with glowing accents — looks "cool" without actual design decisions

### Layout & Space
- ❌ Wrap everything in cards — not everything needs a container
- ❌ Nest cards inside cards — flatten the hierarchy
- ❌ Identical card grids: same size, icon + heading + text, repeated endlessly
- ❌ The hero metric template: big number, small label, supporting stats, gradient accent
- ❌ Center everything — left-aligned with asymmetric layouts feels more designed
- ❌ Same spacing everywhere — without rhythm, layouts feel monotonous

### Visual Details
- ❌ Glassmorphism everywhere — blur/glass/glow as decoration, not function
- ❌ Rounded elements with thick colored border on one side — lazy accent
- ❌ Sparklines as decoration — tiny charts that convey nothing
- ❌ Generic rounded rectangles with drop shadows — safe, forgettable

### Motion
- ❌ Exaggerated bounce / elastic with visible wobble — draws attention to the animation, not the content
- ❌ Animate everything — animation fatigue is real

### Interaction
- ❌ Redundant copy — headers restating intros, buttons re-explained in text
- ❌ Every button is primary — use ghost, text links, secondary styles; hierarchy matters
- ❌ Modals as first resort — modals are lazy; find a better pattern

---

## Positive Patterns

### Typography
- ✅ Pick a distinctive typeface; pair display + body with genuine contrast
- ✅ Modular type scale with few sizes, high contrast between levels
- ✅ Vary weight and size to create clear hierarchy

### Color
- ✅ Commit to a cohesive palette; dominant + sharp accent > evenly spread colors
- ✅ Tint your neutrals toward your brand hue — even subtle tint creates cohesion
- ✅ 60-30-10 rule by visual weight: neutral → secondary → accent

### Layout & Space
- ✅ Create visual rhythm: tight groupings, generous separations
- ✅ Use asymmetry intentionally; break the grid for emphasis
- ✅ Fluid spacing that breathes on larger screens

### Motion
- ✅ One well-orchestrated entrance beats scattered micro-interactions
- ✅ Physics-based springs (subtle overshoot, natural deceleration) — platform standard on Apple
- ✅ Exponential easing (quart/quint/expo) for non-spring contexts
- ✅ Motion to convey state changes — entrances, exits, feedback

### Interaction
- ✅ Progressive disclosure: start simple, reveal sophistication through interaction
- ✅ Empty states that teach the interface, not just say "nothing here"
- ✅ Every interactive surface feels intentional and responsive

---

---

## Attribution

Distilled from [Impeccable](https://github.com/pbakaus/impeccable) by Paul Bakaus.
Builds on [Anthropic's frontend-design skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design).
Both licensed Apache 2.0.
