import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Editor, type EditorTheme, Key, Text, matchesKey, truncateToWidth, wrapTextWithAnsi } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

interface AskOption {
  key?: string;
  label: string;
  description?: string;
}

interface AskMeDetails {
  question: string;
  answer: string | null;
  optionKey?: string;
  optionLabel?: string;
  cancelled: boolean;
}

interface AskMeUIResult {
  answer: string;
  optionKey?: string;
  optionLabel?: string;
  cancelled: boolean;
}

const OptionSchema = Type.Object({
  key: Type.Optional(Type.String({ description: "Option key (fixed to 1..N)" })),
  label: Type.String({ description: "Option label" }),
  description: Type.Optional(Type.String({ description: "Optional help text for the option" })),
});

const AskMeParams = Type.Object({
  question: Type.String({ description: "Question to ask the user" }),
  options: Type.Optional(Type.Array(OptionSchema, { description: "Selectable options. If omitted, fall back to free text input." })),
  placeholder: Type.Optional(Type.String({ description: "Default placeholder for free text input" })),
});

function compactPreview(input: string): string {
  if (!input.trim()) return "";
  return input.replace(/\n/g, " ↩ ");
}

// NOTE:
// We intentionally probe Editor's runtime internals here.
// `isOnFirstVisualLine` is not part of the public TypeScript API,
// so a future pi-tui upgrade may remove/rename it.
// If this breaks, keyboard behavior regresses to fallback (logical line only),
// and ↑/↓ boundary switching may feel wrong on wrapped lines.
// First fix to try: re-check latest Editor public API in pi-tui examples/docs and replace this probe.
function editorAtFirstVisualLine(editor: Editor): boolean {
  const runtimeEditor = editor as unknown as { isOnFirstVisualLine?: () => boolean };
  if (typeof runtimeEditor.isOnFirstVisualLine === "function") {
    return runtimeEditor.isOnFirstVisualLine();
  }
  const cursor = editor.getCursor();
  return cursor.line <= 0;
}

// NOTE:
// Same caveat as `editorAtFirstVisualLine`: runtime probe to non-public Editor API.
// If unavailable after upgrade, fallback only checks logical lines.
function editorAtLastVisualLine(editor: Editor): boolean {
  const runtimeEditor = editor as unknown as { isOnLastVisualLine?: () => boolean };
  if (typeof runtimeEditor.isOnLastVisualLine === "function") {
    return runtimeEditor.isOnLastVisualLine();
  }
  const lines = editor.getLines();
  const cursor = editor.getCursor();
  return cursor.line >= lines.length - 1;
}

