/**
 * Ralph Wiggum v3 — Checkpoint validation.
 *
 * Verifies that the agent actually updated the task file with a proper
 * checkpoint section during reflection iterations.
 */

import * as crypto from "node:crypto";
import type { LoopStateV3, CheckpointValidationResult } from "../types.js";

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/** SHA-256 hex digest of a string. */
export function computeFileHash(content: string): string {
	return crypto.createHash("sha256").update(content, "utf-8").digest("hex");
}

// ---------------------------------------------------------------------------
// Required checkpoint subsections
// ---------------------------------------------------------------------------

const REQUIRED_SUBSECTIONS = [
	"### Completed",
	"### Failed Approaches",
	"### Key Decisions",
	"### Current State",
	"### Next Steps",
] as const;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate that the task file was meaningfully updated with a checkpoint.
 *
 * Checks:
 * 1. File content changed (hash/size differ from snapshot) — skipped on first checkpoint.
 * 2. `## Checkpoint` heading exists (latest one is used).
 * 3. Required subsections present inside that checkpoint block.
 */
export function validateCheckpoint(
	state: LoopStateV3,
	taskContent: string,
): CheckpointValidationResult {
	const reasons: string[] = [];

	// --- Check 1: content changed ---
	if (state.lastTaskFileHash !== undefined) {
		const currentHash = computeFileHash(taskContent);
		const sameHash = currentHash === state.lastTaskFileHash;
		const sameSize = taskContent.length === state.lastTaskFileSize;
		if (sameHash && sameSize) {
			reasons.push("Task file content unchanged since last snapshot (same hash + size).");
		}
	}

	// --- Check 2 & 3: checkpoint section ---
	const checkpointBlock = extractLatestCheckpointBlock(taskContent);

	if (!checkpointBlock) {
		reasons.push("Missing `## Checkpoint` heading in task file.");
	} else {
		// Check 3: required subsections
		for (const sub of REQUIRED_SUBSECTIONS) {
			if (!checkpointBlock.includes(sub)) {
				reasons.push(`Missing subsection: ${sub}`);
			}
		}
	}

	return {
		valid: reasons.length === 0,
		reasons,
	};
}

/**
 * Extract the last `## Checkpoint` block (from heading to next `## ` or EOF).
 * Returns null if no checkpoint heading found.
 */
function extractLatestCheckpointBlock(content: string): string | null {
	const regex = /^(## Checkpoint[^\n]*\n(?:(?!^## )[\s\S])*)/gm;
	let last: string | null = null;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(content)) !== null) {
		last = match[1];
	}
	return last;
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

/**
 * Update the state's task file hash/size snapshot.
 * Call after a successful checkpoint validation or on loop init.
 */
export function snapshotTaskFile(state: LoopStateV3, content: string): void {
	state.lastTaskFileHash = computeFileHash(content);
	state.lastTaskFileSize = content.length;
}
