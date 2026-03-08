/**
 * Ralph Wiggum v3 — Built-in prompt templates.
 *
 * Each template uses `{{key}}` placeholders resolved by renderer.ts.
 */

// ---------------------------------------------------------------------------
// Task file scaffold (for new loops)
// ---------------------------------------------------------------------------

export const DEFAULT_TASK_TEMPLATE = `# Task

## Goals
- Goal 1

## Checklist
- [ ] Item 1

## Notes
(Update this as you work)
`;

// ---------------------------------------------------------------------------
// Iteration prompts
// ---------------------------------------------------------------------------

export const BUILDING_TEMPLATE = `\
───────────────────────────────────────────────────────────────────────
🔄 RALPH LOOP: {{loopName}} — BUILD | Iteration {{iteration}}{{maxStr}}
───────────────────────────────────────────────────────────────────────

## Task File ({{taskFile}})
{{taskContent}}

---

{{hints}}

## Instructions
1. Study the task file and choose the most important unchecked item
2. Before making changes, search the codebase (don't assume not implemented)
3. Implement the item
4. Run tests/validation to verify
5. **MANDATORY — Update the task file ({{taskFile}}) before calling ralph_done:**
   - Use the edit tool to change \`- [ ]\` to \`- [x]\` for every completed item
   - Add notes under ## Notes for any discoveries or decisions
   - The checklist widget tracks your progress from the task file — if you skip this step, progress will appear stuck at 0
6. When ALL items are complete, output on its own line: <promise>COMPLETE</promise>
7. If a precondition fails or the task is IMPOSSIBLE, output on its own line: <promise>ABORT</promise>
8. Otherwise: call ralph_done to proceed to the next iteration

User controls: ESC pauses. Send a message to resume. /ralph-stop ends.
`;

export const PLANNING_TEMPLATE = `\
───────────────────────────────────────────────────────────────────────
🔄 RALPH LOOP: {{loopName}} — PLAN | Iteration {{iteration}}{{maxStr}}
───────────────────────────────────────────────────────────────────────

## Task File ({{taskFile}})
{{taskContent}}

---

{{hints}}

## Instructions — PLANNING MODE
1. Study the task file: {{taskFile}}
2. Study the existing codebase to understand current state
3. Compare requirements against existing implementation (gap analysis)
4. **MANDATORY — Update the task file ({{taskFile}}) before calling ralph_done:**
   - Use the edit tool to change \`- [ ]\` to \`- [x]\` for completed analysis items
   - Items yet to be implemented, sorted by priority
   - Note any discovered issues or missing elements
   - The checklist widget tracks your progress from the task file — if you skip this step, progress will appear stuck at 0

IMPORTANT: Plan only. Do NOT implement anything. Do NOT write code. Do NOT commit.
Do NOT assume functionality is missing — confirm with code search first.

5. When the plan is complete: <promise>COMPLETE</promise>
6. Otherwise: call ralph_done to refine further

User controls: ESC pauses. Send a message to resume. /ralph-stop ends.
`;

// ---------------------------------------------------------------------------
// Checkpoint / reflection
// ---------------------------------------------------------------------------

export const CHECKPOINT_PROMPT_TEMPLATE = `\
───────────────────────────────────────────────────────────────────────
🪞 CHECKPOINT — MANDATORY FILE UPDATE (Iteration {{iteration}})
───────────────────────────────────────────────────────────────────────

You MUST update the task file ({{taskFile}}) NOW.
This is not optional. The file will be verified after you call ralph_done.

Add or update this section in the task file:

## Checkpoint (Iteration {{iteration}})

### Completed
- [x] Items done so far (update the checklist above too)

### Failed Approaches
- Approach X: failed because Y (DO NOT RETRY THESE)

### Key Decisions
- Decision A: rationale

### Current State
- What's working, what's partially done

### Next Steps
1. Most important next item
2. Second priority

After updating the file, call ralph_done to continue.
`;

// ---------------------------------------------------------------------------
// Session rotation bootstrap
// ---------------------------------------------------------------------------

export const ROTATION_BOOTSTRAP_TEMPLATE = `\
───────────────────────────────────────────────────────────────────────
🔄 RALPH LOOP RESUMED — Session Rotation
Loop: {{loopName}} | Iteration: {{iteration}} | Rotation #{{sessionRotations}}
───────────────────────────────────────────────────────────────────────

Your context has been refreshed via session rotation.

Read your task file: {{taskFile}}
It contains your complete progress, failed approaches, decisions, and next steps.

Continue working from where the checkpoint left off.
Call ralph_done when you complete this iteration.
`;
