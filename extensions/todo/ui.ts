/**
 * TUI components and theme-dependent rendering helpers for the todo extension.
 */
import { DynamicBorder, copyToClipboard, getMarkdownTheme, keyHint, type Theme } from "@mariozechner/pi-coding-agent";
import {
    Container,
    type Focusable,
    Input,
    Key,
    Markdown,
    SelectList,
    Spacer,
    type SelectItem,
    Text,
    type TUI,
    getEditorKeybindings,
    matchesKey,
    truncateToWidth,
    visibleWidth,
} from "@mariozechner/pi-tui";
import {
    type TodoFrontMatter,
    type TodoRecord,
    type TodoOverlayAction,
    type TodoMenuAction,
    type TodoTreeLine,
    formatTodoId,
    getDependencyIds,
    isTodoClosed,
    getTodoStatus,
    getTodoTitle,
    getTodoMarker,
    buildTodoTreeLines,
    buildTodoMap,
    withRuntimeDependencyStateForRecord,
    splitTodosByAssignment,
} from "./models.js";

// ---------------------------------------------------------------------------
// Theme-dependent renderers
// ---------------------------------------------------------------------------

export function renderAssignmentSuffix(
    theme: Theme,
    todo: TodoFrontMatter,
    currentSessionId?: string,
    forceColor?: "dim" | "muted",
): string {
    if (!todo.assigned_to_session) return "";
    const isCurrent = todo.assigned_to_session === currentSessionId;
    const color = forceColor ?? (isCurrent ? "success" : "dim");
    const suffix = isCurrent ? ", current" : "";
    return theme.fg(color, ` (assigned: ${todo.assigned_to_session}${suffix})`);
}

export function renderTodoHeading(theme: Theme, todo: TodoFrontMatter, currentSessionId?: string): string {
    const closed = isTodoClosed(getTodoStatus(todo));
    const idColor = closed ? "dim" : "accent";
    const titleColor = closed ? "dim" : "text";
    const metaColor = closed ? "dim" : "muted";
    const tagText = todo.tags.length ? theme.fg(metaColor, ` [${todo.tags.join(", ")}]`) : "";
    const assignmentText = renderAssignmentSuffix(theme, todo, currentSessionId, closed ? "dim" : undefined);
    return theme.fg(idColor, todo.id) + " " + theme.fg(titleColor, getTodoTitle(todo)) + tagText + assignmentText;
}

export function renderTodoList(
    theme: Theme,
    todos: TodoFrontMatter[],
    expanded: boolean,
    currentSessionId?: string,
): string {
    if (!todos.length) return theme.fg("dim", "No todos");

    const treeLines = buildTodoTreeLines(todos, "");
    const closedCount = todos.filter((todo) => isTodoClosed(getTodoStatus(todo))).length;

    if (!treeLines.length) {
        if (closedCount) {
            return theme.fg("dim", `No open todos (${closedCount} closed hidden)`);
        }
        return theme.fg("dim", "No open todos");
    }

    const maxItems = expanded ? treeLines.length : Math.min(treeLines.length, 12);
    const lines: string[] = [theme.fg("muted", `Dependency tree (${treeLines.length} open)`)];

    for (let i = 0; i < maxItems; i += 1) {
        const lineData = treeLines[i];
        if (!lineData) continue;
        const { todo, depth } = lineData;
        const treePrefix = depth > 0 ? theme.fg("dim", `${"  ".repeat(Math.max(0, depth - 1))}↳ `) : "";
        const marker = getTodoMarker(todo);
        const statusTextColor = isTodoClosed(getTodoStatus(todo)) ? "dim" : "muted";
        const statusIcon = theme.fg(marker.color, marker.symbol);
        const statusText = theme.fg(statusTextColor, `(${getTodoStatus(todo)})`);
        lines.push(`  ${treePrefix}${statusIcon} ${renderTodoHeading(theme, todo, currentSessionId)} ${statusText}`);
    }

    if (!expanded && treeLines.length > maxItems) {
        lines.push(theme.fg("dim", `  ... ${treeLines.length - maxItems} more`));
    }

    if (closedCount) {
        lines.push("", theme.fg("dim", `${closedCount} closed hidden`));
    }

    return lines.join("\n");
}

