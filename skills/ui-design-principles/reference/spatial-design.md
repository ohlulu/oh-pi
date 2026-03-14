# Spatial Design

## Spacing Systems

### Use a 4pt Base

8pt systems are too coarse — you'll frequently need 12pt (between 8 and 16). Use 4pt for granularity: 4, 8, 12, 16, 24, 32, 48, 64, 96.

### Name Tokens Semantically

Name by relationship (`space-sm`, `space-lg`), not by value (`spacing-8`). Use gap-based layout instead of individual margins for sibling spacing — it keeps spacing logic in one place and avoids inter-element spacing conflicts.

## Visual Hierarchy

### The Squint Test

Blur your eyes (or screenshot and blur). Can you still identify:
- The most important element?
- The second most important?
- Clear groupings?

If everything looks the same weight, you have a hierarchy problem.

### Hierarchy Through Multiple Dimensions

Don't rely on size alone. Combine:

| Tool | Strong | Weak |
|------|--------|------|
| **Size** | 3:1 ratio+ | <2:1 ratio |
| **Weight** | Bold vs Regular | Medium vs Regular |
| **Color** | High contrast | Similar tones |
| **Position** | Top / leading | Bottom / trailing |
| **Space** | Surrounded by space | Crowded |

**Best hierarchy uses 2–3 dimensions at once**: A heading that's larger, bolder, AND has more space above it.

### Cards Are Not Required

Cards are overused. Spacing and alignment create grouping naturally. Use cards only when:
- Content is truly distinct and actionable
- Items need visual comparison in a grid
- Content needs clear interaction boundaries

**Never nest cards inside cards.** Use spacing, typography, and subtle dividers.

## Optical Adjustments

- Text with zero leading may look indented due to letterform whitespace — use negative offset to optically align.
- Geometrically centered icons often look off-center; play icons need to shift trailing, arrows shift toward their direction.

## Iconography

- All icons in an interface should come from the same family or share consistent style traits: stroke weight, corner radius, filled vs outlined.
- Use a fixed set of icon sizes (e.g., 16 / 20 / 24 / 32). Don't freestyle per-instance.
- When pairing icon + text, align the icon to the text's x-height optically, not by mathematical center.
- Icon-only buttons must have an accessible label — screen readers can't see pictures.

### Touch Targets vs Visual Size

Elements can look small but need large touch targets (44pt minimum). Use padding or invisible hit-test expansion to meet the target without bloating visual size.

## Depth & Elevation

Create a semantic elevation scale (dropdown → sticky → modal-backdrop → modal → toast → tooltip) instead of arbitrary z-values.

For shadows, use a consistent elevation scale (sm → md → lg → xl). **Key insight**: Shadows should be subtle — if you can clearly see the shadow, it's probably too strong.

---

**Avoid**: Arbitrary spacing outside your scale. Making all spacing equal. Creating hierarchy through size alone.
