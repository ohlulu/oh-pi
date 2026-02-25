/**
 * Todo extension entry point.
 *
 * Registers the `todo` tool and `/todos` command.
 * See models.ts, storage.ts, and ui.ts for supporting modules.
 */
import { copyToClipboard, type ExtensionAPI, type ExtensionContext, type Theme } from "@mariozechner/pi-coding-agent";
import { Text, type TUI } from "@mariozechner/pi-tui";
import path from "node:path";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";

import {
  type TodoFrontMatter,
  type TodoRecord,
  type TodoAction,
  type TodoToolDetails,
  type TodoErrorPayload,
  type TodoOverlayAction,
  type TodoMenuAction,
  TodoParams,
  formatTodoId,
  normalizeTodoId,
  normalizeDependencyId,
  validateTodoId,
  getDependencyIds,
  buildTodoMap,
  enrichTodosWithDependencyState,
  withRuntimeDependencyStateForRecord,
  isTodoClosed,
  clearAssignmentIfClosed,
  getTodoStatus,
  todoError,
  validateDependsOn,
  splitTodosByAssignment,
  serializeTodoForAgent,
  serializeTodoListForAgent,
  formatTodoList,
  formatErrorWithCode,
  toolErrorDetails,
  buildTodoTreeLines,
  filterTodos,
  getTodoMarker,
  getTodoTitle,
} from "./models.js";

import {
  getTodosDir,
  getTodosDirLabel,
  getTodoPath,
  readTodoSettings,
  garbageCollectTodos,
  ensureTodosDir,
  writeTodoFile,
  generateTodoId,
  listTodos,
  listTodosSync,
  withTodoLock,
  ensureTodoExists,
  appendTodoBody,
  updateTodoStatus,
  claimTodoAssignment,
  releaseTodoAssignment,
  deleteTodo,
} from "./storage.js";

