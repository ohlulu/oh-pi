/**
 * Phase D — compatibility/cleanup verification without pi runtime bootstrap.
 */

import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

import { createDefaultState } from "../types.ts";
import { startCommand, parseArgs } from "../commands/start.ts";
import { stopCommand } from "../commands/stop.ts";
import { resumeCommand } from "../commands/resume.ts";
import { advanceIteration } from "../runtime/loop.ts";
import { appendHistory, appendLog, appendLogEvent } from "../runtime/history.ts";
import { ensureDir, loadState, saveStateSync } from "../state/store.ts";
import type { SharedContext } from "../runtime/loop.ts";

const TMP = path.join("/tmp", `ralph-phase-d-${Date.now()}`);

function makeCtx(cwd = TMP): any {
	const notifications: Array<{ msg: string; level: string }> = [];
	return {
		cwd,
		hasUI: true,
		notifications,
		ui: {
			notify: (msg: string, level: string) => notifications.push({ msg, level }),
			setStatus: () => {},
			setWidget: () => {},
			confirm: async () => true,
			theme: { fg: (_: string, t: string) => t, bold: (t: string) => t },
		},
		isIdle: () => true,
		hasPendingMessages: () => false,
	};
}

function makePi() {
	return {
		sent: [] as string[],
		sendUserMessage(msg: string) {
			this.sent.push(msg);
		},
	};
}

function makeShared(currentLoop: string | null = null): SharedContext {
	return {
		currentLoop,
		updateUI: () => {},
	};
}

beforeEach(() => {
	fs.rmSync(TMP, { recursive: true, force: true });
	fs.mkdirSync(TMP, { recursive: true });
});

afterAll(() => {
	fs.rmSync(TMP, { recursive: true, force: true });
});

describe("D.1 docs wiring smoke", () => {
	test("SKILL.md includes new commands/options/behaviors", () => {
		const content = fs.readFileSync(
			path.resolve("/Users/ohlulu/.pi/agent/skills/ralph-wiggum/SKILL.md"),
			"utf-8",
		);
		expect(content).toContain("/ralph hint");
		expect(content).toContain("/ralph hints");
		expect(content).toContain("/ralph rotate");
		expect(content).toContain("/ralph mode");
		expect(content).toContain("--mode");
		expect(content).toContain("--template");
		expect(content).toContain("Checkpoint Behavior");
		expect(content).toContain("Marker Protocol");
		expect(content).toContain("compaction");
		expect(content).toContain("Struggle Detection");
	});
});

describe("D.2 backward compatibility", () => {
	test("legacy v1 state auto-migrates", () => {
		const ctx = makeCtx();
		const legacy = {
			name: "legacy",
			taskFile: ".ralph/legacy.md",
			iteration: 7,
			maxIterations: 50,
			itemsPerIteration: 3,
			reflectEveryItems: 10,
			reflectInstructions: "reflect",
			active: true,
			startedAt: "2025-01-01T00:00:00.000Z",
		};
		const fp = path.resolve(TMP, ".ralph", "legacy.state.json");
		ensureDir(fp);
		fs.writeFileSync(fp, JSON.stringify(legacy), "utf-8");

		const migrated = loadState(ctx, "legacy");
		expect(migrated).not.toBeNull();
		expect(migrated!.schemaVersion).toBe(3);
		expect(migrated!.status).toBe("active");
		expect(migrated!.reflectEvery).toBe(10);
	});

	test("/ralph start without new flags keeps v1-like defaults", () => {
		const ctx = makeCtx();
		const pi = makePi();
		const shared = makeShared();

		startCommand("compat-loop", ctx, pi as any, shared);

		const state = loadState(ctx, "compat-loop")!;
		expect(state.maxIterations).toBe(50);
		expect(state.itemsPerIteration).toBe(0);
		expect(state.reflectEvery).toBe(0);
		expect(state.mode).toBe("build");
		expect(pi.sent.length).toBe(1);
	});

	test("stop/resume command behavior remains stable", () => {
		const ctx = makeCtx();
		const pi = makePi();
		const shared = makeShared();

		startCommand("flow-loop", ctx, pi as any, shared);
		expect(loadState(ctx, "flow-loop")!.status).toBe("active");

		stopCommand("", ctx, shared);
		expect(loadState(ctx, "flow-loop")!.status).toBe("paused");

		resumeCommand("flow-loop", ctx, pi as any, shared);
		const resumed = loadState(ctx, "flow-loop")!;
		expect(resumed.status).toBe("active");
		expect(resumed.iteration).toBe(2);
		expect(pi.sent.length).toBeGreaterThan(1);
	});

	test("index still contains legacy command surface", () => {
		const content = fs.readFileSync(path.resolve("../ralph-wiggum/index.ts"), "utf-8");
		expect(content).toContain("case \"start\"");
		expect(content).toContain("case \"stop\"");
		expect(content).toContain("case \"resume\"");
		expect(content).toContain("status(_rest");
		expect(content).toContain("cancel(rest");
		expect(content).toContain("archive(rest");
		expect(content).toContain("clean(rest");
		expect(content).toContain("list(rest");
		expect(content).toContain("nuke(rest");
	});

	test("ralph_start defaults + ralph_done non-reflection path preserved (static+runtime)", () => {
		const startToolSrc = fs.readFileSync(path.resolve("./tools/ralph_start.ts"), "utf-8");
		expect(startToolSrc).toContain("maxIterations: params.maxIterations ?? 50");
		expect(startToolSrc).toContain("itemsPerIteration: params.itemsPerIteration ?? 0");
		expect(startToolSrc).toContain("reflectEvery: params.reflectEvery ?? 0");
		expect(startToolSrc).toContain('params.mode === "plan" ? "plan" : "build"');

		// Non-reflection runtime path should advance normally (no retry/pause)
		const ctx = makeCtx();
		const shared = makeShared("done-path");
		const pi = makePi();
		const taskFile = ".ralph/done-path.md";
		const full = path.resolve(TMP, taskFile);
		ensureDir(full);
		fs.writeFileSync(full, "# Task\n\n## Checklist\n- [ ] A\n", "utf-8");
		const state = createDefaultState("done-path", taskFile, {
			reflectEvery: 0,
			status: "active",
		});
		saveStateSync(ctx, state);

		const result = advanceIteration(ctx, state, shared, pi as any);
		expect(result.action).toBe("next");
	});

	test("parseArgs keeps backward-compatible defaults", () => {
		const args = parseArgs("my-loop");
		expect(args.name).toBe("my-loop");
		expect(args.maxIterations).toBe(50);
		expect(args.itemsPerIteration).toBe(0);
		expect(args.reflectEvery).toBe(0);
		expect(args.mode).toBe("build");
	});
});

