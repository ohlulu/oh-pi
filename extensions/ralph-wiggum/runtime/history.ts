/**
 * Ralph Wiggum v3 — Iteration history and log recording.
 *
 * Persists lightweight iteration records to:
 * - `.ralph/<name>.history.json` — structured JSON array (max 500 entries)
 * - `.ralph/<name>.log` — human-readable append-only log (max 1MB)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { RALPH_DIR, type IterationRecord } from "../types.js";
import { ensureDir } from "../state/store.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HISTORY_MAX_ENTRIES = 500;
const LOG_MAX_BYTES = 1_048_576; // 1 MB

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

function historyPath(ctx: ExtensionContext, name: string): string {
	return path.resolve(ctx.cwd, RALPH_DIR, `${name}.history.json`);
}

function logPath(ctx: ExtensionContext, name: string): string {
	return path.resolve(ctx.cwd, RALPH_DIR, `${name}.log`);
}

// ---------------------------------------------------------------------------
// History (JSON)
// ---------------------------------------------------------------------------

function readHistory(fp: string): IterationRecord[] {
	try {
		if (!fs.existsSync(fp)) return [];
		const raw = fs.readFileSync(fp, "utf-8");
		const arr = JSON.parse(raw);
		return Array.isArray(arr) ? arr : [];
	} catch {
		return [];
	}
}

/**
 * Append an iteration record to the history JSON file.
 * Trims oldest entries when exceeding HISTORY_MAX_ENTRIES.
 */
export function appendHistory(
	ctx: ExtensionContext,
	name: string,
	record: IterationRecord,
): void {
	const fp = historyPath(ctx, name);
	ensureDir(fp);
	const history = readHistory(fp);
	history.push(record);
	// Trim oldest if over limit
	const trimmed =
		history.length > HISTORY_MAX_ENTRIES
			? history.slice(history.length - HISTORY_MAX_ENTRIES)
			: history;
	fs.writeFileSync(fp, JSON.stringify(trimmed, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Log (text)
// ---------------------------------------------------------------------------

function formatDuration(ms: number): string {
	const totalSec = Math.round(ms / 1000);
	const m = Math.floor(totalSec / 60);
	const s = totalSec % 60;
	return m > 0 ? `${m}m${s}s` : `${s}s`;
}

function formatTimestamp(iso: string): string {
	try {
		const d = new Date(iso);
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
	} catch {
		return iso.slice(0, 16);
	}
}

/**
 * Append a human-readable log line for an iteration.
 * Special lines for rotation, pause, complete events.
 *
 * Format: `[YYYY-MM-DD HH:mm] Iter N  | XmYs | ✓ +Z items | tools: W calls`
 *
 * Truncates front half when log exceeds LOG_MAX_BYTES.
 */
export function appendLog(
	ctx: ExtensionContext,
	name: string,
	record: IterationRecord,
): void {
	const fp = logPath(ctx, name);
	ensureDir(fp);

	const ts = formatTimestamp(record.endedAt);
	const dur = formatDuration(record.durationMs);
	const delta =
		record.checklistDelta > 0
			? `✓ +${record.checklistDelta} items`
			: record.checklistDelta === 0
				? `→ no change`
				: `✗ ${record.checklistDelta} items`;
	const reflect = record.wasReflection ? " [reflection]" : "";
	const line = `[${ts}] Iter ${String(record.iteration).padStart(3)}  | ${dur.padStart(6)} | ${delta.padEnd(14)} | tools: ${record.toolCalls} calls${reflect}\n`;

	fs.appendFileSync(fp, line, "utf-8");
	trimLogIfNeeded(fp);
}

// ---------------------------------------------------------------------------
// Log truncation
// ---------------------------------------------------------------------------

/** Truncate front half of log file when it exceeds LOG_MAX_BYTES. */
function trimLogIfNeeded(fp: string): void {
	try {
		const stat = fs.statSync(fp);
		if (stat.size > LOG_MAX_BYTES) {
			const content = fs.readFileSync(fp, "utf-8");
			const half = Math.floor(content.length / 2);
			const cut = content.indexOf("\n", half);
			if (cut > 0) {
				fs.writeFileSync(
					fp,
					`[…truncated…]\n${content.slice(cut + 1)}`,
					"utf-8",
				);
			}
		}
	} catch {
		// Non-fatal
	}
}

/**
 * Append a special event line to the log (rotation, pause, complete).
 */
export function appendLogEvent(
	ctx: ExtensionContext,
	name: string,
	event: string,
): void {
	const fp = logPath(ctx, name);
	ensureDir(fp);
	const ts = formatTimestamp(new Date().toISOString());
	fs.appendFileSync(fp, `[${ts}] --- ${event} ---\n`, "utf-8");
	trimLogIfNeeded(fp);
}
