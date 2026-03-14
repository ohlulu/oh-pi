# Adaptive Design

## Content-Driven Breakpoints

Don't chase device sizes — let content tell you where to break. Start narrow, stretch until design breaks, add breakpoint there. Three breakpoints usually suffice.

## Detect Input Method, Not Just Screen Size

Screen size doesn't tell you input method. A laptop with touchscreen, a tablet with keyboard — consider both axes:

| Axis | Variants |
|------|----------|
| **Screen size** | Compact, regular, large |
| **Input method** | Touch (coarse), pointer (fine) |
| **Hover support** | Yes (pointer), No (touch) |

- **Fine pointer**: Smaller interactive targets, hover states useful
- **Coarse pointer**: Larger touch targets (44pt+), no hover reliance
- **No hover**: Never hide functionality behind hover — touch users can't access it

## Safe Areas

Modern devices have notches, rounded corners, home indicators, and dynamic islands. Respect system-provided safe area insets — never let interactive content sit behind hardware obstructions.

## Layout Adaptation Patterns

- **Lists → Detail**: Stack on compact, split view on regular+
- **Dense grids**: Reduce columns on compact; don't just shrink everything
- **Progressive disclosure**: Collapse secondary content on compact; use expandable sections

## Navigation Patterns

Core navigation models:

| Pattern | Best for | Example |
|---------|----------|---------|
| **Tab bar** | 3–5 parallel top-level destinations | iOS tab bar, Android bottom nav |
| **Navigation stack** | Drilling into hierarchical content | Settings → Account → Privacy |
| **Sidebar** | Space-rich environments with many destinations | macOS / iPadOS sidebar |
| **Breadcrumb** | Deep hierarchies where context matters | File browsers, admin panels |

### Adaptation by size class

- **Compact**: Tab bar + navigation stack is the safest default combination
- **Regular+**: Sidebar + detail area, or split view
- Tab bar items should not exceed 5 — beyond that, use "More" or rethink the IA

### Depth rule of thumb

If your navigation goes deeper than 3 levels, reconsider the information architecture. Deep stacks disorient users. Flatten where possible.

### Back navigation

The return path must always be visible and predictable. Never leave the user wondering how to go back.

## Image & Asset Adaptation

- Provide assets at multiple resolutions (1×, 2×, 3×) for different pixel densities
- Use different crops/compositions for different size classes, not just scaling
- Lazy-load off-screen content
- Ensure images don't cause layout shift — reserve space with aspect ratios

## Testing

Emulators/simulators are useful for layout but miss:

- Actual touch interactions
- Real CPU/memory constraints
- Font rendering differences
- Keyboard appearance behavior
- System chrome and safe areas

**Test on at least one real device per platform.** Cheap/low-end devices reveal performance issues you'll never see in simulators.

---

**Avoid**: Hiding critical functionality on smaller screens. Device detection instead of feature detection. Separate codebases per screen size. Ignoring landscape orientation.
