/**
 * Todo data types, constants, ID helpers, dependency graph logic,
 * search/filter, and tree building.
 */
import { StringEnum } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";
import { fuzzyMatch } from "@mariozechner/pi-tui";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TODO_DIR_NAME = ".pi/todos";
export const TODO_PATH_ENV = "PI_TODO_PATH";
export const TODO_SETTINGS_NAME = "settings.json";
export const TODO_ID_PREFIX = "TODO-";
export const TODO_ID_PATTERN = /^[a-f0-9]{8}$/i;
export const DEFAULT_TODO_SETTINGS = {
    gc: true,
    gcDays: 7,
};
export const LOCK_TTL_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TodoFrontMatter {
    id: string;
    title: string;
    tags: string[];
    status: string;
    created_at: string;
    assigned_to_session?: string;
    depends_on: string[];
    blocked_by?: string[];
    ready?: boolean;
}

export interface TodoRecord extends TodoFrontMatter {
    body: string;
}

export interface LockInfo {
    id: string;
    pid: number;
    session?: string | null;
    created_at: string;
}

export interface TodoSettings {
    gc: boolean;
    gcDays: number;
}

export type TodoErrorCode =
    | "INVALID_DEPENDENCY_ID"
    | "DEPENDENCY_NOT_FOUND"
    | "DEPENDENCY_SELF_REFERENCE"
    | "DEPENDENCY_CYCLE"
    | "DEPENDENCY_BLOCKED"
    | "DEPENDENTS_EXIST_DELETE_BLOCKED"
    | "TODO_NOT_FOUND"
    | "ID_REQUIRED"
    | "INVALID_INPUT"
    | "TODO_LOCKED";

export interface TodoErrorPayload {
    error: string;
    errorCode: TodoErrorCode;
    errorMeta?: Record<string, unknown>;
}

export type TodoAction =
    | "list"
    | "list-all"
    | "get"
    | "create"
    | "update"
    | "append"
    | "delete"
    | "claim"
    | "release";

export type TodoOverlayAction = "back" | "work";

export type TodoMenuAction =
    | "work"
    | "refine"
    | "close"
    | "reopen"
    | "release"
    | "delete"
    | "copyPath"
    | "copyText"
    | "view";

export interface TodoDetailMeta {
    error?: string;
    errorCode?: TodoErrorCode;
    errorMeta?: Record<string, unknown>;
    warning?: string;
    warningCode?: TodoErrorCode;
    warningMeta?: Record<string, unknown>;
}

export type TodoToolDetails =
    | ({ action: "list" | "list-all"; todos: TodoFrontMatter[]; currentSessionId?: string } & TodoDetailMeta)
    | ({
            action: "get" | "create" | "update" | "append" | "delete" | "claim" | "release";
            todo: TodoRecord;
        } & TodoDetailMeta);

export interface TodoTreeLine {
    todo: TodoFrontMatter;
    depth: number;
}

// ---------------------------------------------------------------------------
// TodoParams schema
// ---------------------------------------------------------------------------

export const TodoParams = Type.Object({
    action: StringEnum([
        "list",
        "list-all",
        "get",
        "create",
        "update",
        "append",
        "delete",
        "claim",
        "release",
    ] as const),
    id: Type.Optional(
        Type.String({ description: "Todo id (TODO-<hex> or raw hex filename)" }),
    ),
    title: Type.Optional(Type.String({ description: "Short summary shown in lists" })),
    status: Type.Optional(Type.String({ description: "Todo status" })),
    tags: Type.Optional(Type.Array(Type.String({ description: "Todo tag" }))),
    body: Type.Optional(
        Type.String({ description: "Long-form details (markdown). Update replaces; append adds." }),
    ),
    depends_on: Type.Optional(
        Type.Array(Type.String({ description: "Dependency todo id (TODO-<hex> or raw hex id)" })),
    ),
    force: Type.Optional(Type.Boolean({ description: "Override another session's assignment" })),
});

// ---------------------------------------------------------------------------
// ID helpers
// ---------------------------------------------------------------------------

export function formatTodoId(id: string): string {
    return `${TODO_ID_PREFIX}${id}`;
}

