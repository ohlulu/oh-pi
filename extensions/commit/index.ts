/**
 * Smart Commit Extension
 *
 * Registers `/commit` and `/end-commit` commands.
 * When using an expensive model, automatically branches to an empty context,
 * switches to a cheap model, runs the commit workflow, then returns to
 * the original position and restores the model.
 *
 * Flow (expensive model detected):
 *   1. Save current leaf + model
 *   2. navigateTree → first user message (near-empty context)
 *   3. setModel → cheap model (Haiku / Flash)
 *   4. sendUserMessage with commit prompt
 *   5. Queue `/end-commit` as followUp
 *   6. /end-commit navigates back + restores model
 *
 * Flow (cheap model or user declines):
 *   Sends commit prompt in-place, no branch switching.
 */
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COMMIT_STATE_TYPE = "commit-session";
const COMMITTER_PATH = "~/.pi/agent/shared/scripts/committer";

/** Models considered "cheap enough" to skip branching (cost ≤ threshold $/M output). */
const CHEAP_OUTPUT_COST_THRESHOLD = 5;

/** Preferred cheap models in priority order: [provider, modelId]. */
const CHEAP_MODEL_CANDIDATES: [string, string][] = [
  ["anthropic", "claude-haiku-3-5"],
  ["google", "gemini-2.5-flash"],
  ["anthropic", "claude-sonnet-4-5"],
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type CommitSessionState = {
  active: boolean;
  originId?: string;
  originalProvider?: string;
  originalModelId?: string;
};

let commitOriginId: string | undefined;
let commitOriginalProvider: string | undefined;
let commitOriginalModelId: string | undefined;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isExpensiveModel(ctx: ExtensionContext): boolean {
  const model = ctx.model;
  if (!model) return false;
  return (model.cost?.output ?? 0) > CHEAP_OUTPUT_COST_THRESHOLD;
}

function getCommitState(ctx: ExtensionContext): CommitSessionState | undefined {
  let state: CommitSessionState | undefined;
  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type === "custom" && entry.customType === COMMIT_STATE_TYPE) {
      state = entry.data as CommitSessionState | undefined;
    }
  }
  return state;
}

function applyCommitState(ctx: ExtensionContext) {
  const state = getCommitState(ctx);
  if (state?.active && state.originId) {
    commitOriginId = state.originId;
    commitOriginalProvider = state.originalProvider;
    commitOriginalModelId = state.originalModelId;
    setCommitWidget(ctx, true);
    return;
  }
  clearState(ctx);
}

function clearState(ctx: ExtensionContext) {
  commitOriginId = undefined;
  commitOriginalProvider = undefined;
  commitOriginalModelId = undefined;
  setCommitWidget(ctx, false);
}

