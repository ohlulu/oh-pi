/**
 * Ralph Wiggum v3 — /ralph hint & /ralph hints commands.
 *
 * Manages one-shot and sticky hints injected into iteration prompts.
 * One-shot hints are consumed after being included in one prompt.
 */

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { HINT_MAX_LENGTH, HINT_MAX_COUNT } from "../types.js";
import { loadState, saveStateSync } from "../state/store.js";
import type { SharedContext } from "../runtime/loop.js";

// ---------------------------------------------------------------------------
// /ralph hint <text> [--sticky] [--clear]
// ---------------------------------------------------------------------------

export function hintCommand(
	rest: string,
	ctx: ExtensionContext,
	shared: SharedContext,
): void {
	if (!shared.currentLoop) {
		ctx.ui.notify("No active Ralph loop", "warning");
		return;
	}

	const state = loadState(ctx, shared.currentLoop);
	if (!state) {
		ctx.ui.notify("Could not load loop state", "error");
		return;
	}

	const trimmed = rest.trim();

	// --clear: wipe all hints
	if (trimmed === "--clear") {
		state.pendingHints = [];
		state.stickyHints = [];
		saveStateSync(ctx, state);
		ctx.ui.notify("All hints cleared", "info");
		return;
	}

	// Determine sticky vs one-shot
	const isSticky = trimmed.includes("--sticky");
	const hintText = trimmed
		.replace(/--sticky/g, "")
		.trim();

	if (!hintText) {
		ctx.ui.notify(
			"Usage: /ralph hint <text> [--sticky] | /ralph hint --clear",
			"warning",
		);
		return;
	}

	// Governance: length check
	let finalHint = hintText;
	if (finalHint.length > HINT_MAX_LENGTH) {
		finalHint = finalHint.slice(0, HINT_MAX_LENGTH);
		ctx.ui.notify(
			`Hint truncated to ${HINT_MAX_LENGTH} chars`,
			"warning",
		);
	}

	// Governance: count check
	const totalHints = state.pendingHints.length + state.stickyHints.length;
	if (totalHints >= HINT_MAX_COUNT) {
		ctx.ui.notify(
			`Max hints reached (${HINT_MAX_COUNT}). Use /ralph hint --clear first.`,
			"warning",
		);
		return;
	}

	// Add hint
	if (isSticky) {
		state.stickyHints.push(finalHint);
	} else {
		state.pendingHints.push(finalHint);
	}

	saveStateSync(ctx, state);
	const label = isSticky ? "sticky" : "one-shot";
	ctx.ui.notify(`Added ${label} hint: "${finalHint}"`, "info");
}

// ---------------------------------------------------------------------------
// /ralph hints — list active hints
// ---------------------------------------------------------------------------

export function hintsCommand(
	_rest: string,
	ctx: ExtensionContext,
	shared: SharedContext,
): void {
	if (!shared.currentLoop) {
		ctx.ui.notify("No active Ralph loop", "warning");
		return;
	}

	const state = loadState(ctx, shared.currentLoop);
	if (!state) {
		ctx.ui.notify("Could not load loop state", "error");
		return;
	}

	const { pendingHints, stickyHints } = state;
	if (pendingHints.length === 0 && stickyHints.length === 0) {
		ctx.ui.notify("No active hints", "info");
		return;
	}

	const lines: string[] = [];
	for (const h of pendingHints) lines.push(`  • ${h} (one-shot)`);
	for (const h of stickyHints) lines.push(`  • ${h} (sticky)`);
	ctx.ui.notify(`Active hints:\n${lines.join("\n")}`, "info");
}

// ---------------------------------------------------------------------------
// Consume one-shot hints (called after prompt injection)
// ---------------------------------------------------------------------------

/** Clear pending (one-shot) hints after they've been injected into a prompt. */
export function consumePendingHints(
	ctx: ExtensionContext,
	shared: SharedContext,
): void {
	if (!shared.currentLoop) return;
	const state = loadState(ctx, shared.currentLoop);
	if (!state || state.pendingHints.length === 0) return;
	state.pendingHints = [];
	saveStateSync(ctx, state);
}