export function normalizeTodoId(id: string): string {
    let trimmed = id.trim();
    if (trimmed.startsWith("#")) {
        trimmed = trimmed.slice(1);
    }
    if (trimmed.toUpperCase().startsWith(TODO_ID_PREFIX)) {
        trimmed = trimmed.slice(TODO_ID_PREFIX.length);
    }
    return trimmed;
}

export function validateTodoId(id: string): { id: string } | { error: string } {
    const normalized = normalizeTodoId(id);
    if (!normalized || !TODO_ID_PATTERN.test(normalized)) {
        return { error: "Invalid todo id. Expected TODO-<hex>." };
    }
    return { id: normalized.toLowerCase() };
}

export function todoError(errorCode: TodoErrorCode, error: string, errorMeta?: Record<string, unknown>): TodoErrorPayload {
    return { errorCode, error, errorMeta };
}

export function normalizeDependencyId(rawId: string): { id: string } | TodoErrorPayload {
    const trimmed = rawId.trim();
    if (!trimmed) {
        return todoError(
            "INVALID_DEPENDENCY_ID",
            "Dependency id is empty. Expected an id like 85be7d22 or TODO-85be7d22.",
            { dependencyId: rawId },
        );
    }

    let candidate = trimmed;
    if (candidate.toUpperCase().startsWith(TODO_ID_PREFIX)) {
        candidate = candidate.slice(TODO_ID_PREFIX.length);
    }

    if (!TODO_ID_PATTERN.test(candidate)) {
        return todoError(
            "INVALID_DEPENDENCY_ID",
            `Dependency id invalid: "${rawId}". Expected 8-char hex id (e.g. "85be7d22").`,
            { dependencyId: rawId },
        );
    }

    return { id: candidate.toLowerCase() };
}

export function dedupeStrings(values: string[]): string[] {
    return [...new Set(values)];
}