export function renderTodoDetail(theme: Theme, todo: TodoRecord, expanded: boolean): string {
    const summary = renderTodoHeading(theme, todo);
    if (!expanded) return summary;

    const tags = todo.tags.length ? todo.tags.join(", ") : "none";
    const createdAt = todo.created_at || "unknown";
    const dependencies = getDependencyIds(todo);
    const blockedBy = todo.blocked_by ?? [];
    const bodyText = todo.body?.trim() ? todo.body.trim() : "No details yet.";
    const bodyLines = bodyText.split("\n");

    const lines = [
        summary,
        theme.fg("muted", `Status: ${getTodoStatus(todo)}`),
        theme.fg("muted", `Tags: ${tags}`),
        theme.fg("muted", `Created: ${createdAt}`),
        theme.fg(
            "muted",
            `Depends on: ${dependencies.length ? dependencies.map((id) => formatTodoId(id)).join(", ") : "none"}`,
        ),
        theme.fg(
            "muted",
            `Blocked by: ${blockedBy.length ? blockedBy.map((id) => formatTodoId(id)).join(", ") : "none"}`,
        ),
        "",
        theme.fg("muted", "Body:"),
        ...bodyLines.map((line) => theme.fg("text", `  ${line}`)),
    ];

    return lines.join("\n");
}

export function appendExpandHint(theme: Theme, text: string): string {
    return `${text}\n${theme.fg("dim", `(${keyHint("expandTools", "to expand")})`)}`;
}

// ---------------------------------------------------------------------------
// TodoSelectorComponent
// ---------------------------------------------------------------------------

export class TodoSelectorComponent extends Container implements Focusable {
    private searchInput: Input;
    private listContainer: Container;
    private allTodos: TodoFrontMatter[];
    private treeLines: TodoTreeLine[];
    private selectedIndex = 0;
    private onSelectCallback: (todo: TodoFrontMatter) => void;
    private onCancelCallback: () => void;
    private tui: TUI;
    private theme: Theme;
    private headerText: Text;
    private hintText: Text;
    private currentSessionId?: string;
    private showClosed = false;

    private _focused = false;
    get focused(): boolean {
        return this._focused;
    }
    set focused(value: boolean) {
        this._focused = value;
        this.searchInput.focused = value;
    }

    constructor(
        tui: TUI,
        theme: Theme,
        todos: TodoFrontMatter[],
        onSelect: (todo: TodoFrontMatter) => void,
        onCancel: () => void,
        initialSearchInput?: string,
        currentSessionId?: string,
        private onQuickAction?: (todo: TodoFrontMatter, action: "work" | "refine") => void,
        private onToggleShowClosed?: (showClosed: boolean) => void,
    ) {
        super();
        this.tui = tui;
        this.theme = theme;
        this.currentSessionId = currentSessionId;
        this.allTodos = todos;
        this.treeLines = [];
        this.onSelectCallback = onSelect;
        this.onCancelCallback = onCancel;

        this.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
        this.addChild(new Spacer(1));

        this.headerText = new Text("", 1, 0);
        this.addChild(this.headerText);
        this.addChild(new Spacer(1));

        this.searchInput = new Input();
        if (initialSearchInput) {
            this.searchInput.setValue(initialSearchInput);
        }
        this.searchInput.onSubmit = () => {
            const selected = this.treeLines[this.selectedIndex]?.todo;
            if (selected) this.onSelectCallback(selected);
        };
        this.addChild(this.searchInput);

        this.addChild(new Spacer(1));
        this.listContainer = new Container();
        this.addChild(this.listContainer);

        this.addChild(new Spacer(1));
        this.hintText = new Text("", 1, 0);
        this.addChild(this.hintText);
        this.addChild(new Spacer(1));
        this.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

        this.updateHeader();
        this.updateHints();
        this.applyFilter(this.searchInput.getValue());
    }

