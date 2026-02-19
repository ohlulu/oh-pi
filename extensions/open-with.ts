/**
 * Open With - Open cwd in external apps
 *
 * Commands:
 *   /finder  - Reveal cwd in Finder
 *   /cursor  - Open cwd in Cursor editor
 */

import type { ExtensionAPI } from '@mariozechner/pi-coding-agent';

export default function (pi: ExtensionAPI) {
  pi.registerCommand('finder', {
    description: 'Reveal cwd in Finder',
    handler: async (_args, ctx) => {
      const { code } = await pi.exec('open', [ctx.cwd]);
      if (code !== 0) ctx.ui.notify(`Failed to open Finder`, 'error');
    },
  });

  pi.registerCommand('cursor', {
    description: 'Open cwd in Cursor',
    handler: async (_args, ctx) => {
      const { code } = await pi.exec('cursor', [ctx.cwd]);
      if (code !== 0) ctx.ui.notify(`Failed to open Cursor`, 'error');
    },
  });
}
