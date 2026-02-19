/**
 * Ralph Wiggum v3 — Iteration control and loop state transitions.
 *
 * Manages pause/complete/stop transitions, iteration advancement,
 * checkpoint validation, and checklist counting.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { LoopStateV3 } from "../types.js";
import { saveStateSync, loadState, tryRead } from "../state/store.js";
import { validateCheckpoint, snapshotTaskFile } from "./checkpoint.js";
import { buildIterationPrompt } from "../prompt/renderer.js";
import { appendLogEvent } from "./history.js";

// ---------------------------------------------------------------------------
// Shared context type (passed from index.ts)
// ---------------------------------------------------------------------------

export interface SharedContext {
	currentLoop: string | null;
	updateUI: (ctx: ExtensionContext) => void;
}

// ---------------------------------------------------------------------------
// Advance result
// ---------------------------------------------------------------------------

export type AdvanceAction = "next" | "retry" | "pause" | "complete";

export interface AdvanceResult {
	action: AdvanceAction;
	prompt?: string;
	message?: string;
}

// ---------------------------------------------------------------------------
// Loop state transitions
// ---------------------------------------------------------------------------

/** Pause a loop — save, clear currentLoop, update UI. */
export function pauseLoop(
	ctx: ExtensionContext,
	state: LoopStateV3,
	shared: SharedContext,
	message?: string,
): void {
	state.status = "paused";
	saveStateSync(ctx, state);
	try {
		appendLogEvent(ctx, state.name, `PAUSE iter=${state.iteration}`);
	} catch {
		// Non-fatal
	}
	shared.currentLoop = null;
	shared.updateUI(ctx);
	if (message && ctx.hasUI) ctx.ui.notify(message, "info");
}

/** Complete a loop — set completed, save, send banner. */
export function completeLoop(
	ctx: ExtensionContext,
	state: LoopStateV3,
	shared: SharedContext,
	pi: ExtensionAPI,
	banner: string,
): void {
	state.status = "completed";
	state.completedAt = new Date().toISOString();
	saveStateSync(ctx, state);
	try {
		appendLogEvent(ctx, state.name, `COMPLETE iter=${state.iteration}`);
	} catch {
		// Non-fatal
	}
	shared.currentLoop = null;
	shared.updateUI(ctx);
	pi.sendUserMessage(banner);
}

/** Stop a loop — set completed, save, notify. */
export function stopLoop(
	ctx: ExtensionContext,
	state: LoopStateV3,
	shared: SharedContext,
	message?: string,
): void {
	state.status = "completed";
	state.completedAt = new Date().toISOString();
	saveStateSync(ctx, state);
	try {
		appendLogEvent(ctx, state.name, `COMPLETE (manual-stop) iter=${state.iteration}`);
	} catch {
		// Non-fatal
	}
	shared.currentLoop = null;
	shared.updateUI(ctx);
	if (message && ctx.hasUI) ctx.ui.notify(message, "info");
}

// ---------------------------------------------------------------------------
// Checklist counting
// ---------------------------------------------------------------------------

/** Count checked and unchecked items in a markdown checklist. */
export function countChecklist(content: string): { done: number; total: number } {
	let done = 0;
	let todo = 0;
	for (const line of content.split(/\r?\n/)) {
		if (/^\s*-\s*\[x\]/i.test(line)) done++;
		else if (/^\s*-\s*\[ \]/.test(line)) todo++;
	}
	return { done, total: done + todo };
}

// ---------------------------------------------------------------------------
// Iteration advancement
// ---------------------------------------------------------------------------

/**
 * Advance to the next iteration.
 *
 * Handles:
 * - Reading task file content
 * - Reflection / checkpoint validation
 * - Max iterations limit
 * - Building the next iteration prompt
 */
export function advanceIteration(
	ctx: ExtensionContext,
	state: LoopStateV3,
	shared: SharedContext,
	pi: ExtensionAPI,
): AdvanceResult {
	// Increment iteration
	state.iteration++;

	// Check max iterations
	if (state.maxIterations > 0 && state.iteration > state.maxIterations) {
		completeLoop(
			ctx,
			state,
			shared,
			pi,
			`───────────────────────────────────────────────────────────────────────\n` +
				`⚠️ RALPH LOOP STOPPED: ${state.name} | Max iterations (${state.maxIterations}) reached\n` +
				`───────────────────────────────────────────────────────────────────────`,
		);
		return { action: "complete", message: "Max iterations reached. Loop stopped." };
	}

	// Read task file
	const taskContent = tryRead(path.resolve(ctx.cwd, state.taskFile));
	if (!taskContent) {
		pauseLoop(ctx, state, shared);
		return { action: "pause", message: `Error: Could not read task file: ${state.taskFile}` };
	}

	// Determine if this is a reflection iteration
	const needsReflection =
		state.reflectEvery > 0 &&
		state.iteration > 1 &&
		(state.iteration - 1) % state.reflectEvery === 0;

	// Checkpoint validation on reflection
	// Always validate on reflection — validateCheckpoint handles first-run (no hash)
	if (needsReflection) {
		const validation = validateCheckpoint(state, taskContent);

		if (!validation.valid) {
			if (!state.checkpointRetried) {
				// First failure → retry
				state.checkpointRetried = true;
				saveStateSync(ctx, state);
				const retryPrompt = buildIterationPrompt(state, taskContent, true);
				return {
					action: "retry",
					prompt: retryPrompt,
					message: `Checkpoint validation failed: ${validation.reasons.join("; ")}. Retrying.`,
				};
			}
			// Second failure → pause
			pauseLoop(
				ctx,
				state,
				shared,
				`Checkpoint validation failed after retry: ${validation.reasons.join("; ")}`,
			);
			return {
				action: "pause",
				message: `Checkpoint failed after retry. Loop paused.`,
			};
		}

		// Validation passed → snapshot + reset retry flag
		snapshotTaskFile(state, taskContent);
		state.checkpointRetried = false;
	}

	// Update checklist stats
	const { done, total } = countChecklist(taskContent);
	state.lastChecklistCount = done;

	// Reset per-iteration stats
	state.currentIterationToolCalls = 0;
	state.currentIterationFiles = [];
	state.iterationStartedAt = new Date().toISOString();

	// Save and build prompt
	saveStateSync(ctx, state);
	shared.updateUI(ctx);

	const prompt = buildIterationPrompt(state, taskContent, needsReflection);
	return { action: "next", prompt };
}
