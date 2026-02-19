/**
 * Update the terminal tab title with Pi run status.
 * ☘️ = idle/waiting for user input, 🔄 = agent working, 🛑 = error/stuck.
 * /tab <name> to set custom tab name.
 */
import type {
  ExtensionAPI,
  ExtensionContext,
  SessionStartEvent,
  SessionSwitchEvent,
  BeforeAgentStartEvent,
  AgentStartEvent,
  AgentEndEvent,
  TurnStartEvent,
  ToolCallEvent,
  ToolResultEvent,
  SessionShutdownEvent,
} from "@mariozechner/pi-coding-agent";
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { AssistantMessage, StopReason } from "@mariozechner/pi-ai";
import { basename } from "node:path";

type StatusState = "idle" | "working" | "stuck";

const STATUS_EMOJI: Record<StatusState, string> = {
  idle: "☘️",
  working: "🔄",
  stuck: "🛑",
};

const INACTIVE_TIMEOUT_MS = 180_000;
const GIT_COMMIT_RE = /\bgit\b[^\n]*\bcommit\b/;
const ASK_TOOLS = new Set(["ask_me", "ask_me_batch"]);

export default function (pi: ExtensionAPI) {
  let state: StatusState = "idle";
  let running = false;
  let waitingForUser = false;
  let customName: string | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const nativeClearTimeout = globalThis.clearTimeout;

  const titlePrefix = (ctx: ExtensionContext): string =>
    customName ?? `pi - ${basename(ctx.cwd || "pi")}`;

  const setTitle = (ctx: ExtensionContext, next: StatusState): void => {
    state = next;
    if (!ctx.hasUI) return;
    ctx.ui.setTitle(`${titlePrefix(ctx)} ${STATUS_EMOJI[next]}`);
  };

  const clearTabTimeout = (): void => {
    if (timeoutId === undefined) return;
    nativeClearTimeout(timeoutId);
    timeoutId = undefined;
  };

  const resetTimeout = (ctx: ExtensionContext): void => {
    clearTabTimeout();
    timeoutId = setTimeout(() => {
      if (running && state === "working") {
        setTitle(ctx, "stuck");
      }
    }, INACTIVE_TIMEOUT_MS);
  };

  const markActivity = (ctx: ExtensionContext): void => {
    if (state === "stuck") setTitle(ctx, "working");
    if (!running) return;
    resetTimeout(ctx);
  };

  // -- Command --

  pi.registerCommand("tab", {
    description: "Set custom tab name. Usage: /tab <name>  (empty to reset)",
    handler: async (args, ctx) => {
      const name = args?.trim();
      customName = name || undefined;
      setTitle(ctx, state);
      ctx.ui.notify(
        customName ? `Tab → "${customName}"` : "Tab → default",
        "info",
      );
    },
  });

  // -- Event handlers --

  const handlers = [
    [
      "session_start",
      async (_event: SessionStartEvent, ctx: ExtensionContext) => {
        running = false;
        waitingForUser = false;
        clearTabTimeout();
        setTitle(ctx, "idle");
      },
    ],
    [
      "session_switch",
      async (_event: SessionSwitchEvent, ctx: ExtensionContext) => {
        running = false;
        waitingForUser = false;
        clearTabTimeout();
        setTitle(ctx, "idle");
      },
    ],
    [
      "before_agent_start",
      async (_event: BeforeAgentStartEvent, ctx: ExtensionContext) => {
        markActivity(ctx);
      },
    ],
    [
      "agent_start",
      async (_event: AgentStartEvent, ctx: ExtensionContext) => {
        running = true;
        waitingForUser = false;
        setTitle(ctx, "working");
        resetTimeout(ctx);
      },
    ],
    [
      "turn_start",
      async (_event: TurnStartEvent, ctx: ExtensionContext) => {
        markActivity(ctx);
      },
    ],
    [
      "tool_call",
      async (event: ToolCallEvent, ctx: ExtensionContext) => {
        if (ASK_TOOLS.has(event.toolName)) {
          waitingForUser = true;
          setTitle(ctx, "idle");
          clearTabTimeout();
          return;
        }
        markActivity(ctx);
      },
    ],
    [
      "tool_result",
      async (event: ToolResultEvent, ctx: ExtensionContext) => {
        if (waitingForUser && ASK_TOOLS.has(event.toolName)) {
          waitingForUser = false;
          setTitle(ctx, "working");
          resetTimeout(ctx);
          return;
        }
        markActivity(ctx);
      },
    ],
    [
      "agent_end",
      async (event: AgentEndEvent, ctx: ExtensionContext) => {
        running = false;
        waitingForUser = false;
        clearTabTimeout();
        const stopReason = getStopReason(event.messages);
        setTitle(ctx, stopReason === "error" ? "stuck" : "idle");
      },
    ],
    [
      "session_shutdown",
      async (_event: SessionShutdownEvent, ctx: ExtensionContext) => {
        clearTabTimeout();
        if (!ctx.hasUI) return;
        ctx.ui.setTitle(titlePrefix(ctx));
      },
    ],
  ] as const;

  for (const [event, handler] of handlers) {
    pi.on(event, handler as (event: unknown, ctx: ExtensionContext) => void);
  }
}

function getStopReason(messages: AgentMessage[]): StopReason | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.role === "assistant") {
      return (msg as AssistantMessage).stopReason;
    }
  }
  return undefined;
}
