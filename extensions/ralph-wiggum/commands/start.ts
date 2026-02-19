/**
 * Ralph Wiggum v3 — /ralph start command.
 *
 * Creates or restarts a loop with v3 state, new args (--mode, --template).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import {
	RALPH_DIR,
	DEFAULT_REFLECT_INSTRUCTIONS,
	createDefaultState,
	type LoopStateV3,
	type LoopMode,
	type ParsedArgs,
} from "../types.js";
import { sanitize, loadState, saveStateSync, ensureDir, tryRead } from "../state/store.js";
import { snapshotTaskFile } from "../runtime/checkpoint.js";
import { buildIterationPrompt } from "../prompt/renderer.js";
import { DEFAULT_TASK_TEMPLATE } from "../prompt/templates.js";
import type { SharedContext } from "../runtime/loop.js";

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

/** Parse `/ralph start` arguments with v3 extensions. */
export function parseArgs(argsStr: string): ParsedArgs {
	const tokens = argsStr.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
	const result: ParsedArgs = {
		name: "",
		maxIterations: 50,
		itemsPerIteration: 0,
		reflectEvery: 0,
		reflectInstructions: DEFAULT_REFLECT_INSTRUCTIONS,
		mode: "build",
	};

	for (let i = 0; i < tokens.length; i++) {
		const tok = tokens[i];
		const next = tokens[i + 1];
		if (tok === "--max-iterations" && next) {
			result.maxIterations = parseInt(next, 10) || 0;
			i++;
		} else if (tok === "--items-per-iteration" && next) {
			result.itemsPerIteration = parseInt(next, 10) || 0;
			i++;
		} else if (tok === "--reflect-every" && next) {
			result.reflectEvery = parseInt(next, 10) || 0;
			i++;
		} else if (tok === "--reflect-instructions" && next) {
			result.reflectInstructions = next.replace(/^"|"$/g, "");
			i++;
		} else if (tok === "--mode" && next) {
			const mode = next.toLowerCase();
			if (mode === "plan" || mode === "build") {
				result.mode = mode as LoopMode;
			}
			// Invalid mode silently falls back to "build"
			i++;
		} else if (tok === "--template" && next) {
			result.promptTemplate = next.replace(/^"|"$/g, "");
			i++;
		} else if (!tok.startsWith("--")) {
			result.name = tok;
		}
	}
	return result;
}

// ---------------------------------------------------------------------------
// Command handler
// ---------------------------------------------------------------------------

export function startCommand(
	rest: string,
	ctx: ExtensionContext,
	pi: ExtensionAPI,
	shared: SharedContext,
): void {
	const args = parseArgs(rest);
	if (!args.name) {
		ctx.ui.notify(
			"Usage: /ralph start <name|path> [--mode plan|build] [--template PATH] [--items-per-iteration N] [--reflect-every N] [--max-iterations N]",
			"warning",
		);
		return;
	}

	// Validate template path if provided
	if (args.promptTemplate && !fs.existsSync(path.resolve(ctx.cwd, args.promptTemplate))) {
		ctx.ui.notify(`Template not found: ${args.promptTemplate} — using built-in`, "warning");
		args.promptTemplate = undefined;
	}

	const isPath = args.name.includes("/") || args.name.includes("\\");
	const loopName = isPath
		? sanitize(path.basename(args.name, path.extname(args.name)))
		: args.name;
	const taskFile = isPath ? args.name : path.join(RALPH_DIR, `${loopName}.md`);

	const existing = loadState(ctx, loopName);
	if (existing?.status === "active") {
		ctx.ui.notify(
			`Loop "${loopName}" is already active. Use /ralph resume ${loopName}`,
			"warning",
		);
		return;
	}

	// Create task file if missing
	const fullPath = path.resolve(ctx.cwd, taskFile);
	if (!fs.existsSync(fullPath)) {
		ensureDir(fullPath);
		fs.writeFileSync(fullPath, DEFAULT_TASK_TEMPLATE, "utf-8");
		ctx.ui.notify(`Created task file: ${taskFile}`, "info");
	}

	// Build state
	const state = createDefaultState(loopName, taskFile, {
		maxIterations: args.maxIterations,
		itemsPerIteration: args.itemsPerIteration,
		reflectEvery: args.reflectEvery,
		reflectInstructions: args.reflectInstructions,
		mode: args.mode,
		promptTemplate: args.promptTemplate,
		startedAt: existing?.startedAt || new Date().toISOString(),
	});

	state.iterationStartedAt = new Date().toISOString();

	// Snapshot initial task file
	const content = tryRead(fullPath);
	if (!content) {
		ctx.ui.notify(`Could not read task file: ${taskFile}`, "error");
		return;
	}
	snapshotTaskFile(state, content);

	saveStateSync(ctx, state);
	shared.currentLoop = loopName;
	shared.updateUI(ctx);

	pi.sendUserMessage(buildIterationPrompt(state, content, false));
}
