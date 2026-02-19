import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Editor, type EditorTheme, Key, Text, matchesKey, truncateToWidth, wrapTextWithAnsi } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

interface AskOption {
  key?: string;
  label: string;
  description?: string;
}

interface AskBatchQuestionInput {
  id?: string;
  label?: string;
  question: string;
  options: AskOption[];
  placeholder?: string;
}

interface AskBatchQuestion {
  id: string;
  label: string;
  question: string;
  options: Required<AskOption>[];
  placeholder?: string;
}

interface AskBatchAnswer {
  questionId: string;
  question: string;
  answer: string;
  optionKey?: string;
  optionLabel?: string;
  wasCustom: boolean;
}

interface AskMeBatchDetails {
  questions: AskBatchQuestion[];
  answers: AskBatchAnswer[];
  cancelled: boolean;
}

type RenderOption = Required<AskOption> & { isCustom?: boolean };

const OptionSchema = Type.Object({
  key: Type.Optional(Type.String({ description: "Option key (fixed to 1..N)" })),
  label: Type.String({ description: "Option label" }),
  description: Type.Optional(Type.String({ description: "Optional help text for the option" })),
});

const BatchQuestionSchema = Type.Object({
  id: Type.Optional(Type.String({ description: "Question identifier (optional)" })),
  label: Type.Optional(Type.String({ description: "Short label (for example: Scope/Priority)" })),
  question: Type.String({ description: "Question text" }),
  options: Type.Array(OptionSchema, { description: "Options with keys fixed to 1..N" }),
  placeholder: Type.Optional(Type.String({ description: "Placeholder text for custom answer input" })),
});

const AskMeBatchParams = Type.Object({
  questions: Type.Array(BatchQuestionSchema, { description: "List of questions to confirm in batch" }),
});

function compactPreview(input: string): string {
  if (!input.trim()) return "";
  return input.replace(/\n/g, " ↩ ");
}

// NOTE:
// We intentionally probe Editor runtime internals.
// `isOnFirstVisualLine` is not part of public TS typings and can change across pi-tui versions.
// If this probe stops working, fallback becomes logical-line-only and ↑ boundary switching may regress on wrapped lines.
// Future fix: align with latest public Editor API/patterns from pi docs/examples.
function editorAtFirstVisualLine(editor: Editor): boolean {
  const runtimeEditor = editor as unknown as { isOnFirstVisualLine?: () => boolean };
  if (typeof runtimeEditor.isOnFirstVisualLine === "function") {
    return runtimeEditor.isOnFirstVisualLine();
  }
  const cursor = editor.getCursor();
  return cursor.line <= 0;
}

