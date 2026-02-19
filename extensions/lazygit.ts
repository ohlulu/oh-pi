import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { TUI } from "@mariozechner/pi-tui";
import { spawnSync } from "node:child_process";

const LAZYGIT_URL = "https://github.com/jesseduffield/lazygit";

function isLazygitAvailable(): boolean {
  const result = spawnSync("which", ["lazygit"], { encoding: "utf8" });
  return result.status === 0;
}

function launchLazygit(tui: TUI, cwd: string): void {
  tui.stop();
  spawnSync("lazygit", [], { stdio: "inherit", cwd });
  tui.start();
  tui.requestRender(true);
}

export default function lazygitExtension(pi: ExtensionAPI): void {
  const runLazygit = async (ctx: ExtensionContext): Promise<void> => {
    if (!ctx.hasUI) {
      ctx.ui.notify("lazygit needs interactive mode", "error");
      return;
    }

    if (!isLazygitAvailable()) {
      ctx.ui.notify(`lazygit not found. Install: ${LAZYGIT_URL}`, "error");
      return;
    }

    const cwd = ctx.cwd;

    await ctx.ui.custom<void>(async (tui, _theme, _kb, done) => {
      launchLazygit(tui, cwd);
      done();
      return { render: () => [], invalidate: () => {} };
    });
  };

  pi.registerCommand("lazygit", {
    description: "Open lazygit",
    handler: async (_args, ctx) => {
      await runLazygit(ctx);
    },
  });

  pi.registerShortcut("ctrl+shift+g", {
    description: "Open lazygit",
    handler: async (ctx) => {
      await runLazygit(ctx);
    },
  });
}