    setTodos(todos: TodoFrontMatter[]): void {
        this.allTodos = todos;
        this.updateHeader();
        this.applyFilter(this.searchInput.getValue());
        this.tui.requestRender();
    }

    getSearchValue(): string {
        return this.searchInput.getValue();
    }

    private updateHeader(): void {
        const openCount = this.allTodos.filter((todo) => !isTodoClosed(todo.status)).length;
        const closedCount = this.allTodos.length - openCount;
        const closedLabel = this.showClosed ? `${closedCount} closed shown` : `${closedCount} closed hidden`;
        const title = `Todos (${openCount} open, ${closedLabel})`;
        this.headerText.setText(this.theme.fg("accent", this.theme.bold(title)));
    }

    private updateHints(): void {
        this.hintText.setText(
            this.theme.fg(
                "dim",
                "Dependency tree • ↑↓ select • Enter actions • Ctrl+Shift+W work • Ctrl+Shift+R refine • Ctrl+Shift+H toggle closed • Esc close",
            ),
        );
    }

    private applyFilter(query: string): void {
        this.treeLines = buildTodoTreeLines(this.allTodos, query, this.showClosed);
        this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.treeLines.length - 1));
        this.updateList();
    }

    private updateList(): void {
        this.listContainer.clear();

        if (this.treeLines.length === 0) {
            const hasSearch = Boolean(this.searchInput.getValue().trim());
            const noDataText = hasSearch
                ? "  No matching dependency branches"
                : this.showClosed
                    ? "  No todos"
                    : "  No open todos";
            this.listContainer.addChild(new Text(this.theme.fg("muted", noDataText), 0, 0));
            return;
        }

        const maxVisible = 10;
        const startIndex = Math.max(
            0,
            Math.min(this.selectedIndex - Math.floor(maxVisible / 2), this.treeLines.length - maxVisible),
        );
        const endIndex = Math.min(startIndex + maxVisible, this.treeLines.length);

        for (let i = startIndex; i < endIndex; i += 1) {
            const lineData = this.treeLines[i];
            if (!lineData) continue;
            const { todo, depth } = lineData;
            const isSelected = i === this.selectedIndex;
            const prefix = isSelected ? this.theme.fg("accent", "→ ") : "  ";
            const treePrefix = depth > 0 ? this.theme.fg("dim", `${"  ".repeat(Math.max(0, depth - 1))}↳ `) : "";
            const status = getTodoStatus(todo);
            const closed = isTodoClosed(status);
            const marker = getTodoMarker(todo);
            const closedSelected = closed && isSelected;
            const idColor = closed ? (closedSelected ? "text" : "dim") : "accent";
            const titleColor = closed ? (closedSelected ? "text" : "dim") : isSelected ? "accent" : "text";
            const metaColor = closed ? (closedSelected ? "text" : "dim") : "muted";
            const statusTextColor = closed ? (closedSelected ? "text" : "dim") : "muted";
            const markerColor = closedSelected ? "text" : marker.color;
            const statusIcon = this.theme.fg(markerColor, marker.symbol);
            const tagText = todo.tags.length ? this.theme.fg(metaColor, ` [${todo.tags.join(", ")}]`) : "";
            const assignmentText = renderAssignmentSuffix(
                this.theme,
                todo,
                this.currentSessionId,
                closed ? (closedSelected ? "muted" : "dim") : undefined,
            );
            const line =
                prefix +
                treePrefix +
                statusIcon +
                " " +
                this.theme.fg(idColor, todo.id) +
                " " +
                this.theme.fg(titleColor, todo.title || "(untitled)") +
                tagText +
                assignmentText +
                " " +
                this.theme.fg(statusTextColor, `(${status})`);
            this.listContainer.addChild(new Text(line, 0, 0));
        }

        if (startIndex > 0 || endIndex < this.treeLines.length) {
            const scrollInfo = this.theme.fg("dim", `  (${this.selectedIndex + 1}/${this.treeLines.length})`);
            this.listContainer.addChild(new Text(scrollInfo, 0, 0));
        }
    }

    handleInput(keyData: string): void {
        const kb = getEditorKeybindings();
        if (kb.matches(keyData, "selectUp")) {
            if (this.treeLines.length === 0) return;
            this.selectedIndex = this.selectedIndex === 0 ? this.treeLines.length - 1 : this.selectedIndex - 1;
            this.updateList();
            return;
        }
        if (kb.matches(keyData, "selectDown")) {
            if (this.treeLines.length === 0) return;
            this.selectedIndex = this.selectedIndex === this.treeLines.length - 1 ? 0 : this.selectedIndex + 1;
            this.updateList();
            return;
        }
        if (kb.matches(keyData, "selectConfirm")) {
            const selected = this.treeLines[this.selectedIndex]?.todo;
            if (selected) this.onSelectCallback(selected);
            return;
        }
        if (kb.matches(keyData, "selectCancel")) {
            this.onCancelCallback();
            return;
        }
        if (matchesKey(keyData, Key.ctrlShift("r"))) {
            const selected = this.treeLines[this.selectedIndex]?.todo;
            if (selected && this.onQuickAction) this.onQuickAction(selected, "refine");
            return;
        }
        if (matchesKey(keyData, Key.ctrlShift("w"))) {
            const selected = this.treeLines[this.selectedIndex]?.todo;
            if (selected && this.onQuickAction) this.onQuickAction(selected, "work");
            return;
        }
        const toggleClosedShortcut =
            matchesKey(keyData, Key.ctrlShift("h")) ||
            matchesKey(keyData, Key.shiftCtrl("h"));
        if (toggleClosedShortcut) {
            this.showClosed = !this.showClosed;
            this.updateHeader();
            this.applyFilter(this.searchInput.getValue());
            this.onToggleShowClosed?.(this.showClosed);
            this.tui.requestRender();
            return;
        }
        this.searchInput.handleInput(keyData);
        this.applyFilter(this.searchInput.getValue());
    }

    override invalidate(): void {
        super.invalidate();
        this.updateHeader();
        this.updateHints();
        this.updateList();
    }
}

