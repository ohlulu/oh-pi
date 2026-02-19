/**
 * File I/O, parsing, serialization, locking, GC, and CRUD operations
 * for todo files.
 */
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import crypto from "node:crypto";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import {
    type TodoFrontMatter,
    type TodoRecord,
    type LockInfo,
    type TodoSettings,
    type TodoErrorPayload,
    TODO_DIR_NAME,
    TODO_PATH_ENV,
    TODO_SETTINGS_NAME,
    LOCK_TTL_MS,
    DEFAULT_TODO_SETTINGS,
    normalizeDependencyId,
    dedupeStrings,
    formatTodoId,
    normalizeTodoId,
    validateTodoId,
    displayTodoId,
    getDependencyIds,
    buildTodoMap,
    getBlockedBy,
    withRuntimeDependencyStateForRecord,
    isTodoClosed,
    clearAssignmentIfClosed,
    sortTodos,
    todoError,
    getTodoStatus,
    findDependents,
} from "./models.js";

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

export function getTodosDir(cwd: string): string {
    const overridePath = process.env[TODO_PATH_ENV];
    if (overridePath && overridePath.trim()) {
        return path.resolve(cwd, overridePath.trim());
    }
    return path.resolve(cwd, TODO_DIR_NAME);
}

export function getTodosDirLabel(cwd: string): string {
    const overridePath = process.env[TODO_PATH_ENV];
    if (overridePath && overridePath.trim()) {
        return path.resolve(cwd, overridePath.trim());
    }
    return TODO_DIR_NAME;
}

export function getTodoPath(todosDir: string, id: string): string {
    return path.join(todosDir, `${id}.md`);
}

export function getLockPath(todosDir: string, id: string): string {
    return path.join(todosDir, `${id}.lock`);
}

export function getTodoSettingsPath(todosDir: string): string {
    return path.join(todosDir, TODO_SETTINGS_NAME);
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function normalizeTodoSettings(raw: Partial<TodoSettings>): TodoSettings {
    const gc = raw.gc ?? DEFAULT_TODO_SETTINGS.gc;
    const gcDays = Number.isFinite(raw.gcDays) ? raw.gcDays : DEFAULT_TODO_SETTINGS.gcDays;
    return {
        gc: Boolean(gc),
        gcDays: Math.max(0, Math.floor(gcDays)),
    };
}

export async function readTodoSettings(todosDir: string): Promise<TodoSettings> {
    const settingsPath = getTodoSettingsPath(todosDir);
    let data: Partial<TodoSettings> = {};

    try {
        const raw = await fs.readFile(settingsPath, "utf8");
        data = JSON.parse(raw) as Partial<TodoSettings>;
    } catch {
        data = {};
    }

    return normalizeTodoSettings(data);
}

// ---------------------------------------------------------------------------
// Garbage collection
// ---------------------------------------------------------------------------

export async function garbageCollectTodos(todosDir: string, settings: TodoSettings): Promise<void> {
    if (!settings.gc) return;

    let entries: string[] = [];
    try {
        entries = await fs.readdir(todosDir);
    } catch {
        return;
    }

    const cutoff = Date.now() - settings.gcDays * 24 * 60 * 60 * 1000;
    await Promise.all(
        entries
            .filter((entry) => entry.endsWith(".md"))
            .map(async (entry) => {
                const id = entry.slice(0, -3);
                const filePath = path.join(todosDir, entry);
                try {
                    const content = await fs.readFile(filePath, "utf8");
                    const { frontMatter } = splitFrontMatter(content);
                    const parsed = parseFrontMatter(frontMatter, id);
                    if (!isTodoClosed(parsed.status)) return;
                    const createdAt = Date.parse(parsed.created_at);
                    if (!Number.isFinite(createdAt)) return;
                    if (createdAt < cutoff) {
                        await fs.unlink(filePath);
                    }
                } catch {
                    // ignore unreadable todo
                }
            }),
    );
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export function findJsonObjectEnd(content: string): number {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < content.length; i += 1) {
        const char = content[i];

        if (inString) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === "\\") {
                escaped = true;
                continue;
            }
            if (char === "\"") {
                inString = false;
            }
            continue;
        }

        if (char === "\"") {
            inString = true;
            continue;
        }

        if (char === "{") {
            depth += 1;
            continue;
        }

        if (char === "}") {
            depth -= 1;
            if (depth === 0) return i;
        }
    }

    return -1;
}