export function displayTodoId(id: string): string {
    return formatTodoId(normalizeTodoId(id));
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

export function isTodoClosed(status: string): boolean {
    return ["closed", "done"].includes(status.toLowerCase());
}

export function getTodoTitle(todo: TodoFrontMatter): string {
    return todo.title || "(untitled)";
}

export function getTodoStatus(todo: TodoFrontMatter): string {
    return todo.status || "open";
}

export function getTodoMarker(todo: TodoFrontMatter): { symbol: string; color: "success" | "warning" | "dim" } {
    if (isTodoClosed(getTodoStatus(todo))) {
        return { symbol: "✓", color: "dim" };
    }
    if (todo.ready === false) {
        return { symbol: "◌", color: "warning" };
    }
    return { symbol: "◉", color: "success" };
}

export function clearAssignmentIfClosed(todo: TodoFrontMatter): void {
    if (isTodoClosed(getTodoStatus(todo))) {
        todo.assigned_to_session = undefined;
    }
}

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

export function sortTodos(todos: TodoFrontMatter[]): TodoFrontMatter[] {
    return [...todos].sort((a, b) => {
        const aClosed = isTodoClosed(a.status);
        const bClosed = isTodoClosed(b.status);
        if (aClosed !== bClosed) return aClosed ? 1 : -1;
        const aAssigned = !aClosed && Boolean(a.assigned_to_session);
        const bAssigned = !bClosed && Boolean(b.assigned_to_session);
        if (aAssigned !== bAssigned) return aAssigned ? -1 : 1;
        return (a.created_at || "").localeCompare(b.created_at || "");
    });
}

// ---------------------------------------------------------------------------
// Dependency graph
// ---------------------------------------------------------------------------

export function getDependencyIds(todo: Pick<TodoFrontMatter, "depends_on">): string[] {
    return dedupeStrings(
        (todo.depends_on ?? [])
            .map((dependencyId) => normalizeDependencyId(dependencyId))
            .filter((result): result is { id: string } => "id" in result)
            .map((result) => result.id),
    );
}

export function buildTodoMap(todos: TodoFrontMatter[]): Map<string, TodoFrontMatter> {
    return new Map(todos.map((todo) => [todo.id, todo]));
}

export function getBlockedBy(todo: Pick<TodoFrontMatter, "depends_on" | "status">, todoMap: Map<string, TodoFrontMatter>): string[] {
    const blockedBy: string[] = [];
    for (const dependencyId of getDependencyIds(todo)) {
        const dependencyTodo = todoMap.get(dependencyId);
        if (!dependencyTodo || !isTodoClosed(getTodoStatus(dependencyTodo))) {
            blockedBy.push(dependencyId);
        }
    }
    return blockedBy;
}

export function withRuntimeDependencyState(todo: TodoFrontMatter, todoMap: Map<string, TodoFrontMatter>): TodoFrontMatter {
    const blockedBy = getBlockedBy(todo, todoMap);
    return {
        ...todo,
        depends_on: getDependencyIds(todo),
        blocked_by: blockedBy,
        ready: !isTodoClosed(getTodoStatus(todo)) && blockedBy.length === 0,
    };
}

export function withRuntimeDependencyStateForRecord(
    todo: TodoRecord,
    todoMap: Map<string, TodoFrontMatter>,
): TodoRecord {
    const blockedBy = getBlockedBy(todo, todoMap);
    return {
        ...todo,
        depends_on: getDependencyIds(todo),
        blocked_by: blockedBy,
        ready: !isTodoClosed(getTodoStatus(todo)) && blockedBy.length === 0,
    };
}

export function enrichTodosWithDependencyState(todos: TodoFrontMatter[]): TodoFrontMatter[] {
    const todoMap = buildTodoMap(todos);
    return todos.map((todo) => withRuntimeDependencyState(todo, todoMap));
}

export function findDependents(todos: TodoFrontMatter[], targetId: string): string[] {
    return dedupeStrings(
        todos
            .filter((todo) => todo.id !== targetId && getDependencyIds(todo).includes(targetId))
            .map((todo) => todo.id),
    );
}

export function hasDependencyPath(
    startId: string,
    targetId: string,
    edges: Map<string, string[]>,
    visited = new Set<string>(),
): boolean {
    if (startId === targetId) return true;
    if (visited.has(startId)) return false;
    visited.add(startId);

    const dependencies = edges.get(startId) ?? [];
    for (const dependencyId of dependencies) {
        if (hasDependencyPath(dependencyId, targetId, edges, visited)) {
            return true;
        }
    }

    return false;
}

export function validateDependsOn(
    todoId: string,
    rawDependsOn: string[] | undefined,
    allTodos: TodoFrontMatter[],
): { dependsOn: string[] } | TodoErrorPayload {
    const candidateDependsOn = rawDependsOn ?? [];
    const normalizedDependsOn: string[] = [];

    for (const rawDependencyId of candidateDependsOn) {
        const normalizedDependency = normalizeDependencyId(rawDependencyId);
        if ("error" in normalizedDependency) {
            return normalizedDependency;
        }

        if (normalizedDependency.id === todoId) {
            return todoError(
                "DEPENDENCY_SELF_REFERENCE",
                `Todo ${formatTodoId(todoId)} cannot depend on itself.`,
                { id: todoId },
            );
        }

        normalizedDependsOn.push(normalizedDependency.id);
    }

    const dependsOn = dedupeStrings(normalizedDependsOn);
    const knownIds = new Set(allTodos.map((todo) => todo.id));
    for (const dependencyId of dependsOn) {
        if (!knownIds.has(dependencyId)) {
            return todoError(
                "DEPENDENCY_NOT_FOUND",
                `Dependency ${formatTodoId(dependencyId)} not found.`,
                { id: todoId, dependencyId },
            );
        }
    }

    const edges = new Map<string, string[]>();
    for (const todo of allTodos) {
        edges.set(todo.id, getDependencyIds(todo));
    }
    edges.set(todoId, dependsOn);

    for (const dependencyId of dependsOn) {
        if (hasDependencyPath(dependencyId, todoId, edges)) {
            return todoError(
                "DEPENDENCY_CYCLE",
                `Dependency cycle detected: ${formatTodoId(todoId)} ↔ ${formatTodoId(dependencyId)}.`,
                { id: todoId, dependencyId },
            );
        }
    }

    return { dependsOn };
}

// ---------------------------------------------------------------------------
// Search / filter
// ---------------------------------------------------------------------------

export function buildTodoSearchText(todo: TodoFrontMatter): string {
    const tags = todo.tags.join(" ");
    const assignment = todo.assigned_to_session ? `assigned:${todo.assigned_to_session}` : "";
    const dependencies = getDependencyIds(todo).join(" ");
    return `${formatTodoId(todo.id)} ${todo.id} ${todo.title} ${tags} ${todo.status} ${assignment} ${dependencies}`.trim();
}

export function filterTodos(todos: TodoFrontMatter[], query: string): TodoFrontMatter[] {
    const trimmed = query.trim();
    if (!trimmed) return todos;

    const tokens = trimmed
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean);

    if (tokens.length === 0) return todos;

    const matches: Array<{ todo: TodoFrontMatter; score: number }> = [];
    for (const todo of todos) {
        const text = buildTodoSearchText(todo);
        let totalScore = 0;
        let matched = true;
        for (const token of tokens) {
            const result = fuzzyMatch(token, text);
            if (!result.matches) {
                matched = false;
                break;
            }
            totalScore += result.score;
        }
        if (matched) {
            matches.push({ todo, score: totalScore });
        }
    }

    return matches
        .sort((a, b) => {
            const aClosed = isTodoClosed(a.todo.status);
            const bClosed = isTodoClosed(b.todo.status);
            if (aClosed !== bClosed) return aClosed ? 1 : -1;
            const aAssigned = !aClosed && Boolean(a.todo.assigned_to_session);
            const bAssigned = !bClosed && Boolean(b.todo.assigned_to_session);
            if (aAssigned !== bAssigned) return aAssigned ? -1 : 1;
            return a.score - b.score;
        })
        .map((match) => match.todo);
}