function setCommitWidget(ctx: ExtensionContext, active: boolean) {
  if (!ctx.hasUI) return;
  if (!active) {
    ctx.ui.setWidget("commit", undefined);
    return;
  }

  ctx.ui.setWidget("commit", (_tui, theme) => {
    const text = new Text(
      theme.fg("warning", "Commit session active, return with /end-commit"),
      0,
      0,
    );
    return {
      render(width: number) {
        return text.render(width);
      },
      invalidate() {
        text.invalidate();
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const COMMIT_SYSTEM_PROMPT = `You are a commit assistant. Your ONLY job is to:

1. Run \`git status\` and \`git diff\` / \`git diff --staged\` to understand changes.
2. Classify the commit type (feat|fix|refactor|docs|style|test|perf|build|ci|chore).
3. Write a Conventional Commits message: imperative mood, lowercase, ≤72 chars subject.
4. List every file explicitly — never use "." as a path.
5. Commit using: ${COMMITTER_PATH} "<message>" file1 file2 ...
6. If changes serve different purposes, split into separate commits.

Rules:
- NEVER run \`git commit\` directly — always use ${COMMITTER_PATH}.
- Subject: imperative mood, lowercase start, no trailing period, ≤72 chars.
- Body (optional): explain WHY, not what. Wrap at 72 chars.
- One commit = one logical unit of work.
- Verify no unrelated files are staged.`;

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function commitExtension(pi: ExtensionAPI) {
  // Restore state on session lifecycle events
  pi.on("session_start", (_event, ctx) => applyCommitState(ctx));
  pi.on("session_switch", (_event, ctx) => applyCommitState(ctx));
  pi.on("session_tree", (_event, ctx) => applyCommitState(ctx));

  // -------------------------------------------------------------------------
  // /commit
  // -------------------------------------------------------------------------

  pi.registerCommand("commit", {
    description: "Smart commit: auto-switches to a cheap model when on an expensive one",
    handler: async (args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("Commit requires interactive mode", "error");
        return;
      }

      if (commitOriginId) {
        ctx.ui.notify("Already in a commit session. Use /end-commit to finish.", "warning");
        return;
      }

      // Check if git repo
      const { code } = await pi.exec("git", ["rev-parse", "--git-dir"]);
      if (code !== 0) {
        ctx.ui.notify("Not a git repository", "error");
        return;
      }

      const expensive = isExpensiveModel(ctx);

      // If cheap model or user opts to stay, just send prompt in-place
      if (!expensive) {
        pi.sendUserMessage(buildCommitPrompt(args));
        return;
      }

      // Expensive model — offer branch switch
      const choice = await ctx.ui.select(
        `Current model is expensive (${ctx.model?.name}). Switch to cheap model for commit?`,
        ["Switch model (save tokens)", "Use current model"],
      );

      if (choice === undefined) {
        ctx.ui.notify("Commit cancelled", "info");
        return;
      }

      if (choice === "Use current model") {
        pi.sendUserMessage(buildCommitPrompt(args));
        return;
      }

      // --- Branch + switch flow ---
      const originId = ctx.sessionManager.getLeafId() ?? undefined;
      if (!originId) {
        ctx.ui.notify("Cannot determine session position. Try again.", "error");
        return;
      }

      const entries = ctx.sessionManager.getEntries();
      const firstUserMessage = entries.find(
        (e) => e.type === "message" && e.message.role === "user",
      );

      if (!firstUserMessage) {
        ctx.ui.notify("No user message found in session", "error");
        return;
      }

      // Navigate to empty branch
      try {
        const result = await ctx.navigateTree(firstUserMessage.id, {
          summarize: false,
          label: "smart-commit",
        });
        if (result.cancelled) return;
      } catch (error) {
        ctx.ui.notify(
          `Failed to branch: ${error instanceof Error ? error.message : String(error)}`,
          "error",
        );
        return;
      }

      // Save original model
      commitOriginId = originId;
      if (ctx.model) {
        commitOriginalProvider = ctx.model.provider;
        commitOriginalModelId = ctx.model.id;
      }

      // Switch to cheap model
      let switched = false;
      for (const [provider, modelId] of CHEAP_MODEL_CANDIDATES) {
        const cheapModel = ctx.modelRegistry.find(provider, modelId);
        if (cheapModel) {
          const ok = await pi.setModel(cheapModel);
          if (ok) {
            ctx.ui.notify(`Switched to ${cheapModel.name} for commit`, "info");
            switched = true;
            break;
          }
        }
      }

      if (!switched) {
        ctx.ui.notify("No cheap model available, using current model", "warning");
      }

      // Persist state
      setCommitWidget(ctx, true);
      pi.appendEntry(COMMIT_STATE_TYPE, {
        active: true,
        originId,
        originalProvider: commitOriginalProvider,
        originalModelId: commitOriginalModelId,
      } satisfies CommitSessionState);

      ctx.ui.setEditorText("");

      // Send commit prompt + queue auto-return
      pi.sendUserMessage(buildCommitPrompt(args));
      pi.sendUserMessage("/end-commit", { deliverAs: "followUp" });
    },
  });

  // -------------------------------------------------------------------------
  // /end-commit
  // -------------------------------------------------------------------------

  pi.registerCommand("end-commit", {
    description: "Return from commit branch and restore original model",
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("end-commit requires interactive mode", "error");
        return;
      }

      // Try module state first, then persisted state
      if (!commitOriginId) {
        const state = getCommitState(ctx);
        if (state?.active && state.originId) {
          commitOriginId = state.originId;
          commitOriginalProvider = state.originalProvider;
          commitOriginalModelId = state.originalModelId;
        } else {
          ctx.ui.notify("Not in a commit session", "info");
          return;
        }
      }

      const originId = commitOriginId;
      const savedProvider = commitOriginalProvider;
      const savedModelId = commitOriginalModelId;

      // Navigate back — no summary needed, commit result lives in git
      try {
        const result = await ctx.navigateTree(originId!, { summarize: false });
        if (result.cancelled) {
          ctx.ui.notify("Navigation cancelled. Use /end-commit to try again.", "info");
          return;
        }
      } catch (error) {
        ctx.ui.notify(
          `Failed to return: ${error instanceof Error ? error.message : String(error)}`,
          "error",
        );
        return;
      }

      // Clear state
      clearState(ctx);
      pi.appendEntry(COMMIT_STATE_TYPE, { active: false } satisfies CommitSessionState);

      // Restore model
      if (savedProvider && savedModelId) {
        const originalModel = ctx.modelRegistry.find(savedProvider, savedModelId);
        if (originalModel) {
          const ok = await pi.setModel(originalModel);
          if (ok) {
            ctx.ui.notify(`Restored model to ${originalModel.name}`, "info");
          }
        }
      }

      ctx.ui.notify("Commit complete! Returned to original position.", "info");
    },
  });
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildCommitPrompt(userHint?: string): string {
  let prompt = COMMIT_SYSTEM_PROMPT + "\n\nPlease analyze the current changes and create appropriate commit(s).";

  if (userHint?.trim()) {
    prompt += `\n\nAdditional context from user: ${userHint.trim()}`;
  }

  return prompt;
}
