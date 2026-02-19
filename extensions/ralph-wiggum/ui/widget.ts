/**
 * Ralph Wiggum v3 — TUI widget and status bar.
 *
 * Renders loop info in the pi status bar and sidebar widget.
 */

import * as path from "node:path";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { STATUS_ICONS, type LoopStateV3 } from "../types.js";
import { loadState, tryRead } from "../state/store.js";
import { countChecklist, type SharedContext } from "../runtime/loop.js";
import { isStruggling } from "../runtime/struggle.js";

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

/** One-line summary of a loop for status/list display. */
export function formatLoop(l: LoopStateV3): string {
	const status = `${STATUS_ICONS[l.status]} ${l.status}`;
	const iter =
		l.maxIterations > 0
			? `${l.iteration}/${l.maxIterations}`
			: `${l.iteration}`;
	return `${l.name}: ${status} (iteration ${iter})`;
}

/**
 * Render a text progress bar.
 *
 * ```
 * 8/15 ████████░░░░░░░
 * ```
 *
 * @param done  Completed items
 * @param total Total items (0 → empty string)
 * @param width Bar character width (default 15)
 */
export function renderProgressBar(
	done: number,
	total: number,
	width = 15,
): string {
	if (total <= 0) return "";
	const ratio = Math.min(done / total, 1);
	const filled = Math.round(ratio * width);
	const empty = width - filled;
	return `${done}/${total} ${"█".repeat(filled)}${"░".repeat(empty)}`;
}

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------

/** Update the pi status bar and widget for the current loop. */
export function updateUI(
	ctx: ExtensionContext,
	shared: SharedContext,
): void {
	if (!ctx.hasUI) return;

	const state = shared.currentLoop
		? loadState(ctx, shared.currentLoop)
		: null;

	if (!state) {
		ctx.ui.setStatus("ralph", undefined);
		ctx.ui.setWidget("ralph", undefined);
		return;
	}

	const { theme } = ctx.ui;
	const maxStr =
		state.maxIterations > 0 ? `/${state.maxIterations}` : "";

	// Status bar
	ctx.ui.setStatus(
		"ralph",
		theme.fg(
			"accent",
			`🔄 ${state.name} [${state.mode}] (${state.iteration}${maxStr})`,
		),
	);

	// Widget lines
	const lines = [
		theme.fg("accent", theme.bold("Ralph Wiggum")),
		theme.fg("muted", `Loop: ${state.name} [${state.mode}]`),
		theme.fg("dim", `Status: ${STATUS_ICONS[state.status]} ${state.status}`),
		theme.fg("dim", `Iteration: ${state.iteration}${maxStr}`),
	];

	// Checklist progress bar
	const taskContent = tryRead(path.resolve(ctx.cwd, state.taskFile));
	if (taskContent) {
		const { done, total } = countChecklist(taskContent);
		if (total > 0) {
			lines.push(
				theme.fg("dim", `Checklist: ${renderProgressBar(done, total)}`),
			);
		}
	}

	lines.push(theme.fg("dim", `Task: ${state.taskFile}`));

	if (state.reflectEvery > 0) {
		const next =
			state.reflectEvery -
			((state.iteration - 1) % state.reflectEvery);
		lines.push(theme.fg("dim", `Next reflection in: ${next} iterations`));
	}

	// Conditional extras
	if (state.compactionCount > 0) {
		lines.push(theme.fg("dim", `Compactions: ${state.compactionCount}`));
	}
	if (state.sessionRotations > 0) {
		lines.push(theme.fg("dim", `Rotations: ${state.sessionRotations}`));
	}
	if (isStruggling(state)) {
		lines.push(
			theme.fg(
				"warning",
				`⚠️ No progress ×${state.noProgressStreak} — try /ralph hint or /ralph rotate`,
			),
		);
	}
	const hintCount =
		state.pendingHints.length + state.stickyHints.length;
	if (hintCount > 0) {
		lines.push(theme.fg("dim", `💡 ${hintCount} hint(s)`));
	}

	lines.push("");
	lines.push(theme.fg("warning", "ESC pauses; /ralph-stop ends"));
	ctx.ui.setWidget("ralph", lines);
}
