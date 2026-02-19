import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { TUI } from "@mariozechner/pi-tui";
import { spawnSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Yazi integration – launches yazi in normal mode (no --chooser-file)
// so all default keybindings (o, O, Enter, etc.) work unchanged.
// ---------------------------------------------------------------------------

const YAZI_URL = "https://github.com/sxyazi/yazi";

function isYaziAvailable(): boolean {
  const result = spawnSync("which", ["yazi"], { encoding: "utf8" });
  return result.status === 0;
}

function launchYazi(tui: TUI, cwd: string): void {
  tui.stop();
  spawnSync("yazi", [], { stdio: "inherit", cwd });
  tui.start();
  tui.requestRender(true);
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function yaziExtension(pi: ExtensionAPI): void {
  const runYazi = async (ctx: ExtensionContext): Promise<void> => {
    if (!ctx.hasUI) {
      ctx.ui.notify("yazi needs interactive mode", "error");
      return;
    }

    if (!isYaziAvailable()) {
      ctx.ui.notify(`yazi not found. Install: ${YAZI_URL}`, "error");
      return;
    }

    const cwd = ctx.cwd;

    await ctx.ui.custom<void>(async (tui, _theme, _kb, done) => {
      launchYazi(tui, cwd);
      done();
      return { render: () => [], invalidate: () => {} };
    });
  };

  pi.registerCommand("yazi", {
    description: "Open yazi file browser",
    handler: async (_args, ctx) => { await runYazi(ctx); },
  });

  pi.registerShortcut("ctrl+shift+y", {
    description: "Open yazi file browser",
    handler: async (ctx) => { await runYazi(ctx); },
  });
}
