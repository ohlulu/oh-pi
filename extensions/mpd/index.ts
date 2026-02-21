/**
 * MPD — Merge, Push, Delete
 *
 * Pure-script extension: merges current feature branch into the default
 * branch, pushes, and deletes the local feature branch. Zero LLM tokens.
 *
 * Usage:
 *   /mpd          — run with confirmation
 *   /mpd --force  — skip confirmation
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// Branches that are never treated as "feature" branches
const PROTECTED_BRANCHES = ["main", "master", "develop", "development", "staging", "release"];

export default function mpdExtension(pi: ExtensionAPI) {
  pi.registerCommand("mpd", {
    description: "Merge feature branch into default, push, and delete local branch",
    handler: async (args, ctx) => {
      const force = args.trim() === "--force";

      // --- Pre-flight checks ---

      const { code: gitCheck } = await pi.exec("git", ["rev-parse", "--git-dir"]);
      if (gitCheck !== 0) {
        ctx.ui.notify("Not a git repository", "error");
        return;
      }

      const currentBranch = await getCurrentBranch(pi);
      if (!currentBranch) {
        ctx.ui.notify("Cannot determine current branch (detached HEAD?)", "error");
        return;
      }

      const defaultBranch = await getDefaultBranch(pi);

      if (PROTECTED_BRANCHES.includes(currentBranch)) {
        ctx.ui.notify(`Already on ${currentBranch} — nothing to merge`, "error");
        return;
      }

      if (await hasUncommittedChanges(pi)) {
        ctx.ui.notify("Uncommitted changes detected. Commit or stash first.", "error");
        return;
      }

      // --- Confirmation ---

      if (!force && ctx.hasUI) {
        const ok = await ctx.ui.confirm(
          "MPD",
          `Merge \`${currentBranch}\` → \`${defaultBranch}\`, push, delete local branch?`,
        );
        if (!ok) {
          ctx.ui.notify("Cancelled", "info");
          return;
        }
      }

      // --- Execute ---

      // 1. Checkout default branch
      const { code: coCode, stderr: coErr } = await pi.exec("git", ["checkout", defaultBranch]);
      if (coCode !== 0) {
        ctx.ui.notify(`Failed to checkout ${defaultBranch}: ${coErr}`, "error");
        return;
      }

      // 2. Pull latest (fast-forward only to avoid surprise merges)
      const { code: pullCode, stderr: pullErr } = await pi.exec("git", ["pull", "--ff-only"]);
      if (pullCode !== 0) {
        ctx.ui.notify(`Pull failed: ${pullErr}. Staying on ${defaultBranch}.`, "error");
        return;
      }

      // 3. Merge feature branch
      const { code: mergeCode, stderr: mergeErr } = await pi.exec("git", [
        "merge",
        currentBranch,
        "--no-edit",
      ]);
      if (mergeCode !== 0) {
        // Abort the failed merge to leave a clean state
        await pi.exec("git", ["merge", "--abort"]);
        ctx.ui.notify(`Merge failed: ${mergeErr}. Aborted.`, "error");
        // Go back to feature branch
        await pi.exec("git", ["checkout", currentBranch]);
        return;
      }

      // 4. Push
      const { code: pushCode, stderr: pushErr } = await pi.exec("git", ["push"]);
      if (pushCode !== 0) {
        ctx.ui.notify(`Push failed: ${pushErr}`, "error");
        return;
      }

      // 5. Delete local feature branch
      const { code: delCode, stderr: delErr } = await pi.exec("git", [
        "branch",
        "-d",
        currentBranch,
      ]);
      if (delCode !== 0) {
        ctx.ui.notify(
          `Merged & pushed, but failed to delete local branch: ${delErr}`,
          "warning",
        );
        return;
      }

      ctx.ui.notify(
        `✓ ${currentBranch} → ${defaultBranch} merged, pushed, local branch deleted`,
        "info",
      );
    },
  });
}

// ---------------------------------------------------------------------------
// Git helpers (self-contained, no external deps)
// ---------------------------------------------------------------------------

async function getCurrentBranch(pi: ExtensionAPI): Promise<string | null> {
  const { stdout, code } = await pi.exec("git", ["branch", "--show-current"]);
  return code === 0 && stdout.trim() ? stdout.trim() : null;
}

async function getDefaultBranch(pi: ExtensionAPI): Promise<string> {
  const { stdout, code } = await pi.exec("git", [
    "symbolic-ref",
    "refs/remotes/origin/HEAD",
    "--short",
  ]);
  if (code === 0 && stdout.trim()) {
    return stdout.trim().replace("origin/", "");
  }

  // Fallback: check local branches
  const { stdout: branches } = await pi.exec("git", ["branch", "--format=%(refname:short)"]);
  const list = branches.trim().split("\n").map((b) => b.trim());
  if (list.includes("main")) return "main";
  if (list.includes("master")) return "master";
  return "main";
}

async function hasUncommittedChanges(pi: ExtensionAPI): Promise<boolean> {
  const { stdout, code } = await pi.exec("git", ["status", "--porcelain"]);
  return code === 0 && stdout.trim().length > 0;
}