function normalizeQuestions(input: AskBatchQuestionInput[]): AskBatchQuestion[] {
  const usedIds = new Set<string>();

  return input.map((q, index) => {
    const baseId = q.id?.trim() || `q${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${baseId}_${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);

    const normalizedOptions = q.options.map((opt, optIndex) => ({
      key: String(optIndex + 1),
      label: opt.label,
      description: opt.description,
    }));

    return {
      id,
      label: q.label?.trim() || `Q${index + 1}`,
      question: q.question,
      options: normalizedOptions,
      placeholder: q.placeholder,
    };
  });
}

function invalidResult(message: string, questions: AskBatchQuestion[] = []) {
  return {
    content: [{ type: "text" as const, text: message }],
    details: {
      questions,
      answers: [],
      cancelled: true,
    } as AskMeBatchDetails,
  };
}

export default function askMeBatchExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "ask_me_batch",
    label: "Ask Me Batch",
    description:
      "Ask multiple confirmation questions in one pass. Each question uses option keys 1..N and includes ✍️ custom input.",
    parameters: AskMeBatchParams,

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!ctx.hasUI) {
        return invalidResult("Error: ask_me_batch requires interactive UI (interactive / RPC)");
      }

      if (params.questions.length === 0) {
        return invalidResult("Error: questions cannot be empty");
      }

      const questions = normalizeQuestions(params.questions as AskBatchQuestionInput[]);


      const result = await ctx.ui.custom<AskMeBatchDetails>((tui, theme, _kb, done) => {
        let currentTab = 0;
        let inputMode = false;
        let inputQuestionId: string | null = null;
        let cachedLines: string[] | undefined;

        const optionIndices = new Map<string, number>();
        const answers = new Map<string, AskBatchAnswer>();
        const customDrafts = new Map<string, string>();
        for (const q of questions) optionIndices.set(q.id, 0);

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

        function refresh() {
          cachedLines = undefined;
          tui.requestRender();
        }

        function asResult(cancelled: boolean): AskMeBatchDetails {
          return {
            questions,
            answers: questions
              .filter((q) => answers.has(q.id))
              .map((q) => answers.get(q.id)!)
              .filter(Boolean),
            cancelled,
          };
        }

        function currentQuestion(): AskBatchQuestion | undefined {
          return questions[currentTab];
        }

        function allAnswered(): boolean {
          return questions.every((q) => answers.has(q.id));
        }

        function getOptions(question: AskBatchQuestion): RenderOption[] {
          const opts: RenderOption[] = [...question.options];
          opts.push({ key: "*", label: "✍️", description: undefined, isCustom: true });
          return opts;
        }

        function getOptionIndex(questionId: string): number {
          return optionIndices.get(questionId) ?? 0;
        }

        function setOptionIndex(question: AskBatchQuestion, next: number) {
          const max = Math.max(0, getOptions(question).length - 1);
          optionIndices.set(question.id, Math.max(0, Math.min(max, next)));
        }

        function persistDraft() {
          if (!inputMode || !inputQuestionId) return;
          customDrafts.set(inputQuestionId, editor.getText());
        }

        function clearInputMode(clearEditor = true) {
          inputMode = false;
          inputQuestionId = null;
          if (clearEditor) editor.setText("");
        }

        function startCustomInput(question: AskBatchQuestion) {
          const sameQuestion = inputMode && inputQuestionId === question.id;
          if (sameQuestion) return;

          persistDraft();
          inputMode = true;
          inputQuestionId = question.id;

          const existing = answers.get(question.id);
          const value = existing?.wasCustom ? existing.answer : customDrafts.get(question.id) || "";
          editor.setText(value);
        }

        function syncInputModeWithSelection() {
          if (currentTab === questions.length) {
            persistDraft();
            clearInputMode();
            return;
          }

          const question = currentQuestion();
          if (!question) {
            persistDraft();
            clearInputMode();
            return;
          }

          const options = getOptions(question);
          const selected = options[getOptionIndex(question.id)];
          if (selected?.isCustom) {
            startCustomInput(question);
            return;
          }

          persistDraft();
          clearInputMode();
        }

        function advanceAfterAnswer() {
          if (currentTab < questions.length - 1) {
            currentTab += 1;
          } else {
            currentTab = questions.length; // Submit tab
          }
          syncInputModeWithSelection();
          refresh();
        }

        editor.onChange = () => {
          if (inputQuestionId) {
            customDrafts.set(inputQuestionId, editor.getText());
          }
          cachedLines = undefined;
          tui.requestRender();
        };

        editor.onSubmit = (value) => {
          if (!inputQuestionId) return;
          const question = questions.find((q) => q.id === inputQuestionId);
          if (!question) return;

          const trimmed = value.trim();
          if (!trimmed) return;

          answers.set(question.id, {
            questionId: question.id,
            question: question.question,
            answer: trimmed,
            wasCustom: true,
          });
          customDrafts.set(question.id, trimmed);

          clearInputMode();
          advanceAfterAnswer();
        };

        function selectOption(question: AskBatchQuestion, selected: RenderOption | undefined) {
          if (!selected) return;

          if (selected.isCustom) {
            startCustomInput(question);
            refresh();
            return;
          }

          answers.set(question.id, {
            questionId: question.id,
            question: question.question,
            answer: selected.label,
            optionKey: selected.key,
            optionLabel: selected.label,
            wasCustom: false,
          });
          advanceAfterAnswer();
        }

        function handleInput(data: string) {
          if (inputMode) {
            if (matchesKey(data, Key.up) && editorAtFirstVisualLine(editor)) {
              const q = inputQuestionId ? questions.find((item) => item.id === inputQuestionId) : undefined;
              if (q) {
                const idx = getOptionIndex(q.id);
                setOptionIndex(q, Math.max(0, idx - 1));
              }
              syncInputModeWithSelection();
              refresh();
              return;
            }

            if (matchesKey(data, Key.escape)) {
              const q = inputQuestionId ? questions.find((item) => item.id === inputQuestionId) : undefined;
              if (q) {
                customDrafts.delete(q.id);
                const idx = getOptionIndex(q.id);
                setOptionIndex(q, Math.max(0, idx - 1));
              }
              clearInputMode();
              syncInputModeWithSelection();
              refresh();
              return;
            }

            editor.handleInput(data);
            refresh();
            return;
          }

          const onSubmitTab = currentTab === questions.length;

          if (matchesKey(data, Key.tab) || matchesKey(data, Key.right)) {
            currentTab = (currentTab + 1) % (questions.length + 1);
            syncInputModeWithSelection();
            refresh();
            return;
          }

          if (matchesKey(data, Key.shift("tab")) || matchesKey(data, Key.left)) {
            currentTab = (currentTab - 1 + (questions.length + 1)) % (questions.length + 1);
            syncInputModeWithSelection();
            refresh();
            return;
          }

          if (onSubmitTab) {
            if (matchesKey(data, Key.enter)) {
              if (allAnswered()) done(asResult(false));
              return;
            }
            if (matchesKey(data, Key.escape)) {
              done(asResult(true));
            }
            return;
          }

          const question = currentQuestion();
          if (!question) return;
          const options = getOptions(question);
          const currentOptionIndex = getOptionIndex(question.id);

          if (matchesKey(data, Key.up)) {
            setOptionIndex(question, currentOptionIndex - 1);
            syncInputModeWithSelection();
            refresh();
            return;
          }

          if (matchesKey(data, Key.down)) {
            setOptionIndex(question, currentOptionIndex + 1);
            syncInputModeWithSelection();
            refresh();
            return;
          }

          if (matchesKey(data, Key.enter)) {
            selectOption(question, options[currentOptionIndex]);
            return;
          }

          if (data.length === 1 && !data.startsWith("\u001b")) {
            const hotkey = data.toLowerCase();
            const selectedByKey = options.find((opt) => !opt.isCustom && (opt.key || "").toLowerCase() === hotkey);
            if (selectedByKey) {
              selectOption(question, selectedByKey);
              return;
            }
          }

          if (matchesKey(data, Key.escape)) {
            done(asResult(true));
          }
        }

        function render(width: number): string[] {
          if (cachedLines) return cachedLines;

          const lines: string[] = [];
          const add = (text: string) => lines.push(truncateToWidth(text, width));

          add(theme.fg("accent", "─".repeat(width)));

          // Tabs
          const tabs: string[] = [];
          for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const active = i === currentTab;
            const answered = answers.has(q.id);
            const text = ` ${answered ? "■" : "□"} ${q.label} `;
            if (active) {
              tabs.push(theme.bg("selectedBg", theme.fg("text", text)));
            } else {
              tabs.push(theme.fg(answered ? "success" : "muted", text));
            }
          }

          const submitActive = currentTab === questions.length;
          const submitText = " ✓ Submit ";
          if (submitActive) {
            tabs.push(theme.bg("selectedBg", theme.fg("text", submitText)));
          } else {
            tabs.push(theme.fg(allAnswered() ? "success" : "dim", submitText));
          }

          add(` ${tabs.join(" ")}`);
          lines.push("");

          if (currentTab === questions.length) {
            add(theme.fg("accent", theme.bold(" Ready to submit")));
            lines.push("");

            for (const q of questions) {
              const ans = answers.get(q.id);
              if (!ans) {
                add(`${theme.fg("warning", "•")} ${theme.fg("muted", `${q.label}:`)} ${theme.fg("dim", "(pending)")}`);
                continue;
              }
              const prefix = ans.wasCustom ? "(wrote) " : ans.optionKey ? `${ans.optionKey}. ` : "";
              add(`${theme.fg("success", "✓")} ${theme.fg("muted", `${q.label}:`)} ${theme.fg("text", `${prefix}${ans.answer}`)}`);
            }

            lines.push("");
            add(
              allAnswered()
                ? theme.fg("dim", " Enter submit • Esc cancel")
                : theme.fg("warning", " Complete all questions before submit • Esc cancel"),
            );
            add(theme.fg("accent", "─".repeat(width)));

            cachedLines = lines;
            return lines;
          }

          const question = currentQuestion();
          if (!question) {
            add(theme.fg("error", "Internal error: missing current question"));
            add(theme.fg("accent", "─".repeat(width)));
            cachedLines = lines;
            return lines;
          }

          const options = getOptions(question);
          const selectedIndex = getOptionIndex(question.id);
          const answered = answers.get(question.id);

          for (const wrappedLine of wrapTextWithAnsi(theme.fg("text", ` ${question.question}`), width)) {
            lines.push(wrappedLine);
          }
          lines.push("");

          for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            const selected = i === selectedIndex;
            const prefix = selected ? theme.fg("accent", "> ") : "  ";

            const isPicked =
              answered &&
              ((opt.isCustom && answered.wasCustom) || (!opt.isCustom && answered.optionKey === opt.key && !answered.wasCustom));

            if (opt.isCustom) {
              const preview = answered?.wasCustom ? compactPreview(answered.answer) : "";
              const mark = isPicked ? "✓ " : "  ";
              const line = `${mark}${opt.label}${preview ? `：${preview}` : ""}`;
              add(prefix + (selected ? theme.fg("accent", line) : theme.fg("text", line)));
            } else {
              const mark = isPicked ? "✓ " : "  ";
              const line = `${mark}${opt.key}. ${opt.label}`;
              add(prefix + (selected ? theme.fg("accent", line) : theme.fg("text", line)));
            }

            if (opt.description) {
              const indent = opt.isCustom ? 6 : 2 + 2 + opt.key.length + 2; // prefix + mark + key + ". "
              const pad = " ".repeat(indent);
              const descWidth = Math.max(20, width - indent);
              for (const wrappedLine of wrapTextWithAnsi(theme.fg("muted", opt.description), descWidth)) {
                lines.push(`${pad}${wrappedLine}`);
              }
            }
          }

          if (inputMode && inputQuestionId === question.id) {
            lines.push("");
            add(theme.fg("muted", " Your answer"));
            for (const line of editor.render(Math.max(10, width - 2))) {
              add(` ${line}`);
            }
            lines.push("");
            add(theme.fg("dim", " Enter submit • Shift+Enter newline • ↑ at top switches option • Esc cancel"));
          } else {
            lines.push("");
            add(theme.fg("dim", " Tab/←→ switch question • ↑/↓ select • Enter confirm • 1..N quick select • Esc cancel"));
          }

          add(theme.fg("accent", "─".repeat(width)));
          cachedLines = lines;
          return lines;
        }

        syncInputModeWithSelection();

        return {
          render,
          invalidate: () => {
            cachedLines = undefined;
          },
          handleInput,
        };
      });

      if (result.cancelled) {
        return {
          content: [{ type: "text", text: "User cancelled ask_me_batch" }],
          details: result,
        };
      }

      const summary = result.answers.map((ans) => {
        if (ans.wasCustom) return `${ans.questionId}: user wrote: ${ans.answer}`;
        return `${ans.questionId}: user selected: ${ans.optionKey}. ${ans.answer}`;
      });

      return {
        content: [{ type: "text", text: summary.join("\n") || "No answers" }],
        details: result,
      };
    },

    renderCall(args, theme) {
      const qs = Array.isArray(args.questions) ? args.questions : [];
      const count = qs.length;
      let text = theme.fg("toolTitle", theme.bold("ask_me_batch "));
      text += theme.fg("muted", `${count} question${count !== 1 ? "s" : ""}`);
      return new Text(text, 0, 0);
    },

    renderResult(result, _options, theme) {
      const details = result.details as AskMeBatchDetails | undefined;
      if (!details) {
        const text = result.content[0];
        return new Text(text?.type === "text" ? text.text : "", 0, 0);
      }

      if (details.cancelled) {
        return new Text(theme.fg("warning", "Cancelled"), 0, 0);
      }

      const lines = details.answers.map((ans) => {
        if (ans.wasCustom) {
          return `${theme.fg("success", "✓")} ${theme.fg("accent", ans.questionId)}: ${theme.fg("muted", "(wrote) ")}${ans.answer}`;
        }
        return `${theme.fg("success", "✓")} ${theme.fg("accent", ans.questionId)}: ${ans.optionKey}. ${ans.answer}`;
      });

      return new Text(lines.join("\n") || theme.fg("warning", "No answers"), 0, 0);
    },
  });
}
