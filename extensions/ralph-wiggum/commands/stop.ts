/**
 * Ralph Wiggum v3 — /ralph stop command.
 *
 * Pauses the current active loop.
 */

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { loadState, listLoops } from "../state/store.js";
import { pauseLoop, type SharedContext } from "../runtime/loop.js";

export function stopCommand(
	_rest: string,
	ctx: ExtensionContext,
	shared: SharedContext,
): void {
	if (!shared.currentLoop) {
		// Check persisted state for any active loop
		const active = listLoops(ctx).find((l) => l.status === "active");
		if (active) {
			pauseLoop(
				ctx,
				active,
				shared,
				`Paused Ralph loop: ${active.name} (iteration ${active.iteration})`,
			);
		} else {
			ctx.ui.notify("No active Ralph loop", "warning");
		}
		return;
	}

	const state = loadState(ctx, shared.currentLoop);
	if (state) {
		pauseLoop(
			ctx,
			state,
			shared,
			`Paused Ralph loop: ${shared.currentLoop} (iteration ${state.iteration})`,
		);
	}
}
