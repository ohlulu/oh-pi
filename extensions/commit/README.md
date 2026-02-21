# Commit (Extension)

Smart commit assistant that auto-branches to a cheap model when you're on an expensive one — keeps context clean and saves tokens.

## Usage

```
/commit
/commit <optional hint about what changed>
/end-commit
```

Type `/commit` from any session. If you're on an expensive model (e.g., Opus, GPT-4o), the extension offers to branch to a cheap model (Haiku / Flash) to run the commit workflow there. When done, `/end-commit` returns you to the original session and restores your model.

## How It Works

**Expensive model detected:**
1. Saves current session position + model
2. Branches to a near-empty context (first user message)
3. Switches to cheapest available model (Haiku → Flash → Sonnet)
4. Sends commit prompt; auto-queues `/end-commit` as follow-up
5. `/end-commit` navigates back + restores original model

**Cheap model / user declines switch:**
- Sends commit prompt in-place — no branch switching.

## Commands

| Command | What it does |
|---------|-------------|
| `/commit` | Start smart commit workflow |
| `/commit <hint>` | Pass extra context to the commit agent |
| `/end-commit` | Return to original session and restore model |

## Source Files

- `index.ts` — command registration, model switching logic, session state management
