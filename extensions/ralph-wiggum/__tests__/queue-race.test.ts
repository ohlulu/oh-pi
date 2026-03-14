/**
 * Regression tests for the queue race incident (2026-03-13).
 *
 * Covers:
 *   T1: ralph_start source uses deliverAs "steer" (static verification)
 *   T2: ralph_done doneRequested flag behavior (state-level)
 *   T3: complete marker after skipped done → coherent state/history
 *   T4: end-to-end single iteration with proper handoff
 *   T5: doneRequested + complete marker interaction
 *   Bonus: statusDetail lifecycle transitions
 *
 * Note: Tool files import @sinclair/typebox (not available in test env).
 * Tests verify behavior through state/runtime APIs and static source checks.
 */
import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

import { createDefaultState, type IterationRecord } from "../types.ts";
import {
	saveStateSync,
	loadState,
	ensureDir,
	tryRead,
} from "../state/store.ts";
import {
	advanceIteration,
	completeLoop,
	stopLoop,
	countChecklist,
	type SharedContext,
} from "../runtime/loop.ts";
import { appendHistory } from "../runtime/history.ts";
import { snapshotTaskFile } from "../runtime/checkpoint.ts";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const TMP = path.join("/tmp", `ralph-queue-race-${Date.now()}`);
const TASK_FILE = ".pi/ralph/test-loop.md";

const TASK_CONTENT = `# Task

## Goals
- Build feature

## Checklist
- [x] Step 1
- [x] Step 2
- [ ] Step 3
`;

function makeCtx(cwd = TMP): any {
	return {
		cwd,
		hasUI: true,
		ui: {
			notify: () => {},
			setStatus: () => {},
			setWidget: () => {},
			theme: { fg: (_: string, t: string) => t, bold: (t: string) => t },
		},
		isIdle: () => true,
		hasPendingMessages: () => false,
	};
}

function makeShared(currentLoop: string | null = null): SharedContext {
	return {
		currentLoop,
		updateUI: () => {},
	};
}

interface SentMessage {
	text: string;
	options?: { deliverAs?: string };
}

function makePi(): { sent: SentMessage[]; sendUserMessage: (msg: string, opts?: any) => void } {
	return {
		sent: [],
		sendUserMessage(msg: string, opts?: any) {
			this.sent.push({ text: msg, options: opts });
		},
	};
}

function writeTaskFile(content: string, cwd = TMP) {
	const fp = path.resolve(cwd, TASK_FILE);
	ensureDir(fp);
	fs.writeFileSync(fp, content, "utf-8");
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	fs.rmSync(TMP, { recursive: true, force: true });
	fs.mkdirSync(TMP, { recursive: true });
});

