# Interaction Design

## The Eight Interactive States

Every interactive element needs these states designed:

| State | When | Visual Treatment |
|-------|------|------------------|
| **Default** | At rest | Base styling |
| **Hover** | Pointer over (non-touch) | Subtle lift, color shift |
| **Focus** | Keyboard / programmatic | Visible ring or highlight |
| **Active** | Being pressed | Pressed in, darker |
| **Disabled** | Not interactive | Reduced opacity, no pointer |
| **Loading** | Processing | Spinner, skeleton |
| **Error** | Invalid state | Error color, icon, message |
| **Success** | Completed | Confirmation color, check |

**The common miss**: Designing hover without focus, or vice versa. They're different. Keyboard / assistive-tech users never see hover.

## Haptic Feedback

Haptics are the third feedback channel alongside visual and auditory. On platforms that support it (iOS, watchOS, Android):

- **Light haptic**: Toggles, slider snaps, selection changes — subtle confirmation
- **Medium haptic**: Successful actions, state transitions — clear acknowledgment
- **Heavy haptic**: Destructive confirmations, important alerts — demands attention
- Don't vibrate on every interaction — haptic fatigue is real, just like animation fatigue
- Always pair haptic with visual feedback — haptics alone are insufficient (some devices are muted)

## Focus Indicators

**Never remove focus indicators without replacement.** Show the focus ring for keyboard and assistive-tech navigation; suppress it for pointer interaction. Focus rings should be:

- High contrast (3:1 minimum against adjacent colors)
- 2–3pt thick
- Offset from element (not inside it)
- Consistent across all interactive elements

## Form Design

- **Placeholders aren't labels** — they disappear on input. Always use visible labels.
- **Validate on blur**, not on every keystroke (exception: password strength).
- **Place errors below fields**, clearly connected to the problematic input.
- **Smart defaults** reduce decisions — pre-fill what you can infer.

## Loading States

- **Skeleton screens > spinners** — they preview content shape and feel faster.
- **Optimistic updates**: Show success immediately, rollback on failure. Use for low-stakes actions (likes, follows), never for payments or destructive actions.
- **Be specific**: "Saving your draft…" not "Loading…"
- **Set expectations for long waits**: "This usually takes 30 seconds" or show progress.

## Destructive Actions: Undo > Confirm

Undo is better than confirmation dialogs — users click through confirmations mindlessly:

1. Remove from UI immediately
2. Show undo toast / snackbar
3. Actually delete after toast expires

Use confirmation only for:
- Truly irreversible actions (account deletion)
- High-cost actions (financial)
- Batch operations

When you must confirm: **name the action**, explain consequences, use specific button labels ("Delete project" / "Keep project", not "Yes" / "No").

## Progressive Disclosure

Start simple, reveal sophistication through interaction:

- Basic options first, advanced behind expandable sections
- Hover states that reveal secondary actions
- Contextual menus for power-user features

Don't hide critical functionality — adapt the interface, don't amputate it.

## Gestures

Swipe and other gestures are invisible. Make them discoverable:

- **Partially reveal**: Show action peeking from edge
- **Onboarding**: Coach marks on first use
- **Always provide a visible fallback** — never rely on gestures as the only path

---

**Avoid**: Removing focus indicators. Placeholder text as labels. Touch targets <44pt. Generic error messages ("Something went wrong"). Modals as first resort.