describe("D.3 cleanup", () => {
	test("no ralph-wiggum.ts.bak remains", () => {
		expect(fs.existsSync(path.resolve("/Users/ohlulu/.pi/agent/extensions/ralph-wiggum.ts.bak"))).toBe(false);
	});

	test(".ralph additions are additive (.history/.log alongside legacy files)", () => {
		const ctx = makeCtx();
		const base = path.resolve(TMP, ".ralph");

		const state = createDefaultState("layout-loop", ".ralph/layout-loop.md", {
			status: "active",
		});
		saveStateSync(ctx, state);
		ensureDir(path.join(base, "layout-loop.md"));
		fs.writeFileSync(path.join(base, "layout-loop.md"), "# Task", "utf-8");

		appendHistory(ctx, "layout-loop", {
			iteration: 1,
			startedAt: new Date().toISOString(),
			endedAt: new Date().toISOString(),
			durationMs: 1000,
			toolCalls: 1,
			checklistDelta: 0,
			wasReflection: false,
		});
		appendLog(ctx, "layout-loop", {
			iteration: 1,
			startedAt: new Date().toISOString(),
			endedAt: new Date().toISOString(),
			durationMs: 1000,
			toolCalls: 1,
			checklistDelta: 0,
			wasReflection: false,
		});

		expect(fs.existsSync(path.join(base, "layout-loop.state.json"))).toBe(true);
		expect(fs.existsSync(path.join(base, "layout-loop.md"))).toBe(true);
		expect(fs.existsSync(path.join(base, "layout-loop.history.json"))).toBe(true);
		expect(fs.existsSync(path.join(base, "layout-loop.log"))).toBe(true);
	});

	test("resume resets per-iteration stats", () => {
		const ctx = makeCtx();
		const pi = makePi();
		const shared = makeShared();

		// Start and stop
		startCommand("stats-loop", ctx, pi as any, shared);
		const afterStart = loadState(ctx, "stats-loop")!;
		expect(afterStart.iterationStartedAt).toBeTruthy();

		// Simulate tool calls accumulating
		afterStart.currentIterationToolCalls = 12;
		afterStart.currentIterationFiles = ["a.ts", "b.ts"];
		saveStateSync(ctx, afterStart);

		stopCommand("", ctx, shared);

		// Resume → stats must reset
		resumeCommand("stats-loop", ctx, pi as any, shared);
		const resumed = loadState(ctx, "stats-loop")!;
		expect(resumed.currentIterationToolCalls).toBe(0);
		expect(resumed.currentIterationFiles).toEqual([]);
		expect(resumed.iterationStartedAt).toBeTruthy();
		// iterationStartedAt should be recent (within last 5s)
		const elapsed = Date.now() - new Date(resumed.iterationStartedAt!).getTime();
		expect(elapsed).toBeLessThan(5000);
	});

	test("appendLogEvent respects 1MB trim", () => {
		const ctx = makeCtx();
		const fp = path.resolve(TMP, ".ralph", "trim-test.log");
		ensureDir(fp);
		// Seed with ~1MB of content
		const bigLine = "x".repeat(200) + "\n";
		const seed = bigLine.repeat(6000); // ~1.2MB
		fs.writeFileSync(fp, seed, "utf-8");
		expect(fs.statSync(fp).size).toBeGreaterThan(1_048_576);

		// appendLogEvent should trigger trim
		appendLogEvent(ctx, "trim-test", "ROTATION #1");
		const after = fs.statSync(fp).size;
		expect(after).toBeLessThan(1_048_576);
	});

	test("start command sets iterationStartedAt on first iteration", () => {
		const ctx = makeCtx();
		const pi = makePi();
		const shared = makeShared();

		startCommand("ts-loop", ctx, pi as any, shared);
		const state = loadState(ctx, "ts-loop")!;
		expect(state.iterationStartedAt).toBeTruthy();
		const elapsed = Date.now() - new Date(state.iterationStartedAt!).getTime();
		expect(elapsed).toBeLessThan(5000);
	});

	test("all source files remain <= 500 LOC", () => {
		const root = path.resolve(process.cwd());
		const walk = (dir: string): string[] => {
			const out: string[] = [];
			for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
				const p = path.join(dir, entry.name);
				if (entry.isDirectory()) {
					if (entry.name === "__tests__" || entry.name === "node_modules") continue;
					out.push(...walk(p));
				} else if (entry.isFile() && p.endsWith(".ts")) {
					out.push(p);
				}
			}
			return out;
		};
		const files = walk(root);
		expect(files.length).toBeGreaterThan(0);
		for (const file of files) {
			const lines = fs.readFileSync(file, "utf-8").split(/\r?\n/).length;
			expect(lines).toBeLessThanOrEqual(500);
		}
	});
});