export default function askMeExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "ask_me",
    label: "Ask Me",
    description: "Call this when you need user confirmation. Option keys are fixed to 1..N, with optional free-text input.",
    parameters: AskMeParams,

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!ctx.hasUI) {
        return {
          content: [{ type: "text", text: "Error: ask_me requires interactive UI (interactive / RPC)" }],
          details: {
            question: params.question,
            answer: null,
            cancelled: true,
          } as AskMeDetails,
        };
      }

      const options: AskOption[] = params.options ?? [];
      const customLabel = "✍️";

      if (options.length === 0) {
        const typed = await ctx.ui.input(params.question, params.placeholder);
        if (!typed || typed.trim().length === 0) {
          return {
            content: [{ type: "text", text: "User cancelled or provided empty answer" }],
            details: {
              question: params.question,
              answer: null,
              cancelled: true,
            } as AskMeDetails,
          };
        }

        const answer = typed.trim();
        return {
          content: [{ type: "text", text: `User answer: ${answer}` }],
          details: {
            question: params.question,
            answer,
            cancelled: false,
          } as AskMeDetails,
        };
      }

      const normalized = options.map((opt, index) => ({
        ...opt,
        key: String(index + 1),
      }));

      type DisplayEntry = {
        key: string;
        label: string;
        description?: string;
        isCustom?: boolean;
      };

      const entries: DisplayEntry[] = normalized.map((opt) => ({
        key: opt.key,
        label: opt.label,
        description: opt.description,
      }));

      entries.push({ key: "*", label: customLabel, isCustom: true });

      const result = await ctx.ui.custom<AskMeUIResult | null>((tui, theme, _kb, done) => {
        let optionIndex = 0;
        let editMode = false;
        let cachedLines: string[] | undefined;

        const customIndex = entries.findIndex((entry) => entry.isCustom);

        const editorTheme: EditorTheme = {
          borderColor: (s) => theme.fg("dim", s),
          selectList: {
            selectedPrefix: (t) => theme.fg("accent", t),
            selectedText: (t) => theme.fg("accent", t),
            description: (t) => theme.fg("muted", t),
            scrollInfo: (t) => theme.fg("dim", t),
            noMatch: (t) => theme.fg("warning", t),
          },
        };
        const editor = new Editor(tui, editorTheme, { paddingX: 0 });

        editor.onChange = () => {
          cachedLines = undefined;
          tui.requestRender();
        };

        editor.onSubmit = (value) => {
          const trimmed = value.trim();
          if (!trimmed) return;
          done({ cancelled: false, answer: trimmed });
        };

        function refresh() {
          cachedLines = undefined;
          tui.requestRender();
        }

        function syncEditModeWithSelection() {
          if (customIndex === -1) {
            editMode = false;
            return;
          }
          editMode = optionIndex === customIndex;
        }

        function selectEntry(selected: DisplayEntry | undefined) {
          if (!selected) return;

          if (selected.isCustom) {
            syncEditModeWithSelection();
            refresh();
            return;
          }

          done({
            cancelled: false,
            answer: selected.label,
            optionKey: selected.key,
            optionLabel: selected.label,
          });
        }

        function resolveSelected() {
          selectEntry(entries[optionIndex]);
        }

        function passToEditor(data: string) {
          editor.handleInput(data);
          refresh();
        }

        function handleEditingKeys(data: string): boolean {
          if (!editMode) return false;

          if (matchesKey(data, Key.up)) {
            if (editorAtFirstVisualLine(editor)) {
              optionIndex = Math.max(0, optionIndex - 1);
              syncEditModeWithSelection();
              refresh();
              return true;
            }
            passToEditor(data);
            return true;
          }

          if (matchesKey(data, Key.down)) {
            if (editorAtLastVisualLine(editor)) {
              optionIndex = Math.min(entries.length - 1, optionIndex + 1);
              syncEditModeWithSelection();
              refresh();
              return true;
            }
            passToEditor(data);
            return true;
          }

          passToEditor(data);
          return true;
        }

        function handleInput(data: string) {
          if (handleEditingKeys(data)) return;

          if (matchesKey(data, Key.up)) {
            optionIndex = Math.max(0, optionIndex - 1);
            syncEditModeWithSelection();
            refresh();
            return;
          }

          if (matchesKey(data, Key.down)) {
            optionIndex = Math.min(entries.length - 1, optionIndex + 1);
            syncEditModeWithSelection();
            refresh();
            return;
          }

          if (matchesKey(data, Key.enter) || matchesKey(data, "enter")) {
            resolveSelected();
            return;
          }

          if (data.length === 1 && !data.startsWith("\u001b")) {
            const hotkey = data.toLowerCase();
            const selectedByKey = entries.find((entry) => !entry.isCustom && entry.key.toLowerCase() === hotkey);
            if (selectedByKey) {
              selectEntry(selectedByKey);
              return;
            }
          }

          if (matchesKey(data, Key.escape)) {
            done(null);
            return;
          }

          if (customIndex !== -1 && optionIndex === customIndex) {
            syncEditModeWithSelection();
            passToEditor(data);
          }
        }

        function render(width: number): string[] {
          if (cachedLines) return cachedLines;

          const lines: string[] = [];
          const add = (text: string) => lines.push(truncateToWidth(text, width));

          add(theme.fg("accent", "─".repeat(width)));
          for (const wrappedLine of wrapTextWithAnsi(theme.fg("text", ` ${params.question}`), width)) {
            lines.push(wrappedLine);
          }
          lines.push("");

          for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const selected = i === optionIndex;
            const prefix = selected ? "> " : "  ";

            if (entry.isCustom) {
              const preview = compactPreview(editor.getText());
              const inlineValue = selected && editMode ? "" : preview;
              const customTitle = `${prefix}${entry.label}：${inlineValue}`;
              add(selected ? theme.fg("accent", customTitle) : theme.fg("text", customTitle));

              if (selected && editMode) {
                for (const editorLine of editor.render(Math.max(10, width - 4))) {
                  add(`  ${editorLine}`);
                }
              }
            } else {
              const line = `${prefix}${entry.key}. ${entry.label}`;
              add(selected ? theme.fg("accent", line) : theme.fg("text", line));
            }

            if (entry.description) {
              const indent = entry.isCustom ? 4 : 2 + entry.key.length + 2; // prefix + key + ". "
              const pad = " ".repeat(indent);
              const descWidth = Math.max(20, width - indent);
              for (const wrappedLine of wrapTextWithAnsi(theme.fg("muted", entry.description), descWidth)) {
                lines.push(`${pad}${wrappedLine}`);
              }
            }
          }

          lines.push("");
          if (editMode) {
            add(theme.fg("dim", " Enter submit • Shift+Enter newline • ↑/↓ in editor (edge switches option) • Esc cancel"));
          } else {
            add(theme.fg("dim", " ↑/↓ navigate • Enter select • 1..N quick select • Esc cancel"));
          }
          add(theme.fg("accent", "─".repeat(width)));

          cachedLines = lines;
          return lines;
        }

        return {
          render,
          invalidate: () => {
            cachedLines = undefined;
          },
          handleInput,
        };
      });

      if (!result || result.cancelled || !result.answer) {
        return {
          content: [{ type: "text", text: "User cancelled the selection" }],
          details: {
            question: params.question,
            answer: null,
            cancelled: true,
          } as AskMeDetails,
        };
      }

      if (result.optionKey) {
        return {
          content: [{ type: "text", text: `User selected: ${result.optionKey}. ${result.answer}` }],
          details: {
            question: params.question,
            answer: result.answer,
            optionKey: result.optionKey,
            optionLabel: result.optionLabel,
            cancelled: false,
          } as AskMeDetails,
        };
      }

      return {
        content: [{ type: "text", text: `User answer: ${result.answer}` }],
        details: {
          question: params.question,
          answer: result.answer,
          cancelled: false,
        } as AskMeDetails,
      };
    },

    renderCall(args, theme) {
      let text = theme.fg("toolTitle", theme.bold("ask_me ")) + theme.fg("muted", args.question);
      if (Array.isArray(args.options) && args.options.length > 0) {
        const opts = args.options
          .map((opt: AskOption, index: number) => `${index + 1}. ${opt.label}`)
          .join(", ");
        text += `\n${theme.fg("dim", `  options: ${opts}`)}`;
      }
      return new Text(text, 0, 0);
    },

    renderResult(result, _options, theme) {
      const details = result.details as AskMeDetails | undefined;
      if (!details || details.cancelled || !details.answer) {
        return new Text(theme.fg("warning", "Cancelled / no answer"), 0, 0);
      }

      if (details.optionKey) {
        return new Text(theme.fg("success", `✓ ${details.optionKey}. ${details.answer}`), 0, 0);
      }
      return new Text(theme.fg("success", `✓ ${details.answer}`), 0, 0);
    },
  });
}
