/**
 * /context
 *
 * Small TUI view showing what's loaded/available:
 * - extensions (best-effort from registered extension slash commands)
 * - skills
 * - project context files (AGENTS.md / CLAUDE.md)
 * - current context window usage + session totals (tokens/cost)
 */

import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext, ToolResultEvent } from "@mariozechner/pi-coding-agent";
import { DynamicBorder } from "@mariozechner/pi-coding-agent";
import { Container, Key, Text, matchesKey, type Component, type TUI } from "@mariozechner/pi-tui";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";

function formatUsd(cost: number): string {
  if (!Number.isFinite(cost) || cost <= 0) return "$0.00";
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(4)}`;
}

function estimateTokens(text: string): number {
  // Deliberately fuzzy (good enough for "how big-ish is this").
  return Math.max(0, Math.ceil(text.length / 4));
}

function normalizeReadPath(inputPath: string, cwd: string): string {
  // Similar to pi's resolveToCwd/resolveReadPath, but simplified.
  let p = inputPath;
  if (p.startsWith("@")) p = p.slice(1);
  if (p === "~") p = os.homedir();
  else if (p.startsWith("~/")) p = path.join(os.homedir(), p.slice(2));
  if (!path.isAbsolute(p)) p = path.resolve(cwd, p);
  return path.resolve(p);
}

function getAgentDir(): string {
  // Mirrors pi's behavior reasonably well.
  const envCandidates = ["PI_CODING_AGENT_DIR", "TAU_CODING_AGENT_DIR"];
  let envDir: string | undefined;
  for (const k of envCandidates) {
    if (process.env[k]) {
      envDir = process.env[k];
      break;
    }
  }
  if (!envDir) {
    for (const [k, v] of Object.entries(process.env)) {
      if (k.endsWith("_CODING_AGENT_DIR") && v) {
        envDir = v;
        break;
      }
    }
  }

  if (envDir) {
    if (envDir === "~") return os.homedir();
    if (envDir.startsWith("~/")) return path.join(os.homedir(), envDir.slice(2));
    return envDir;
  }
  return path.join(os.homedir(), ".pi", "agent");
}

async function readFileIfExists(filePath: string): Promise<{ path: string; content: string; bytes: number } | null> {
  if (!existsSync(filePath)) return null;
  try {
    const buf = await fs.readFile(filePath);
    return { path: filePath, content: buf.toString("utf8"), bytes: buf.byteLength };
  } catch {
    return null;
  }
}

async function loadProjectContextFiles(cwd: string): Promise<Array<{ path: string; tokens: number; bytes: number }>> {
  const out: Array<{ path: string; tokens: number; bytes: number }> = [];
  const seen = new Set<string>();

  const loadFromDir = async (dir: string) => {
    for (const name of ["AGENTS.md", "CLAUDE.md"]) {
      const p = path.join(dir, name);
      const f = await readFileIfExists(p);
      if (f && !seen.has(f.path)) {
        seen.add(f.path);
        out.push({ path: f.path, tokens: estimateTokens(f.content), bytes: f.bytes });
        // pi loads at most one of those per dir
        return;
      }
    }
  };

  await loadFromDir(getAgentDir());

  // Ancestors: root → cwd (same order as pi)
  const stack: string[] = [];
  let current = path.resolve(cwd);
  while (true) {
    stack.push(current);
    const parent = path.resolve(current, "..");
    if (parent === current) break;
    current = parent;
  }
  stack.reverse();
  for (const dir of stack) await loadFromDir(dir);

  return out;
}

function normalizeSkillName(name: string): string {
  return name.startsWith("skill:") ? name.slice("skill:".length) : name;
}

type SkillIndexEntry = {
  name: string;
  skillFilePath: string;
  skillDir: string;
};

function buildSkillIndex(pi: ExtensionAPI, cwd: string): SkillIndexEntry[] {
  return pi
    .getCommands()
    .filter((c) => c.source === "skill")
    .map((c) => {
      const p = c.path ? normalizeReadPath(c.path, cwd) : "";
      return {
        name: normalizeSkillName(c.name),
        skillFilePath: p,
        skillDir: p ? path.dirname(p) : "",
      };
    })
    .filter((x) => x.name && x.skillDir);
}

const SKILL_LOADED_ENTRY = "context:skill_loaded";

type SkillLoadedEntryData = {
  name: string;
  path: string;
};

function getLoadedSkillsFromSession(ctx: ExtensionContext): Set<string> {
  const out = new Set<string>();
  for (const e of ctx.sessionManager.getEntries()) {
    if ((e as any)?.type !== "custom") continue;
    if ((e as any)?.customType !== SKILL_LOADED_ENTRY) continue;
    const data = (e as any)?.data as SkillLoadedEntryData | undefined;
    if (data?.name) out.add(data.name);
  }
  return out;
}

function extractCostTotal(usage: any): number {
  if (!usage) return 0;
  const c = usage?.cost;
  if (typeof c === "number") return Number.isFinite(c) ? c : 0;
  if (typeof c === "string") {
    const n = Number(c);
    return Number.isFinite(n) ? n : 0;
  }
  const t = c?.total;
  if (typeof t === "number") return Number.isFinite(t) ? t : 0;
  if (typeof t === "string") {
    const n = Number(t);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function sumSessionUsage(ctx: ExtensionCommandContext): {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  totalCost: number;
} {
  let input = 0;
  let output = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  let totalCost = 0;

  for (const entry of ctx.sessionManager.getEntries()) {
    if ((entry as any)?.type !== "message") continue;
    const msg = (entry as any)?.message;
    if (!msg || msg.role !== "assistant") continue;
    const usage = msg.usage;
    if (!usage) continue;
    input += Number(usage.inputTokens ?? 0) || 0;
    output += Number(usage.outputTokens ?? 0) || 0;
    cacheRead += Number(usage.cacheRead ?? 0) || 0;
    cacheWrite += Number(usage.cacheWrite ?? 0) || 0;
    totalCost += extractCostTotal(usage);
  }

  return {
    input,
    output,
    cacheRead,
    cacheWrite,
    totalTokens: input + output + cacheRead + cacheWrite,
    totalCost,
  };
}

function shortenPath(p: string, cwd: string): string {
  const rp = path.resolve(p);
  const rc = path.resolve(cwd);
  if (rp === rc) return ".";
  if (rp.startsWith(rc + path.sep)) return "./" + rp.slice(rc.length + 1);
  return rp;
}

type UsageParts = { system: number; agents: number; tools: number; chat: number; remaining: number };

function formatTok(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

/**
 * Build a 10-column grid of ⛁/⛶ icons (100 total = 1 icon per 1%).
 * Returns array of lines: grid rows with right-side legend.
 */
function renderUsageGrid(theme: any, parts: UsageParts, total: number): string[] {
  if (total <= 0) return [];

  const COLS = 10;
  const TOTAL_CELLS = 100;

  // Assign cells per category (minimum 1 if > 0 tokens)
  const raw = [
    { key: "system", tokens: parts.system },
    { key: "agents", tokens: parts.agents },
    { key: "tools", tokens: parts.tools },
    { key: "chat", tokens: parts.chat },
    { key: "remaining", tokens: parts.remaining },
  ];

  // First pass: proportional
  const cells: number[] = raw.map((r) => Math.round((r.tokens / total) * TOTAL_CELLS));
  // Ensure non-zero categories get at least 1 cell
  for (let i = 0; i < raw.length; i++) {
    if (raw[i].tokens > 0 && cells[i] === 0) cells[i] = 1;
  }
  // Fix rounding drift — adjust remaining (last bucket)
  const sum = cells.reduce((a, b) => a + b, 0);
  cells[cells.length - 1] += TOTAL_CELLS - sum;
  if (cells[cells.length - 1] < 0) cells[cells.length - 1] = 0;

  // Build flat icon array
  const colorMap: Record<string, string> = {
    system: "muted",
    agents: "warning",
    tools: "success",
    chat: "accent",
    remaining: "dim",
  };
  const filled = "⛁";
  const free = "⛶";
  const icons: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const color = colorMap[raw[i].key];
    const ch = raw[i].key === "remaining" ? free : filled;
    for (let j = 0; j < cells[i]; j++) {
      icons.push(theme.fg(color, ch));
    }
  }

  // Chunk into rows
  const rows: string[][] = [];
  for (let i = 0; i < icons.length; i += COLS) {
    rows.push(icons.slice(i, i + COLS));
  }

  // Build right-side legend
  const dim = (s: string) => theme.fg("dim", s);
  const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`;

  const legendEntries = [
    { icon: theme.fg("muted", filled), label: "System", tokens: parts.system },
    { icon: theme.fg("warning", filled), label: "AGENTS", tokens: parts.agents },
    { icon: theme.fg("success", filled), label: "Tools", tokens: parts.tools },
    { icon: theme.fg("accent", filled), label: "Chat", tokens: parts.chat },
    { icon: theme.fg("dim", free), label: "Free", tokens: parts.remaining },
  ];

  // Compose: header on row 0, then legend entries starting row 1
  const usedTokens = total - parts.remaining;
  const usedPct = ((usedTokens / total) * 100).toFixed(1);
  const rightSide: string[] = [];
  rightSide.push(`${theme.fg("text", `${formatTok(usedTokens)}/${formatTok(total)}`)} ${dim("tokens")} ${dim(`(${usedPct}%)`)}`);
  rightSide.push("");
  for (const e of legendEntries) {
    rightSide.push(`${e.icon} ${dim(e.label + ":")} ${theme.fg("text", formatTok(e.tokens))} ${dim(`(${pct(e.tokens)})`)}`);
  }

  // Merge grid rows + right side
  const GAP = "   ";
  const gridColWidth = COLS * 2; // icon + space per cell
  const lines: string[] = [];
  const maxRows = Math.max(rows.length, rightSide.length);
  for (let r = 0; r < maxRows; r++) {
    const gridPart = r < rows.length ? rows[r].join(" ") : " ".repeat(gridColWidth - 1);
    const rightPart = r < rightSide.length ? rightSide[r] : "";
    lines.push(`${gridPart}${GAP}${rightPart}`);
  }

  return lines;
}

