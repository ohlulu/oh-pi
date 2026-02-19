/**
 * Tests for state/store.ts — migrateState (v1 → v3) and error reporting.
 */
import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
	migrateState,
	loadState,
	listLoops,
	saveStateSync,
	setStateWarningHandler,
} from "../state/store.ts";

/** Minimal valid v1 state. */
function v1State(overrides: Record<string, unknown> = {}) {
	return {
		name: "test-loop",
		taskFile: ".ralph/test-loop.md",
		iteration: 5,
		maxIterations: 50,
		itemsPerIteration: 3,
		reflectEvery: 10,
		reflectInstructions: "reflect!",
		active: true,
		startedAt: "2025-01-01T00:00:00Z",
		lastReflectionAt: 3,
		...overrides,
	};
}

describe("migrateState", () => {
	test("v1 state (no schemaVersion) → v3 with all fields", () => {
		const result = migrateState(v1State());
		expect(result.schemaVersion).toBe(3);
		expect(result.name).toBe("test-loop");
		expect(result.taskFile).toBe(".ralph/test-loop.md");
		expect(result.iteration).toBe(5);
		expect(result.maxIterations).toBe(50);
		expect(result.reflectEvery).toBe(10);
		// v3 new fields — defaults
		expect(result.mode).toBe("build");
		expect(result.pendingHints).toEqual([]);
		expect(result.stickyHints).toEqual([]);
		expect(result.lastTaskFileHash).toBeUndefined();
		expect(result.lastTaskFileSize).toBeUndefined();
		expect(result.checkpointRetried).toBe(false);
		expect(result.compactionCount).toBe(0);
		expect(result.sessionRotations).toBe(0);
		expect(result.noProgressStreak).toBe(0);
		expect(result.lastChecklistCount).toBe(0);
		expect(result.currentIterationToolCalls).toBe(0);
		expect(result.currentIterationFiles).toEqual([]);
	});

	test("already v3 → passthrough (preserves values)", () => {
		const v3Input = migrateState(v1State());
		v3Input.mode = "plan";
		v3Input.compactionCount = 5;
		const result = migrateState(v3Input);
		expect(result.schemaVersion).toBe(3);
		expect(result.name).toBe("test-loop");
		expect(result.mode).toBe("plan");
		expect(result.compactionCount).toBe(5);
	});

	test("v1 active: true → status: 'active'", () => {
		const result = migrateState(v1State({ active: true }));
		expect(result.status).toBe("active");
	});

	test("v1 active: false → status: 'paused'", () => {
		const result = migrateState(
			v1State({ active: false, status: undefined }),
		);
		expect(result.status).toBe("paused");
	});

	test("v1 with explicit status field → status preserved", () => {
		const result = migrateState(
			v1State({ active: false, status: "completed" }),
		);
		expect(result.status).toBe("completed");
	});

	test("reflectEveryItems → reflectEvery rename", () => {
		const input = v1State({
			reflectEvery: undefined,
			reflectEveryItems: 7,
		});
		delete (input as any).reflectEvery;
		const result = migrateState(input);
		expect(result.reflectEvery).toBe(7);
	});

	test("missing name → throws", () => {
		expect(() => migrateState({ iteration: 1 })).toThrow(/name/);
	});

	test("empty name → throws", () => {
		expect(() => migrateState({ name: "" })).toThrow(/name/);
	});

	test("null input → throws", () => {
		expect(() => migrateState(null)).toThrow(/not an object/);
	});

	test("non-object input → throws", () => {
		expect(() => migrateState("string")).toThrow(/not an object/);
		expect(() => migrateState(42)).toThrow(/not an object/);
	});
});

describe("loadState / listLoops error reporting", () => {
	const tmpDir = path.join("/tmp", `ralph-warn-test-${Date.now()}`);
	const ralphDir = path.join(tmpDir, ".ralph");
	const fakeCtx = { cwd: tmpDir } as any;

	test("loadState emits warning on corrupt JSON", () => {
		fs.mkdirSync(ralphDir, { recursive: true });
		fs.writeFileSync(path.join(ralphDir, "bad.state.json"), "{{{corrupt", "utf-8");

		const warnings: string[] = [];
		setStateWarningHandler((msg) => warnings.push(msg));

		const result = loadState(fakeCtx, "bad");
		expect(result).toBeNull();
		expect(warnings.length).toBe(1);
		expect(warnings[0]).toContain("bad");
		expect(warnings[0]).toContain("bad.state.json");
	});

	test("loadState emits warning on migration failure (missing name)", () => {
		fs.writeFileSync(
			path.join(ralphDir, "no_name.state.json"),
			JSON.stringify({ iteration: 1 }),
			"utf-8",
		);

		const warnings: string[] = [];
		setStateWarningHandler((msg) => warnings.push(msg));

		const result = loadState(fakeCtx, "no_name");
		expect(result).toBeNull();
		expect(warnings.length).toBe(1);
		expect(warnings[0]).toContain("name");
	});

	test("listLoops emits warning per corrupt file, still returns good ones", () => {
		// Write one good, one bad
		const good = {
			schemaVersion: 3, name: "good-loop", taskFile: ".ralph/good.md",
			iteration: 1, maxIterations: 50, itemsPerIteration: 0, reflectEvery: 0,
			reflectInstructions: "", status: "active", startedAt: "2025-01-01",
			mode: "build", pendingHints: [], stickyHints: [], compactionCount: 0,
			sessionRotations: 0, noProgressStreak: 0, lastChecklistCount: 0,
			currentIterationToolCalls: 0, currentIterationFiles: [],
		};
		fs.writeFileSync(
			path.join(ralphDir, "good-loop.state.json"),
			JSON.stringify(good),
			"utf-8",
		);

		const warnings: string[] = [];
		setStateWarningHandler((msg) => warnings.push(msg));

		const loops = listLoops(fakeCtx);
		// Should include good-loop; bad + no_name emit warnings
		const names = loops.map((l) => l.name);
		expect(names).toContain("good-loop");
		expect(warnings.length).toBeGreaterThanOrEqual(1); // at least the corrupt ones
	});

	// Cleanup
	test("cleanup tmp", () => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
		setStateWarningHandler((msg) => console.warn(`[ralph] ${msg}`)); // restore default
	});
});