import {
  renderTodoList,
  renderTodoDetail,
  renderTodoHeading,
  renderAssignmentSuffix,
  appendExpandHint,
  TodoSelectorComponent,
  TodoActionMenuComponent,
  TodoDeleteConfirmComponent,
  TodoDetailOverlayComponent,
} from "./ui.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugifyBranchName(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function ensureFeatureBranch(description: string, cwd: string): { created: boolean; branch: string } | null {
  try {
    const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();

    if (currentBranch.startsWith("feature/")) {
      return { created: false, branch: currentBranch };
    }

    const slug = slugifyBranchName(description);
    if (!slug) return null;

    const branchName = `feature/${slug}`;
    execSync(`git checkout -b "${branchName}"`, {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { created: true, branch: branchName };
  } catch {
    return null; // not a git repo or git error — skip silently
  }
}

function buildRefinePrompt(todoId: string, title: string): string {
  return (
    `let's refine task ${formatTodoId(todoId)} "${title}": ` +
    "Ask me for the missing details needed to refine the todo together. Do not rewrite the todo yet and do not make assumptions. " +
    "Ask clear, concrete questions and wait for my answers before drafting any structured description.\n\n"
  );
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function todosExtension(pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    const todosDir = getTodosDir(ctx.cwd);
    // Only run GC if the todos directory already exists; don't create it eagerly.
    if (existsSync(todosDir)) {
      const settings = await readTodoSettings(todosDir);
      await garbageCollectTodos(todosDir, settings);
    }
  });

  const todosDirLabel = getTodosDirLabel(process.cwd());

  pi.registerTool({
    name: "todo",
    label: "Todo",
    description:
      `Manage file-based todos in ${todosDirLabel} (list, list-all, get, create, update, append, delete, claim, release). ` +
      "Title is the short summary; body is long-form markdown notes (update replaces, append adds). " +
      "Dependencies are managed via depends_on on create/update (accepts TODO-<hex> or raw hex and stores raw ids). " +
      "Todo ids are shown as TODO-<hex>; id parameters accept TODO-<hex> or the raw hex filename. " +
      "Claim tasks before working on them to avoid conflicts, and close them when complete.",
    parameters: TodoParams,

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const todosDir = getTodosDir(ctx.cwd);
      const action: TodoAction = params.action;

      switch (action) {
        case "list": {
          const todos = enrichTodosWithDependencyState(await listTodos(todosDir));
          const { assignedTodos, openTodos } = splitTodosByAssignment(todos);
          const listedTodos = [...assignedTodos, ...openTodos];
          const currentSessionId = ctx.sessionManager.getSessionId();
          return {
            content: [{ type: "text", text: serializeTodoListForAgent(listedTodos) }],
            details: { action: "list", todos: listedTodos, currentSessionId },
          };
        }

        case "list-all": {
          const todos = enrichTodosWithDependencyState(await listTodos(todosDir));
          const currentSessionId = ctx.sessionManager.getSessionId();
          return {
            content: [{ type: "text", text: serializeTodoListForAgent(todos) }],
            details: { action: "list-all", todos, currentSessionId },
          };
        }

        case "get": {
          if (!params.id) {
            const error = todoError("ID_REQUIRED", "id required");
            return {
              content: [{ type: "text", text: formatErrorWithCode(error) }],
              details: toolErrorDetails("get", error),
            };
          }
          const validated = validateTodoId(params.id);
          if ("error" in validated) {
            const error = todoError("ID_REQUIRED", validated.error, { id: params.id });
            return {
              content: [{ type: "text", text: formatErrorWithCode(error) }],
              details: toolErrorDetails("get", error),
            };
          }
          const normalizedId = validated.id;
          const displayId = formatTodoId(normalizedId);
          const filePath = getTodoPath(todosDir, normalizedId);
          const todo = await ensureTodoExists(filePath, normalizedId);
          if (!todo) {
            const error = todoError("TODO_NOT_FOUND", `Todo ${displayId} not found`, { id: normalizedId });
            return {
              content: [{ type: "text", text: formatErrorWithCode(error) }],
              details: toolErrorDetails("get", error),
            };
          }

          const todoMap = buildTodoMap(await listTodos(todosDir));
          const todoWithState = withRuntimeDependencyStateForRecord(todo, todoMap);
          return {
            content: [{ type: "text", text: serializeTodoForAgent(todoWithState) }],
            details: { action: "get", todo: todoWithState },
          };
        }

        case "create": {
          if (!params.title) {
            const error = todoError("INVALID_INPUT", "title required");
            return {
              content: [{ type: "text", text: formatErrorWithCode(error) }],
              details: toolErrorDetails("create", error),
            };
          }

          await ensureTodosDir(todosDir);
          const allTodos = await listTodos(todosDir);
          const id = await generateTodoId(todosDir);
          const dependencyValidation = validateDependsOn(id, params.depends_on, allTodos);
          if ("error" in dependencyValidation) {
            return {
              content: [{ type: "text", text: formatErrorWithCode(dependencyValidation) }],
              details: toolErrorDetails("create", dependencyValidation),
            };
          }

          const filePath = getTodoPath(todosDir, id);
          const todo: TodoRecord = {
            id,
            title: params.title,
            tags: params.tags ?? [],
            status: params.status ?? "open",
            created_at: new Date().toISOString(),
            depends_on: dependencyValidation.dependsOn,
            body: params.body ?? "",
          };

          const result = await withTodoLock(todosDir, id, ctx, async () => {
            await writeTodoFile(filePath, todo);
            const createdTodos = [...allTodos, todo];
            const todoMap = buildTodoMap(createdTodos);
            return withRuntimeDependencyStateForRecord(todo, todoMap);
          });

          if (typeof result === "object" && "error" in result) {
            return {
              content: [{ type: "text", text: formatErrorWithCode(result) }],
              details: toolErrorDetails("create", result),
            };
          }

          return {
            content: [{ type: "text", text: serializeTodoForAgent(result as TodoRecord) }],
            details: { action: "create", todo: result as TodoRecord },
          };
        }

        case "update": {
          if (!params.id) {
            const error = todoError("ID_REQUIRED", "id required");
            return {
              content: [{ type: "text", text: formatErrorWithCode(error) }],
              details: toolErrorDetails("update", error),
            };
          }
          const validated = validateTodoId(params.id);
          if ("error" in validated) {
            const error = todoError("ID_REQUIRED", validated.error, { id: params.id });
            return {
              content: [{ type: "text", text: formatErrorWithCode(error) }],
              details: toolErrorDetails("update", error),
            };
          }
          const normalizedId = validated.id;
          const displayId = formatTodoId(normalizedId);
          const filePath = getTodoPath(todosDir, normalizedId);
          if (!existsSync(filePath)) {
            const error = todoError("TODO_NOT_FOUND", `Todo ${displayId} not found`, { id: normalizedId });
            return {
              content: [{ type: "text", text: formatErrorWithCode(error) }],
              details: toolErrorDetails("update", error),
            };
          }

          const allTodos = await listTodos(todosDir);
          const result = await withTodoLock(todosDir, normalizedId, ctx, async () => {
            const existing = await ensureTodoExists(filePath, normalizedId);
            if (!existing) {
              return todoError("TODO_NOT_FOUND", `Todo ${displayId} not found`, { id: normalizedId });
            }

            const dependencyInput = params.depends_on ?? existing.depends_on;
            const todosWithoutCurrent = allTodos.filter((todo) => todo.id !== normalizedId);
            const dependencyValidation = validateDependsOn(normalizedId, dependencyInput, todosWithoutCurrent);
            if ("error" in dependencyValidation) {
              return dependencyValidation;
            }

            existing.id = normalizedId;
            if (params.title !== undefined) existing.title = params.title;
            if (params.status !== undefined) existing.status = params.status;
            if (params.tags !== undefined) existing.tags = params.tags;
            if (params.body !== undefined) existing.body = params.body;
            existing.depends_on = dependencyValidation.dependsOn;
            if (!existing.created_at) existing.created_at = new Date().toISOString();
            clearAssignmentIfClosed(existing);

            await writeTodoFile(filePath, existing);
            const todosAfterUpdate = [...todosWithoutCurrent, existing];
            const todoMap = buildTodoMap(todosAfterUpdate);
            return withRuntimeDependencyStateForRecord(existing, todoMap);
          });

          if (typeof result === "object" && "error" in result) {
            return {
              content: [{ type: "text", text: formatErrorWithCode(result) }],
              details: toolErrorDetails("update", result),
            };
          }

          const updatedTodo = result as TodoRecord;
          return {
            content: [{ type: "text", text: serializeTodoForAgent(updatedTodo) }],
            details: { action: "update", todo: updatedTodo },
          };
        }

        case "append": {
          if (!params.id) {
            const error = todoError("ID_REQUIRED", "id required");
            return {
              content: [{ type: "text", text: formatErrorWithCode(error) }],
              details: toolErrorDetails("append", error),
            };
          }
          const validated = validateTodoId(params.id);
          if ("error" in validated) {
            const error = todoError("ID_REQUIRED", validated.error, { id: params.id });
            return {
              content: [{ type: "text", text: formatErrorWithCode(error) }],
              details: toolErrorDetails("append", error),
            };
          }
          const normalizedId = validated.id;
          const displayId = formatTodoId(normalizedId);
          const filePath = getTodoPath(todosDir, normalizedId);
          if (!existsSync(filePath)) {
            const error = todoError("TODO_NOT_FOUND", `Todo ${displayId} not found`, { id: normalizedId });
            return {
              content: [{ type: "text", text: formatErrorWithCode(error) }],
              details: toolErrorDetails("append", error),
            };
          }

          const allTodos = await listTodos(todosDir);
          const result = await withTodoLock(todosDir, normalizedId, ctx, async () => {
            const existing = await ensureTodoExists(filePath, normalizedId);
            if (!existing) {
              return todoError("TODO_NOT_FOUND", `Todo ${displayId} not found`, { id: normalizedId });
            }
            if (params.body && params.body.trim()) {
              await appendTodoBody(filePath, existing, params.body);
            }

            const todoMap = buildTodoMap(allTodos);
            return withRuntimeDependencyStateForRecord(existing, todoMap);
          });

          if (typeof result === "object" && "error" in result) {
            return {
              content: [{ type: "text", text: formatErrorWithCode(result) }],
              details: toolErrorDetails("append", result),
            };
          }

          const updatedTodo = result as TodoRecord;
          return {
            content: [{ type: "text", text: serializeTodoForAgent(updatedTodo) }],
            details: { action: "append", todo: updatedTodo },
          };
        }

        case "claim": {
          if (!params.id) {
            const error = todoError("ID_REQUIRED", "id required");
            return {
              content: [{ type: "text", text: formatErrorWithCode(error) }],
              details: toolErrorDetails("claim", error),
            };
          }
          const result = await claimTodoAssignment(todosDir, params.id, ctx, Boolean(params.force));
          if (typeof result === "object" && "error" in result) {
            return {
              content: [{ type: "text", text: formatErrorWithCode(result) }],
              details: toolErrorDetails("claim", result),
            };
          }
          const updatedTodo = result as TodoRecord;
          const blockedBy = updatedTodo.blocked_by ?? [];
          const forcedBlockedClaim = Boolean(params.force) && blockedBy.length > 0;
          return {
            content: [{ type: "text", text: serializeTodoForAgent(updatedTodo) }],
            details: {
              action: "claim",
              todo: updatedTodo,
              ...(forcedBlockedClaim
                ? {
                    warning: `Claimed with force while blocked by ${blockedBy.map((dependencyId) => formatTodoId(dependencyId)).join(", ")}.`,
                    warningCode: "DEPENDENCY_BLOCKED" as const,
                    warningMeta: { id: updatedTodo.id, blockedBy },
                  }
                : {}),
            },
          };
        }

        case "release": {
          if (!params.id) {
            const error = todoError("ID_REQUIRED", "id required");
            return {
              content: [{ type: "text", text: formatErrorWithCode(error) }],
              details: toolErrorDetails("release", error),
            };
          }
          const result = await releaseTodoAssignment(todosDir, params.id, ctx, Boolean(params.force));
          if (typeof result === "object" && "error" in result) {
            return {
              content: [{ type: "text", text: formatErrorWithCode(result) }],
              details: toolErrorDetails("release", result),
            };
          }
          const updatedTodo = result as TodoRecord;
          return {
            content: [{ type: "text", text: serializeTodoForAgent(updatedTodo) }],
            details: { action: "release", todo: updatedTodo },
          };
        }

        case "delete": {
          if (!params.id) {
            const error = todoError("ID_REQUIRED", "id required");
            return {
              content: [{ type: "text", text: formatErrorWithCode(error) }],
              details: toolErrorDetails("delete", error),
            };
          }

          const validated = validateTodoId(params.id);
          if ("error" in validated) {
            const error = todoError("ID_REQUIRED", validated.error, { id: params.id });
            return {
              content: [{ type: "text", text: formatErrorWithCode(error) }],
              details: toolErrorDetails("delete", error),
            };
          }
          const result = await deleteTodo(todosDir, validated.id, ctx);
          if (typeof result === "object" && "error" in result) {
            return {
              content: [{ type: "text", text: formatErrorWithCode(result) }],
              details: toolErrorDetails("delete", result),
            };
          }

          return {
            content: [{ type: "text", text: serializeTodoForAgent(result as TodoRecord) }],
            details: { action: "delete", todo: result as TodoRecord },
          };
        }
      }
    },

    renderCall(args, theme) {
      const action = typeof args.action === "string" ? args.action : "";
      const id = typeof args.id === "string" ? args.id : "";
      const normalizedId = id ? normalizeTodoId(id) : "";
      const title = typeof args.title === "string" ? args.title : "";
      const dependsOn = Array.isArray(args.depends_on)
        ? args.depends_on
            .filter((dependencyId): dependencyId is string => typeof dependencyId === "string")
            .map((dependencyId) => normalizeDependencyId(dependencyId))
            .filter((result): result is { id: string } => "id" in result)
            .map((result) => formatTodoId(result.id))
        : [];
      let text = theme.fg("toolTitle", theme.bold("todo ")) + theme.fg("muted", action);
      if (normalizedId) {
        text += " " + theme.fg("accent", formatTodoId(normalizedId));
      }
      if (title) {
        text += " " + theme.fg("dim", `"${title}"`);
      }
      if (dependsOn.length) {
        text += " " + theme.fg("muted", `depends_on=[${dependsOn.join(", ")}]`);
      }
      return new Text(text, 0, 0);
    },

    renderResult(result, { expanded, isPartial }, theme) {
      const details = result.details as TodoToolDetails | undefined;
      if (isPartial) {
        return new Text(theme.fg("warning", "Processing..."), 0, 0);
      }
      if (!details) {
        const text = result.content[0];
        return new Text(text?.type === "text" ? text.text : "", 0, 0);
      }

      if (details.error) {
        const code = details.errorCode ? `[${details.errorCode}] ` : "";
        return new Text(theme.fg("error", `Error: ${code}${details.error}`), 0, 0);
      }

      if (details.action === "list" || details.action === "list-all") {
        const treeLineCount = buildTodoTreeLines(details.todos, "").length;
        const hiddenClosedCount = details.todos.filter((todo) => isTodoClosed(getTodoStatus(todo))).length;
        let text = renderTodoList(theme, details.todos, expanded, details.currentSessionId);
        if (!expanded && (treeLineCount > 12 || hiddenClosedCount > 0)) {
          text = appendExpandHint(theme, text);
        }
        return new Text(text, 0, 0);
      }

      if (!("todo" in details)) {
        const text = result.content[0];
        return new Text(text?.type === "text" ? text.text : "", 0, 0);
      }

      let text = renderTodoDetail(theme, details.todo, expanded);
      const actionLabel =
        details.action === "create"
          ? "Created"
          : details.action === "update"
            ? "Updated"
            : details.action === "append"
              ? "Appended to"
              : details.action === "delete"
                ? "Deleted"
                : details.action === "claim"
                  ? "Claimed"
                  : details.action === "release"
                    ? "Released"
                    : null;
      if (actionLabel) {
        const lines = text.split("\n");
        lines[0] = theme.fg("success", "✓ ") + theme.fg("muted", `${actionLabel} `) + lines[0];
        text = lines.join("\n");
      }
      if (details.warning) {
        const warningPrefix = details.warningCode ? `[${details.warningCode}] ` : "";
        text += `\n${theme.fg("warning", `⚠ ${warningPrefix}${details.warning}`)}`;
      }
      if (!expanded) {
        text = appendExpandHint(theme, text);
      }
      return new Text(text, 0, 0);
    },
  });

  pi.registerCommand("todos", {
    description: "List todos from .pi/todos",
    getArgumentCompletions: (argumentPrefix: string) => {
      const todos = listTodosSync(getTodosDir(process.cwd()));
      if (!todos.length) return null;
      const matches = filterTodos(todos, argumentPrefix);
      if (!matches.length) return null;
      return matches.map((todo) => {
        const title = todo.title || "(untitled)";
        const tags = todo.tags.length ? ` • ${todo.tags.join(", ")}` : "";
        return {
          value: title,
          label: `${todo.id} ${title}`,
          description: `${todo.status || "open"}${tags}`,
        };
      });
    },
    handler: async (args, ctx) => {
      const todosDir = getTodosDir(ctx.cwd);
      const todos = await listTodos(todosDir);
      const currentSessionId = ctx.sessionManager.getSessionId();
      const searchTerm = (args ?? "").trim();

      if (!ctx.hasUI) {
        const text = formatTodoList(todos);
        console.log(text);
        return;
      }

      let nextPrompt: string | null = null;
      let rootTui: TUI | null = null;
      await ctx.ui.custom<void>((tui, theme, _kb, done) => {
        rootTui = tui;
        let selector: TodoSelectorComponent | null = null;
        let actionMenu: TodoActionMenuComponent | null = null;
        let deleteConfirm: TodoDeleteConfirmComponent | null = null;
        let activeComponent: {
          render: (width: number) => string[];
          invalidate: () => void;
          handleInput?: (data: string) => void;
          focused?: boolean;
        } | null = null;
        let wrapperFocused = false;

        const setActiveComponent = (
          component: {
            render: (width: number) => string[];
            invalidate: () => void;
            handleInput?: (data: string) => void;
            focused?: boolean;
          } | null,
        ) => {
          if (activeComponent && "focused" in activeComponent) {
            activeComponent.focused = false;
          }
          activeComponent = component;
          if (activeComponent && "focused" in activeComponent) {
            activeComponent.focused = wrapperFocused;
          }
          tui.requestRender();
        };

        const copyTodoPathToClipboard = (todoId: string) => {
          const filePath = getTodoPath(todosDir, todoId);
          const absolutePath = path.resolve(filePath);
          try {
            copyToClipboard(absolutePath);
            ctx.ui.notify(`Copied ${absolutePath} to clipboard`, "info");
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            ctx.ui.notify(message, "error");
          }
        };

        const copyTodoTextToClipboard = (record: TodoRecord) => {
          const title = record.title || "(untitled)";
          const body = record.body?.trim() || "";
          const text = body ? `# ${title}\n\n${body}` : `# ${title}`;
          try {
            copyToClipboard(text);
            ctx.ui.notify("Copied todo text to clipboard", "info");
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            ctx.ui.notify(message, "error");
          }
        };

        const resolveTodoRecord = async (todo: TodoFrontMatter): Promise<TodoRecord | null> => {
          const filePath = getTodoPath(todosDir, todo.id);
          const record = await ensureTodoExists(filePath, todo.id);
          if (!record) {
            ctx.ui.notify(`Todo ${formatTodoId(todo.id)} not found`, "error");
            return null;
          }
          const todoMap = buildTodoMap(await listTodos(todosDir));
          return withRuntimeDependencyStateForRecord(record, todoMap);
        };

        const openTodoOverlay = async (record: TodoRecord): Promise<TodoOverlayAction> => {
          const action = await ctx.ui.custom<TodoOverlayAction>(
            (overlayTui, overlayTheme, _overlayKb, overlayDone) => new TodoDetailOverlayComponent(overlayTui, overlayTheme, record, overlayDone),
            {
              overlay: true,
              overlayOptions: { width: "80%", maxHeight: "80%", anchor: "center" },
            },
          );

          return action ?? "back";
        };

        const applyTodoAction = async (record: TodoRecord, action: TodoMenuAction): Promise<"stay" | "exit"> => {
          if (action === "refine") {
            const title = record.title || "(untitled)";
            nextPrompt = buildRefinePrompt(record.id, title);
            done();
            return "exit";
          }
          if (action === "work") {
            const title = record.title || "(untitled)";
            const branchResult = ensureFeatureBranch(title, ctx.cwd);
            if (branchResult?.created) {
              ctx.ui.notify(`Created branch ${branchResult.branch}`, "info");
            }
            nextPrompt = `work on todo ${formatTodoId(record.id)} "${title}"\nUsing skills as needed. Codex will review your code.`;
            done();
            return "exit";
          }
          if (action === "view") {
            return "stay";
          }
          if (action === "copyPath") {
            copyTodoPathToClipboard(record.id);
            return "stay";
          }
          if (action === "copyText") {
            copyTodoTextToClipboard(record);
            return "stay";
          }

          if (action === "release") {
            const result = await releaseTodoAssignment(todosDir, record.id, ctx, true);
            if ("error" in result) {
              ctx.ui.notify(result.error, "error");
              return "stay";
            }
            const updatedTodos = await listTodos(todosDir);
            selector?.setTodos(updatedTodos);
            ctx.ui.notify(`Released todo ${formatTodoId(record.id)}`, "info");
            return "stay";
          }

          if (action === "delete") {
            const result = await deleteTodo(todosDir, record.id, ctx);
            if ("error" in result) {
              ctx.ui.notify(result.error, "error");
              return "stay";
            }
            const updatedTodos = await listTodos(todosDir);
            selector?.setTodos(updatedTodos);
            ctx.ui.notify(`Deleted todo ${formatTodoId(record.id)}`, "info");
            return "stay";
          }

          const nextStatus = action === "close" ? "closed" : "open";
          const result = await updateTodoStatus(todosDir, record.id, nextStatus, ctx);
          if ("error" in result) {
            ctx.ui.notify(result.error, "error");
            return "stay";
          }

          const updatedTodos = await listTodos(todosDir);
          selector?.setTodos(updatedTodos);
          ctx.ui.notify(`${action === "close" ? "Closed" : "Reopened"} todo ${formatTodoId(record.id)}`, "info");
          return "stay";
        };

        const handleActionSelection = async (record: TodoRecord, action: TodoMenuAction) => {
          if (action === "view") {
            const overlayAction = await openTodoOverlay(record);
            if (overlayAction === "work") {
              await applyTodoAction(record, "work");
              return;
            }
            if (actionMenu) {
              setActiveComponent(actionMenu);
            }
            return;
          }

          if (action === "delete") {
            const message = `Delete todo ${formatTodoId(record.id)}? This cannot be undone.`;
            deleteConfirm = new TodoDeleteConfirmComponent(theme, message, (confirmed) => {
              if (!confirmed) {
                setActiveComponent(actionMenu);
                return;
              }
              void (async () => {
                await applyTodoAction(record, "delete");
                setActiveComponent(selector);
              })();
            });
            setActiveComponent(deleteConfirm);
            return;
          }

          const result = await applyTodoAction(record, action);
          if (result === "stay") {
            setActiveComponent(selector);
          }
        };

        const showActionMenu = async (todo: TodoFrontMatter | TodoRecord) => {
          const record = "body" in todo ? todo : await resolveTodoRecord(todo);
          if (!record) return;
          actionMenu = new TodoActionMenuComponent(
            theme,
            record,
            (action) => {
              void handleActionSelection(record, action);
            },
            () => {
              setActiveComponent(selector);
            },
          );
          setActiveComponent(actionMenu);
        };

        const handleSelect = async (todo: TodoFrontMatter) => {
          await showActionMenu(todo);
        };

        selector = new TodoSelectorComponent(
          tui,
          theme,
          todos,
          (todo) => {
            void handleSelect(todo);
          },
          () => done(),
          searchTerm || undefined,
          currentSessionId,
          (todo, action) => {
            const title = todo.title || "(untitled)";
            if (action === "work") {
              const branchResult = ensureFeatureBranch(title, ctx.cwd);
              if (branchResult?.created) {
                ctx.ui.notify(`Created branch ${branchResult.branch}`, "info");
              }
            }
            nextPrompt =
              action === "refine"
                ? buildRefinePrompt(todo.id, title)
                : `work on todo ${formatTodoId(todo.id)} "${title}"\nUsing skills as needed. Codex wil review your code.`;
            done();
          },
          (showClosed) => {
            ctx.ui.notify(showClosed ? "Showing closed/done todos" : "Hiding closed/done todos", "info");
          },
        );

        setActiveComponent(selector);

        const rootComponent = {
          get focused() {
            return wrapperFocused;
          },
          set focused(value: boolean) {
            wrapperFocused = value;
            if (activeComponent && "focused" in activeComponent) {
              activeComponent.focused = value;
            }
          },
          render(width: number) {
            return activeComponent ? activeComponent.render(width) : [];
          },
          invalidate() {
            activeComponent?.invalidate();
          },
          handleInput(data: string) {
            activeComponent?.handleInput?.(data);
          },
        };

        return rootComponent;
      });

      if (nextPrompt) {
        ctx.ui.setEditorText(nextPrompt);
        rootTui?.requestRender();
      }
    },
  });
}
