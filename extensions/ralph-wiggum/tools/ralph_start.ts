/**
 * Ralph Wiggum v3 — ralph_start tool (LLM-callable).
 *
 * Allows the agent to self-start a loop programmatically.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { RALPH_DIR, createDefaultState, type LoopMode } from "../types.js";
import { sanitize, loadState, saveStateSync, ensureDir } from "../state/store.js";
import { snapshotTaskFile } from "../runtime/checkpoint.js";
import { buildIterationPrompt } from "../prompt/renderer.js";
import type { SharedContext } from "../runtime/loop.js";

export function createRalphStartTool(pi: ExtensionAPI, shared: SharedContext) {
	return {
		name: "ralph_start",
		label: "Start Ralph Loop",
		description:
			"Start a long-running development loop. Use for complex multi-iteration tasks.",
		parameters: Type.Object({
			name: Type.String({ description: "Loop name (e.g., 'refactor-auth')" }),
			taskContent: Type.String({
				description: "Task in markdown with goals and checklist",
			}),
			itemsPerIteration: Type.Optional(
				Type.Number({ description: "Suggest N items per turn (0 = no limit)" }),
			),
			reflectEvery: Type.Optional(
				Type.Number({ description: "Reflect every N iterations" }),
			),
			maxIterations: Type.Optional(
				Type.Number({
					description: "Max iterations (default: 50)",
					default: 50,
				}),
			),
			mode: Type.Optional(
				Type.Union([Type.Literal("plan"), Type.Literal("build")], {
					description: 'Execution mode: "plan" (read-only analysis) or "build" (default)',
				}),
			),
			promptTemplate: Type.Optional(
				Type.String({ description: "Path to custom prompt template file" }),
			),
		}),
		async execute(
			_toolCallId: string,
			params: {
				name: string;
				taskContent: string;
				itemsPerIteration?: number;
				reflectEvery?: number;
				maxIterations?: number;
				mode?: string;
				promptTemplate?: string;
			},
			_signal: AbortSignal | undefined,
			_onUpdate: unknown,
			ctx: ExtensionContext,
		) {
			const loopName = sanitize(params.name);
			const taskFile = path.join(RALPH_DIR, `${loopName}.md`);

			if (loadState(ctx, loopName)?.status === "active") {
				return {
					content: [{ type: "text" as const, text: `Loop "${loopName}" already active.` }],
					details: {},
				};
			}

			const fullPath = path.resolve(ctx.cwd, taskFile);
			ensureDir(fullPath);
			fs.writeFileSync(fullPath, params.taskContent, "utf-8");

			const mode: LoopMode =
				params.mode === "plan" ? "plan" : "build";

			const state = createDefaultState(loopName, taskFile, {
				maxIterations: params.maxIterations ?? 50,
				itemsPerIteration: params.itemsPerIteration ?? 0,
				reflectEvery: params.reflectEvery ?? 0,
				mode,
				promptTemplate: params.promptTemplate,
			});

			state.iterationStartedAt = new Date().toISOString();
			snapshotTaskFile(state, params.taskContent);
			saveStateSync(ctx, state);
			shared.currentLoop = loopName;
			shared.updateUI(ctx);

			pi.sendUserMessage(
				buildIterationPrompt(state, params.taskContent, false),
				{ deliverAs: "followUp" },
			);

			return {
				content: [
					{
						type: "text" as const,
						text: `Started loop "${loopName}" [${mode}] (max ${state.maxIterations} iterations).`,
					},
				],
				details: {},
			};
		},
	};
}
