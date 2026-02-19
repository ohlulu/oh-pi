/**
 * Ralph Wiggum v3 — `/ralph mode` command.
 *
 * Switch execution mode (plan ↔ build) on the active loop.
 */

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { LoopMode } from "../types.js";
import { loadState, saveStateSync } from "../state/store.js";
import type { SharedContext } from "../runtime/loop.js";

const VALID_MODES: LoopMode[] = ["plan", "build"];

export function modeCommand(
	rest: string,
	ctx: ExtensionContext,
	shared: SharedContext,
): void {
	const target = rest.trim().toLowerCase();

	if (!shared.currentLoop) {
		ctx.ui.notify("No active Ralph loop.", "warning");
		return;
	}

	if (!target || !VALID_MODES.includes(target as LoopMode)) {
		ctx.ui.notify(
			`Usage: /ralph mode <plan|build>\nCurrent mode: ${loadState(ctx, shared.currentLoop)?.mode ?? "unknown"}`,
			"warning",
		);
		return;
	}

	const state = loadState(ctx, shared.currentLoop);
	if (!state) {
		ctx.ui.notify(`Loop "${shared.currentLoop}" not found.`, "error");
		return;
	}

	const newMode = target as LoopMode;
	if (state.mode === newMode) {
		ctx.ui.notify(`Already in ${newMode} mode.`, "info");
		return;
	}

	const oldMode = state.mode;
	state.mode = newMode;
	saveStateSync(ctx, state);
	shared.updateUI(ctx);

	ctx.ui.notify(`Mode switched: ${oldMode} → ${newMode}`, "info");
}