// ---------------------------------------------------------------------------
// TodoActionMenuComponent
// ---------------------------------------------------------------------------

export class TodoActionMenuComponent extends Container {
    private selectList: SelectList;
    private onSelectCallback: (action: TodoMenuAction) => void;
    private onCancelCallback: () => void;

    constructor(
        theme: Theme,
        todo: TodoRecord,
        onSelect: (action: TodoMenuAction) => void,
        onCancel: () => void,
    ) {
        super();
        this.onSelectCallback = onSelect;
        this.onCancelCallback = onCancel;

        const closed = isTodoClosed(todo.status);
        const title = todo.title || "(untitled)";
        const options: SelectItem[] = [
            { value: "view", label: "view", description: "View todo" },
            { value: "work", label: "work", description: "Work on todo" },
            { value: "refine", label: "refine", description: "Refine task" },
            ...(closed
                ? [{ value: "reopen", label: "reopen", description: "Reopen todo" }]
                : [{ value: "close", label: "close", description: "Close todo" }]),
            ...(todo.assigned_to_session
                ? [{ value: "release", label: "release", description: "Release assignment" }]
                : []),
            { value: "copyPath", label: "copy path", description: "Copy absolute path to clipboard" },
            { value: "copyText", label: "copy text", description: "Copy title and body to clipboard" },
            { value: "delete", label: "delete", description: "Delete todo" },
        ];

        this.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
        this.addChild(
            new Text(
                theme.fg(
                    "accent",
                    theme.bold(`Actions for ${todo.id} "${title}"`),
                ),
            ),
        );

        this.selectList = new SelectList(options, options.length, {
            selectedPrefix: (text) => theme.fg("accent", text),
            selectedText: (text) => theme.fg("accent", text),
            description: (text) => theme.fg("muted", text),
            scrollInfo: (text) => theme.fg("dim", text),
            noMatch: (text) => theme.fg("warning", text),
        });

        this.selectList.onSelect = (item) => this.onSelectCallback(item.value as TodoMenuAction);
        this.selectList.onCancel = () => this.onCancelCallback();

        this.addChild(this.selectList);
        this.addChild(new Text(theme.fg("dim", "Enter to confirm • Esc back")));
        this.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
    }

