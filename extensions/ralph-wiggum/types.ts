/**
 * Ralph Wiggum v3 — Types, interfaces, and constants.
 *
 * Single source of truth for all shared type definitions.
 * Every module imports from here; no circular deps.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Directory name for ralph state/task files (relative to cwd). */
export const RALPH_DIR = ".ralph";

/** Strict completion marker — must appear on its own line. */
export const COMPLETE_MARKER = "<promise>COMPLETE</promise>";

/** Strict abort marker — must appear on its own line. */
export const ABORT_MARKER = "<promise>ABORT</promise>";

/** Task content byte limit; above this, inject summary instead of full text. */
export const TASK_CONTENT_INLINE_LIMIT = 8192;

/** Max characters for a single hint. */
export const HINT_MAX_LENGTH = 300;

/** Max total hints (pending + sticky combined). */
export const HINT_MAX_COUNT = 20;

/** Current state schema version. */
export const SCHEMA_VERSION = 3;

// ---------------------------------------------------------------------------
// Enums / Unions
// ---------------------------------------------------------------------------

/** Loop lifecycle status. */
export type LoopStatus = "active" | "paused" | "completed";

/** Execution mode: plan-only vs full build. */
export type LoopMode = "plan" | "build";

/** Status icons for TUI display. */
export const STATUS_ICONS: Record<LoopStatus, string> = {
	active: "▶",
	paused: "⏸",
	completed: "✓",
};

// ---------------------------------------------------------------------------
// State — v3 (current)
// ---------------------------------------------------------------------------

/** Full loop state persisted to `.ralph/<name>.state.json`. */
export interface LoopStateV3 {
	schemaVersion: 3;

	// identity
	name: string;
	taskFile: string;

	// iteration
	iteration: number;
	maxIterations: number;
	itemsPerIteration: number;
	reflectEvery: number;
	reflectInstructions: string;

	// lifecycle
	status: LoopStatus;
	startedAt: string;
	completedAt?: string;

	// mode / template
	mode: LoopMode;
	promptTemplate?: string;

	// hints
	pendingHints: string[];
	stickyHints: string[];

	// checkpoint
	lastTaskFileHash?: string;
	lastTaskFileSize?: number;
	checkpointRetried?: boolean;

	// context health
	compactionCount: number;
	sessionRotations: number;

	// struggle / history (v3-plus)
	noProgressStreak: number;
	lastChecklistCount: number;

	// per-iteration runtime stats
	iterationStartedAt?: string;
	currentIterationToolCalls: number;
	currentIterationFiles: string[];
}

// ---------------------------------------------------------------------------
// State — v1 legacy (migration input)
// ---------------------------------------------------------------------------

/**
 * Shape of v1 state files (no `schemaVersion` field).
 * Used only as input type for `migrateState()`.
 */
export interface LoopStateLegacy {
	name: string;
	taskFile: string;
	iteration: number;
	maxIterations: number;
	itemsPerIteration: number;
	reflectEvery: number;
	reflectInstructions: string;
	active: boolean;
	status?: LoopStatus;
	startedAt: string;
	completedAt?: string;
	lastReflectionAt?: number;
	/** Old field name — renamed to `reflectEvery` in v3. */
	reflectEveryItems?: number;
	/** Old field name — renamed to `lastReflectionAt` in v3. */
	lastReflectionAtItems?: number;
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

/** Single iteration record for history-lite (v3-plus). */
export interface IterationRecord {
	iteration: number;
	startedAt: string;
	endedAt: string;
	durationMs: number;
	toolCalls: number;
	checklistDelta: number;
	wasReflection: boolean;
}

// ---------------------------------------------------------------------------
// Validation / Detection
// ---------------------------------------------------------------------------

/** Result of checkpoint content validation. */
export interface CheckpointValidationResult {
	valid: boolean;
	reasons: string[];
}

/** Strict marker detection result. */
export type MarkerResult = "COMPLETE" | "ABORT" | null;

// ---------------------------------------------------------------------------
// Command parsing
// ---------------------------------------------------------------------------

/** Parsed arguments for `/ralph start` and `ralph_start` tool. */
export interface ParsedArgs {
	name: string;
	maxIterations: number;
	itemsPerIteration: number;
	reflectEvery: number;
	reflectInstructions: string;
	mode: LoopMode;
	promptTemplate?: string;
}

// ---------------------------------------------------------------------------
// Defaults (factory helpers)
// ---------------------------------------------------------------------------

/** Default reflection instructions injected on checkpoint iterations. */
export const DEFAULT_REFLECT_INSTRUCTIONS = `REFLECTION CHECKPOINT

Pause and reflect on your progress:
1. What has been accomplished so far?
2. What's working well?
3. What's not working or blocking progress?
4. Should the approach be adjusted?
5. What are the next priorities?

Update the task file with your reflection, then continue working.`;

/** Creates a fresh LoopStateV3 with sensible defaults. */
export function createDefaultState(
	name: string,
	taskFile: string,
	overrides?: Partial<LoopStateV3>,
): LoopStateV3 {
	return {
		schemaVersion: SCHEMA_VERSION,
		name,
		taskFile,
		iteration: 1,
		maxIterations: 50,
		itemsPerIteration: 0,
		reflectEvery: 0,
		reflectInstructions: DEFAULT_REFLECT_INSTRUCTIONS,
		status: "active",
		startedAt: new Date().toISOString(),
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