function joinComma(items: string[]): string {
  return items.join(", ");
}

function joinCommaStyled(items: string[], renderItem: (item: string) => string, sep: string): string {
  return items.map(renderItem).join(sep);
}

type ContextViewData = {
  usage: {
    // message-based context usage estimate from ctx.getContextUsage()
    messageTokens: number;
    contextWindow: number;
    // effective usage incl. a rough tool-definition estimate
    effectiveTokens: number;
    percent: number;
    remainingTokens: number;
    systemPromptTokens: number;
    agentTokens: number;
    toolsTokens: number;
    activeTools: number;
  } | null;
  agentFiles: string[];
  extensions: string[];
  skills: string[];
  loadedSkills: string[];
  session: { totalTokens: number; totalCost: number };
};

class ContextView implements Component {
  private tui: TUI;
  private theme: any;
  private onDone: () => void;
  private data: ContextViewData;
  private container: Container;
  private body: Text;
  private cachedWidth?: number;

  constructor(tui: TUI, theme: any, data: ContextViewData, onDone: () => void) {
    this.tui = tui;
    this.theme = theme;
    this.data = data;
    this.onDone = onDone;

    this.container = new Container();
    this.container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));
    this.container.addChild(new Text(theme.fg("accent", theme.bold("Context")) + theme.fg("dim", "  (Esc/q/Enter to close)"), 1, 0));
    this.container.addChild(new Text("", 1, 0));

    this.body = new Text("", 1, 0);
    this.container.addChild(this.body);

    this.container.addChild(new Text("", 1, 0));
    this.container.addChild(new DynamicBorder((s) => theme.fg("accent", s)));
  }

  private rebuild(width: number): void {
    const muted = (s: string) => this.theme.fg("muted", s);
    const dim = (s: string) => this.theme.fg("dim", s);
    const text = (s: string) => this.theme.fg("text", s);

    const lines: string[] = [];

    // Window — ⛁ grid
    if (!this.data.usage) {
      lines.push(muted("Window: ") + dim("(unknown)"));
    } else {
      const u = this.data.usage;
      const sysOnly = Math.max(0, u.systemPromptTokens - u.agentTokens);
      const chatTokens = Math.max(0, u.messageTokens - Math.min(u.systemPromptTokens, u.messageTokens));

      const gridLines = renderUsageGrid(
        this.theme,
        { system: sysOnly, agents: u.agentTokens, tools: u.toolsTokens, chat: chatTokens, remaining: u.remainingTokens },
        u.contextWindow,
      );
      for (const gl of gridLines) lines.push(gl);
    }

    lines.push("");

    lines.push(muted(`AGENTS (${this.data.agentFiles.length}): `) + text(this.data.agentFiles.length ? joinComma(this.data.agentFiles) : "(none)"));
    lines.push("");
    lines.push(
      muted(`Extensions (${this.data.extensions.length}): `) + text(this.data.extensions.length ? joinComma(this.data.extensions) : "(none)"),
    );

    const loaded = new Set(this.data.loadedSkills);
    const sortedSkills = [...this.data.skills].sort((a, b) => {
      const aLoaded = loaded.has(a) ? 0 : 1;
      const bLoaded = loaded.has(b) ? 0 : 1;
      return aLoaded !== bLoaded ? aLoaded - bLoaded : a.localeCompare(b);
    });
    const skillsRendered = sortedSkills.length
      ? joinCommaStyled(
          sortedSkills,
          (name) => (loaded.has(name) ? this.theme.fg("success", name) : this.theme.fg("muted", name)),
          this.theme.fg("muted", ", "),
        )
      : "(none)";
    lines.push(muted(`Skills (${this.data.skills.length}): `) + skillsRendered);
    lines.push("");
    lines.push(
      muted("Session: ") +
        text(`${this.data.session.totalTokens.toLocaleString()} tokens`) +
        muted(" · ") +
        text(formatUsd(this.data.session.totalCost)),
    );

    this.body.setText(lines.join("\n"));
    this.cachedWidth = width;
  }

  handleInput(data: string): void {
    if (matchesKey(data, Key.escape) || matchesKey(data, Key.ctrl("c")) || data.toLowerCase() === "q" || data === "\r") {
      this.onDone();
      return;
    }
  }

  invalidate(): void {
    this.container.invalidate();
    this.cachedWidth = undefined;
  }

  render(width: number): string[] {
    if (this.cachedWidth !== width) this.rebuild(width);
    return this.container.render(width);
  }
}

