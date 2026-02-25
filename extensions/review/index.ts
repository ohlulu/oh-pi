/**
 * Code Review Extension entry point.
 *
 * Provides `/review` and `/end-review` commands.
 * See git.ts for git helpers and prompts.ts for prompt templates.
 */
import type { ExtensionAPI, ExtensionContext, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { DynamicBorder, BorderedLoader } from "@mariozechner/pi-coding-agent";
import { Container, type SelectItem, SelectList, Text } from "@mariozechner/pi-tui";
import path from "node:path";
import { homedir } from "node:os";
import { promises as fs } from "node:fs";

import {
  getMergeBase,
  getLocalBranches,
  getRecentCommits,
  hasUncommittedChanges,
  hasPendingChanges,
  parsePrReference,
  getPrInfo,
  checkoutPr,
  getCurrentBranch,
  getDefaultBranch,
} from "./git.js";

import {
  type ReviewTarget,
  type ReviewPresetValue,
  buildReviewPrompt,
  getUserFacingHint,
  loadSharedReviewRubric,
  loadProjectReviewGuidelines,
  REVIEW_PRESETS,
  REVIEW_SUMMARY_PROMPT,
} from "./prompts.js";

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

// State to track fresh session review (where we branched from).
// Module-level state means only one review can be active at a time.
// This is intentional - the UI and /end-review command assume a single active review.
let reviewOriginId: string | undefined = undefined;
let reviewOriginalProvider: string | undefined = undefined;
let reviewOriginalModelId: string | undefined = undefined;

const REVIEW_STATE_TYPE = "review-session";

type ReviewSessionState = {
  active: boolean;
  originId?: string;
  originalProvider?: string;
  originalModelId?: string;
};

// ---------------------------------------------------------------------------
// Session state helpers
// ---------------------------------------------------------------------------

function setReviewWidget(ctx: ExtensionContext, active: boolean) {
  if (!ctx.hasUI) return;
  if (!active) {
    ctx.ui.setWidget("review", undefined);
    return;
  }

  ctx.ui.setWidget("review", (_tui, theme) => {
    const text = new Text(theme.fg("warning", "Review session active, return with /end-review"), 0, 0);
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

function getReviewState(ctx: ExtensionContext): ReviewSessionState | undefined {
  let state: ReviewSessionState | undefined;
  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type === "custom" && entry.customType === REVIEW_STATE_TYPE) {
      state = entry.data as ReviewSessionState | undefined;
    }
  }

  return state;
}

function applyReviewState(ctx: ExtensionContext) {
  const state = getReviewState(ctx);

  if (state?.active && state.originId) {
    reviewOriginId = state.originId;
    reviewOriginalProvider = state.originalProvider;
    reviewOriginalModelId = state.originalModelId;
    setReviewWidget(ctx, true);
    return;
  }

  reviewOriginId = undefined;
  reviewOriginalProvider = undefined;
  reviewOriginalModelId = undefined;
  setReviewWidget(ctx, false);
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function reviewExtension(pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    applyReviewState(ctx);
  });

  pi.on("session_switch", (_event, ctx) => {
    applyReviewState(ctx);
  });

  pi.on("session_tree", (_event, ctx) => {
    applyReviewState(ctx);
  });

  const GIT_DEPENDENT_PRESETS: ReadonlySet<ReviewPresetValue> = new Set<ReviewPresetValue>([
    "pullRequest",
    "baseBranch",
    "uncommitted",
    "commit",
  ]);

  const REVIEW_MODEL_PROVIDER = "openai-codex";
  const REVIEW_MODEL_ID = "gpt-5.3-codex";

  async function isGitRepo(): Promise<boolean> {
    const { code } = await pi.exec("git", ["rev-parse", "--git-dir"]);
    return code === 0;
  }

  /**
   * Determine the smart default review type based on git state
   */
  async function getSmartDefault(): Promise<"uncommitted" | "baseBranch" | "commit"> {
    if (await hasUncommittedChanges(pi)) {
      return "uncommitted";
    }

    const currentBranch = await getCurrentBranch(pi);
    const defaultBranch = await getDefaultBranch(pi);
    if (currentBranch && currentBranch !== defaultBranch) {
      return "baseBranch";
    }

    return "commit";
  }

  /**
   * Show the review preset selector
   */
  async function showReviewSelector(ctx: ExtensionContext): Promise<ReviewTarget | null> {
    const inGitRepo = await isGitRepo();
    const smartDefault = inGitRepo ? await getSmartDefault() : "folder";
    const items: SelectItem[] = REVIEW_PRESETS.slice()
      .filter((preset) => inGitRepo || !GIT_DEPENDENT_PRESETS.has(preset.value))
      .sort((a, b) => {
        if (a.value === smartDefault) return -1;
        if (b.value === smartDefault) return 1;
        return 0;
      })
      .map((preset) => ({
        value: preset.value,
        label: preset.label,
        description: preset.description,
      }));

    while (true) {
      const result = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
        const container = new Container();
        container.addChild(new DynamicBorder((str) => theme.fg("accent", str)));
        container.addChild(new Text(theme.fg("accent", theme.bold("Select a review preset"))));

        const selectList = new SelectList(items, Math.min(items.length, 10), {
          selectedPrefix: (text) => theme.fg("accent", text),
          selectedText: (text) => theme.fg("accent", text),
          description: (text) => theme.fg("muted", text),
          scrollInfo: (text) => theme.fg("dim", text),
          noMatch: (text) => theme.fg("warning", text),
        });

        selectList.onSelect = (item) => done(item.value);
        selectList.onCancel = () => done(null);

        container.addChild(selectList);
        container.addChild(new Text(theme.fg("dim", "Press enter to confirm or esc to go back")));
        container.addChild(new DynamicBorder((str) => theme.fg("accent", str)));

        return {
          render(width: number) {
            return container.render(width);
          },
          invalidate() {
            container.invalidate();
          },
          handleInput(data: string) {
            selectList.handleInput(data);
            tui.requestRender();
          },
        };
      });

      if (!result) return null;

      switch (result) {
        case "uncommitted":
          return { type: "uncommitted" };

        case "baseBranch": {
          const target = await showBranchSelector(ctx);
          if (target) return target;
          break;
        }

        case "commit": {
          const target = await showCommitSelector(ctx);
          if (target) return target;
          break;
        }

        case "custom": {
          const target = await showCustomInput(ctx);
          if (target) return target;
          break;
        }

        case "folder": {
          const target = await showFolderInput(ctx);
          if (target) return target;
          break;
        }

        case "pullRequest": {
          const target = await showPrInput(ctx);
          if (target) return target;
          break;
        }

        default:
          return null;
      }
    }
  }

  /**
   * Show branch selector for base branch review
   */
  async function showBranchSelector(ctx: ExtensionContext): Promise<ReviewTarget | null> {
    const branches = await getLocalBranches(pi);
    const currentBranch = await getCurrentBranch(pi);
    const defaultBranch = await getDefaultBranch(pi);

    const candidateBranches = currentBranch ? branches.filter((b) => b !== currentBranch) : branches;

    if (candidateBranches.length === 0) {
      ctx.ui.notify(currentBranch ? `No other branches found (current branch: ${currentBranch})` : "No branches found", "error");
      return null;
    }

    const sortedBranches = candidateBranches.sort((a, b) => {
      if (a === defaultBranch) return -1;
      if (b === defaultBranch) return 1;
      return a.localeCompare(b);
    });

    const items: SelectItem[] = sortedBranches.map((branch) => ({
      value: branch,
      label: branch,
      description: branch === defaultBranch ? "(default)" : "",
    }));

    const result = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
      const container = new Container();
      container.addChild(new DynamicBorder((str) => theme.fg("accent", str)));
      container.addChild(new Text(theme.fg("accent", theme.bold("Select base branch"))));

      const selectList = new SelectList(items, Math.min(items.length, 10), {
        selectedPrefix: (text) => theme.fg("accent", text),
        selectedText: (text) => theme.fg("accent", text),
        description: (text) => theme.fg("muted", text),
        scrollInfo: (text) => theme.fg("dim", text),
        noMatch: (text) => theme.fg("warning", text),
      });

      selectList.searchable = true;

      selectList.onSelect = (item) => done(item.value);
      selectList.onCancel = () => done(null);

      container.addChild(selectList);
      container.addChild(new Text(theme.fg("dim", "Type to filter • enter to select • esc to cancel")));
      container.addChild(new DynamicBorder((str) => theme.fg("accent", str)));

      return {
        render(width: number) {
          return container.render(width);
        },
        invalidate() {
          container.invalidate();
        },
        handleInput(data: string) {
          selectList.handleInput(data);
          tui.requestRender();
        },
      };
    });

    if (!result) return null;
    return { type: "baseBranch", branch: result };
  }

  /**
   * Show commit selector
   */
  async function showCommitSelector(ctx: ExtensionContext): Promise<ReviewTarget | null> {
    const commits = await getRecentCommits(pi, 20);

    if (commits.length === 0) {
      ctx.ui.notify("No commits found", "error");
      return null;
    }

    const items: SelectItem[] = commits.map((commit) => ({
      value: commit.sha,
      label: `${commit.sha.slice(0, 7)} ${commit.title}`,
      description: "",
    }));

    const result = await ctx.ui.custom<{ sha: string; title: string } | null>((tui, theme, _kb, done) => {
      const container = new Container();
      container.addChild(new DynamicBorder((str) => theme.fg("accent", str)));
      container.addChild(new Text(theme.fg("accent", theme.bold("Select commit to review"))));

      const selectList = new SelectList(items, Math.min(items.length, 10), {
        selectedPrefix: (text) => theme.fg("accent", text),
        selectedText: (text) => theme.fg("accent", text),
        description: (text) => theme.fg("muted", text),
        scrollInfo: (text) => theme.fg("dim", text),
        noMatch: (text) => theme.fg("warning", text),
      });

      selectList.searchable = true;

      selectList.onSelect = (item) => {
        const commit = commits.find((c) => c.sha === item.value);
        if (commit) {
          done(commit);
        } else {
          done(null);
        }
      };
      selectList.onCancel = () => done(null);

      container.addChild(selectList);
      container.addChild(new Text(theme.fg("dim", "Type to filter • enter to select • esc to cancel")));
      container.addChild(new DynamicBorder((str) => theme.fg("accent", str)));

      return {
        render(width: number) {
          return container.render(width);
        },
        invalidate() {
          container.invalidate();
        },
        handleInput(data: string) {
          selectList.handleInput(data);
          tui.requestRender();
        },
      };
    });

    if (!result) return null;
    return { type: "commit", sha: result.sha, title: result.title };
  }

  /**
   * Show custom instructions input
   */
  async function showCustomInput(ctx: ExtensionContext): Promise<ReviewTarget | null> {
    const result = await ctx.ui.editor("Enter review instructions:", "Review the code for security vulnerabilities and potential bugs...");

    if (!result?.trim()) return null;
    return { type: "custom", instructions: result.trim() };
  }

  /**
   * Parse space-separated paths, respecting single/double quotes and backslash-escaped spaces.
   * Examples:
   *   `"/path/with spaces/file.ts" './another one'`  → ['/path/with spaces/file.ts', './another one']
   *   `/path/no\ spaces/here`                        → ['/path/no spaces/here']
   *   `a b c`                                        → ['a', 'b', 'c']
   */
  function parseReviewPaths(value: string): string[] {
    const results: string[] = [];
    let current = "";
    let quote: string | null = null;
    let escaped = false;

    for (const ch of value) {
      if (escaped) {
        current += ch;
        escaped = false;
        continue;
      }

      if (ch === "\\") {
        escaped = true;
        continue;
      }

      if (quote) {
        if (ch === quote) {
          quote = null;
        } else {
          current += ch;
        }
        continue;
      }

      if (ch === '"' || ch === "'") {
        quote = ch;
        continue;
      }

      if (/\s/.test(ch)) {
        if (current.length > 0) {
          results.push(current);
          current = "";
        }
        continue;
      }

      current += ch;
    }

    if (current.length > 0) {
      results.push(current);
    }

    // Strip leading '@' only when it's pi file-mention syntax (token starts with
    // '@' followed by a path-like char). Preserve '@' inside path segments
    // (e.g. 'packages/@scope/lib' stays intact).
    return results.map((p) => {
      if (p.startsWith("@") && p.length > 1 && (p[1] === "/" || p[1] === "." || p[1] === "~")) {
        return p.slice(1);
      }
      return p;
    });
  }

  /**
   * Show folder input
   */
  async function showFolderInput(ctx: ExtensionContext): Promise<ReviewTarget | null> {
    const result = await ctx.ui.editor("Enter folders/files to review (space-separated or one per line):", ".");

    if (!result?.trim()) return null;
    const paths = parseReviewPaths(result);
    if (paths.length === 0) return null;

    return { type: "folder", paths: normalizeReviewPaths(paths, ctx.cwd) };
  }

  /**
   * Show PR input and handle checkout
   */
  async function showPrInput(ctx: ExtensionContext): Promise<ReviewTarget | null> {
    // Fast-fail before opening the editor
    if (await hasPendingChanges(pi)) {
      ctx.ui.notify("Cannot checkout PR: you have uncommitted changes. Please commit or stash them first.", "error");
      return null;
    }

    const prRef = await ctx.ui.editor("Enter PR number or URL (e.g. 123 or https://github.com/owner/repo/pull/123):", "");

    if (!prRef?.trim()) return null;
    return handlePrCheckout(ctx, prRef.trim());
  }

  /**
   * Execute the review
   */
  async function executeReview(ctx: ExtensionCommandContext, target: ReviewTarget, useFreshSession: boolean): Promise<void> {
    if (reviewOriginId) {
      ctx.ui.notify("Already in a review. Use /end-review to finish first.", "warning");
      return;
    }

    if (useFreshSession) {
      const originId = ctx.sessionManager.getLeafId() ?? undefined;
      if (!originId) {
        ctx.ui.notify("Failed to determine review origin. Try again from a session with messages.", "error");
        return;
      }
      reviewOriginId = originId;

      const lockedOriginId = originId;

      const entries = ctx.sessionManager.getEntries();
      const firstUserMessage = entries.find((e) => e.type === "message" && e.message.role === "user");

      if (!firstUserMessage) {
        ctx.ui.notify("No user message found in session", "error");
        reviewOriginId = undefined;
        return;
      }

      try {
        const result = await ctx.navigateTree(firstUserMessage.id, { summarize: false, label: "code-review" });
        if (result.cancelled) {
          reviewOriginId = undefined;
          return;
        }
      } catch (error) {
        reviewOriginId = undefined;
        ctx.ui.notify(`Failed to start review: ${error instanceof Error ? error.message : String(error)}`, "error");
        return;
      }

      reviewOriginId = lockedOriginId;

      ctx.ui.setEditorText("");

      const currentModel = ctx.model;
      if (currentModel) {
        reviewOriginalProvider = currentModel.provider;
        reviewOriginalModelId = currentModel.id;
      }
      const reviewModel = ctx.modelRegistry.find(REVIEW_MODEL_PROVIDER, REVIEW_MODEL_ID);
      if (reviewModel) {
        const ok = await pi.setModel(reviewModel);
        if (ok) {
          ctx.ui.notify(`Switched to ${REVIEW_MODEL_ID} for review`, "info");
        } else {
          ctx.ui.notify(`No API key for ${REVIEW_MODEL_ID}, using current model`, "warning");
        }
      }

      setReviewWidget(ctx, true);

      pi.appendEntry(REVIEW_STATE_TYPE, {
        active: true,
        originId: lockedOriginId,
        originalProvider: reviewOriginalProvider,
        originalModelId: reviewOriginalModelId,
      });
    }

    const prompt = await buildReviewPrompt(pi, target);
    const hint = getUserFacingHint(target);
    const projectGuidelines = await loadProjectReviewGuidelines(ctx.cwd);
    const reviewRubric = await loadSharedReviewRubric();

    let fullPrompt = `${reviewRubric}\n\n---\n\nPlease perform a code review with the following focus:\n\n${prompt}\n\nIMPORTANT: Output the entire review report in Traditional Chinese (台灣繁體中文).`;

    if (projectGuidelines) {
      fullPrompt += `\n\nThis project has additional instructions for code reviews:\n\n${projectGuidelines}`;
    }

    const modeHint = useFreshSession ? " (fresh session)" : "";
    ctx.ui.notify(`Starting review: ${hint}${modeHint}`, "info");

    pi.sendUserMessage(fullPrompt);
  }

  function resolvePathToken(token: string, cwd: string): string {
    if (token === "~") return homedir();
    if (token.startsWith("~/")) return path.join(homedir(), token.slice(2));
    return path.resolve(cwd, token);
  }

  function normalizeReviewPaths(paths: string[], cwd: string): string[] {
    return paths.map((p) => resolvePathToken(p, cwd));
  }

  async function allPathsExist(paths: string[], cwd: string): Promise<boolean> {
    const checks = await Promise.all(
      paths.map(async (p) => {
        const resolved = resolvePathToken(p, cwd);
        const stats = await fs.stat(resolved).catch(() => null);
        return Boolean(stats?.isFile() || stats?.isDirectory());
      }),
    );

    return checks.every(Boolean);
  }

  /**
   * Parse command arguments for direct invocation
   */
  async function parseArgs(args: string | undefined, cwd: string): Promise<ReviewTarget | { type: "pr"; ref: string } | null> {
    if (!args?.trim()) return null;

    const parts = args.trim().split(/\s+/);
    const subcommand = parts[0]?.toLowerCase();

    switch (subcommand) {
      case "uncommitted":
        return { type: "uncommitted" };

      case "branch": {
        const branch = parts[1];
        if (!branch) return null;
        return { type: "baseBranch", branch };
      }

      case "commit": {
        const sha = parts[1];
        if (!sha) return null;
        const title = parts.slice(2).join(" ") || undefined;
        return { type: "commit", sha, title };
      }

      case "custom": {
        const instructions = parts.slice(1).join(" ");
        if (!instructions) return null;
        return { type: "custom", instructions };
      }

      case "folder":
      case "file":
      case "path": {
        const paths = parseReviewPaths(parts.slice(1).join(" "));
        if (paths.length === 0) return null;
        return { type: "folder", paths: normalizeReviewPaths(paths, cwd) };
      }

      case "pr": {
        const ref = parts[1];
        if (!ref) return null;
        return { type: "pr", ref };
      }

      default: {
        const paths = parseReviewPaths(args);
        if (paths.length === 0) return null;

        if (await allPathsExist(paths, cwd)) {
          return { type: "folder", paths: normalizeReviewPaths(paths, cwd) };
        }

        return null;
      }
    }
  }

  /**
   * Handle PR checkout and return a ReviewTarget (or null on failure)
   */
  async function handlePrCheckout(ctx: ExtensionContext, ref: string): Promise<ReviewTarget | null> {
    if (await hasPendingChanges(pi)) {
      ctx.ui.notify("Cannot checkout PR: you have uncommitted changes. Please commit or stash them first.", "error");
      return null;
    }

    const prNumber = parsePrReference(ref);
    if (!prNumber) {
      ctx.ui.notify("Invalid PR reference. Enter a number or GitHub PR URL.", "error");
      return null;
    }

    ctx.ui.notify(`Fetching PR #${prNumber} info...`, "info");
    const prInfo = await getPrInfo(pi, prNumber);

    if (!prInfo) {
      ctx.ui.notify(`Could not find PR #${prNumber}. Make sure gh is authenticated and the PR exists.`, "error");
      return null;
    }

    ctx.ui.notify(`Checking out PR #${prNumber}...`, "info");
    const checkoutResult = await checkoutPr(pi, prNumber);

    if (!checkoutResult.success) {
      ctx.ui.notify(`Failed to checkout PR: ${checkoutResult.error}`, "error");
      return null;
    }

    ctx.ui.notify(`Checked out PR #${prNumber} (${prInfo.headBranch})`, "info");

    return {
      type: "pullRequest",
      prNumber,
      baseBranch: prInfo.baseBranch,
      title: prInfo.title,
    };
  }

  // ---------------------------------------------------------------------------
  // /review command
  // ---------------------------------------------------------------------------

  pi.registerCommand("review", {
    description: "Review code changes (PR, uncommitted, branch, commit, file/folder, or custom)",
    handler: async (args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("Review requires interactive mode", "error");
        return;
      }

      if (reviewOriginId) {
        ctx.ui.notify("Already in a review. Use /end-review to finish first.", "warning");
        return;
      }

      let target: ReviewTarget | null = null;
      let fromSelector = false;
      const parsed = await parseArgs(args, ctx.cwd);

      if (parsed) {
        if (parsed.type === "pr") {
          target = await handlePrCheckout(ctx, parsed.ref);
          if (!target) {
            ctx.ui.notify("PR review failed. Returning to review menu.", "warning");
          }
        } else {
          target = parsed;
        }
      }

      if (!target) {
        fromSelector = true;
      }

      while (true) {
        if (!target && fromSelector) {
          target = await showReviewSelector(ctx);
        }

        if (!target) {
          ctx.ui.notify("Review cancelled", "info");
          return;
        }

        // folder/file review doesn't require a git repo; everything else does
        if (target.type !== "folder") {
          const { code } = await pi.exec("git", ["rev-parse", "--git-dir"]);
          if (code !== 0) {
            ctx.ui.notify("Not a git repository", "error");
            return;
          }
        }

        const entries = ctx.sessionManager.getEntries();
        const messageCount = entries.filter((e) => e.type === "message").length;

        let useFreshSession = false;

        if (messageCount > 0) {
          const choice = await ctx.ui.select("Start review in:", ["Empty branch", "Current session"]);

          if (choice === undefined) {
            if (fromSelector) {
              target = null;
              continue;
            }
            ctx.ui.notify("Review cancelled", "info");
            return;
          }

          useFreshSession = choice === "Empty branch";
        }

        await executeReview(ctx, target, useFreshSession);
        return;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // Model restore helper
  // ---------------------------------------------------------------------------

  /**
   * Restore the model that was active before review started.
   */
  async function restoreOriginalModel(ctx: ExtensionContext, provider?: string, modelId?: string) {
    const p = provider ?? reviewOriginalProvider;
    const m = modelId ?? reviewOriginalModelId;
    if (p && m) {
      const originalModel = ctx.modelRegistry.find(p, m);
      if (originalModel) {
        const ok = await pi.setModel(originalModel);
        if (ok) {
          ctx.ui.notify(`Restored model to ${p}/${m}`, "info");
        }
      }
    }
    reviewOriginalProvider = undefined;
    reviewOriginalModelId = undefined;
  }

  // ---------------------------------------------------------------------------
  // /end-review command
  // ---------------------------------------------------------------------------

  pi.registerCommand("end-review", {
    description: "Complete review and return to original position",
    handler: async (args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify("End-review requires interactive mode", "error");
        return;
      }

      if (!reviewOriginId) {
        const state = getReviewState(ctx);
        if (state?.active && state.originId) {
          reviewOriginId = state.originId;
          reviewOriginalProvider = state.originalProvider;
          reviewOriginalModelId = state.originalModelId;
        } else if (state?.active) {
          setReviewWidget(ctx, false);
          pi.appendEntry(REVIEW_STATE_TYPE, { active: false });
          ctx.ui.notify("Review state was missing origin info; cleared review status.", "warning");
          return;
        } else {
          ctx.ui.notify("Not in a review branch (use /review first, or review was started in current session mode)", "info");
          return;
        }
      }

      const summaryChoice = await ctx.ui.select("Summarize review branch?", ["Summarize", "No summary"]);

      if (summaryChoice === undefined) {
        ctx.ui.notify("Cancelled. Use /end-review to try again.", "info");
        return;
      }

      const wantsSummary = summaryChoice === "Summarize";
      const originId = reviewOriginId;

      const savedProvider = reviewOriginalProvider;
      const savedModelId = reviewOriginalModelId;

      if (wantsSummary) {
        const result = await ctx.ui.custom<{ cancelled: boolean; error?: string } | null>((tui, theme, _kb, done) => {
          const loader = new BorderedLoader(tui, theme, "Summarizing review branch...");
          loader.onAbort = () => done(null);

          ctx
            .navigateTree(originId!, {
              summarize: true,
              customInstructions: REVIEW_SUMMARY_PROMPT,
              replaceInstructions: true,
            })
            .then(done)
            .catch((err) => done({ cancelled: false, error: err instanceof Error ? err.message : String(err) }));

          return loader;
        });

        if (result === null) {
          ctx.ui.notify("Summarization cancelled. Use /end-review to try again.", "info");
          return;
        }

        if (result.error) {
          ctx.ui.notify(`Summarization failed: ${result.error}`, "error");
          return;
        }

        if (result.cancelled) {
          ctx.ui.notify("Navigation cancelled. Use /end-review to try again.", "info");
          return;
        }

        setReviewWidget(ctx, false);
        reviewOriginId = undefined;
        pi.appendEntry(REVIEW_STATE_TYPE, { active: false });
        await restoreOriginalModel(ctx, savedProvider, savedModelId);

        if (!ctx.ui.getEditorText().trim()) {
          ctx.ui.setEditorText("Act on the code review, and using relevant skills as needed.");
        }

        ctx.ui.notify("Review complete! Returned to original position.", "info");
      } else {
        try {
          const result = await ctx.navigateTree(originId!, { summarize: false });

          if (result.cancelled) {
            ctx.ui.notify("Navigation cancelled. Use /end-review to try again.", "info");
            return;
          }

          setReviewWidget(ctx, false);
          reviewOriginId = undefined;
          pi.appendEntry(REVIEW_STATE_TYPE, { active: false });
          await restoreOriginalModel(ctx, savedProvider, savedModelId);
          ctx.ui.notify("Review complete! Returned to original position.", "info");
        } catch (error) {
          ctx.ui.notify(`Failed to return: ${error instanceof Error ? error.message : String(error)}`, "error");
        }
      }
    },
  });
}
