/**
 * Ralph Wiggum v3 — Template rendering and prompt building.
 *
 * Resolves `{{key}}` placeholders and assembles iteration prompts
 * from state, task content, and hints.
 */

import { TASK_CONTENT_INLINE_LIMIT, type LoopStateV3 } from "../types.js";
import {
	BUILDING_TEMPLATE,
	PLANNING_TEMPLATE,
	CHECKPOINT_PROMPT_TEMPLATE,
} from "./templates.js";
import { tryRead } from "../state/store.js";

// ---------------------------------------------------------------------------
// Core renderer
// ---------------------------------------------------------------------------

/**
 * Replace `{{key}}` placeholders in `template` with values from `vars`.
 * Unknown keys are preserved as-is. Undefined/null values become "".
 */
export function renderTemplate(
	template: string,
	vars: Record<string, string>,
): string {
	return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
		if (key in vars) return vars[key] ?? "";
		return match; // unknown key → preserve
	});
}

// ---------------------------------------------------------------------------
// Hint formatting
// ---------------------------------------------------------------------------

/**
 * Format pending + sticky hints into a markdown section.
 * Returns empty string when no hints exist.
 */
export function formatHints(pending: string[], sticky: string[]): string {
	if (pending.length === 0 && sticky.length === 0) return "";

	const lines = ["## 💡 User Hints"];
	for (const h of pending) lines.push(`- ${h} (one-shot)`);
	for (const h of sticky) lines.push(`- ${h} (sticky)`);
	return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Task content slicing
// ---------------------------------------------------------------------------

/**
 * If `fullContent` fits within `limit`, return as-is.
 * Otherwise extract key sections and append a truncation notice.
 */
export function sliceTaskContent(
	fullContent: string,
	limit: number,
	taskFile: string,
): string {
	if (fullContent.length <= limit) return fullContent;

	const sections: string[] = [];

	// Extract ## Goals
	const goals = extractSection(fullContent, "Goals");
	if (goals) sections.push(goals);

	// Extract ## Checklist — unchecked + last 5 checked
	const checklist = extractChecklist(fullContent);
	if (checklist) sections.push(checklist);

	// Extract latest ## Checkpoint
	const checkpoint = extractLatestCheckpoint(fullContent);
	if (checkpoint) sections.push(checkpoint);

	sections.push(
		`\n(Task file truncated. Use read tool to see full content: ${taskFile})`,
	);

	return sections.join("\n\n");
}

/** Extract a `## <heading>` section (up to the next `## ` or EOF). */
function extractSection(content: string, heading: string): string | null {
	const pattern = new RegExp(
		`^(## ${heading}[^\\n]*\\n(?:(?!^## )[\\s\\S])*)`,
		"gm",
	);
	const match = pattern.exec(content);
	if (!match) return null;
	return match[1].trimEnd();
}

/** Extract checklist: all unchecked items + last 5 checked items. */
function extractChecklist(content: string): string | null {
	const section = extractSection(content, "Checklist");
	if (!section) return null;

	const lines = section.split("\n");
	const header = lines[0];
	const unchecked: string[] = [];
	const checked: string[] = [];

	for (const line of lines.slice(1)) {
		if (/^\s*-\s*\[ \]/.test(line)) unchecked.push(line);
		else if (/^\s*-\s*\[x\]/i.test(line)) checked.push(line);
	}

	const recentChecked = checked.slice(-5);
	const parts = [header];
	if (recentChecked.length > 0) {
		if (checked.length > recentChecked.length) {
			parts.push(`  (${checked.length - recentChecked.length} earlier completed items omitted)`);
		}
		parts.push(...recentChecked);
	}
	parts.push(...unchecked);

	return parts.length > 1 ? parts.join("\n") : null;
}

/** Extract the last `## Checkpoint (Iteration N)` section. */
function extractLatestCheckpoint(content: string): string | null {
	const regex = /^(## Checkpoint[^\n]*\n(?:(?!^## )[\s\S])*)/gm;
	let last: string | null = null;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(content)) !== null) {
		last = match[1].trimEnd();
	}
	return last;
}

// ---------------------------------------------------------------------------
// Template variable assembly
// ---------------------------------------------------------------------------

/** Build the full variable map for template rendering. */
export function buildTemplateVars(
	state: LoopStateV3,
	taskContent: string,
	hints: string,
	_isReflection?: boolean,
): Record<string, string> {
	return {
		loopName: state.name,
		iteration: String(state.iteration),
		maxStr: state.maxIterations > 0 ? `/${state.maxIterations}` : "",
		maxIterations:
			state.maxIterations > 0 ? String(state.maxIterations) : "unlimited",
		taskFile: state.taskFile,
		taskContent,
		hints,
		mode: state.mode,
		sessionRotations: String(state.sessionRotations),
	};
}

// ---------------------------------------------------------------------------
// High-level prompt builder
// ---------------------------------------------------------------------------

/**
 * Assemble the full iteration prompt.
 *
 * - `state.mode` selects BUILDING or PLANNING template.
 * - `state.promptTemplate` path overrides built-in template.
 * - `isReflection` prepends the CHECKPOINT prompt.
 */
export function buildIterationPrompt(
	state: LoopStateV3,
	taskContent: string,
	isReflection: boolean,
): string {
	const hints = formatHints(state.pendingHints, state.stickyHints);
	const sliced = sliceTaskContent(taskContent, TASK_CONTENT_INLINE_LIMIT, state.taskFile);
	const vars = buildTemplateVars(state, sliced, hints, isReflection);

	// Choose template
	let template: string;
	if (state.promptTemplate) {
		const custom = tryRead(state.promptTemplate);
		template = custom ?? (state.mode === "plan" ? PLANNING_TEMPLATE : BUILDING_TEMPLATE);
	} else {
		template = state.mode === "plan" ? PLANNING_TEMPLATE : BUILDING_TEMPLATE;
	}

	let prompt = renderTemplate(template, vars);

	// Prepend checkpoint prompt for reflection iterations
	if (isReflection) {
		prompt = renderTemplate(CHECKPOINT_PROMPT_TEMPLATE, vars) + "\n\n" + prompt;
	}

	return prompt;
}
