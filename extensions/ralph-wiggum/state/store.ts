/**
 * Ralph Wiggum v3 — State persistence, migration, and file helpers.
 *
 * All `.ralph/` filesystem access goes through this module.
 * Handles v1 → v3 state migration transparently on load.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import {
	RALPH_DIR,
	SCHEMA_VERSION,
	DEFAULT_REFLECT_INSTRUCTIONS,
	type LoopStateV3,
	type LoopStateLegacy,
} from "../types.js";
import { stateLock } from "./lock.js";

// ---------------------------------------------------------------------------
// Error reporting
// ---------------------------------------------------------------------------

/**
 * Warning callback for non-fatal state errors (corrupt JSON, migration fail).
 * Set via `setStateWarningHandler` — defaults to console.warn.
 * Extension index.ts should wire this to `ctx.ui.notify()`.
 */
let warnHandler: (message: string) => void = (msg) => console.warn(`[ralph] ${msg}`);

/** Override the warning handler (call once from index.ts). */
export function setStateWarningHandler(handler: (message: string) => void): void {
	warnHandler = handler;
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

/** Ensure parent directory exists for a given file path. */
export function ensureDir(filePath: string): void {
	const dir = path.dirname(filePath);
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Read file as UTF-8 string, or return null on any error. */
export function tryRead(filePath: string): string | null {
	try {
		return fs.readFileSync(filePath, "utf-8");
	} catch {
		return null;
	}
}

/** Delete a single file, ignoring errors. */
export function tryDelete(filePath: string): void {
	try {
		if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
	} catch {
		/* ignore */
	}
}

/** Recursively remove a directory. Returns true on success. */
export function tryRemoveDir(dirPath: string): boolean {
	try {
		if (fs.existsSync(dirPath)) {
			fs.rmSync(dirPath, { recursive: true, force: true });
		}
		return true;
	} catch {
		return false;
	}
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/** Resolve `.ralph/` directory for the current working directory. */
export function ralphDir(ctx: ExtensionContext): string {
	return path.resolve(ctx.cwd, RALPH_DIR);
}

/** Resolve `.ralph/archive/` directory. */
export function archiveDir(ctx: ExtensionContext): string {
	return path.join(ralphDir(ctx), "archive");
}

/** Sanitize a loop name for safe filesystem usage. */
export function sanitize(name: string): string {
	return name.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");
}

/** Build full path for a state/task file. */
export function getPath(
	ctx: ExtensionContext,
	name: string,
	ext: string,
	archived = false,
): string {
	const dir = archived ? archiveDir(ctx) : ralphDir(ctx);
	return path.join(dir, `${sanitize(name)}${ext}`);
}

// ---------------------------------------------------------------------------
// Migration: v1 (legacy) → v3
// ---------------------------------------------------------------------------

/**
 * Migrate any raw JSON state to `LoopStateV3`.
 *
 * - v1 states have no `schemaVersion` field.
 * - Already-v3 states pass through with defaults patched.
 * - Throws if `name` is missing (corrupt file).
 */
export function migrateState(raw: unknown): LoopStateV3 {
	if (typeof raw !== "object" || raw === null) {
		throw new Error("migrateState: input is not an object");
	}

	const obj = raw as Record<string, unknown>;

	// Validate required field
	if (typeof obj.name !== "string" || obj.name.length === 0) {
		throw new Error("migrateState: missing or empty 'name' field");
	}

	// Detect version
	const version = typeof obj.schemaVersion === "number" ? obj.schemaVersion : 1;

	if (version >= SCHEMA_VERSION) {
		// Already v3 — patch any missing defaults and return
		return applyDefaults(obj);
	}

	// --- v1 → v3 migration ---
	const legacy = obj as unknown as LoopStateLegacy;

	// Status mapping: v1 used `active: boolean`
	let status: LoopStateV3["status"];
	if (legacy.status) {
		status = legacy.status;
	} else {
		status = legacy.active ? "active" : "paused";
	}

	// Field renames
	const reflectEvery =
		legacy.reflectEvery ??
		legacy.reflectEveryItems ??
		0;

	const migrated: Record<string, unknown> = {
		...legacy,
		schemaVersion: SCHEMA_VERSION,
		status,
		reflectEvery,
	};

	// Remove legacy-only fields
	delete migrated.active;
	delete migrated.reflectEveryItems;
	delete migrated.lastReflectionAtItems;
	delete migrated.lastReflectionAt;

	return applyDefaults(migrated);
}

/**
 * Ensure every v3 field has a value. Fills missing fields with defaults.
 * Doesn't overwrite existing truthy/defined values.
 */
function applyDefaults(obj: Record<string, unknown>): LoopStateV3 {
	return {
		// identity
		schemaVersion: SCHEMA_VERSION,
		name: obj.name as string,
		taskFile: (obj.taskFile as string) ?? "",
		// iteration
		iteration: (obj.iteration as number) ?? 1,
		maxIterations: (obj.maxIterations as number) ?? 50,
		itemsPerIteration: (obj.itemsPerIteration as number) ?? 0,
		reflectEvery: (obj.reflectEvery as number) ?? 0,
		reflectInstructions: (obj.reflectInstructions as string) ?? DEFAULT_REFLECT_INSTRUCTIONS,
		// lifecycle
		status: (obj.status as LoopStateV3["status"]) ?? "paused",
		startedAt: (obj.startedAt as string) ?? new Date().toISOString(),
		completedAt: obj.completedAt as string | undefined,
		// mode / template
		mode: (obj.mode as LoopStateV3["mode"]) ?? "build",
		promptTemplate: obj.promptTemplate as string | undefined,
		// hints
		pendingHints: (obj.pendingHints as string[]) ?? [],
		stickyHints: (obj.stickyHints as string[]) ?? [],
		// checkpoint
		lastTaskFileHash: obj.lastTaskFileHash as string | undefined,
		lastTaskFileSize: obj.lastTaskFileSize as number | undefined,
		checkpointRetried: (obj.checkpointRetried as boolean) ?? false,
		// context health
		compactionCount: (obj.compactionCount as number) ?? 0,
		sessionRotations: (obj.sessionRotations as number) ?? 0,
		// struggle / history
		noProgressStreak: (obj.noProgressStreak as number) ?? 0,
		lastChecklistCount: (obj.lastChecklistCount as number) ?? 0,
		// per-iteration runtime
		iterationStartedAt: obj.iterationStartedAt as string | undefined,
		currentIterationToolCalls: (obj.currentIterationToolCalls as number) ?? 0,
		currentIterationFiles: (obj.currentIterationFiles as string[]) ?? [],
	};
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/**
 * Load and migrate a loop state by name. Returns null if not found.
 * Emits a warning (via `warnHandler`) on parse/migration failure.
 */
export function loadState(
	ctx: ExtensionContext,
	name: string,
	archived = false,
): LoopStateV3 | null {
	const filePath = getPath(ctx, name, ".state.json", archived);
	const content = tryRead(filePath);
	if (!content) return null;
	try {
		return migrateState(JSON.parse(content));
	} catch (err) {
		const reason = err instanceof Error ? err.message : String(err);
		warnHandler(`Failed to load state "${name}" (${filePath}): ${reason}`);
		return null;
	}
}

/**
 * Synchronous state write — no lock.
 *
 * Safe to call from synchronous command/tool handlers (single-threaded,
 * no interleaving within sync code). For async contexts that cross `await`
 * boundaries, use `withLockedState` instead.
 */
export function saveStateSync(
	ctx: ExtensionContext,
	state: LoopStateV3,
	archived = false,
): void {
	state.schemaVersion = SCHEMA_VERSION;
	const filePath = getPath(ctx, state.name, ".state.json", archived);
	ensureDir(filePath);
	fs.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8");
}

/**
 * Locked read-modify-write helper.
 * Acquires a per-name mutex, loads state, calls `fn` to mutate, then saves.
 * Returns whatever `fn` returns (for passing results back to callers).
 *
 * **Use this for all state mutations in async event handlers**
 * (session_compact, session_shutdown, etc.) where interleaving is possible.
 */
export async function withLockedState<T>(
	ctx: ExtensionContext,
	name: string,
	fn: (state: LoopStateV3) => T,
): Promise<T | null> {
	const release = await stateLock.acquire(name);
	try {
		const state = loadState(ctx, name);
		if (!state) return null;
		const result = fn(state);
		saveStateSync(ctx, state);
		return result;
	} finally {
		release();
	}
}

/**
 * List all loop states in `.ralph/` (or archive).
 * Emits warnings for any corrupt/unparseable state files.
 */
export function listLoops(
	ctx: ExtensionContext,
	archived = false,
): LoopStateV3[] {
	const dir = archived ? archiveDir(ctx) : ralphDir(ctx);
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir)
		.filter((f) => f.endsWith(".state.json"))
		.map((f) => {
			const filePath = path.join(dir, f);
			const content = tryRead(filePath);
			if (!content) return null;
			try {
				return migrateState(JSON.parse(content));
			} catch (err) {
				const reason = err instanceof Error ? err.message : String(err);
				warnHandler(`Failed to parse state file ${filePath}: ${reason}`);
				return null;
			}
		})
		.filter((s): s is LoopStateV3 => s !== null);
}

/** Delete a loop's state file. */
export function deleteState(ctx: ExtensionContext, name: string): void {
	tryDelete(getPath(ctx, name, ".state.json"));
}
