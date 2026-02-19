/**
 * Tests for prompt/renderer.ts — template rendering, hints, slicing.
 */
import { describe, test, expect } from "bun:test";
import {
	renderTemplate,
	formatHints,
	sliceTaskContent,
	buildTemplateVars,
	buildIterationPrompt,
} from "../prompt/renderer.ts";
import type { LoopStateV3 } from "../types.ts";
import { BUILDING_TEMPLATE, PLANNING_TEMPLATE } from "../prompt/templates.ts";

function makeState(overrides: Partial<LoopStateV3> = {}): LoopStateV3 {
	return {
		schemaVersion: 3,
		name: "test-loop",
		taskFile: ".ralph/test-loop.md",
		iteration: 3,
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

// ---------------------------------------------------------------------------
// renderTemplate
// ---------------------------------------------------------------------------

describe("renderTemplate", () => {
	test("replaces known keys", () => {
		const result = renderTemplate("Hello {{name}}, iter {{n}}!", {
			name: "Ralph",
			n: "5",
		});
		expect(result).toBe("Hello Ralph, iter 5!");
	});

	test("preserves unknown keys", () => {
		expect(renderTemplate("{{known}} and {{unknown}}", { known: "yes" })).toBe(
			"yes and {{unknown}}",
		);
	});

	test("empty value → empty string", () => {
		expect(renderTemplate("pre{{v}}post", { v: "" })).toBe("prepost");
	});

	test("multiple occurrences of same key", () => {
		expect(renderTemplate("{{x}}-{{x}}", { x: "A" })).toBe("A-A");
	});
});

// ---------------------------------------------------------------------------
// formatHints
// ---------------------------------------------------------------------------

describe("formatHints", () => {
	test("no hints → empty string", () => {
		expect(formatHints([], [])).toBe("");
	});

	test("pending only", () => {
		const result = formatHints(["do X"], []);
		expect(result).toContain("## 💡 User Hints");
		expect(result).toContain("- do X (one-shot)");
	});

	test("sticky only", () => {
		const result = formatHints([], ["always Y"]);
		expect(result).toContain("- always Y (sticky)");
	});

	test("mixed pending + sticky", () => {
		const result = formatHints(["a"], ["b"]);
		expect(result).toContain("(one-shot)");
		expect(result).toContain("(sticky)");
	});
});

// ---------------------------------------------------------------------------
// sliceTaskContent
// ---------------------------------------------------------------------------

describe("sliceTaskContent", () => {
	test("small file → full text returned", () => {
		const content = "# Task\nshort";
		expect(sliceTaskContent(content, 10000, "f.md")).toBe(content);
	});

	test("large file → truncated with key sections", () => {
		const goals = "## Goals\n- Build the thing\n";
		const checklist = [
			"## Checklist",
			"- [x] step 1",
			"- [x] step 2",
			"- [x] step 3",
			"- [x] step 4",
			"- [x] step 5",
			"- [x] step 6",
			"- [x] step 7",
			"- [ ] step 8",
			"- [ ] step 9",
		].join("\n");
		const checkpoint =
			"## Checkpoint (Iteration 3)\n### Completed\n- did stuff\n";
		const filler = "x".repeat(10000);
		const content = `${goals}\n${checklist}\n\n${checkpoint}\n${filler}`;

		const result = sliceTaskContent(content, 500, "task.md");

		// Should include goals
		expect(result).toContain("## Goals");
		expect(result).toContain("Build the thing");
		// Should include unchecked items
		expect(result).toContain("- [ ] step 8");
		expect(result).toContain("- [ ] step 9");
		// Should include last 5 checked
		expect(result).toContain("- [x] step 7");
		expect(result).toContain("- [x] step 3");
		// Should NOT include earliest checked (step 1, step 2)
		expect(result).not.toContain("- [x] step 1");
		expect(result).not.toContain("- [x] step 2");
		// Should include checkpoint
		expect(result).toContain("## Checkpoint");
		// Should include truncation notice
		expect(result).toContain("Task file truncated");
		expect(result).toContain("task.md");
	});
});

// ---------------------------------------------------------------------------
// buildTemplateVars
// ---------------------------------------------------------------------------

describe("buildTemplateVars", () => {
	test("builds correct variable map", () => {
		const state = makeState({ maxIterations: 100 });
		const vars = buildTemplateVars(state, "content", "hints");
		expect(vars.loopName).toBe("test-loop");
		expect(vars.iteration).toBe("3");
		expect(vars.maxStr).toBe("/100");
		expect(vars.taskFile).toBe(".ralph/test-loop.md");
		expect(vars.taskContent).toBe("content");
		expect(vars.hints).toBe("hints");
		expect(vars.mode).toBe("build");
	});

	test("maxIterations 0 → empty maxStr", () => {
		const vars = buildTemplateVars(makeState({ maxIterations: 0 }), "", "");
		expect(vars.maxStr).toBe("");
		expect(vars.maxIterations).toBe("unlimited");
	});
});

// ---------------------------------------------------------------------------
// buildIterationPrompt
// ---------------------------------------------------------------------------

describe("buildIterationPrompt", () => {
	test("build mode selects BUILDING template", () => {
		const prompt = buildIterationPrompt(makeState(), "task text", false);
		expect(prompt).toContain("BUILD");
		expect(prompt).toContain("test-loop");
		expect(prompt).toContain("task text");
		expect(prompt).not.toContain("PLANNING MODE");
	});

	test("plan mode selects PLANNING template", () => {
		const prompt = buildIterationPrompt(
			makeState({ mode: "plan" }),
			"task text",
			false,
		);
		expect(prompt).toContain("PLAN");
		expect(prompt).toContain("PLANNING MODE");
	});

	test("isReflection → prepends CHECKPOINT prompt", () => {
		const prompt = buildIterationPrompt(makeState(), "task text", true);
		expect(prompt).toContain("CHECKPOINT");
		expect(prompt).toContain("MANDATORY FILE UPDATE");
		// Also contains the iteration prompt after
		expect(prompt).toContain("BUILD");
	});

	test("hints included when present", () => {
		const state = makeState({
			pendingHints: ["focus on tests"],
			stickyHints: ["use bun"],
		});
		const prompt = buildIterationPrompt(state, "task", false);
		expect(prompt).toContain("focus on tests (one-shot)");
		expect(prompt).toContain("use bun (sticky)");
	});
});
