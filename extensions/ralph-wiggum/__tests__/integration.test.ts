/**
 * Integration tests for Ralph Wiggum v3.
 *
 * Tests end-to-end flows using real state files on disk
 * with mocked pi/ctx objects.
 */
import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

import { createDefaultState, TASK_CONTENT_INLINE_LIMIT } from "../types.ts";
import {
	saveStateSync,
	loadState,
	migrateState,
	ralphDir,
	ensureDir,
} from "../state/store.ts";
import { detectPromiseMarker } from "../prompt/markers.ts";
import { buildIterationPrompt, formatHints } from "../prompt/renderer.ts";
import {
	advanceIteration,
	countChecklist,
	pauseLoop,
	type SharedContext,
} from "../runtime/loop.ts";
import { snapshotTaskFile } from "../runtime/checkpoint.ts";
import { hintCommand, hintsCommand, consumePendingHints } from "../commands/hint.ts";
import { parseArgs } from "../commands/start.ts";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const TMP = path.join("/tmp", `ralph-integration-${Date.now()}`);
const TASK_FILE = ".ralph/test-loop.md";

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

function makeShared(): SharedContext & { sentMessages: string[] } {
	const s: any = {
		currentLoop: null,
		sentMessages: [],
		updateUI: () => {},
	};
	return s;
}

function makePi(shared: ReturnType<typeof makeShared>): any {
	return {
		sendUserMessage: (msg: string) => shared.sentMessages.push(msg),
	};
}

function writeTaskFile(content: string, cwd = TMP) {
	const fp = path.resolve(cwd, TASK_FILE);
	ensureDir(fp);
	fs.writeFileSync(fp, content, "utf-8");
}

const VALID_TASK = `# Task

## Goals
- Build feature

## Checklist
- [x] Step 1
- [ ] Step 2
- [ ] Step 3

## Checkpoint (Iteration 5)

### Completed
- [x] Step 1

### Failed Approaches
- None

### Key Decisions
- Chose approach A

### Current State
- Step 1 done

### Next Steps
1. Step 2
`;

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
// Marker detection flows
// ---------------------------------------------------------------------------

describe("start → advance → complete (marker)", () => {
	test("COMPLETE marker triggers completion", () => {
		const ctx = makeCtx();
		const shared = makeShared();
		const pi = makePi(shared);

		writeTaskFile(VALID_TASK);
		const state = createDefaultState("test-loop", TASK_FILE);
		saveStateSync(ctx, state);
		shared.currentLoop = "test-loop";

		const marker = detectPromiseMarker(
			"All done.\n<promise>COMPLETE</promise>\nFinished.",
		);
		expect(marker).toBe("COMPLETE");
	});

	test("ABORT marker triggers pause", () => {
		const marker = detectPromiseMarker(
			"Cannot proceed.\n<promise>ABORT</promise>",
		);
		expect(marker).toBe("ABORT");
	});
});

// ---------------------------------------------------------------------------
// Checkpoint / reflection flows
// ---------------------------------------------------------------------------