export function parseSearchTokens(query: string): string[] {
    return query
        .trim()
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean);
}

export function matchesSearchTokens(todo: TodoFrontMatter, tokens: string[]): boolean {
    if (!tokens.length) return true;
    const text = buildTodoSearchText(todo);
    for (const token of tokens) {
        const result = fuzzyMatch(token, text);
        if (!result.matches) return false;
    }
    return true;
}

// ---------------------------------------------------------------------------
// Tree building
// ---------------------------------------------------------------------------

export function buildTodoTreeLines(todos: TodoFrontMatter[], query: string, includeClosed = false): TodoTreeLine[] {
    const tokens = parseSearchTokens(query);
    const isSearching = tokens.length > 0;

    const allTodoMap = buildTodoMap(todos);
    const visibleTodos = todos
        .filter((todo) => includeClosed || !isTodoClosed(getTodoStatus(todo)))
        .map((todo) => withRuntimeDependencyState(todo, allTodoMap));

    if (!visibleTodos.length) return [];

    const visibleTodoMap = buildTodoMap(visibleTodos);
    const order = new Map(visibleTodos.map((todo, index) => [todo.id, index]));

    const childrenByParent = new Map<string, TodoFrontMatter[]>();
    const roots: TodoFrontMatter[] = [];

    for (const todo of visibleTodos) {
        const selfClosed = isTodoClosed(getTodoStatus(todo));
        const parentIds = getDependencyIds(todo).filter((dependencyId) => {
            const parent = visibleTodoMap.get(dependencyId);
            if (!parent) return false;
            // Open children of closed parents float up to roots
            const parentClosed = isTodoClosed(getTodoStatus(parent));
            return !parentClosed || selfClosed;
        });
        if (!parentIds.length) {
            roots.push(todo);
            continue;
        }

        for (const parentId of parentIds) {
            const children = childrenByParent.get(parentId) ?? [];
            children.push(todo);
            childrenByParent.set(parentId, children);
        }
    }

    for (const children of childrenByParent.values()) {
        children.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }

    roots.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    const lines: TodoTreeLine[] = [];
    const renderedTodoIds = new Set<string>();

    const visit = (todo: TodoFrontMatter, depth: number, path: Set<string>): { include: boolean; lines: TodoTreeLine[] } => {
        if (path.has(todo.id)) {
            return { include: false, lines: [] };
        }

        const nextPath = new Set(path);
        nextPath.add(todo.id);

        const children = childrenByParent.get(todo.id) ?? [];
        const childResults = children.map((child) => visit(child, depth + 1, nextPath));
        const hasMatchingDescendant = childResults.some((childResult) => childResult.include);
        const selfMatches = matchesSearchTokens(todo, tokens);

        if (isSearching && !selfMatches && !hasMatchingDescendant) {
            return { include: false, lines: [] };
        }

        const nodeLines: TodoTreeLine[] = [{ todo, depth }];
        renderedTodoIds.add(todo.id);
        for (const childResult of childResults) {
            if (childResult.include) {
                nodeLines.push(...childResult.lines);
            }
        }

        return { include: true, lines: nodeLines };
    };

    for (const root of roots) {
        const result = visit(root, 0, new Set());
        if (result.include) {
            lines.push(...result.lines);
        }
    }

    // Graceful fallback for malformed graphs without roots (e.g. manual edits creating cycles).
    for (const todo of visibleTodos) {
        if (renderedTodoIds.has(todo.id)) continue;
        const result = visit(todo, 0, new Set());
        if (result.include) {
            lines.push(...result.lines);
        }
    }

    return lines;
}