    handleInput(keyData: string): void {
        this.selectList.handleInput(keyData);
    }

    override invalidate(): void {
        super.invalidate();
    }
}

// ---------------------------------------------------------------------------
// TodoDeleteConfirmComponent
// ---------------------------------------------------------------------------

export class TodoDeleteConfirmComponent extends Container {
    private selectList: SelectList;
    private onConfirm: (confirmed: boolean) => void;

    constructor(theme: Theme, message: string, onConfirm: (confirmed: boolean) => void) {
        super();
        this.onConfirm = onConfirm;

        const options: SelectItem[] = [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
        ];

        this.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
        this.addChild(new Text(theme.fg("accent", message)));

        this.selectList = new SelectList(options, options.length, {
            selectedPrefix: (text) => theme.fg("accent", text),
            selectedText: (text) => theme.fg("accent", text),
            description: (text) => theme.fg("muted", text),
            scrollInfo: (text) => theme.fg("dim", text),
            noMatch: (text) => theme.fg("warning", text),
        });

        this.selectList.onSelect = (item) => this.onConfirm(item.value === "yes");
        this.selectList.onCancel = () => this.onConfirm(false);

        this.addChild(this.selectList);
        this.addChild(new Text(theme.fg("dim", "Enter to confirm • Esc back")));
        this.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
    }

    handleInput(keyData: string): void {
        this.selectList.handleInput(keyData);
    }

    override invalidate(): void {
        super.invalidate();
    }
}

// ---------------------------------------------------------------------------
// TodoDetailOverlayComponent
// ---------------------------------------------------------------------------

export class TodoDetailOverlayComponent {
    private todo: TodoRecord;
    private theme: Theme;
    private tui: TUI;
    private markdown: Markdown;
    private scrollOffset = 0;
    private viewHeight = 0;
    private totalLines = 0;
    private onAction: (action: TodoOverlayAction) => void;

    constructor(tui: TUI, theme: Theme, todo: TodoRecord, onAction: (action: TodoOverlayAction) => void) {
        this.tui = tui;
        this.theme = theme;
        this.todo = todo;
        this.onAction = onAction;
        this.markdown = new Markdown(this.getMarkdownText(), 1, 0, getMarkdownTheme());
    }

    private getMarkdownText(): string {
        const body = this.todo.body?.trim();
        return body ? body : "_No details yet._";
    }

    handleInput(keyData: string): void {
        const kb = getEditorKeybindings();
        if (kb.matches(keyData, "selectCancel")) {
            this.onAction("back");
            return;
        }
        if (kb.matches(keyData, "selectConfirm")) {
            this.onAction("work");
            return;
        }
        if (kb.matches(keyData, "selectUp")) {
            this.scrollBy(-1);
            return;
        }
        if (kb.matches(keyData, "selectDown")) {
            this.scrollBy(1);
            return;
        }
        if (kb.matches(keyData, "selectPageUp")) {
            this.scrollBy(-this.viewHeight || -1);
            return;
        }
        if (kb.matches(keyData, "selectPageDown")) {
            this.scrollBy(this.viewHeight || 1);
            return;
        }
    }

