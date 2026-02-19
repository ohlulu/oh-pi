/**
 * Docs List Extension
 *
 * Runs docs-list on session start and injects the output into the first agent turn,
 * so the LLM always sees the project's doc index before coding.
 *
 * Supports .pi/docs-paths for multi-directory setups (one path per line, relative to project root).
 * Falls back to docs/ if .pi/docs-paths doesn't exist.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { readFileSync } from "node:fs";

const DOCS_LIST_BIN = join(
  process.env.HOME ?? "~",
  ".pi/agent/bin/docs-list"
);

function hasDocsToScan(projectRoot: string): boolean {
  const docsPathsFile = join(projectRoot, ".pi", "docs-paths");
  if (existsSync(docsPathsFile)) {
    const lines = readFileSync(docsPathsFile, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"));
    return lines.some((line) => existsSync(resolve(projectRoot, line)));
  }
  return existsSync(join(projectRoot, "docs"));
}

export default function (pi: ExtensionAPI) {
  let docsOutput: string | null = null;

  async function scanDocs(projectRoot: string) {
    if (!hasDocsToScan(projectRoot)) {
      docsOutput = null;
      return;
    }

    try {
      const result = await pi.exec(DOCS_LIST_BIN, [projectRoot], {
        timeout: 5000,
      });
      if (result.code === 0 && result.stdout.trim()) {
        docsOutput = result.stdout.trim();
      } else {
        docsOutput = null;
      }
    } catch {
      docsOutput = null;
    }
  }

  // Fires on initial pi launch and /reload
  pi.on("session_start", async (_event, ctx) => {
    await scanDocs(ctx.cwd);
  });

  // Fires on /new and /resume
  pi.on("session_switch", async (_event, ctx) => {
    await scanDocs(ctx.cwd);
  });

  pi.on("before_agent_start", async (_event, ctx) => {
    if (!docsOutput) return;

    const output = docsOutput;
    docsOutput = null; // inject once only

    // Show only warnings in TUI
    const warningStart = output.indexOf("\n⚠️");
    if (warningStart !== -1) {
      const warningBlock = output.slice(warningStart + 1, output.indexOf("\nReminder:") !== -1
        ? output.indexOf("\nReminder:")
        : undefined
      ).trim();
      ctx.ui.notify(warningBlock, "warning");
    }

    return {
      message: {
        customType: "docs-list",
        content: `[Project docs index]\n${output}`,
        display: false,
      },
    };
  });
}
