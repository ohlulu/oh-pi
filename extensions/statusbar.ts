import type { ExtensionAPI, ExtensionContext, ReadonlyFooterDataProvider, Theme } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import { basename } from "node:path";
import { homedir } from "node:os";

// ── Model abbreviation ──────────────────────────────────────────────────

function abbreviateModel(provider: string | undefined, id: string | undefined): string {
	if (!provider || !id) return "no model";

	if (provider === "anthropic") {
		let short = id.replace(/^claude-/, "");
		short = short.replace(/-\d{8}$/, "");
		return short;
	}

	// GPT family: keep original id.
	// `openai-codex/gpt-5.4` is still GPT, not Codex-branded.
	if (id.startsWith("gpt-")) {
		return id;
	}

	// Non-Anthropic, non-GPT: last segment of provider + version from id.
	const parts = provider.split("-");
	const providerShort = parts.length > 1 ? parts[parts.length - 1] : provider;

	let modelVersion = id.replace(/^[a-z]+-/, "");
	if (modelVersion.includes(providerShort)) {
		modelVersion = modelVersion.replace(new RegExp(`-?${providerShort}$`), "");
	}

	return `${providerShort}-${modelVersion}`;
}

// ── Color helpers ───────────────────────────────────────────────────────

type ThemeColor = "accent" | "success" | "warning" | "error" | "muted" | "dim" | "text";
// ColorSpec = theme name OR ANSI 256 color code
type ColorSpec = ThemeColor | number;

function styled(theme: Theme, color: ColorSpec, text: string): string {
	if (typeof color === "number") return `\x1b[38;5;${color}m${text}\x1b[0m`;
	return theme.fg(color, text);
}

// Provider → color: theme name or ANSI 256 code
function providerColor(provider: string | undefined): ColorSpec {
	if (!provider) return "muted";
	const p = provider.toLowerCase();
	if (p === "anthropic")         return 208;      // ANSI orange
	if (p.startsWith("openai"))    return "accent"; // theme blue/purple
	if (p.startsWith("google"))    return "warning";// theme yellow
	if (p.startsWith("meta"))      return "error";  // theme red
	if (p.startsWith("mistral"))   return "text";
	return "muted";
}

// Directory name → stable ANSI 256 color (muted/readable palette)
const DIR_PALETTE = [67, 68, 71, 72, 73, 79, 80, 98, 104, 107, 110, 114, 140, 174, 175];

function dirHashColor(name: string): number {
	let h = 5381;
	for (let i = 0; i < name.length; i++) {
		h = ((h << 5) + h) ^ name.charCodeAt(i);
		h = h >>> 0; // keep unsigned 32-bit
	}
	return DIR_PALETTE[h % DIR_PALETTE.length]!;
}

// ── Context formatting ──────────────────────────────────────────────────

function formatContextWindow(contextWindow: number): string {
	if (contextWindow >= 1_000_000) {
		return `${(contextWindow / 1_000_000).toFixed(1)}M`;
	}
	return `${Math.round(contextWindow / 1000)}K`;
}

// ── Git cache ───────────────────────────────────────────────────────────

interface GitCache {
	uncommittedCount: number;
	cwd: string;
	timestamp: number;
}

const GIT_CACHE_TTL = 10_000; // 10s safety net
let gitCache: GitCache | null = null;
let gitFetching = false;

function markGitCacheStale(): void {
	// Keep the last known value so renders during refresh still show something,
	// but force TTL expiry so the next getCachedUncommittedCount triggers a refresh.
	if (gitCache) gitCache.timestamp = 0;
}

async function fetchUncommittedCount(pi: ExtensionAPI, cwd: string): Promise<number> {
	try {
		const result = await pi.exec("git", ["status", "--porcelain"], { timeout: 3000 });
		if (result.code !== 0) return 0;
		const lines = result.stdout.trim().split("\n").filter((l) => l.length > 0);
		return lines.length;
	} catch {
		return 0;
	}
}