    render(width: number): string[] {
        const maxHeight = this.getMaxHeight();
        const headerLines = 3;
        const footerLines = 3;
        const borderLines = 2;
        const innerWidth = Math.max(10, width - 2);
        const contentHeight = Math.max(1, maxHeight - headerLines - footerLines - borderLines);

        const markdownLines = this.markdown.render(innerWidth);
        this.totalLines = markdownLines.length;
        this.viewHeight = contentHeight;
        const maxScroll = Math.max(0, this.totalLines - contentHeight);
        this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxScroll));

        const visibleLines = markdownLines.slice(this.scrollOffset, this.scrollOffset + contentHeight);
        const lines: string[] = [];

        lines.push(this.buildTitleLine(innerWidth));
        lines.push(this.buildMetaLine(innerWidth));
        lines.push("");

        for (const line of visibleLines) {
            lines.push(truncateToWidth(line, innerWidth));
        }
        while (lines.length < headerLines + contentHeight) {
            lines.push("");
        }

        lines.push("");
        lines.push(this.buildActionLine(innerWidth));

        const borderColor = (text: string) => this.theme.fg("borderMuted", text);
        const top = borderColor(`┌${"─".repeat(innerWidth)}┐`);
        const bottom = borderColor(`└${"─".repeat(innerWidth)}┘`);
        const framedLines = lines.map((line) => {
            const truncated = truncateToWidth(line, innerWidth);
            const padding = Math.max(0, innerWidth - visibleWidth(truncated));
            return borderColor("│") + truncated + " ".repeat(padding) + borderColor("│");
        });

        return [top, ...framedLines, bottom].map((line) => truncateToWidth(line, width));
    }

    invalidate(): void {
        this.markdown = new Markdown(this.getMarkdownText(), 1, 0, getMarkdownTheme());
    }

    private getMaxHeight(): number {
        const rows = this.tui.terminal.rows || 24;
        return Math.max(10, Math.floor(rows * 0.8));
    }

    private buildTitleLine(width: number): string {
        const titleText = this.todo.title
            ? ` ${this.todo.title} `
            : ` Todo ${this.todo.id} `;
        const titleWidth = visibleWidth(titleText);
        if (titleWidth >= width) {
            return truncateToWidth(this.theme.fg("accent", titleText.trim()), width);
        }
        const leftWidth = Math.max(0, Math.floor((width - titleWidth) / 2));
        const rightWidth = Math.max(0, width - titleWidth - leftWidth);
        return (
            this.theme.fg("borderMuted", "─".repeat(leftWidth)) +
            this.theme.fg("accent", titleText) +
            this.theme.fg("borderMuted", "─".repeat(rightWidth))
        );
    }

    private buildMetaLine(width: number): string {
        const status = this.todo.status || "open";
        const statusColor = isTodoClosed(status) ? "dim" : "success";
        const tagText = this.todo.tags.length ? this.todo.tags.join(", ") : "no tags";
        const line =
            this.theme.fg("accent", this.todo.id) +
            this.theme.fg("muted", " • ") +
            this.theme.fg(statusColor, status) +
            this.theme.fg("muted", " • ") +
            this.theme.fg("muted", tagText);
        return truncateToWidth(line, width);
    }

    private buildActionLine(width: number): string {
        const work = this.theme.fg("accent", "enter") + this.theme.fg("muted", " work on todo");
        const back = this.theme.fg("dim", "esc back");
        const pieces = [work, back];

        let line = pieces.join(this.theme.fg("muted", " • "));
        if (this.totalLines > this.viewHeight) {
            const start = Math.min(this.totalLines, this.scrollOffset + 1);
            const end = Math.min(this.totalLines, this.scrollOffset + this.viewHeight);
            const scrollInfo = this.theme.fg("dim", ` ${start}-${end}/${this.totalLines}`);
            line += scrollInfo;
        }

        return truncateToWidth(line, width);
    }

    private scrollBy(delta: number): void {
        const maxScroll = Math.max(0, this.totalLines - this.viewHeight);
        this.scrollOffset = Math.max(0, Math.min(this.scrollOffset + delta, maxScroll));
    }
}
