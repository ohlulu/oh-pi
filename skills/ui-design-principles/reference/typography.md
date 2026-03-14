# Typography

## Vertical Rhythm

Line-height is the base unit for ALL vertical spacing. If body text has 1.5× line-height on 16pt type (= 24pt), spacing values should be multiples of 24pt. Text and space share a mathematical foundation — this creates subconscious harmony.

## Modular Scale & Hierarchy

The common mistake: too many sizes too close together (14, 15, 16, 18…). This creates muddy hierarchy.

**Use fewer sizes with more contrast.** A 5-size system covers most needs:

| Role | Use Case |
|------|----------|
| xs | Captions, legal, metadata |
| sm | Secondary UI, supporting text |
| base | Body text |
| lg | Subheadings, lead text |
| xl+ | Headlines, hero text |

Popular ratios: 1.25 (major third), 1.333 (perfect fourth), 1.5 (perfect fifth). Pick one and commit.

## Readability

- **Measure** (line length): aim for 45–75 characters for body text.
- **Line-height scales inversely** with line length — narrow columns need tighter leading, wide columns need more.
- **Light text on dark backgrounds** needs more breathing room — increase line-height by ~0.05–0.1 from your normal value. Perceived weight is lighter.

## Font Selection

**Avoid invisible defaults.** Every platform has fonts that are everywhere — using them makes your design feel generic. They're fine for tools where personality isn't the goal, but for distinctive design, look elsewhere.

**Apple platforms: prefer system fonts.** SF Pro / SF Rounded / SF Mono / New York are optimized for Apple's rendering engine and support Dynamic Type, optical sizing, and the full weight range out of the box. Use them by default. Only switch to a custom font when brand requirements demand it — and if you do, you own Dynamic Type adaptation.

**System fonts are underrated on all platforms.** They look native, load instantly, and are highly readable. Consider when performance > personality.

When evaluating a custom font, check:
- **x-height** (lowercase letter height relative to cap height) — higher x-height → better readability at small sizes
- **Character width** — too narrow saves space but hurts readability; too wide wastes space
- **Personality match** — does the font's character match your app's tone? Humanist = warm, geometric = precise, slab-serif = sturdy

## Pairing Principles

You often don't need a second font. One well-chosen family in multiple weights creates cleaner hierarchy than two competing typefaces. Only add a second font when you need genuine contrast:

- Serif + Sans (structure contrast)
- Geometric + Humanist (personality contrast)
- Condensed display + Wide body (proportion contrast)

**Never pair fonts that are similar but not identical** (e.g., two geometric sans-serifs). They create visual tension without clear hierarchy.

## Accessibility

- **Never disable zoom** or text scaling. If your layout breaks at 200% scale, fix the layout.
- **Use relative sizing** that respects user system settings.
- **Minimum body text: 16pt equivalent.** Smaller strains eyes.
- **Touch targets** around text links need at least 44pt tap area.

---

**Avoid**: More than 2–3 font families per project. Decorative fonts for body text. Ignoring font loading performance.