function refreshGitCache(pi: ExtensionAPI, cwd: string, onDone: () => void): void {
	if (gitFetching) return;
	gitFetching = true;
	fetchUncommittedCount(pi, cwd).then((count) => {
		gitCache = { uncommittedCount: count, cwd, timestamp: Date.now() };
		gitFetching = false;
		onDone();
	});
}

function getCachedUncommittedCount(pi: ExtensionAPI, cwd: string, onDone: () => void): number | null {
	if (gitCache && gitCache.cwd === cwd && Date.now() - gitCache.timestamp < GIT_CACHE_TTL) {
		return gitCache.uncommittedCount;
	}
	// Trigger async refresh
	refreshGitCache(pi, cwd, onDone);
	return gitCache?.cwd === cwd ? gitCache.uncommittedCount : null;
}

// ── Extension ───────────────────────────────────────────────────────────

export default function statusbar(pi: ExtensionAPI) {
	let tuiRef: any = null;
	let currentCwd = "";
	const home = homedir();

	const requestRender = () => tuiRef?.requestRender();

	// ── Reactivity: invalidate git cache on file changes ──

	pi.on("tool_result", async (event) => {
		if (event.toolName === "write" || event.toolName === "edit" || event.toolName === "bash") {
			markGitCacheStale();
			// Eager fetch: start git status NOW, not lazily from the next render.
			// When it finishes, requestRender() shows the fresh count.
			if (currentCwd) refreshGitCache(pi, currentCwd, requestRender);
			requestRender(); // render immediately with stale value (no flicker)
		}
	});

	pi.on("model_select", async () => {
		requestRender();
	});

	// ── Footer setup ──

	pi.on("session_start", async (_event, ctx) => {
		currentCwd = ctx.cwd;
		setupFooter(ctx);
	});

	pi.on("session_switch", async (_event, ctx) => {
		currentCwd = ctx.cwd;
		gitCache = null; // new session → new cwd, old cache irrelevant
		setupFooter(ctx);
	});

	function setupFooter(ctx: ExtensionContext): void {
		if (!ctx.hasUI) return;

		ctx.ui.setFooter((tui, theme, footerData) => {
			tuiRef = tui;
			const unsub = footerData.onBranchChange(() => {
				markGitCacheStale();
				tui.requestRender();
			});

			return {
				dispose: unsub,
				invalidate() {},
				render(width: number): string[] {
					const segments: string[] = [];

					// 1. Model + thinking
					const modelStr = abbreviateModel(ctx.model?.provider, ctx.model?.id);
					const thinking = pi.getThinkingLevel();
					const modelSeg = thinking !== "off" ? `${modelStr}:${thinking}` : modelStr;
					segments.push(styled(theme, providerColor(ctx.model?.provider), modelSeg));

					// 2. CWD basename
					const cwd = ctx.cwd;
					let dirName: string;
					if (cwd === home) {
						dirName = "~";
					} else if (cwd === "/") {
						dirName = "/";
					} else {
						dirName = basename(cwd);
					}
					segments.push(styled(theme, dirHashColor(dirName), dirName));

					// 3. Git branch + uncommitted
					const branch = footerData.getGitBranch();
					if (branch !== null) {
						const count = getCachedUncommittedCount(pi, cwd, requestRender);
						const isDirty = count !== null && count > 0;
						// clean → 101 (khaki/gray-yellow), dirty → 220 (yellow), whole segment unified
						const gitColor: ColorSpec = isDirty ? 220 : 101;
						const branchText = isDirty ? `${branch}(${count})` : branch;
						segments.push(styled(theme, gitColor, branchText));
					}

					// 4. Context usage
					const usage = ctx.getContextUsage();
					if (usage) {
						const pct = usage.percent !== null ? usage.percent.toFixed(1) : "–";
						const unit = formatContextWindow(usage.contextWindow);
						segments.push(theme.fg("dim", `${pct}%/${unit}`));
					}

					const sep = theme.fg("dim", " │ ");
					const line = segments.join(sep);
					return [truncateToWidth(line, width)];
				},
			};
		});
	}
}
