/**
 * Tests for runtime/checkpoint.ts — checkpoint validation + hashing.
 */
import { describe, test, expect } from "bun:test";
import {
	computeFileHash,
	validateCheckpoint,
	snapshotTaskFile,
} from "../runtime/checkpoint.ts";
import type { LoopStateV3 } from "../types.ts";

function makeState(overrides: Partial<LoopStateV3> = {}): LoopStateV3 {
	return {
		schemaVersion: 3,
		name: "test",
		taskFile: ".ralph/test.md",
		iteration: 5,
		maxIterations: 50,
		itemsPerIteration: 0,
		reflectEvery: 5,
		reflectInstructions: "",
		status: "active",
		startedAt: "2025-01-01",
		mode: "build",
		pendingHints: [],
		stickyHints: [],
		compactionCount: 0,
		sessionRotations: 0,
		noProgressStreak: 0,
		lastChecklistCount: 0,
		currentIterationToolCalls: 0,
		currentIterationFiles: [],
		...overrides,
	};
}

const VALID_CHECKPOINT_CONTENT = `# Task

## Goals
- Do stuff

## Checklist
- [x] Item 1
- [ ] Item 2

## Checkpoint (Iteration 5)

### Completed
- [x] Item 1

### Failed Approaches
- None yet

### Key Decisions
- Chose approach A

### Current State
- Item 1 done, Item 2 pending

### Next Steps
1. Implement Item 2
`;

// ---------------------------------------------------------------------------
// computeFileHash
// ---------------------------------------------------------------------------

describe("computeFileHash", () => {
	test("returns hex string", () => {
		const hash = computeFileHash("hello");
		expect(hash).toMatch(/^[a-f0-9]{64}$/);
	});

	test("same input → same hash", () => {
		expect(computeFileHash("abc")).toBe(computeFileHash("abc"));
	});

	test("different input → different hash", () => {
		expect(computeFileHash("a")).not.toBe(computeFileHash("b"));
	});
});

// ---------------------------------------------------------------------------
// validateCheckpoint
// ---------------------------------------------------------------------------

describe("validateCheckpoint", () => {
	test("valid checkpoint → { valid: true, reasons: [] }", () => {
		const state = makeState(); // no lastTaskFileHash → first time
		const result = validateCheckpoint(state, VALID_CHECKPOINT_CONTENT);
		expect(result.valid).toBe(true);
		expect(result.reasons).toEqual([]);
	});

	test("unchanged content (same hash) → invalid", () => {
		const state = makeState();
		snapshotTaskFile(state, VALID_CHECKPOINT_CONTENT);
		// Validate with same content
		const result = validateCheckpoint(state, VALID_CHECKPOINT_CONTENT);
		expect(result.valid).toBe(false);
		expect(result.reasons.some((r) => r.includes("unchanged"))).toBe(true);
	});

	test("first checkpoint (no previous hash) → only check sections", () => {
		const state = makeState({
			lastTaskFileHash: undefined,
			lastTaskFileSize: undefined,
		});
		const result = validateCheckpoint(state, VALID_CHECKPOINT_CONTENT);
		expect(result.valid).toBe(true);
	});

	test("missing ## Checkpoint heading → invalid", () => {
		const state = makeState();
		const content = "# Task\n## Goals\n- stuff\n";
		const result = validateCheckpoint(state, content);
		expect(result.valid).toBe(false);
		expect(result.reasons.some((r) => r.includes("Missing `## Checkpoint`"))).toBe(true);
	});

	test("heading present but missing subsections → invalid + reasons list", () => {
		const state = makeState();
		const content = `# Task

## Checkpoint (Iteration 5)

### Completed
- [x] Item 1

### Key Decisions
- Chose A
`;
		const result = validateCheckpoint(state, content);
		expect(result.valid).toBe(false);
		// Missing: Failed Approaches, Current State, Next Steps
		expect(result.reasons.some((r) => r.includes("Failed Approaches"))).toBe(true);
		expect(result.reasons.some((r) => r.includes("Current State"))).toBe(true);
		expect(result.reasons.some((r) => r.includes("Next Steps"))).toBe(true);
		// Present ones should NOT appear in reasons
		expect(result.reasons.some((r) => r.includes("### Completed"))).toBe(false);
		expect(result.reasons.some((r) => r.includes("### Key Decisions"))).toBe(false);
	});

	test("multiple checkpoint sections → validates latest", () => {
		const state = makeState();
		const content = `# Task

## Checkpoint (Iteration 3)
### Completed
- old stuff

## Checkpoint (Iteration 5)

### Completed
- [x] Item 1

### Failed Approaches
- None

### Key Decisions
- Chose A

### Current State
- Good

### Next Steps
1. Next thing
`;
		const result = validateCheckpoint(state, content);
		expect(result.valid).toBe(true);
	});

	test("content changed but no checkpoint section → only section error", () => {
		const state = makeState();
		snapshotTaskFile(state, "old content");
		const result = validateCheckpoint(state, "new content entirely");
		expect(result.valid).toBe(false);
		// Should not complain about unchanged content
		expect(result.reasons.some((r) => r.includes("unchanged"))).toBe(false);
		// But should complain about missing checkpoint
		expect(result.reasons.some((r) => r.includes("Checkpoint"))).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// snapshotTaskFile
// ---------------------------------------------------------------------------

describe("snapshotTaskFile", () => {
	test("sets hash and size on state", () => {
		const state = makeState();
		snapshotTaskFile(state, "hello world");
		expect(state.lastTaskFileHash).toBe(computeFileHash("hello world"));
		expect(state.lastTaskFileSize).toBe(11);
	});

	test("updates existing snapshot", () => {
		const state = makeState();
		snapshotTaskFile(state, "v1");
		snapshotTaskFile(state, "v2 longer");
		expect(state.lastTaskFileHash).toBe(computeFileHash("v2 longer"));
		expect(state.lastTaskFileSize).toBe(9);
	});
});
