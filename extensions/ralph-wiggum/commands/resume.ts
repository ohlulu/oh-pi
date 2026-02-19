/**
 * Ralph Wiggum v3 — /ralph resume command.
 *
 * Resumes a paused loop using v3 prompt builder.
 */

import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { loadState, saveStateSync, tryRead } from "../state/store.js";
import { buildIterationPrompt } from "../prompt/renderer.js";
import { pauseLoop, type SharedContext } from "../runtime/loop.js";

export function resumeCommand(
	rest: string,
	ctx: ExtensionContext,
	pi: ExtensionAPI,
	shared: SharedContext,
): void {
	const loopName = rest.trim();
	if (!loopName) {
		ctx.ui.notify("Usage: /ralph resume <name>", "warning");
		return;
	}

	const state = loadState(ctx, loopName);
	if (!state) {
		ctx.ui.notify(`Loop "${loopName}" not found`, "error");
		return;
	}
	if (state.status === "completed") {
		ctx.ui.notify(
			`Loop "${loopName}" is completed. Use /ralph start ${loopName} to restart`,
			"warning",
		);
		return;
	}

	// Pause current loop if different
	if (shared.currentLoop && shared.currentLoop !== loopName) {
		const curr = loadState(ctx, shared.currentLoop);
		if (curr) pauseLoop(ctx, curr, shared);
	}

	state.status = "active";
	state.iteration++;
	state.iterationStartedAt = new Date().toISOString();
	state.currentIterationToolCalls = 0;
	state.currentIterationFiles = [];
	saveStateSync(ctx, state);
	shared.currentLoop = loopName;
	shared.updateUI(ctx);

	ctx.ui.notify(`Resumed: ${loopName} (iteration ${state.iteration})`, "info");

	const content = tryRead(path.resolve(ctx.cwd, state.taskFile));
	if (!content) {
		ctx.ui.notify(`Could not read task file: ${state.taskFile}`, "error");
		return;
	}

	const needsReflection =
		state.reflectEvery > 0 &&
		state.iteration > 1 &&
		(state.iteration - 1) % state.reflectEvery === 0;

	pi.sendUserMessage(buildIterationPrompt(state, content, needsReflection));
}
