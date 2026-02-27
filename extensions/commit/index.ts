/**
 * Smart Commit Extension
 *
 * Spawns an isolated `pi -p --mode json` subprocess with haiku + bash-only
 * to handle git analysis and committing. Parses JSON event stream from
 * stdout for real-time progress notifications.
 *
 * Flow:
 *   1. Check git repo + has changes
 *   2. Snapshot HEAD
 *   3. Spawn pi subprocess (haiku, bash-only, no-extensions)
 *   4. Stream progress via JSON events → notify
 *   5. On exit: compare HEAD to count new commits
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
const COMMIT_TIMEOUT_MS = 120_000; // 2 min hard cap
const SKILL_PATH = join(homedir(), ".pi/agent/skills/commit/SKILL.md");

// ---------------------------------------------------------------------------
// Skill loader
// ---------------------------------------------------------------------------

function loadCommitSkill(): string {
  const raw = readFileSync(SKILL_PATH, "utf-8");
  const end = raw.indexOf("\n---", 3);
  return end !== -1 ? raw.slice(end + 4).trim() : raw.trim();
}

// ---------------------------------------------------------------------------
// Progress inference from JSON events
// ---------------------------------------------------------------------------

/**
 * Infer a human-readable phase string from a pi JSON event.
 * Returns null if the event isn't interesting for progress display.
 */
function inferPhase(event: Record<string, unknown>): string | null {
  // bash tool start → infer from command
  if (event.type === "tool_execution_start" && event.toolName === "bash") {
    const cmd = String((event.args as Record<string, unknown>)?.command ?? "");

    if (/committer\b/.test(cmd)) {
      const m = cmd.match(/committer\s+(?:--force\s+)?"([^"]+)"/);
      return m ? `Committing: ${truncate(m[1], 60)}` : "Running committer…";
    }
    if (/git\s+diff/.test(cmd)) return "Reading diff…";
    if (/git\s+status/.test(cmd)) return "Scanning status…";
    if (/git\s+add/.test(cmd)) return "Staging files…";
    if (/git\s+restore/.test(cmd)) return "Restoring index…";
    return `Running: ${truncate(cmd, 50)}`;
  }

  // LLM thinking (first turn after tool results → model is deciding)
  if (event.type === "turn_start") return "Thinking…";

  return null;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

// ---------------------------------------------------------------------------
// Spawn with progress
// ---------------------------------------------------------------------------

async function spawnCommitAgent(
  cwd: string,
  hint: string | undefined,
  signal: AbortSignal | undefined,
  onProgress?: (phase: string) => void,
): Promise<{ exitCode: number; stderr: string }> {
  return new Promise((resolve) => {
    const tmpDir = mkdtempSync(join(tmpdir(), "pi-commit-"));
    const promptPath = join(tmpDir, "prompt.txt");
    writeFileSync(promptPath, loadCommitSkill());

    const task = hint?.trim()
      ? `Analyze the current git changes and create appropriate commits using the committer script. Additional context: ${hint.trim()}`
      : "Analyze the current git changes and create appropriate commits using the committer script.";

    const args = [
      "-p",
      "--mode", "json",
      "--no-session",
      "--models", COMMIT_MODEL,
      "--tools", "bash",
      "--no-extensions",
      "--no-skills",
      "--no-prompt-templates",
      "--append-system-prompt", promptPath,
      task,
    ];

    const proc = spawn("pi", args, {
      cwd,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    // --- stderr (for error reporting) ---
    let stderr = "";
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    // --- stdout JSON event stream (for progress) ---
    let stdoutBuf = "";
    proc.stdout!.on("data", (d: Buffer) => {
      if (!onProgress) return;
      stdoutBuf += d.toString();
      // Each JSON event is one line
      let nl: number;
      while ((nl = stdoutBuf.indexOf("\n")) !== -1) {
        const line = stdoutBuf.slice(0, nl).trim();
        stdoutBuf = stdoutBuf.slice(nl + 1);
        if (!line) continue;
        try {
          const event = JSON.parse(line);
          const phase = inferPhase(event);
          if (phase) onProgress(phase);
        } catch { /* ignore malformed lines */ }
      }
    });

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
        // proc.killed flips to true as soon as the signal is *sent*,
        // not when the process actually exits. Track exit ourselves
        // so the SIGKILL escalation works reliably.
        let exited = false;
        proc.on("close", () => { exited = true; });
        proc.kill("SIGTERM");
        setTimeout(() => { if (!exited) proc.kill("SIGKILL"); }, 3000);
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
      const gitCheck = await pi.exec("git", ["rev-parse", "--git-dir"]);
      if (gitCheck.code !== 0) {
        ctx.ui.notify("Not a git repository", "error");
        return;
      }

      const statusCheck = await pi.exec("git", ["status", "--porcelain"]);
      if (statusCheck.code !== 0) {
        ctx.ui.notify(`git status failed (exit ${statusCheck.code})`, "error");
        return;
      }
      if (!statusCheck.stdout?.trim()) {
        ctx.ui.notify("Nothing to commit", "info");
        return;
      }

      const headBefore = await pi.exec("git", ["rev-parse", "HEAD"]);
      const headBeforeSha = headBefore.stdout?.trim();

      // Progress callback → notify
      const onProgress = (phase: string) => {
        ctx.ui.notify(phase, "info");
      };

      onProgress("Starting commit agent…");

      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), COMMIT_TIMEOUT_MS);

      let exitCode: number;
      let stderr: string;
      try {
        ({ exitCode, stderr } = await spawnCommitAgent(ctx.cwd, args, ac.signal, onProgress));
      } finally {
        clearTimeout(timer);
      }

      if (ac.signal.aborted) {
        ctx.ui.notify(`Commit timed out after ${COMMIT_TIMEOUT_MS / 1000}s`, "error");
        return;
      }

      if (exitCode !== 0) {
        const msg = stderr || `Subprocess exited with code ${exitCode}`;
        ctx.ui.notify(`Commit failed: ${msg}`, "error");
        return;
      }

      // Count new commits.
      // When HEAD didn't exist before (fresh repo), list everything
      // reachable from current HEAD to capture all new commits.
      const logArgs = headBeforeSha
        ? ["log", "--oneline", `${headBeforeSha}..HEAD`]
        : ["log", "--oneline"];

      const logResult = await pi.exec("git", logArgs);
      if (logResult.code !== 0) {
        ctx.ui.notify(`Committed, but git log failed (exit ${logResult.code})`, "warning");
        return;
      }
      const newCommits = logResult.stdout?.trim().split("\n").filter(Boolean) ?? [];

      if (newCommits.length === 0) {
        ctx.ui.notify("No commits made", "info");
      } else if (newCommits.length === 1) {
        const subject = newCommits[0]!.replace(/^[0-9a-f]{7,} /, "");
        ctx.ui.notify(`✓ ${subject}`, "info");
      } else {
        ctx.ui.notify(`✓ ${newCommits.length} commits`, "info");
      }
    },
  });
}
