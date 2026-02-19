/**
 * Ralph Wiggum v3 — Strict marker protocol parser.
 *
 * Detects COMPLETE / ABORT markers in agent output.
 * A marker is valid only when it appears as the sole content on a line
 * (after trimming whitespace), **outside** fenced code blocks.
 * Both present = conflict → null.
 */

import { COMPLETE_MARKER, ABORT_MARKER, type MarkerResult } from "../types.js";

/**
 * Scan `text` for promise markers.
 *
 * Rules:
 * - Lines inside fenced code blocks (``` or ~~~) are skipped.
 * - Each remaining line is trimmed; must exactly equal the marker string.
 * - If both COMPLETE and ABORT appear → conflict → `null`.
 * - Single match → `"COMPLETE"` or `"ABORT"`.
 * - No match → `null`.
 */
export function detectPromiseMarker(text: string): MarkerResult {
	const lines = text.split(/\r?\n/);
	let inFence = false;

	let hasComplete = false;
	let hasAbort = false;

	for (const raw of lines) {
		const trimmed = raw.trim();

		// Toggle fence state on ``` or ~~~ (with optional language tag)
		if (/^(`{3,}|~{3,})/.test(trimmed)) {
			inFence = !inFence;
			continue;
		}

		if (inFence) continue;

		if (trimmed === COMPLETE_MARKER) hasComplete = true;
		if (trimmed === ABORT_MARKER) hasAbort = true;
	}

	if (hasComplete && hasAbort) return null; // conflict
	if (hasComplete) return "COMPLETE";
	if (hasAbort) return "ABORT";
	return null;
}
