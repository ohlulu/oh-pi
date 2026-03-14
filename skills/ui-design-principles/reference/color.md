# Color

## Tinted Neutrals

Pure gray is dead. Add a subtle hint of your brand hue to all neutrals — even an imperceptible tint creates subconscious cohesion between brand color and UI chrome. Aim for roughly 2–5% hue shift — enough for the subconscious, invisible to the conscious eye.

- Warm tint → friendly, approachable
- Cool tint → professional, technical

## Palette Structure

A complete system needs:

| Role | Purpose |
|------|---------|
| **Primary** | Brand, CTAs, key actions — 1 color, 3–5 shades |
| **Neutral** | Text, backgrounds, borders — 9–11 shade scale |
| **Semantic** | Success, error, warning, info — 4 colors, 2–3 shades each |
| **Surface** | Cards, modals, overlays — 2–3 elevation levels |

**Skip secondary/tertiary unless you need them.** Most apps work fine with one accent color. Adding more creates decision fatigue and visual noise.

### Building a Palette — Minimum Viable Method

1. Start with **1 brand hue**
2. Generate a **9-shade scale** (lightest to darkest) from that hue
3. Pick **1 complementary or analogous accent** for highlights
4. Derive **semantic colors** (success / error / warning / info) — they can share the accent's family or stand alone
5. Tint your neutral gray scale toward the brand hue (2–5%)

## The 60-30-10 Rule

This is about **visual weight**, not pixel count:

- **60%** — Neutral backgrounds, white space, base surfaces
- **30%** — Secondary colors: text, borders, inactive states
- **10%** — Accent: CTAs, highlights, focus states

The common mistake: using the accent color everywhere because it's "the brand color." Accent colors work *because* they're rare. Overuse kills their power.

## Contrast & Accessibility

| Content Type | Minimum Ratio |
|---|---|
| Body text | 4.5:1 |
| Large text (18pt+ or 14pt bold) | 3:1 |
| UI components, icons | 3:1 |

### Dangerous Combinations

- Light gray text on white — the #1 accessibility fail
- **Gray text on any colored background** — gray looks washed out on color. Use a darker shade of the background, or transparency
- Red on green (or vice versa) — 8% of men can't distinguish
- Blue on red — vibrates visually
- Thin light text on images — unpredictable contrast

### Never Use Pure Gray or Pure Black

Pure gray and pure black don't exist in nature — real shadows and surfaces always have a color cast. Even a tiny tint is enough to feel natural without being obviously colored.

## Dark Mode ≠ Inverted Light Mode

You can't just swap colors. Dark mode requires different decisions:

| Light Mode | Dark Mode |
|---|---|
| Shadows for depth | Lighter surfaces for depth (no shadows) |
| Dark text on light | Light text on dark (reduce font weight) |
| Vibrant accents | Desaturate accents slightly |
| White backgrounds | Never pure black — use dark gray with subtle tint |

### Token Architecture

Use two layers: **primitive tokens** (blue-500) and **semantic tokens** (color-primary → blue-500). For dark mode, only redefine the semantic layer.

## Transparency as Design Smell

Heavy use of alpha/transparency usually means an incomplete palette. It creates unpredictable contrast and inconsistency. Define explicit overlay colors for each context instead. Exception: focus rings and interactive states where see-through is functionally needed.

---

**Avoid**: Relying on color alone to convey information. Palettes without clear roles. Pure black for large areas. Skipping color blindness testing.
