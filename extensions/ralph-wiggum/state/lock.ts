/**
 * Ralph Wiggum v3 — State write serialization.
 *
 * Simple per-name async mutex to prevent concurrent read-modify-write
 * races on `.ralph/<name>.state.json`.
 */

/** Per-name async mutex for state file writes. */
class StateLock {
	private locks = new Map<string, Promise<void>>();

	/**
	 * Acquire exclusive access for `name`.
	 * Returns a release function — call it when done.
	 *
	 * ```ts
	 * const release = await stateLock.acquire("my-loop");
	 * try { /* read-modify-write * / } finally { release(); }
	 * ```
	 */
	async acquire(name: string): Promise<() => void> {
		// Wait for any existing lock on this name
		while (this.locks.has(name)) {
			await this.locks.get(name);
		}

		// Create a new lock
		let release!: () => void;
		const promise = new Promise<void>((resolve) => {
			release = () => {
				this.locks.delete(name);
				resolve();
			};
		});
		this.locks.set(name, promise);

		return release;
	}
}

/** Singleton lock instance shared across all modules. */
export const stateLock = new StateLock();
