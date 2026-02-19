/**
 * Ralph Wiggum v3 — /ralph rotate command.
 *
 * Triggers a manual session rotation: checkpoint → new session → bootstrap.
 */

import * as path from "node:path";
import type {
	ExtensionAPI,
	ExtensionCommandContext,
} from "@mariozechner/pi-coding-agent";
import { loadState, saveStateSync, tryRead } from "../state/store.js";
import { snapshotTaskFile, validateCheckpoint } from "../runtime/checkpoint.js";
import { renderTemplate } from "../prompt/renderer.js";
import { ROTATION_BOOTSTRAP_TEMPLATE } from "../prompt/templates.js";
import { appendLogEvent } from "../runtime/history.js";
import type { SharedContext } from "../runtime/loop.js";

export async function rotateCommand(
	_rest: string,
	ctx: ExtensionCommandContext,
	pi: ExtensionAPI,
	shared: SharedContext,
): Promise<void> {
	if (!shared.currentLoop) {
		ctx.ui.notify("No active Ralph loop", "warning");
		return;
	}

	const state = loadState(ctx, shared.currentLoop);
	if (!state || state.status !== "active") {
		ctx.ui.notify("No active Ralph loop to rotate", "warning");
		return;
	}

	// Wait for agent to finish
	await ctx.waitForIdle();

	// Read current task file
	const taskContent = tryRead(path.resolve(ctx.cwd, state.taskFile));
	if (!taskContent) {
		ctx.ui.notify(`Could not read task file: ${state.taskFile}`, "error");
		return;
	}

	// Validate checkpoint before rotation (optional — snapshot regardless)
	if (state.lastTaskFileHash !== undefined) {
		const validation = validateCheckpoint(state, taskContent);
		if (!validation.valid) {
			ctx.ui.notify(
				`Warning: checkpoint incomplete (${validation.reasons.join("; ")}). Rotating anyway.`,
				"warning",
			);
		}
	}

	// Snapshot current state
	snapshotTaskFile(state, taskContent);
	state.sessionRotations++;
	const savedRotation = state.sessionRotations;
	saveStateSync(ctx, state);

	// Build bootstrap message
	const bootstrapVars: Record<string, string> = {
		loopName: state.name,
		iteration: String(state.iteration),
		sessionRotations: String(state.sessionRotations),
		taskFile: state.taskFile,
	};
	const bootstrapMessage = renderTemplate(ROTATION_BOOTSTRAP_TEMPLATE, bootstrapVars);

	// Start new session
	const result = await ctx.newSession({
		setup: async (sessionManager) => {
			sessionManager.appendCustomMessageEntry(
				"ralph-rotation-bootstrap",
				bootstrapMessage,
				true, // display in TUI
			);
		},
	});

	if (result.cancelled) {
		// Roll back
		state.sessionRotations = savedRotation - 1;
		saveStateSync(ctx, state);
		ctx.ui.notify("Session rotation cancelled", "warning");
		return;
	}

	// Post-rotation
	try {
		appendLogEvent(ctx, state.name, `ROTATION #${state.sessionRotations}`);
	} catch {
		// Non-fatal
	}
	shared.updateUI(ctx);
	ctx.ui.notify(
		`Session rotated for "${state.name}" (rotation #${state.sessionRotations})`,
		"info",
	);
}