export function splitFrontMatter(content: string): { frontMatter: string; body: string } {
    if (!content.startsWith("{")) {
        return { frontMatter: "", body: content };
    }

    const endIndex = findJsonObjectEnd(content);
    if (endIndex === -1) {
        return { frontMatter: "", body: content };
    }

    const frontMatter = content.slice(0, endIndex + 1);
    const body = content.slice(endIndex + 1).replace(/^\r?\n+/, "");
    return { frontMatter, body };
}

export function parseFrontMatter(text: string, idFallback: string): TodoFrontMatter {
    const data: TodoFrontMatter = {
        id: idFallback,
        title: "",
        tags: [],
        status: "open",
        created_at: "",
        assigned_to_session: undefined,
        depends_on: [],
    };

    const trimmed = text.trim();
    if (!trimmed) return data;

    try {
        const parsed = JSON.parse(trimmed) as Partial<TodoFrontMatter> | null;
        if (!parsed || typeof parsed !== "object") return data;
        if (typeof parsed.id === "string" && parsed.id) data.id = parsed.id;
        if (typeof parsed.title === "string") data.title = parsed.title;
        if (typeof parsed.status === "string" && parsed.status) data.status = parsed.status;
        if (typeof parsed.created_at === "string") data.created_at = parsed.created_at;
        if (typeof parsed.assigned_to_session === "string" && parsed.assigned_to_session.trim()) {
            data.assigned_to_session = parsed.assigned_to_session;
        }
        if (Array.isArray(parsed.tags)) {
            data.tags = parsed.tags.filter((tag): tag is string => typeof tag === "string");
        }
        if (Array.isArray(parsed.depends_on)) {
            data.depends_on = dedupeStrings(
                parsed.depends_on
                    .filter((dependencyId): dependencyId is string => typeof dependencyId === "string")
                    .map((dependencyId) => normalizeDependencyId(dependencyId))
                    .filter((result): result is { id: string } => "id" in result)
                    .map((result) => result.id),
            );
        }
    } catch {
        return data;
    }

    return data;
}

export function parseTodoContent(content: string, idFallback: string): TodoRecord {
    const { frontMatter, body } = splitFrontMatter(content);
    const parsed = parseFrontMatter(frontMatter, idFallback);
    return {
        id: idFallback,
        title: parsed.title,
        tags: parsed.tags ?? [],
        status: parsed.status,
        created_at: parsed.created_at,
        assigned_to_session: parsed.assigned_to_session,
        depends_on: parsed.depends_on ?? [],
        body: body ?? "",
    };
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/**
 * Normalize body text by converting literal escape sequences (`\n`, `\t`)
 * into real characters. LLMs sometimes send `\\n` in JSON tool-call params,
 * which results in literal backslash-n stored on disk.
 */
function normalizeBodyText(text: string): string {
    return text.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

export function serializeTodo(todo: TodoRecord): string {
    const frontMatter = JSON.stringify(
        {
            id: todo.id,
            title: todo.title,
            tags: todo.tags ?? [],
            status: todo.status,
            created_at: todo.created_at,
            assigned_to_session: todo.assigned_to_session || undefined,
            depends_on: getDependencyIds(todo),
        },
        null,
        2,
    );

    const body = normalizeBodyText(todo.body ?? "");
    const trimmedBody = body.replace(/^\n+/, "").replace(/\s+$/, "");
    if (!trimmedBody) return `${frontMatter}\n`;
    return `${frontMatter}\n\n${trimmedBody}\n`;
}

// ---------------------------------------------------------------------------
// File operations
// ---------------------------------------------------------------------------

export async function ensureTodosDir(todosDir: string) {
    await fs.mkdir(todosDir, { recursive: true });
}

export async function readTodoFile(filePath: string, idFallback: string): Promise<TodoRecord> {
    const content = await fs.readFile(filePath, "utf8");
    return parseTodoContent(content, idFallback);
}

export async function writeTodoFile(filePath: string, todo: TodoRecord) {
    await fs.writeFile(filePath, serializeTodo(todo), "utf8");
}

export async function generateTodoId(todosDir: string): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const id = crypto.randomBytes(4).toString("hex");
        const todoPath = getTodoPath(todosDir, id);
        if (!existsSync(todoPath)) return id;
    }
    throw new Error("Failed to generate unique todo id");
}

