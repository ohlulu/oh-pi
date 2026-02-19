/**
 * Ralph Wiggum v3 — ralph_done tool (LLM-callable).
 *
 * Signals iteration complete. Handles checkpoint validation on
 * reflection iterations, consumes one-shot hints, and advances.
 */

import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import type { IterationRecord } from "../types.js";
import { loadState, saveStateSync, tryRead } from "../state/store.js";
import {
	advanceIteration,
	countChecklist,
	pauseLoop,
	type SharedContext,
} from "../runtime/loop.js";
import { appendHistory, appendLog } from "../runtime/history.js";
import { updateStruggleState } from "../runtime/struggle.js";

export function createRalphDoneTool(pi: ExtensionAPI, shared: SharedContext) {
	return {
		name: "ralph_done",
		label: "Ralph Iteration Done",
		description:
			"Signal that you've completed this iteration of the Ralph loop. " +
			"Call this after making progress to get the next iteration prompt. " +
			"Do NOT call this if you've output the completion marker.",
		parameters: Type.Object({}),
		async execute(
			_toolCallId: string,
			_params: Record<string, never>,
			_signal: AbortSignal | undefined,
			_onUpdate: unknown,
			ctx: ExtensionContext,
		) {
			if (!shared.currentLoop) {
				return {
					content: [{ type: "text" as const, text: "No active Ralph loop." }],
					details: {},
				};
			}

			const state = loadState(ctx, shared.currentLoop);
			if (!state || state.status !== "active") {
				return {
					content: [{ type: "text" as const, text: "Ralph loop is not active." }],
					details: {},
				};
			}

			if (ctx.hasPendingMessages()) {
				return {
					content: [
						{
							type: "text" as const,
							text: "Pending messages already queued. Skipping ralph_done.",
						},
					],
					details: {},
				};
			}

			// --- Collect iteration stats before advancing ---
			const prevIteration = state.iteration;
			const prevDone = state.lastChecklistCount;
			const iterStartedAt = state.iterationStartedAt || state.startedAt;
			const toolCalls = state.currentIterationToolCalls;

			// Advance iteration (handles checkpoint, max-iter, prompt building)
			const result = advanceIteration(ctx, state, shared, pi);

			// --- Record history + struggle after advance ---
			if (result.action === "next" || result.action === "complete") {
				const taskContent = tryRead(path.resolve(ctx.cwd, state.taskFile)) ?? "";
				const { done: newDone } = countChecklist(taskContent);
				const checklistDelta = newDone - prevDone;

				const nextIteration = prevIteration + 1;
				const record: IterationRecord = {
					iteration: prevIteration,
					startedAt: iterStartedAt,
					endedAt: new Date().toISOString(),
					durationMs: Date.now() - new Date(iterStartedAt).getTime(),
					toolCalls,
					checklistDelta,
					wasReflection:
						state.reflectEvery > 0 &&
						nextIteration > 1 &&
						(nextIteration - 1) % state.reflectEvery === 0,
				};

				try {
					appendHistory(ctx, state.name, record);
					appendLog(ctx, state.name, record);
				} catch {
					// Non-fatal — don't block iteration
				}

				updateStruggleState(state, checklistDelta);
				saveStateSync(ctx, state);
			}

			// Consume one-shot hints after prompt injection
			if (result.action === "next" || result.action === "retry") {
				if (state.pendingHints.length > 0) {
					state.pendingHints = [];
					saveStateSync(ctx, state);
				}
			}

			switch (result.action) {
				case "next":
					// Queue next iteration
					pi.sendUserMessage(result.prompt!, { deliverAs: "followUp" });
					return {
						content: [
							{
								type: "text" as const,
								text: `Iteration ${prevIteration} complete. Next iteration queued.`,
							},
						],
						details: {},
					};

				case "retry":
					// Checkpoint retry — send retry prompt
					pi.sendUserMessage(result.prompt!, { deliverAs: "followUp" });
					return {
						content: [
							{
								type: "text" as const,
								text: result.message || "Checkpoint retry requested.",
							},
						],
						details: {},
					};

				case "complete":
					return {
						content: [
							{ type: "text" as const, text: result.message || "Loop completed." },
						],
						details: {},
					};

				case "pause":
					return {
						content: [
							{
								type: "text" as const,
								text: result.message || "Loop paused.",
							},
						],
						details: {},
					};
			}
		},
	};
}