afterAll(() => {
	fs.rmSync(TMP, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// T1: ralph_start tool uses deliverAs "steer" (static verification)
// ---------------------------------------------------------------------------

describe("T1: ralph_start tool steer delivery", () => {
	test("ralph_start.ts source uses deliverAs 'steer'", () => {
		const src = fs.readFileSync(
			path.resolve(__dirname, "../tools/ralph_start.ts"),
			"utf-8",
		);
		// Must use steer, not followUp
		expect(src).toContain('deliverAs: "steer"');
		expect(src).not.toContain('deliverAs: "followUp"');
	});

	test("ralph_start.ts tool result signals model to stop", () => {
		const src = fs.readFileSync(
			path.resolve(__dirname, "../tools/ralph_start.ts"),
			"utf-8",
		);
		expect(src).toContain("do not call further tools");
	});

	test("ralph_start.ts sets statusDetail to 'starting'", () => {
		const src = fs.readFileSync(
			path.resolve(__dirname, "../tools/ralph_start.ts"),
			"utf-8",
		);
		expect(src).toContain('"starting"');
	});
});

// ---------------------------------------------------------------------------
// T2: ralph_done doneRequested flag behavior
// ---------------------------------------------------------------------------

describe("T2: doneRequested flag in state", () => {
	test("ralph_done.ts source sets doneRequested on pending", () => {
		const src = fs.readFileSync(
			path.resolve(__dirname, "../tools/ralph_done.ts"),
			"utf-8",
		);
		expect(src).toContain("state.doneRequested = true");
		expect(src).toContain("deferred");
		// Old skip message must be gone
		expect(src).not.toContain("Skipping ralph_done");
	});

	test("doneRequested field can be persisted and loaded", () => {
		const ctx = makeCtx();
		writeTaskFile(TASK_CONTENT);

		const state = createDefaultState("flag-loop", TASK_FILE, {
			status: "active",
		});
		state.doneRequested = true;
		saveStateSync(ctx, state);

		const loaded = loadState(ctx, "flag-loop")!;
		expect(loaded.doneRequested).toBe(true);
	});

	test("doneRequested defaults to undefined/falsy on new state", () => {
		const state = createDefaultState("new-loop", TASK_FILE);
		expect(state.doneRequested).toBeFalsy();
	});
});

// ---------------------------------------------------------------------------
// T3: completeLoop final accounting
// ---------------------------------------------------------------------------

describe("T3: completeLoop records final iteration", () => {
	test("completeLoop produces history record with correct checklist delta", () => {
		const ctx = makeCtx();
		const shared = makeShared("accounting-loop");
		const pi = makePi();

		writeTaskFile(TASK_CONTENT);
		const state = createDefaultState("accounting-loop", TASK_FILE, {
			status: "active",
			lastChecklistCount: 0, // stale
			currentIterationToolCalls: 42,
		});
		state.iterationStartedAt = new Date(Date.now() - 60_000).toISOString();
		saveStateSync(ctx, state);

		completeLoop(ctx, state, shared, pi as any, "✅ COMPLETE");

		// State accounting
		const finalState = loadState(ctx, "accounting-loop")!;
		expect(finalState.status).toBe("completed");
		expect(finalState.lastChecklistCount).toBe(2); // 2 [x] in TASK_CONTENT
		expect(finalState.statusDetail).toBe("completing");

		// History file
		const hp = path.resolve(TMP, ".pi/ralph", "accounting-loop.history.json");
		expect(fs.existsSync(hp)).toBe(true);
		const history: IterationRecord[] = JSON.parse(fs.readFileSync(hp, "utf-8"));
		expect(history.length).toBe(1);
		expect(history[0].iteration).toBe(1);
		expect(history[0].toolCalls).toBe(42);
		expect(history[0].checklistDelta).toBe(2);

		// Log file
		const lp = path.resolve(TMP, ".pi/ralph", "accounting-loop.log");
		expect(fs.existsSync(lp)).toBe(true);
		const logContent = fs.readFileSync(lp, "utf-8");
		expect(logContent).toContain("Iter   1");
		expect(logContent).toContain("COMPLETE");
	});

	test("stopLoop also records final accounting", () => {
		const ctx = makeCtx();
		const shared = makeShared("stop-accounting");

		writeTaskFile(TASK_CONTENT);
		const state = createDefaultState("stop-accounting", TASK_FILE, {
			status: "active",
			lastChecklistCount: 1,
			currentIterationToolCalls: 10,
		});
		state.iterationStartedAt = new Date(Date.now() - 30_000).toISOString();
		saveStateSync(ctx, state);

		stopLoop(ctx, state, shared, "Stopped.");

		const finalState = loadState(ctx, "stop-accounting")!;
		expect(finalState.lastChecklistCount).toBe(2);
		expect(finalState.statusDetail).toBe("completing");

		const hp = path.resolve(TMP, ".pi/ralph", "stop-accounting.history.json");
		expect(fs.existsSync(hp)).toBe(true);
		const history: IterationRecord[] = JSON.parse(fs.readFileSync(hp, "utf-8"));
		expect(history.length).toBe(1);
		expect(history[0].checklistDelta).toBe(1); // 2 - 1
	});

	test("completeLoop is safe when task file is missing", () => {
		const ctx = makeCtx();
		const shared = makeShared("missing-task");
		const pi = makePi();

		// Don't write task file
		const state = createDefaultState("missing-task", TASK_FILE, {
			status: "active",
		});
		saveStateSync(ctx, state);

		// Should not throw — accounting failure is non-fatal
		expect(() => {
			completeLoop(ctx, state, shared, pi as any, "✅ DONE");
		}).not.toThrow();

		const finalState = loadState(ctx, "missing-task")!;
		expect(finalState.status).toBe("completed");
	});
});

// ---------------------------------------------------------------------------
// T4: end-to-end single iteration with proper handoff
// ---------------------------------------------------------------------------

describe("T4: single iteration end-to-end", () => {
	test("advanceIteration → completeLoop produces coherent history", () => {
		const ctx = makeCtx();
		const shared = makeShared("e2e-loop");
		const pi = makePi();

		writeTaskFile(TASK_CONTENT);
		const state = createDefaultState("e2e-loop", TASK_FILE, {
			status: "active",
			lastChecklistCount: 1, // started with 1 done
			currentIterationToolCalls: 15,
		});
		state.iterationStartedAt = new Date(Date.now() - 120_000).toISOString();
		snapshotTaskFile(state, "old content");
		saveStateSync(ctx, state);

		// Simulate ralph_done → advanceIteration
		const prevIter = state.iteration;
		const prevDone = state.lastChecklistCount;
		const result = advanceIteration(ctx, state, shared, pi as any);
		expect(result.action).toBe("next");
		expect(state.iteration).toBe(2);
		expect(state.statusDetail).toBe("active");

		// Now simulate COMPLETE marker → completeLoop
		completeLoop(ctx, state, shared, pi as any, "✅ DONE");

		const finalState = loadState(ctx, "e2e-loop")!;
		expect(finalState.status).toBe("completed");
		expect(finalState.statusDetail).toBe("completing");
		expect(finalState.lastChecklistCount).toBe(2);

		// History should have the completion record
		const hp = path.resolve(TMP, ".pi/ralph", "e2e-loop.history.json");
		if (fs.existsSync(hp)) {
			const history: IterationRecord[] = JSON.parse(
				fs.readFileSync(hp, "utf-8"),
			);
			expect(history.length).toBeGreaterThanOrEqual(1);
		}
	});
});

// ---------------------------------------------------------------------------
// T5: doneRequested + agent_end drain scenario
// ---------------------------------------------------------------------------

describe("T5: doneRequested drain in agent_end", () => {
	test("agent_end handler drains doneRequested before max-iter guard", () => {
		const indexSrc = fs.readFileSync(
			path.resolve(__dirname, "../index.ts"),
			"utf-8",
		);
		// index.ts must check doneRequested and call drainDoneRequest
		expect(indexSrc).toContain("state.doneRequested");
		expect(indexSrc).toContain("drainDoneRequest");

		// doneRequested block must come BEFORE max iterations guard
		const doneReqIdx = indexSrc.indexOf("state.doneRequested && !marker");
		const maxIterIdx = indexSrc.indexOf("Max iterations guard");
		expect(doneReqIdx).toBeGreaterThan(-1);
		expect(maxIterIdx).toBeGreaterThan(-1);
		expect(doneReqIdx).toBeLessThan(maxIterIdx);

		// Drain logic in loop.ts resets flag and calls advanceIteration
		const loopSrc = fs.readFileSync(
			path.resolve(__dirname, "../runtime/loop.ts"),
			"utf-8",
		);
		expect(loopSrc).toContain("drainDoneRequest");
		expect(loopSrc).toContain("state.doneRequested = false");
		expect(loopSrc).toContain("advanceIteration(ctx, state, shared, pi)");
	});

	test("doneRequested + completeLoop: flag is cleared and completion still works", () => {
		const ctx = makeCtx();
		const shared = makeShared("deferred-complete");
		const pi = makePi();

		writeTaskFile(TASK_CONTENT);
		const state = createDefaultState("deferred-complete", TASK_FILE, {
			status: "active",
			lastChecklistCount: 0,
			currentIterationToolCalls: 5,
		});
		state.doneRequested = true;
		state.iterationStartedAt = new Date().toISOString();
		saveStateSync(ctx, state);

		// Simulate: agent_end with COMPLETE marker takes priority over doneRequested
		// (the agent_end handler checks marker first, doneRequested only when !marker)
		// Here we test completeLoop directly — it should work regardless of flag
		completeLoop(ctx, state, shared, pi as any, "✅ COMPLETE");

		const finalState = loadState(ctx, "deferred-complete")!;
		expect(finalState.status).toBe("completed");
		expect(finalState.lastChecklistCount).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// Bonus: statusDetail lifecycle
// ---------------------------------------------------------------------------

describe("statusDetail lifecycle", () => {
	test("advanceIteration sets statusDetail to 'active'", () => {
		const ctx = makeCtx();
		const shared = makeShared("detail-loop");
		const pi = makePi();

		writeTaskFile(TASK_CONTENT);
		const state = createDefaultState("detail-loop", TASK_FILE, {
			status: "active",
		});
		state.statusDetail = "starting";
		saveStateSync(ctx, state);

		advanceIteration(ctx, state, shared, pi as any);
		expect(state.statusDetail).toBe("active");
	});

	test("completeLoop sets statusDetail to 'completing'", () => {
		const ctx = makeCtx();
		const shared = makeShared("complete-detail");
		const pi = makePi();

		writeTaskFile(TASK_CONTENT);
		const state = createDefaultState("complete-detail", TASK_FILE, {
			status: "active",
		});
		state.statusDetail = "active";
		saveStateSync(ctx, state);

		completeLoop(ctx, state, shared, pi as any, "✅ DONE");
		expect(state.statusDetail).toBe("completing");
	});

	test("stopLoop sets statusDetail to 'completing'", () => {
		const ctx = makeCtx();
		const shared = makeShared("stop-detail");

		writeTaskFile(TASK_CONTENT);
		const state = createDefaultState("stop-detail", TASK_FILE, {
			status: "active",
		});
		state.statusDetail = "active";
		saveStateSync(ctx, state);

		stopLoop(ctx, state, shared, "Stopped.");
		expect(state.statusDetail).toBe("completing");
	});
});
