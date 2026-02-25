/**
 * Smart Commit Extension
 *
 * Spawns an isolated `pi --mode json` subprocess with haiku + bash-only to
 * handle git analysis and committing. No branching, no model switching,
 * no state machine.
 *
 * Flow:
 *   1. Check git repo + has changes
 *   2. Snapshot HEAD
 *   3. spawn pi subprocess (haiku, bash-only, no-extensions)
 *   4. On exit: compare HEAD to count new commits
 *   5. notify dim gray with result
 */
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COMMIT_MODEL = "anthropic/claude-haiku-4-5";
const SKILL_PATH = join(homedir(), ".pi/agent/skills/commit/SKILL.md");

// ---------------------------------------------------------------------------
// Skill loader
// ---------------------------------------------------------------------------

function loadCommitSkill(): string {
  const raw = readFileSync(SKILL_PATH, "utf-8");
  // Strip YAML frontmatter (--- ... ---)
  const end = raw.indexOf("\n---", 3);
  return end !== -1 ? raw.slice(end + 4).trim() : raw.trim();
}

// ---------------------------------------------------------------------------
// Spawn
// ---------------------------------------------------------------------------

async function spawnCommitAgent(
  cwd: string,
  hint: string | undefined,
  signal: AbortSignal | undefined,
): Promise<{ exitCode: number; stderr: string }> {
  return new Promise((resolve) => {
    // Write system prompt to a temp file
    const tmpDir = mkdtempSync(join(tmpdir(), "pi-commit-"));
    const promptPath = join(tmpDir, "prompt.txt");
    writeFileSync(promptPath, loadCommitSkill());

    const task = hint?.trim()
      ? `Analyze the current git changes and create appropriate commits using the committer script. Additional context: ${hint.trim()}`
      : "Analyze the current git changes and create appropriate commits using the committer script.";

    const args = [
      "--mode", "json",
      "-p",
      "--no-session",
      "--models", COMMIT_MODEL,
      "--tools", "bash",
      "--no-extensions",
      "--append-system-prompt", promptPath,
      task,
    ];

    const proc = spawn("pi", args, {
      cwd,
      env: { ...process.env },
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    const cleanup = () => {
      try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    };

    proc.on("close", (code: number | null) => {
      cleanup();
      resolve({ exitCode: code ?? 1, stderr: stderr.trim() });
    });

    proc.on("error", (err: Error) => {
      cleanup();
      resolve({ exitCode: 1, stderr: err.message });
    });

    if (signal) {
      const kill = () => {
        proc.kill("SIGTERM");
        setTimeout(() => { if (!proc.killed) proc.kill("SIGKILL"); }, 3000);
      };
      if (signal.aborted) kill();
      else signal.addEventListener("abort", kill, { once: true });
    }
  });
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function commitExtension(pi: ExtensionAPI) {
  pi.registerCommand("commit", {
    description: "Commit changes using an isolated haiku subprocess",
    handler: async (args, ctx) => {
      // Must be git repo
      const gitCheck = await pi.exec("git", ["rev-parse", "--git-dir"]);
      if (gitCheck.code !== 0) {
        ctx.ui.notify("Not a git repository", "error");
        return;
      }

      // Must have something to commit
      const statusCheck = await pi.exec("git", ["status", "--porcelain"]);
      if (statusCheck.code !== 0) {
        ctx.ui.notify(`git status failed (exit ${statusCheck.code})`, "error");
        return;
      }
      if (!statusCheck.stdout?.trim()) {
        ctx.ui.notify("Nothing to commit", "info");
        return;
      }

      // Snapshot HEAD before (to count new commits after)
      const headBefore = await pi.exec("git", ["rev-parse", "HEAD"]);
      const headBeforeSha = headBefore.stdout?.trim();

      ctx.ui.notify(`Committing with cheaper model (${COMMIT_MODEL})…`, "info");

      const { exitCode, stderr } = await spawnCommitAgent(ctx.cwd, args, undefined);

      if (exitCode !== 0) {
        const msg = stderr || `Subprocess exited with code ${exitCode}`;
        ctx.ui.notify(`Commit failed: ${msg}`, "error");
        return;
      }

      // Count what was actually committed
      const logArgs = headBeforeSha
        ? ["log", "--oneline", `${headBeforeSha}..HEAD`]
        : ["log", "--oneline", "-1"];

      const logResult = await pi.exec("git", logArgs);
      if (logResult.code !== 0) {
        ctx.ui.notify(`Committed, but git log failed (exit ${logResult.code})`, "warning");
        return;
      }
      const newCommits = logResult.stdout?.trim().split("\n").filter(Boolean) ?? [];

      if (newCommits.length === 0) {
        ctx.ui.notify("No commits made", "info");
      } else if (newCommits.length === 1) {
        // Strip the short SHA prefix (7 chars + space)
        const subject = newCommits[0]!.replace(/^[0-9a-f]{7} /, "");
        ctx.ui.notify(`✓ ${subject}`, "info");
      } else {
        ctx.ui.notify(`✓ ${newCommits.length} commits`, "info");
      }
    },
  });
}