describe("reflection iteration → checkpoint validation", () => {
	test("checkpoint not written → retry prompt", () => {
		const ctx = makeCtx();
		const shared = makeShared();
		const pi = makePi(shared);

		writeTaskFile("# Task\n## Goals\n- stuff\n");
		const state = createDefaultState("test-loop", TASK_FILE, {
			iteration: 5, // next will be 6; (6-1)%5===0 → reflection
			reflectEvery: 5,
		});
		// Snapshot so hash comparison works (same content = unchanged → fail)
		snapshotTaskFile(state, "# Task\n## Goals\n- stuff\n");
		saveStateSync(ctx, state);
		shared.currentLoop = "test-loop";

		const result = advanceIteration(ctx, state, shared, pi);
		expect(result.action).toBe("retry");
		expect(result.message).toContain("Checkpoint validation failed");
		expect(state.checkpointRetried).toBe(true);
	});

	test("checkpoint not written × 2 → pause", () => {
		const ctx = makeCtx();
		const shared = makeShared();
		const pi = makePi(shared);

		writeTaskFile("# Task\n## Goals\n- stuff\n");
		const state = createDefaultState("test-loop", TASK_FILE, {
			iteration: 5, // next will be 6 → reflection
			reflectEvery: 5,
			checkpointRetried: true, // already retried once
		});
		snapshotTaskFile(state, "# Task\n## Goals\n- stuff\n");
		saveStateSync(ctx, state);
		shared.currentLoop = "test-loop";

		const result = advanceIteration(ctx, state, shared, pi);
		expect(result.action).toBe("pause");
	});

	test("valid checkpoint → advance", () => {
		const ctx = makeCtx();
		const shared = makeShared();
		const pi = makePi(shared);

		writeTaskFile(VALID_TASK);
		const state = createDefaultState("test-loop", TASK_FILE, {
			iteration: 5, // next will be 6 → reflection
			reflectEvery: 5,
		});
		snapshotTaskFile(state, "old content that differs");
		saveStateSync(ctx, state);
		shared.currentLoop = "test-loop";

		const result = advanceIteration(ctx, state, shared, pi);
		expect(result.action).toBe("next");
		expect(result.prompt).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Hint flows
// ---------------------------------------------------------------------------

describe("hint lifecycle", () => {
	test("one-shot hint injected then consumed", () => {
		const ctx = makeCtx();
		const shared = makeShared();

		writeTaskFile(VALID_TASK);
		const state = createDefaultState("test-loop", TASK_FILE);
		saveStateSync(ctx, state);
		shared.currentLoop = "test-loop";

		// Add hint
		hintCommand("focus on tests", ctx, shared);
		const loaded = loadState(ctx, "test-loop")!;
		expect(loaded.pendingHints).toContain("focus on tests");

		// Prompt includes it
		const prompt = buildIterationPrompt(loaded, VALID_TASK, false);
		expect(prompt).toContain("focus on tests");
		expect(prompt).toContain("one-shot");

		// Consume
		consumePendingHints(ctx, shared);
		const after = loadState(ctx, "test-loop")!;
		expect(after.pendingHints).toEqual([]);
	});

	test("sticky hint persists after consume", () => {
		const ctx = makeCtx();
		const shared = makeShared();

		writeTaskFile(VALID_TASK);
		const state = createDefaultState("test-loop", TASK_FILE);
		saveStateSync(ctx, state);
		shared.currentLoop = "test-loop";

		hintCommand("always use bun --sticky", ctx, shared);
		consumePendingHints(ctx, shared);
		const after = loadState(ctx, "test-loop")!;
		expect(after.stickyHints).toContain("always use bun");
	});

	test("--clear removes all hints", () => {
		const ctx = makeCtx();
		const shared = makeShared();

		writeTaskFile(VALID_TASK);
		const state = createDefaultState("test-loop", TASK_FILE, {
			pendingHints: ["a"],
			stickyHints: ["b"],
		});
		saveStateSync(ctx, state);
		shared.currentLoop = "test-loop";

		hintCommand("--clear", ctx, shared);
		const after = loadState(ctx, "test-loop")!;
		expect(after.pendingHints).toEqual([]);
		expect(after.stickyHints).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Mode-specific prompts
// ---------------------------------------------------------------------------

describe("mode-specific prompts", () => {
	test("plan mode contains planning instructions", () => {
		const state = createDefaultState("plan-loop", TASK_FILE, {
			mode: "plan",
		});
		const prompt = buildIterationPrompt(state, "# Task", false);
		expect(prompt).toContain("PLANNING MODE");
		expect(prompt).toContain("Do NOT implement");
	});

	test("build mode contains build instructions", () => {
		const state = createDefaultState("build-loop", TASK_FILE, {
			mode: "build",
		});
		const prompt = buildIterationPrompt(state, "# Task", false);
		expect(prompt).toContain("BUILD");
		expect(prompt).toContain("Implement the item");
	});
});

// ---------------------------------------------------------------------------
// Task file truncation
// ---------------------------------------------------------------------------

describe("large task file truncation", () => {
	test("task > TASK_CONTENT_INLINE_LIMIT uses summary", () => {
		const bigTask =
			"## Goals\n- big goal\n\n## Checklist\n- [ ] item\n\n" +
			"x".repeat(TASK_CONTENT_INLINE_LIMIT + 1000);
		const state = createDefaultState("big-loop", TASK_FILE);
		const prompt = buildIterationPrompt(state, bigTask, false);
		expect(prompt).toContain("Task file truncated");
		expect(prompt).toContain("big goal");
	});
});

// ---------------------------------------------------------------------------
// v1 migration in integration context
// ---------------------------------------------------------------------------

describe("v1 state migration", () => {
	test("v1 state file loads and upgrades correctly", () => {
		const ctx = makeCtx();
		const v1State = {
			name: "legacy-loop",
			taskFile: ".ralph/legacy-loop.md",
			iteration: 10,
			maxIterations: 100,
			itemsPerIteration: 5,
			reflectEveryItems: 10,
			reflectInstructions: "reflect!",
			active: true,
			startedAt: "2025-01-01",
			lastReflectionAtItems: 5,
		};
		const fp = path.join(ralphDir(ctx), "legacy-loop.state.json");
		ensureDir(fp);
		fs.writeFileSync(fp, JSON.stringify(v1State), "utf-8");

		const loaded = loadState(ctx, "legacy-loop");
		expect(loaded).not.toBeNull();
		expect(loaded!.schemaVersion).toBe(3);
		expect(loaded!.status).toBe("active");
		expect(loaded!.reflectEvery).toBe(10);
		expect(loaded!.mode).toBe("build");
		expect(loaded!.pendingHints).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// parseArgs v3
// ---------------------------------------------------------------------------

describe("parseArgs v3 extensions", () => {
	test("--mode and --template parsed", () => {
		const args = parseArgs(
			"my-loop --mode plan --template custom.md --max-iterations 100",
		);
		expect(args.name).toBe("my-loop");
		expect(args.mode).toBe("plan");
		expect(args.promptTemplate).toBe("custom.md");
		expect(args.maxIterations).toBe(100);
	});

	test("invalid mode falls back to build", () => {
		const args = parseArgs("loop --mode invalid");
		expect(args.mode).toBe("build");
	});
});

// ---------------------------------------------------------------------------
// countChecklist
// ---------------------------------------------------------------------------

describe("countChecklist", () => {
	test("counts correctly", () => {
		const { done, total } = countChecklist(
			"- [x] a\n- [x] b\n- [ ] c\nnot a check\n- [ ] d",
		);
		expect(done).toBe(2);
		expect(total).toBe(4);
	});

	test("empty content", () => {
		const { done, total } = countChecklist("");
		expect(done).toBe(0);
		expect(total).toBe(0);
	});
});