export default function contextExtension(pi: ExtensionAPI) {
  // Track which skills were actually pulled in via read tool calls.
  let lastSessionId: string | null = null;
  let cachedLoadedSkills = new Set<string>();
  let cachedSkillIndex: SkillIndexEntry[] = [];

  const ensureCaches = (ctx: ExtensionContext) => {
    const sid = ctx.sessionManager.getSessionId();
    if (sid !== lastSessionId) {
      lastSessionId = sid;
      cachedLoadedSkills = getLoadedSkillsFromSession(ctx);
      cachedSkillIndex = buildSkillIndex(pi, ctx.cwd);
    }
    if (cachedSkillIndex.length === 0) {
      cachedSkillIndex = buildSkillIndex(pi, ctx.cwd);
    }
  };

  const matchSkillForPath = (absPath: string): string | null => {
    let best: SkillIndexEntry | null = null;
    for (const s of cachedSkillIndex) {
      if (!s.skillDir) continue;
      if (absPath === s.skillFilePath || absPath.startsWith(s.skillDir + path.sep)) {
        if (!best || s.skillDir.length > best.skillDir.length) best = s;
      }
    }
    return best?.name ?? null;
  };

  pi.on("tool_result", (event: ToolResultEvent, ctx: ExtensionContext) => {
    // Only count successful reads.
    if ((event as any).toolName !== "read") return;
    if ((event as any).isError) return;

    const input = (event as any).input as { path?: unknown } | undefined;
    const p = typeof input?.path === "string" ? input.path : "";
    if (!p) return;

    ensureCaches(ctx);
    const abs = normalizeReadPath(p, ctx.cwd);
    const skillName = matchSkillForPath(abs);
    if (!skillName) return;

    if (!cachedLoadedSkills.has(skillName)) {
      cachedLoadedSkills.add(skillName);
      pi.appendEntry<SkillLoadedEntryData>(SKILL_LOADED_ENTRY, { name: skillName, path: abs });
    }
  });

  pi.registerCommand("context", {
    description: "Show loaded context overview",
    handler: async (_args, ctx: ExtensionCommandContext) => {
      const commands = pi.getCommands();
      const extensionCmds = commands.filter((c) => c.source === "extension");
      const skillCmds = commands.filter((c) => c.source === "skill");

      const extensionsByPath = new Map<string, string[]>();
      for (const c of extensionCmds) {
        const p = c.path ?? "<unknown>";
        const arr = extensionsByPath.get(p) ?? [];
        arr.push(c.name);
        extensionsByPath.set(p, arr);
      }
      const extensionFiles = [...extensionsByPath.keys()].map((p) => (p === "<unknown>" ? p : path.basename(p))).sort((a, b) => a.localeCompare(b));

      const skills = skillCmds.map((c) => normalizeSkillName(c.name)).sort((a, b) => a.localeCompare(b));

      const agentFiles = await loadProjectContextFiles(ctx.cwd);
      const agentFilePaths = agentFiles.map((f) => shortenPath(f.path, ctx.cwd));
      const agentTokens = agentFiles.reduce((a, f) => a + f.tokens, 0);

      const systemPrompt = ctx.getSystemPrompt();
      const systemPromptTokens = systemPrompt ? estimateTokens(systemPrompt) : 0;

      const usage = ctx.getContextUsage();
      const messageTokens = usage?.tokens ?? 0;
      const ctxWindow = usage?.contextWindow ?? 0;

      // Tool definitions are not part of ctx.getContextUsage() (it estimates message tokens).
      // We approximate their token impact from tool name + description, and apply a fudge
      // factor to account for parameters/schema/formatting.
      const TOOL_FUDGE = 1.5;
      const activeToolNames = pi.getActiveTools();
      const toolInfoByName = new Map(pi.getAllTools().map((t) => [t.name, t] as const));
      let toolsTokens = 0;
      for (const name of activeToolNames) {
        const info = toolInfoByName.get(name);
        const blob = `${name}\n${info?.description ?? ""}`;
        toolsTokens += estimateTokens(blob);
      }
      toolsTokens = Math.round(toolsTokens * TOOL_FUDGE);

      const effectiveTokens = messageTokens + toolsTokens;
      const percent = ctxWindow > 0 ? (effectiveTokens / ctxWindow) * 100 : 0;
      const remainingTokens = ctxWindow > 0 ? Math.max(0, ctxWindow - effectiveTokens) : 0;

      const sessionUsage = sumSessionUsage(ctx);

      const makePlainText = () => {
        const lines: string[] = [];
        lines.push("Context");
        if (usage) {
          lines.push(
            `Window: ~${effectiveTokens.toLocaleString()} / ${ctxWindow.toLocaleString()} (${percent.toFixed(1)}% used, ~${remainingTokens.toLocaleString()} left)`,
          );
        } else {
          lines.push("Window: (unknown)");
        }
        lines.push(`System: ~${systemPromptTokens.toLocaleString()} tok (AGENTS ~${agentTokens.toLocaleString()})`);
        lines.push(`Tools: ~${toolsTokens.toLocaleString()} tok (${activeToolNames.length} active)`);
        lines.push(`AGENTS: ${agentFilePaths.length ? joinComma(agentFilePaths) : "(none)"}`);
        lines.push(`Extensions (${extensionFiles.length}): ${extensionFiles.length ? joinComma(extensionFiles) : "(none)"}`);
        lines.push(`Skills (${skills.length}): ${skills.length ? joinComma(skills) : "(none)"}`);
        lines.push(`Session: ${sessionUsage.totalTokens.toLocaleString()} tokens · ${formatUsd(sessionUsage.totalCost)}`);
        return lines.join("\n");
      };

      if (!ctx.hasUI) {
        pi.sendMessage({ customType: "context", content: makePlainText(), display: true }, { triggerTurn: false });
        return;
      }

      const loadedSkills = Array.from(getLoadedSkillsFromSession(ctx)).sort((a, b) => a.localeCompare(b));

      const viewData: ContextViewData = {
        usage: usage
          ? {
              messageTokens,
              contextWindow: ctxWindow,
              effectiveTokens,
              percent,
              remainingTokens,
              systemPromptTokens,
              agentTokens,
              toolsTokens,
              activeTools: activeToolNames.length,
            }
          : null,
        agentFiles: agentFilePaths,
        extensions: extensionFiles,
        skills,
        loadedSkills,
        session: { totalTokens: sessionUsage.totalTokens, totalCost: sessionUsage.totalCost },
      };

      await ctx.ui.custom<void>((tui, theme, _kb, done) => {
        return new ContextView(tui, theme, viewData, done);
      });
    },
  });
}