// ---------------------------------------------------------------------------
// Plain-text formatting (no Theme dependency)
// ---------------------------------------------------------------------------

export function formatAssignmentSuffix(todo: TodoFrontMatter): string {
    return todo.assigned_to_session ? ` (assigned: ${todo.assigned_to_session})` : "";
}

export function formatTodoHeading(todo: TodoFrontMatter): string {
    const tagText = todo.tags.length ? ` [${todo.tags.join(", ")}]` : "";
    return `${todo.id} ${getTodoTitle(todo)}${tagText}${formatAssignmentSuffix(todo)}`;
}

export function splitTodosByAssignment(todos: TodoFrontMatter[]): {
    assignedTodos: TodoFrontMatter[];
    openTodos: TodoFrontMatter[];
    closedTodos: TodoFrontMatter[];
} {
    const assignedTodos: TodoFrontMatter[] = [];
    const openTodos: TodoFrontMatter[] = [];
    const closedTodos: TodoFrontMatter[] = [];
    for (const todo of todos) {
        if (isTodoClosed(getTodoStatus(todo))) {
            closedTodos.push(todo);
            continue;
        }
        if (todo.assigned_to_session) {
            assignedTodos.push(todo);
        } else {
            openTodos.push(todo);
        }
    }
    return { assignedTodos, openTodos, closedTodos };
}

export function formatTodoList(todos: TodoFrontMatter[]): string {
    if (!todos.length) return "No todos.";

    const treeLines = buildTodoTreeLines(todos, "");
    const closedCount = todos.filter((todo) => isTodoClosed(getTodoStatus(todo))).length;
    if (!treeLines.length) {
        return closedCount ? `No open todos. (${closedCount} closed hidden)` : "No open todos.";
    }

    const lines: string[] = ["Dependency tree:"];
    for (const { todo, depth } of treeLines) {
        const treePrefix = depth > 0 ? `${"  ".repeat(Math.max(0, depth - 1))}↳ ` : "";
        const status = todo.ready === false ? "blocked" : "ready";
        lines.push(`  ${treePrefix}${todo.id} ${getTodoTitle(todo)} (${status})`);
    }

    if (closedCount) {
        lines.push("", `${closedCount} closed hidden.`);
    }

    return lines.join("\n");
}

export function serializeTodoForAgent(todo: TodoRecord): string {
    const payload = {
        ...todo,
        id: formatTodoId(todo.id),
        depends_on: getDependencyIds(todo).map((dependencyId) => formatTodoId(dependencyId)),
        blocked_by: (todo.blocked_by ?? []).map((dependencyId) => formatTodoId(dependencyId)),
    };
    return JSON.stringify(payload, null, 2);
}

export function serializeTodoListForAgent(todos: TodoFrontMatter[]): string {
    const { assignedTodos, openTodos, closedTodos } = splitTodosByAssignment(todos);
    const mapTodo = (todo: TodoFrontMatter) => ({
        ...todo,
        id: formatTodoId(todo.id),
        depends_on: getDependencyIds(todo).map((dependencyId) => formatTodoId(dependencyId)),
        blocked_by: (todo.blocked_by ?? []).map((dependencyId) => formatTodoId(dependencyId)),
    });
    return JSON.stringify(
        {
            assigned: assignedTodos.map(mapTodo),
            open: openTodos.map(mapTodo),
            closed: closedTodos.map(mapTodo),
        },
        null,
        2,
    );
}

export function formatErrorWithCode(error: TodoErrorPayload): string {
    return `[${error.errorCode}] ${error.error}`;
}

export function toolErrorDetails(action: Exclude<TodoAction, "list" | "list-all">, error: TodoErrorPayload) {
    return {
        action,
        error: error.error,
        errorCode: error.errorCode,
        errorMeta: error.errorMeta,
    };
}
