# UX Writing

## The Button Label Problem

**Never use "OK", "Submit", or "Yes/No".** These are lazy and ambiguous. Use verb + object:

| Bad | Good | Why |
|-----|------|-----|
| OK | Save changes | Says what will happen |
| Submit | Create account | Outcome-focused |
| Yes | Delete message | Confirms the action |
| Cancel | Keep editing | Clarifies what "cancel" means |

**For destructive actions**, name the destruction:
- "Delete" not "Remove" (delete is permanent, remove implies recoverable)
- "Delete 5 items" not "Delete selected" (show the count)

## Error Messages: The Formula

Every error message answers three questions:

1. **What happened?**
2. **Why?**
3. **How to fix it?**

Example: "Email address isn't valid. Please include an @ symbol." — not "Invalid input."

### Templates

| Situation | Template |
|-----------|----------|
| Format error | "[Field] needs to be [format]. Example: [example]" |
| Missing required | "Please enter [what's missing]" |
| Permission denied | "You don't have access to [thing]. [What to do instead]" |
| Network error | "Couldn't reach [thing]. Check your connection and [action]." |
| Server error | "Something went wrong on our end. We're looking into it. [Alternative]" |

**Don't blame the user.** "Please enter a date in MM/DD/YYYY format" — not "You entered an invalid date."

## Empty States Are Opportunities

Empty states are onboarding moments:

1. Acknowledge briefly
2. Explain the value of filling it
3. Provide a clear action

"No projects yet. Create your first one to get started." — not just "No items."

## Voice vs Tone

**Voice** is your brand's personality — consistent everywhere.
**Tone** adapts to the moment:

| Moment | Tone |
|--------|------|
| Success | Celebratory, brief: "Done! Your changes are live." |
| Error | Empathetic, helpful: "That didn't work. Here's what to try…" |
| Loading | Reassuring: "Saving your work…" |
| Destructive confirm | Serious, clear: "Delete this project? This can't be undone." |

**Never use humor for errors.** Users are already frustrated. Be helpful, not cute.

## Accessibility

- **Link / button text must have standalone meaning**: "View pricing plans" not "Click here"
- **Image descriptions** describe information, not the image: "Revenue increased 40% in Q4" not "Chart"
- Exclude decorative images from the accessibility tree — they add noise for screen reader users
- Icon-only buttons need accessible labels

## Writing for Translation

### Plan for Expansion

| Language | Expansion vs English |
|----------|---------------------|
| German | +30% |
| French | +20% |
| Finnish | +30–40% |
| Chinese | −30% chars, ~same width |

### Translation-Friendly Patterns

- Keep numbers separate ("New messages: 3" not "You have 3 new messages")
- Use full sentences as single strings (word order varies by language)
- Avoid abbreviations ("5 minutes ago" not "5 mins ago")
- Give translators context about where strings appear

## Consistency: The Terminology Problem

Pick one term and stick with it:

| Inconsistent | Pick one |
|---|---|
| Delete / Remove / Trash | Delete |
| Settings / Preferences / Options | Settings |
| Sign in / Log in | Sign in |
| Create / Add / New | Create |

Build a terminology glossary and enforce it.

## Avoid Redundant Copy

If the heading explains it, the intro is redundant. If the button is clear, don't explain it again. Say it once, say it well.

---

**Avoid**: Jargon without explanation. Blaming users. Vague errors. Varying terminology for variety. Humor in error states.