export async function ensureTodoExists(filePath: string, id: string): Promise<TodoRecord | null> {
    if (!existsSync(filePath)) return null;
    return readTodoFile(filePath, id);
}

export async function appendTodoBody(filePath: string, todo: TodoRecord, text: string): Promise<TodoRecord> {
    const spacer = todo.body.trim().length ? "\n\n" : "";
    todo.body = `${todo.body.replace(/\s+$/, "")}${spacer}${text.trim()}\n`;
    await writeTodoFile(filePath, todo);
    return todo;
}

// ---------------------------------------------------------------------------
// Locking
// ---------------------------------------------------------------------------

export async function readLockInfo(lockPath: string): Promise<LockInfo | null> {
    try {
        const raw = await fs.readFile(lockPath, "utf8");
        return JSON.parse(raw) as LockInfo;
    } catch {
        return null;
    }
}

export async function acquireLock(
    todosDir: string,
    id: string,
    ctx: ExtensionContext,
): Promise<(() => Promise<void>) | { error: string }> {
    const lockPath = getLockPath(todosDir, id);
    const now = Date.now();
    const session = ctx.sessionManager.getSessionFile();

    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            const handle = await fs.open(lockPath, "wx");
            const info: LockInfo = {
                id,
                pid: process.pid,
                session,
                created_at: new Date(now).toISOString(),
            };
            await handle.writeFile(JSON.stringify(info, null, 2), "utf8");
            await handle.close();
            return async () => {
                try {
                    await fs.unlink(lockPath);
                } catch {
                    // ignore
                }
            };
        } catch (error: any) {
            if (error?.code !== "EEXIST") {
                return { error: `Failed to acquire lock: ${error?.message ?? "unknown error"}` };
            }
            const stats = await fs.stat(lockPath).catch(() => null);
            const lockAge = stats ? now - stats.mtimeMs : LOCK_TTL_MS + 1;
            if (lockAge <= LOCK_TTL_MS) {
                const info = await readLockInfo(lockPath);
                const owner = info?.session ? ` (session ${info.session})` : "";
                return { error: `Todo ${displayTodoId(id)} is locked${owner}. Try again later.` };
            }
            if (!ctx.hasUI) {
                return { error: `Todo ${displayTodoId(id)} lock is stale; rerun in interactive mode to steal it.` };
            }
            const ok = await ctx.ui.confirm(
                "Todo locked",
                `Todo ${displayTodoId(id)} appears locked. Steal the lock?`,
            );
            if (!ok) {
                return { error: `Todo ${displayTodoId(id)} remains locked.` };
            }
            await fs.unlink(lockPath).catch(() => undefined);
        }
    }

    return { error: `Failed to acquire lock for todo ${displayTodoId(id)}.` };
}

