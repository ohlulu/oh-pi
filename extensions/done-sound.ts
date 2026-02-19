/**
 * Done Sound Extension
 *
 * Plays a system sound when the agent finishes and waits for input.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { execFile } from "node:child_process";

export default function (pi: ExtensionAPI) {
  pi.on("agent_end", async () => {
    execFile("afplay", ["/System/Library/Sounds/Glass.aiff"]);
  });
}
