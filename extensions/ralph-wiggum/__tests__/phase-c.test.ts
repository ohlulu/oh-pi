/**
 * Phase C tests — history, struggle detection, mode switching.
 */
import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

import { createDefaultState, type IterationRecord } from "../types.ts";
import { saveStateSync, loadState, ensureDir } from "../state/store.ts";
import { appendHistory, appendLog, appendLogEvent } from "../runtime/history.ts";
import { updateStruggleState, isStruggling } from "../runtime/struggle.ts";
import { modeCommand } from "../commands/mode.ts";
import { renderProgressBar } from "../ui/widget.ts";
import type { SharedContext } from "../runtime/loop.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TMP = path.join("/tmp", `ralph-phase-c-${Date.now()}`);

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
	};
}

function makeShared(): SharedContext & { notifications: string[] } {
	const s: any = {
		currentLoop: null,
		notifications: [],
		updateUI: () => {},
	};
	return s;
}

function makeRecord(overrides?: Partial<IterationRecord>): IterationRecord {
	return {
		iteration: 1,
		startedAt: "2025-01-01T00:00:00.000Z",
		endedAt: "2025-01-01T00:05:00.000Z",
		durationMs: 300_000,
		toolCalls: 10,
		checklistDelta: 2,
		wasReflection: false,
		...overrides,
	};
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
// C.1 — History
// ---------------------------------------------------------------------------

describe("appendHistory", () => {
	test("creates history file and appends record", () => {
		const ctx = makeCtx();
		const record = makeRecord();
		appendHistory(ctx, "test-loop", record);

		const fp = path.resolve(TMP, ".ralph", "test-loop.history.json");
		expect(fs.existsSync(fp)).toBe(true);

		const data = JSON.parse(fs.readFileSync(fp, "utf-8"));
		expect(data).toHaveLength(1);
		expect(data[0].iteration).toBe(1);
		expect(data[0].toolCalls).toBe(10);
	});

	test("appends multiple records", () => {
		const ctx = makeCtx();
		appendHistory(ctx, "test-loop", makeRecord({ iteration: 1 }));
		appendHistory(ctx, "test-loop", makeRecord({ iteration: 2 }));
		appendHistory(ctx, "test-loop", makeRecord({ iteration: 3 }));

		const fp = path.resolve(TMP, ".ralph", "test-loop.history.json");
		const data = JSON.parse(fs.readFileSync(fp, "utf-8"));
		expect(data).toHaveLength(3);
		expect(data[2].iteration).toBe(3);
	});

	test("trims oldest entries beyond 500", () => {
		const ctx = makeCtx();
		const fp = path.resolve(TMP, ".ralph", "test-loop.history.json");
		ensureDir(fp);
		// Seed with 500 entries
		const existing = Array.from({ length: 500 }, (_, i) =>
			makeRecord({ iteration: i + 1 }),
		);
		fs.writeFileSync(fp, JSON.stringify(existing), "utf-8");

		// Append one more
		appendHistory(ctx, "test-loop", makeRecord({ iteration: 501 }));

		const data = JSON.parse(fs.readFileSync(fp, "utf-8"));
		expect(data).toHaveLength(500);
		expect(data[0].iteration).toBe(2); // oldest trimmed
		expect(data[499].iteration).toBe(501);
	});
});

describe("appendLog", () => {
	test("creates log file with formatted line", () => {
		const ctx = makeCtx();
		appendLog(ctx, "test-loop", makeRecord());

		const fp = path.resolve(TMP, ".ralph", "test-loop.log");
		expect(fs.existsSync(fp)).toBe(true);

		const content = fs.readFileSync(fp, "utf-8");
		expect(content).toContain("Iter   1");
		expect(content).toContain("5m0s");
		expect(content).toContain("✓ +2 items");
		expect(content).toContain("tools: 10 calls");
	});

	test("zero-delta shows → no change", () => {
		const ctx = makeCtx();
		appendLog(ctx, "test-loop", makeRecord({ checklistDelta: 0 }));

		const fp = path.resolve(TMP, ".ralph", "test-loop.log");
		const content = fs.readFileSync(fp, "utf-8");
		expect(content).toContain("→ no change");
	});

	test("reflection flag shown", () => {
		const ctx = makeCtx();
		appendLog(
			ctx,
			"test-loop",
			makeRecord({ wasReflection: true }),
		);

		const fp = path.resolve(TMP, ".ralph", "test-loop.log");
		const content = fs.readFileSync(fp, "utf-8");
		expect(content).toContain("[reflection]");
	});
});

describe("appendLogEvent", () => {
	test("writes event line", () => {
		const ctx = makeCtx();
		appendLogEvent(ctx, "test-loop", "ROTATION #2");

		const fp = path.resolve(TMP, ".ralph", "test-loop.log");
		const content = fs.readFileSync(fp, "utf-8");
		expect(content).toContain("--- ROTATION #2 ---");
	});
});

// ---------------------------------------------------------------------------
// C.3 — Struggle detection
// ---------------------------------------------------------------------------

describe("updateStruggleState", () => {
	test("positive delta resets streak", () => {
		const state = createDefaultState("s", ".ralph/s.md", {
			noProgressStreak: 5,
		});
		updateStruggleState(state, 3);
		expect(state.noProgressStreak).toBe(0);
	});

	test("zero delta increments streak", () => {
		const state = createDefaultState("s", ".ralph/s.md", {
			noProgressStreak: 2,
		});
		updateStruggleState(state, 0);
		expect(state.noProgressStreak).toBe(3);
	});

	test("negative delta increments streak", () => {
		const state = createDefaultState("s", ".ralph/s.md", {
			noProgressStreak: 1,
		});
		updateStruggleState(state, -1);
		expect(state.noProgressStreak).toBe(2);
	});
});

describe("isStruggling", () => {
	test("streak < 3 → not struggling", () => {
		const state = createDefaultState("s", ".ralph/s.md", {
			noProgressStreak: 2,
		});
		expect(isStruggling(state)).toBe(false);
	});

	test("streak === 3 → struggling", () => {
		const state = createDefaultState("s", ".ralph/s.md", {
			noProgressStreak: 3,
		});
		expect(isStruggling(state)).toBe(true);
	});

	test("streak > 3 → struggling", () => {
		const state = createDefaultState("s", ".ralph/s.md", {
			noProgressStreak: 7,
		});
		expect(isStruggling(state)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// C.4 — Mode switching
// ---------------------------------------------------------------------------

describe("modeCommand", () => {
	test("switches plan → build", () => {
		const ctx = makeCtx();
		const shared = makeShared();

		const state = createDefaultState("m", ".ralph/m.md", {
			mode: "plan",
		});
		saveStateSync(ctx, state);
		shared.currentLoop = "m";

		let notified = "";
		ctx.ui.notify = (msg: string) => {
			notified = msg;
		};

		modeCommand("build", ctx, shared);

		const updated = loadState(ctx, "m")!;
		expect(updated.mode).toBe("build");
		expect(notified).toContain("plan → build");
	});

	test("switches build → plan", () => {
		const ctx = makeCtx();
		const shared = makeShared();

		const state = createDefaultState("m", ".ralph/m.md", {
			mode: "build",
		});
		saveStateSync(ctx, state);
		shared.currentLoop = "m";

		let notified = "";
		ctx.ui.notify = (msg: string) => {
			notified = msg;
		};

		modeCommand("plan", ctx, shared);

		const updated = loadState(ctx, "m")!;
		expect(updated.mode).toBe("plan");
		expect(notified).toContain("build → plan");
	});

	test("no active loop → warning", () => {
		const ctx = makeCtx();
		const shared = makeShared();
		shared.currentLoop = null;

		let notified = "";
		ctx.ui.notify = (msg: string) => {
			notified = msg;
		};

		modeCommand("plan", ctx, shared);
		expect(notified).toContain("No active");
	});

	test("invalid mode → usage message", () => {
		const ctx = makeCtx();
		const shared = makeShared();

		const state = createDefaultState("m", ".ralph/m.md");
		saveStateSync(ctx, state);
		shared.currentLoop = "m";

		let notified = "";
		ctx.ui.notify = (msg: string) => {
			notified = msg;
		};

		modeCommand("invalid", ctx, shared);
		expect(notified).toContain("Usage");
	});

	test("same mode → already message", () => {
		const ctx = makeCtx();
		const shared = makeShared();

		const state = createDefaultState("m", ".ralph/m.md", {
			mode: "build",
		});
		saveStateSync(ctx, state);
		shared.currentLoop = "m";

		let notified = "";
		ctx.ui.notify = (msg: string) => {
			notified = msg;
		};

		modeCommand("build", ctx, shared);
		expect(notified).toContain("Already");
	});
});

// ---------------------------------------------------------------------------
// C.5 — renderProgressBar
// ---------------------------------------------------------------------------

describe("renderProgressBar", () => {
	test("zero total → empty string", () => {
		expect(renderProgressBar(0, 0)).toBe("");
	});

	test("all done → full bar", () => {
		const result = renderProgressBar(10, 10, 10);
		expect(result).toBe("10/10 ██████████");
	});

	test("none done → empty bar", () => {
		const result = renderProgressBar(0, 10, 10);
		expect(result).toBe("0/10 ░░░░░░░░░░");
	});

	test("half done → half bar", () => {
		const result = renderProgressBar(5, 10, 10);
		expect(result).toBe("5/10 █████░░░░░");
	});

	test("default width is 15", () => {
		const result = renderProgressBar(3, 15);
		expect(result).toBe("3/15 ███░░░░░░░░░░░░");
	});

	test("done > total clamped to full", () => {
		const result = renderProgressBar(20, 10, 10);
		expect(result).toBe("20/10 ██████████");
	});
});

// ---------------------------------------------------------------------------
// C.5 — Widget enhanced (checklist + conditional display)
// ---------------------------------------------------------------------------

describe("widget enhanced display", () => {
	test("widget includes checklist progress bar when task has items", () => {
		const ctx = makeCtx();
		const shared = makeShared();

		const taskFile = ".ralph/w.md";
		const fp = path.resolve(TMP, taskFile);
		ensureDir(fp);
		fs.writeFileSync(
			fp,
			"- [x] a\n- [x] b\n- [ ] c\n- [ ] d\n",
			"utf-8",
		);

		const state = createDefaultState("w", taskFile);
		saveStateSync(ctx, state);
		shared.currentLoop = "w";

		const widgetLines: string[] = [];
		ctx.ui.setWidget = (_id: string, lines: string[] | undefined) => {
			if (lines) widgetLines.push(...lines);
		};
		ctx.ui.setStatus = () => {};

		// Import and call updateUI
		const { updateUI } = require("../ui/widget.ts");
		updateUI(ctx, shared);

		const joined = widgetLines.join("\n");
		expect(joined).toContain("2/4");
		expect(joined).toContain("█");
		expect(joined).toContain("░");
	});

	test("widget hides compactions/rotations/hints when zero", () => {
		const ctx = makeCtx();
		const shared = makeShared();

		const taskFile = ".ralph/w2.md";
		const fp = path.resolve(TMP, taskFile);
		ensureDir(fp);
		fs.writeFileSync(fp, "- [ ] a\n", "utf-8");

		const state = createDefaultState("w2", taskFile, {
			compactionCount: 0,
			sessionRotations: 0,
			pendingHints: [],
			stickyHints: [],
			noProgressStreak: 0,
		});
		saveStateSync(ctx, state);
		shared.currentLoop = "w2";

		const widgetLines: string[] = [];
		ctx.ui.setWidget = (_id: string, lines: string[] | undefined) => {
			if (lines) widgetLines.push(...lines);
		};
		ctx.ui.setStatus = () => {};

		const { updateUI } = require("../ui/widget.ts");
		updateUI(ctx, shared);

		const joined = widgetLines.join("\n");
		expect(joined).not.toContain("Compactions");
		expect(joined).not.toContain("Rotations");
		expect(joined).not.toContain("hint(s)");
		expect(joined).not.toContain("No progress");
	});

	test("widget shows extras when values > 0", () => {
		const ctx = makeCtx();
		const shared = makeShared();

		const taskFile = ".ralph/w3.md";
		const fp = path.resolve(TMP, taskFile);
		ensureDir(fp);
		fs.writeFileSync(fp, "- [ ] a\n", "utf-8");

		const state = createDefaultState("w3", taskFile, {
			compactionCount: 3,
			sessionRotations: 2,
			pendingHints: ["do X"],
			stickyHints: ["always Y"],
			noProgressStreak: 4,
		});
		saveStateSync(ctx, state);
		shared.currentLoop = "w3";

		const widgetLines: string[] = [];
		ctx.ui.setWidget = (_id: string, lines: string[] | undefined) => {
			if (lines) widgetLines.push(...lines);
		};
		ctx.ui.setStatus = () => {};

		const { updateUI } = require("../ui/widget.ts");
		updateUI(ctx, shared);

		const joined = widgetLines.join("\n");
		expect(joined).toContain("Compactions: 3");
		expect(joined).toContain("Rotations: 2");
		expect(joined).toContain("2 hint(s)");
		expect(joined).toContain("No progress ×4");
	});
});
