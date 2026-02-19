/**
 * Ralph Wiggum v3 — Struggle detection.
 *
 * Tracks consecutive iterations with zero checklist progress
 * and flags when the agent appears stuck.
 */

import type { LoopStateV3 } from "../types.js";

/** Threshold: N consecutive zero-progress iterations → struggling. */
const STRUGGLE_THRESHOLD = 3;

/**
 * Update the struggle state based on checklist delta.
 *
 * - `checklistDelta > 0` → reset streak to 0
 * - `checklistDelta === 0` → increment streak
 * - Negative delta is treated as 0 (unchecking items isn't progress)
 */
export function updateStruggleState(
	state: LoopStateV3,
	checklistDelta: number,
): void {
	if (checklistDelta > 0) {
		state.noProgressStreak = 0;
	} else {
		state.noProgressStreak++;
	}
}

/** Returns true when the agent has made no checklist progress for STRUGGLE_THRESHOLD+ iterations. */
export function isStruggling(state: LoopStateV3): boolean {
	return state.noProgressStreak >= STRUGGLE_THRESHOLD;
}
