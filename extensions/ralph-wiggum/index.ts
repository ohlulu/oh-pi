/**
 * Ralph Wiggum v3 — Extension entry point.
 *
 * Registers all commands, tools, and event handlers.
 * Wires shared context across modules.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

// Types & constants
import { COMPLETE_MARKER, ABORT_MARKER } from "./types.js";

// State
import {
	loadState,
	saveStateSync,
	withLockedState,
	listLoops,
	ralphDir,
	archiveDir,
	sanitize,
	getPath,
	ensureDir,
	tryDelete,
	tryRemoveDir,
	setStateWarningHandler,
} from "./state/store.js";

// Prompt
import { detectPromiseMarker } from "./prompt/markers.js";

// Runtime
import type { SharedContext } from "./runtime/loop.js";
import {
	pauseLoop,
	completeLoop,
	stopLoop,
} from "./runtime/loop.js";

// UI
import { updateUI as widgetUpdateUI, formatLoop } from "./ui/widget.js";

// Commands
import { startCommand } from "./commands/start.js";
import { stopCommand } from "./commands/stop.js";
import { resumeCommand } from "./commands/resume.js";
import { hintCommand, hintsCommand } from "./commands/hint.js";
import { rotateCommand } from "./commands/rotate.js";
import { modeCommand } from "./commands/mode.js";

// Tools
import { createRalphStartTool } from "./tools/ralph_start.js";
import { createRalphDoneTool } from "./tools/ralph_done.js";

// ---------------------------------------------------------------------------
// HELP string
// ---------------------------------------------------------------------------

const HELP = `Ralph Wiggum v3 — Long-running development loops

Commands:
  /ralph start <name|path> [options]  Start a new loop
  /ralph stop                         Pause current loop
  /ralph resume <name>                Resume a paused loop
  /ralph status                       Show all loops
  /ralph cancel <name>                Delete loop state
  /ralph archive <name>               Move loop to archive
  /ralph clean [--all]                Clean completed loops
  /ralph list [--archived]            Show loops
  /ralph hint <text> [--sticky]       Add a hint for the agent
  /ralph hint --clear                 Clear all hints
  /ralph hints                        List active hints
  /ralph mode plan|build               Switch execution mode
  /ralph rotate                       Force session rotation
  /ralph nuke [--yes]                 Delete all .ralph data
  /ralph-stop                         Stop active loop (idle only)

Options:
  --mode plan|build        Execution mode (default: build)
  --template PATH          Custom prompt template file
  --items-per-iteration N  Suggest N items per turn
  --reflect-every N        Checkpoint every N iterations
  --max-iterations N       Stop after N iterations (default 50)

To stop: press ESC to interrupt, then run /ralph-stop when idle

Examples:
  /ralph start my-feature
  /ralph start review --mode plan --reflect-every 5
  /ralph hint "Focus on error handling" --sticky`;

// ---------------------------------------------------------------------------
// Extension factory
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
	// --- Shared context ---
	const shared: SharedContext = {
		currentLoop: null,
		updateUI(ctx: ExtensionContext) {
			widgetUpdateUI(ctx, shared);
		},
	};

	// Wire warning handler to UI when available
	setStateWarningHandler((msg) => console.warn(`[ralph] ${msg}`));

	// --- Inline commands (status, cancel, archive, clean, list, nuke) ---

	const inlineCommands: Record<string, (rest: string, ctx: ExtensionContext) => void> = {
		status(_rest, ctx) {
			const loops = listLoops(ctx);
			if (loops.length === 0) {
				ctx.ui.notify("No Ralph loops found.", "info");
				return;
			}
			ctx.ui.notify(
				`Ralph loops:\n${loops.map((l) => formatLoop(l)).join("\n")}`,
				"info",
			);
		},

		cancel(rest, ctx) {
			const loopName = rest.trim();
			if (!loopName) {
				ctx.ui.notify("Usage: /ralph cancel <name>", "warning");
				return;
			}
			if (!loadState(ctx, loopName)) {
				ctx.ui.notify(`Loop "${loopName}" not found`, "error");
				return;
			}
			if (shared.currentLoop === loopName) shared.currentLoop = null;
			tryDelete(getPath(ctx, loopName, ".state.json"));
			ctx.ui.notify(`Cancelled: ${loopName}`, "info");
			shared.updateUI(ctx);
		},

		archive(rest, ctx) {
			const loopName = rest.trim();
			if (!loopName) {
				ctx.ui.notify("Usage: /ralph archive <name>", "warning");
				return;
			}
			const state = loadState(ctx, loopName);
			if (!state) {
				ctx.ui.notify(`Loop "${loopName}" not found`, "error");
				return;
			}
			if (state.status === "active") {
				ctx.ui.notify("Cannot archive active loop. Stop it first.", "warning");
				return;
			}

			if (shared.currentLoop === loopName) shared.currentLoop = null;

			const srcState = getPath(ctx, loopName, ".state.json");
			const dstState = getPath(ctx, loopName, ".state.json", true);
			ensureDir(dstState);
			if (fs.existsSync(srcState)) fs.renameSync(srcState, dstState);

			const srcTask = path.resolve(ctx.cwd, state.taskFile);
			if (
				srcTask.startsWith(ralphDir(ctx)) &&
				!srcTask.startsWith(archiveDir(ctx))
			) {
				const dstTask = getPath(ctx, loopName, ".md", true);
				if (fs.existsSync(srcTask)) fs.renameSync(srcTask, dstTask);
			}

			ctx.ui.notify(`Archived: ${loopName}`, "info");
			shared.updateUI(ctx);
		},

		clean(rest, ctx) {
			const all = rest.trim() === "--all";
			const completed = listLoops(ctx).filter(
				(l) => l.status === "completed",
			);

			if (completed.length === 0) {
				ctx.ui.notify("No completed loops to clean", "info");
				return;
			}

			for (const loop of completed) {
				tryDelete(getPath(ctx, loop.name, ".state.json"));
				if (all) tryDelete(getPath(ctx, loop.name, ".md"));
				if (shared.currentLoop === loop.name) shared.currentLoop = null;
			}

			const suffix = all ? " (all files)" : " (state only)";
			ctx.ui.notify(
				`Cleaned ${completed.length} loop(s)${suffix}:\n${completed
					.map((l) => `  • ${l.name}`)
					.join("\n")}`,
				"info",
			);
			shared.updateUI(ctx);
		},

		list(rest, ctx) {
			const archived = rest.trim() === "--archived";
			const loops = listLoops(ctx, archived);

			if (loops.length === 0) {
				ctx.ui.notify(
					archived
						? "No archived loops"
						: "No loops found. Use /ralph list --archived for archived.",
					"info",
				);
				return;
			}

			const label = archived ? "Archived loops" : "Ralph loops";
			ctx.ui.notify(
				`${label}:\n${loops.map((l) => formatLoop(l)).join("\n")}`,
				"info",
			);
		},

		nuke(rest, ctx) {
			const force = rest.trim() === "--yes";
			const warning =
				"This deletes all .ralph state, task, and archive files. External task files are not removed.";

			const run = () => {
				const dir = ralphDir(ctx);
				if (!fs.existsSync(dir)) {
					if (ctx.hasUI) ctx.ui.notify("No .ralph directory found.", "info");
					return;
				}
				shared.currentLoop = null;
				const ok = tryRemoveDir(dir);
				if (ctx.hasUI) {
					ctx.ui.notify(
						ok
							? "Removed .ralph directory."
							: "Failed to remove .ralph directory.",
						ok ? "info" : "error",
					);
				}
				shared.updateUI(ctx);
			};

			if (!force) {
				if (ctx.hasUI) {
					void ctx.ui
						.confirm("Delete all Ralph loop files?", warning)
						.then((confirmed) => {
							if (confirmed) run();
						});
				} else {
					ctx.ui.notify(
						`Run /ralph nuke --yes to confirm. ${warning}`,
						"warning",
					);
				}
				return;
			}

			if (ctx.hasUI) ctx.ui.notify(warning, "warning");
			run();
		},
	};

	// --- /ralph command ---

	pi.registerCommand("ralph", {
		description: "Ralph Wiggum v3 — long-running development loops",
		handler: async (args, ctx) => {
			const trimmed = args.trim();
			const spaceIdx = trimmed.indexOf(" ");
			const cmd = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
			const rest = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1);

			switch (cmd) {
				case "start":
					return startCommand(rest, ctx, pi, shared);
				case "stop":
					return stopCommand(rest, ctx, shared);
				case "resume":
					return resumeCommand(rest, ctx, pi, shared);
				case "hint":
					return hintCommand(rest, ctx, shared);
				case "hints":
					return hintsCommand(rest, ctx, shared);
				case "mode":
					return modeCommand(rest, ctx, shared);
				case "rotate":
					return rotateCommand(rest, ctx, pi, shared);
				default: {
					const handler = inlineCommands[cmd];
					if (handler) return handler(rest, ctx);
					ctx.ui.notify(HELP, "info");
				}
			}
		},
	});

	// --- /ralph-stop command ---

	pi.registerCommand("ralph-stop", {
		description: "Stop active Ralph loop (idle only)",
		handler: async (_args, ctx) => {
			if (!ctx.isIdle()) {
				if (ctx.hasUI) {
					ctx.ui.notify(
						"Agent is busy. Press ESC to interrupt, then run /ralph-stop.",
						"warning",
					);
				}
				return;
			}

			let state = shared.currentLoop
				? loadState(ctx, shared.currentLoop)
				: null;
			if (!state) {
				const active = listLoops(ctx).find(
					(l) => l.status === "active",
				);
				if (!active) {
					if (ctx.hasUI) ctx.ui.notify("No active Ralph loop", "warning");
					return;
				}
				state = active;
			}

			if (state.status !== "active") {
				if (ctx.hasUI)
					ctx.ui.notify(`Loop "${state.name}" is not active`, "warning");
				return;
			}

			stopLoop(
				ctx,
				state,
				shared,
				`Stopped Ralph loop: ${state.name} (iteration ${state.iteration})`,
			);
		},
	});

	// --- Tools ---

	pi.registerTool(createRalphStartTool(pi, shared) as any);
	pi.registerTool(createRalphDoneTool(pi, shared) as any);

	// --- Event handlers ---

	pi.on("before_agent_start", async (event, ctx) => {
		if (!shared.currentLoop) return;
		const state = loadState(ctx, shared.currentLoop);
		if (!state || state.status !== "active") return;

		const iterStr = `${state.iteration}${state.maxIterations > 0 ? `/${state.maxIterations}` : ""}`;

		let instructions = `You are in a Ralph loop working on: ${state.taskFile}\n`;
		instructions += `Mode: ${state.mode}\n`;
		if (state.itemsPerIteration > 0) {
			instructions += `- Work on ~${state.itemsPerIteration} items this iteration\n`;
		}
		instructions += `- Update the task file as you progress\n`;
		instructions += `- When FULLY COMPLETE: ${COMPLETE_MARKER}\n`;
		instructions += `- If IMPOSSIBLE: ${ABORT_MARKER}\n`;
		instructions += `- Otherwise, call ralph_done tool to proceed to next iteration`;

		if (state.mode === "plan") {
			instructions +=
				"\n\nIMPORTANT: You are in PLANNING mode. Do NOT implement code. Do NOT create new source files. Updating the task file is expected and required.";
		}

		return {
			systemPrompt:
				event.systemPrompt +
				`\n[RALPH LOOP - ${state.name} [${state.mode}] - Iteration ${iterStr}]\n\n${instructions}`,
		};
	});

	pi.on("agent_end", async (event, ctx) => {
		if (!shared.currentLoop) return;
		const state = loadState(ctx, shared.currentLoop);
		if (!state || state.status !== "active") return;

		// Extract last assistant text
		const lastAssistant = [...event.messages]
			.reverse()
			.find((m) => m.role === "assistant");
		const text =
			lastAssistant && Array.isArray(lastAssistant.content)
				? lastAssistant.content
						.filter(
							(c): c is { type: "text"; text: string } =>
								c.type === "text",
						)
						.map((c) => c.text)
						.join("\n")
				: "";

		const marker = detectPromiseMarker(text);

		if (marker === "COMPLETE") {
			completeLoop(
				ctx,
				state,
				shared,
				pi,
				`───────────────────────────────────────────────────────────────────────\n` +
					`✅ RALPH LOOP COMPLETE: ${state.name} | ${state.iteration} iterations\n` +
					`───────────────────────────────────────────────────────────────────────`,
			);
			return;
		}

		if (marker === "ABORT") {
			pauseLoop(
				ctx,
				state,
				shared,
				`Ralph loop "${state.name}" aborted by agent at iteration ${state.iteration}.`,
			);
			return;
		}

		// Max iterations guard (agent didn't call ralph_done)
		if (
			state.maxIterations > 0 &&
			state.iteration >= state.maxIterations
		) {
			completeLoop(
				ctx,
				state,
				shared,
				pi,
				`───────────────────────────────────────────────────────────────────────\n` +
					`⚠️ RALPH LOOP STOPPED: ${state.name} | Max iterations (${state.maxIterations}) reached\n` +
					`───────────────────────────────────────────────────────────────────────`,
			);
		}
	});

	pi.on("tool_execution_end", async (event, ctx) => {
		if (!shared.currentLoop) return;
		const state = loadState(ctx, shared.currentLoop);
		if (!state || state.status !== "active") return;

		// ralph_done marks end-of-iteration; don't attribute it to next iteration
		if (event.toolName === "ralph_done") return;

		state.currentIterationToolCalls++;

		// Track files touched by write/edit tools
		if (/^(edit|write|create_file|update_file)$/i.test(event.toolName)) {
			const filePath = event.args?.path ?? event.args?.filePath;
			if (filePath && !state.currentIterationFiles.includes(filePath)) {
				state.currentIterationFiles.push(filePath);
			}
		}

		saveStateSync(ctx, state);
	});

	pi.on("session_start", async (_event, ctx) => {
		const active = listLoops(ctx).filter((l) => l.status === "active");
		if (active.length > 0 && ctx.hasUI) {
			const lines = active.map(
				(l) =>
					`  • ${l.name} [${l.mode}] (iteration ${l.iteration}${l.maxIterations > 0 ? `/${l.maxIterations}` : ""})`,
			);
			ctx.ui.notify(
				`Active Ralph loops:\n${lines.join("\n")}\n\nUse /ralph resume <name> to continue`,
				"info",
			);
		}
		shared.updateUI(ctx);
	});

	pi.on("session_compact", async (_event, ctx) => {
		if (!shared.currentLoop) return;
		await withLockedState(ctx, shared.currentLoop, (state) => {
			state.compactionCount++;
		});
		shared.updateUI(ctx);
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		if (!shared.currentLoop) return;
		await withLockedState(ctx, shared.currentLoop, () => {
			// Touch file to persist any in-memory state
		});
	});
}
