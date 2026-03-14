# Motion Design

## Duration: The 100/300/500 Rule

Timing matters more than easing:

| Duration | Use Case | Examples |
|----------|----------|---------|
| **100–150ms** | Instant feedback | Button press, toggle, color change |
| **200–300ms** | State changes | Menu open, tooltip, hover states |
| **300–500ms** | Layout changes | Accordion, modal, drawer |
| **500–800ms** | Entrance animations | Page load, hero reveals |

**Exit animations are faster than entrances** — use ~75% of enter duration.

## Easing: Pick the Right Curve

Don't use generic "ease." Instead:

| Curve | Use For |
|-------|---------|
| **Ease-out** (decelerate) | Elements entering the screen |
| **Ease-in** (accelerate) | Elements leaving the screen |
| **Ease-in-out** | State toggles (there → back) |

**For micro-interactions, use exponential curves** — they feel natural because they mimic real physics (friction, deceleration):

- **Quart out** — smooth, refined (recommended default)
- **Quint out** — slightly more dramatic
- **Expo out** — snappy, confident

**Physics-based springs are different from novelty bounce.** Subtle spring animations (small overshoot, natural settling) are the platform standard on Apple — SwiftUI's default animation is a spring. Use them freely. What to avoid: exaggerated bounce/elastic with visible wobble — the kind that was trendy circa 2015. If the user notices the wobble, it's too much.

## What to Animate

Prefer **transform** (position, scale, rotation) and **opacity**. Directly animating an element's size and spacing is generally more expensive than animating its transform. For expand/collapse, prefer techniques that avoid directly animating height (e.g., scale transforms, clip masks, or platform-native disclosure controls).

## Staggered Animations

Stagger items with incremental delay (e.g., each item +50ms). **Cap total stagger time** — 10 items at 50ms = 500ms total. For large collections, reduce per-item delay or cap staggered count.

## Reduced Motion

Not optional. Vestibular disorders affect ~35% of adults over 40.

- **Provide alternatives**: Replace spatial motion (slides, zooms) with crossfades.
- **Preserve functional animations**: Progress bars, loading spinners (slowed), focus indicators should still work — just without spatial movement.
- **Respect system preferences**: Check the OS-level reduced motion setting.

## Perceived Performance

**Nobody cares how fast your app is — just how fast it feels.**

- **The 100ms threshold** (Nielsen): Anything under ~100ms feels instantaneous. This is your target for micro-interaction response time.
- **Active vs passive time**: Passive waiting (staring at spinner) feels longer than active engagement. Show content progressively; use skeleton UI; start transitions immediately while loading.
- **Optimistic UI**: See [interaction reference](interaction.md) — Loading States section.
- **Too-fast can hurt**: Users may distrust instant results for complex operations. Sometimes a brief delay signals "real work."

---

**Avoid**: Animating everything (fatigue). >500ms for UI feedback. Ignoring reduced-motion preferences. Using animation to hide slow loading.