export async function withTodoLock<T>(
    todosDir: string,
    id: string,
    ctx: ExtensionContext,
    fn: () => Promise<T>,
): Promise<T | TodoErrorPayload> {
    const lock = await acquireLock(todosDir, id, ctx);
    if (typeof lock === "object" && "error" in lock) {
        return todoError("TODO_LOCKED", lock.error, { id: normalizeTodoId(id) });
    }
    try {
        return await fn();
    } finally {
        await lock();
    }
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export async function listTodos(todosDir: string): Promise<TodoFrontMatter[]> {
    let entries: string[] = [];
    try {
        entries = await fs.readdir(todosDir);
    } catch {
        return [];
    }

    const todos: TodoFrontMatter[] = [];
    for (const entry of entries) {
        if (!entry.endsWith(".md")) continue;
        const id = entry.slice(0, -3);
        const filePath = path.join(todosDir, entry);
        try {
            const content = await fs.readFile(filePath, "utf8");
            const { frontMatter } = splitFrontMatter(content);
            const parsed = parseFrontMatter(frontMatter, id);
            todos.push({
                id,
                title: parsed.title,
                tags: parsed.tags ?? [],
                status: parsed.status,
                created_at: parsed.created_at,
                assigned_to_session: parsed.assigned_to_session,
                depends_on: parsed.depends_on ?? [],
            });
        } catch {
            // ignore unreadable todo
        }
    }

    return sortTodos(todos);
}

export function listTodosSync(todosDir: string): TodoFrontMatter[] {
    let entries: string[] = [];
    try {
        entries = readdirSync(todosDir);
    } catch {
        return [];
    }

    const todos: TodoFrontMatter[] = [];
    for (const entry of entries) {
        if (!entry.endsWith(".md")) continue;
        const id = entry.slice(0, -3);
        const filePath = path.join(todosDir, entry);
        try {
            const content = readFileSync(filePath, "utf8");
            const { frontMatter } = splitFrontMatter(content);
            const parsed = parseFrontMatter(frontMatter, id);
            todos.push({
                id,
                title: parsed.title,
                tags: parsed.tags ?? [],
                status: parsed.status,
                created_at: parsed.created_at,
                assigned_to_session: parsed.assigned_to_session,
                depends_on: parsed.depends_on ?? [],
            });
        } catch {
            // ignore
        }
    }

    return sortTodos(todos);
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

export async function updateTodoStatus(
    todosDir: string,
    id: string,
    status: string,
    ctx: ExtensionContext,
): Promise<TodoRecord | TodoErrorPayload> {
    const validated = validateTodoId(id);
    if ("error" in validated) {
        return todoError("ID_REQUIRED", validated.error, { id });
    }
    const normalizedId = validated.id;
    const filePath = getTodoPath(todosDir, normalizedId);
    if (!existsSync(filePath)) {
        return todoError("TODO_NOT_FOUND", `Todo ${displayTodoId(id)} not found`, { id: normalizedId });
    }

    const result = await withTodoLock(todosDir, normalizedId, ctx, async () => {
        const existing = await ensureTodoExists(filePath, normalizedId);
        if (!existing) {
            return todoError("TODO_NOT_FOUND", `Todo ${displayTodoId(id)} not found`, { id: normalizedId });
        }
        existing.status = status;
        clearAssignmentIfClosed(existing);
        await writeTodoFile(filePath, existing);
        const todoMap = buildTodoMap(await listTodos(todosDir));
        return withRuntimeDependencyStateForRecord(existing, todoMap);
    });

    if (typeof result === "object" && "error" in result) {
        return result;
    }

    return result;
}

export async function claimTodoAssignment(
    todosDir: string,
    id: string,
    ctx: ExtensionContext,
    force = false,
): Promise<TodoRecord | TodoErrorPayload> {
    const validated = validateTodoId(id);
    if ("error" in validated) {
        return todoError("ID_REQUIRED", validated.error, { id });
    }
    const normalizedId = validated.id;
    const filePath = getTodoPath(todosDir, normalizedId);
    if (!existsSync(filePath)) {
        return todoError("TODO_NOT_FOUND", `Todo ${displayTodoId(id)} not found`, { id: normalizedId });
    }

    const sessionId = ctx.sessionManager.getSessionId();
    const result = await withTodoLock(todosDir, normalizedId, ctx, async () => {
        const existing = await ensureTodoExists(filePath, normalizedId);
        if (!existing) {
            return todoError("TODO_NOT_FOUND", `Todo ${displayTodoId(id)} not found`, { id: normalizedId });
        }
        if (isTodoClosed(existing.status)) {
            return todoError("DEPENDENCY_BLOCKED", `Todo ${displayTodoId(id)} is closed`, { id: normalizedId });
        }

        const allTodos = await listTodos(todosDir);
        const todoMap = buildTodoMap(allTodos);
        const blockedBy = getBlockedBy(existing, todoMap);
        if (blockedBy.length && !force) {
            return todoError(
                "DEPENDENCY_BLOCKED",
                `Todo ${displayTodoId(id)} is blocked by dependencies: ${blockedBy
                    .map((dependencyId) => formatTodoId(dependencyId))
                    .join(", ")}. Use force=true to claim anyway.`,
                { id: normalizedId, blockedBy },
            );
        }

        const assigned = existing.assigned_to_session;
        if (assigned && assigned !== sessionId && !force) {
            return todoError(
                "DEPENDENCY_BLOCKED",
                `Todo ${displayTodoId(id)} is already assigned to session ${assigned}. Use force=true to override.`,
                { id: normalizedId, assignedToSession: assigned },
            );
        }

        if (assigned !== sessionId) {
            existing.assigned_to_session = sessionId;
            await writeTodoFile(filePath, existing);
        }

        return withRuntimeDependencyStateForRecord(existing, todoMap);
    });

    if (typeof result === "object" && "error" in result) {
        return result;
    }

    return result;
}

export async function releaseTodoAssignment(
    todosDir: string,
    id: string,
    ctx: ExtensionContext,
    force = false,
): Promise<TodoRecord | TodoErrorPayload> {
    const validated = validateTodoId(id);
    if ("error" in validated) {
        return todoError("ID_REQUIRED", validated.error, { id });
    }
    const normalizedId = validated.id;
    const filePath = getTodoPath(todosDir, normalizedId);
    if (!existsSync(filePath)) {
        return todoError("TODO_NOT_FOUND", `Todo ${displayTodoId(id)} not found`, { id: normalizedId });
    }

    const sessionId = ctx.sessionManager.getSessionId();
    const result = await withTodoLock(todosDir, normalizedId, ctx, async () => {
        const existing = await ensureTodoExists(filePath, normalizedId);
        if (!existing) {
            return todoError("TODO_NOT_FOUND", `Todo ${displayTodoId(id)} not found`, { id: normalizedId });
        }

        const assigned = existing.assigned_to_session;
        if (assigned && assigned !== sessionId && !force) {
            return todoError(
                "DEPENDENCY_BLOCKED",
                `Todo ${displayTodoId(id)} is assigned to session ${assigned}. Use force=true to release.`,
                { id: normalizedId, assignedToSession: assigned },
            );
        }

        if (assigned) {
            existing.assigned_to_session = undefined;
            await writeTodoFile(filePath, existing);
        }

        const todoMap = buildTodoMap(await listTodos(todosDir));
        return withRuntimeDependencyStateForRecord(existing, todoMap);
    });

    if (typeof result === "object" && "error" in result) {
        return result;
    }

    return result;
}

export async function deleteTodo(
    todosDir: string,
    id: string,
    ctx: ExtensionContext,
): Promise<TodoRecord | TodoErrorPayload> {
    const validated = validateTodoId(id);
    if ("error" in validated) {
        return todoError("ID_REQUIRED", validated.error, { id });
    }
    const normalizedId = validated.id;
    const filePath = getTodoPath(todosDir, normalizedId);
    if (!existsSync(filePath)) {
        return todoError("TODO_NOT_FOUND", `Todo ${displayTodoId(id)} not found`, { id: normalizedId });
    }

    const result = await withTodoLock(todosDir, normalizedId, ctx, async () => {
        const existing = await ensureTodoExists(filePath, normalizedId);
        if (!existing) {
            return todoError("TODO_NOT_FOUND", `Todo ${displayTodoId(id)} not found`, { id: normalizedId });
        }

        const allTodos = await listTodos(todosDir);
        const dependents = findDependents(allTodos, normalizedId);
        if (dependents.length) {
            return todoError(
                "DEPENDENTS_EXIST_DELETE_BLOCKED",
                `Cannot delete ${formatTodoId(normalizedId)}; depended on by: ${dependents
                    .map((dependentId) => formatTodoId(dependentId))
                    .join(", ")}.`,
                { id: normalizedId, dependents },
            );
        }

        await fs.unlink(filePath);
        return existing;
    });

    if (typeof result === "object" && "error" in result) {
        return result;
    }

    return result;
}
