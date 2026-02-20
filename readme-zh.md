# oh-pi

[English](https://github.com/ohlulu/oh-pi/blob/main/readme.md) / 中文版

個人化的 [pi](https://github.com/badlogic/pi) agent 資源集合 — extensions、skills、prompt templates，為自己的工作流量身打造。

> **⚠️ 這是個人化配置。**
> 圍繞我的習慣、工具和技術棧（Swift / SwiftUI / macOS）設計。
> 建議瀏覽內容後**挑選**適合你的部分 — 手動複製個別檔案，而非透過 `pi install` 整包安裝。

## 目錄

- [Extensions](#extensions)
- [Skills](#skills)
- [Prompt Templates](#prompt-templates)
- [Shared Prompts](#shared-prompts)
- [AGENTS.md](#agentsmd)
- [使用方式](#使用方式)

## Extensions

可重複使用的 pi 擴充套件，為 agent 增加工具、指令和事件掛鉤。

| 名稱 | 說明 |
|------|------|
| [ask-me](https://github.com/ohlulu/oh-pi/blob/main/extensions/ask-me.ts) | 互動式單選工具 — 讓 LLM 主動向使用者提問並提供選項。 |
| [ask-me-batch](https://github.com/ohlulu/oh-pi/blob/main/extensions/ask-me-batch.ts) | ask-me 的批次版本 — 一次提出多個問題。 |
| [context](https://github.com/ohlulu/oh-pi/blob/main/extensions/context.ts) | `/context` 指令 — 顯示 context window 用量、已載入的 extensions/skills 和 session 費用。 |
| [done-sound](https://github.com/ohlulu/oh-pi/blob/main/extensions/done-sound.ts) | Agent 完成時播放系統音效（macOS）。 |
| [inject-docs](https://github.com/ohlulu/oh-pi/blob/main/extensions/inject-docs.ts) | Session 開始時自動將專案 `docs/` 索引注入第一輪 agent turn。 |
| [lazygit](https://github.com/ohlulu/oh-pi/blob/main/extensions/lazygit.ts) | `/lazygit` 指令 — 在 TUI 內啟動 lazygit。 |
| [notify](https://github.com/ohlulu/oh-pi/blob/main/extensions/notify.ts) | Agent 完成時發送 macOS 桌面原生通知。 |
| [open-with](https://github.com/ohlulu/oh-pi/blob/main/extensions/open-with.ts) | `/finder`、`/cursor` 指令 — 在 Finder 或 Cursor 編輯器中開啟當前目錄。 |
| [ralph-wiggum](https://github.com/ohlulu/oh-pi/tree/main/extensions/ralph-wiggum) | 長時間迭代開發循環 — plan → execute → verify，含節奏控制和 checkpoint。 |
| [review](https://github.com/ohlulu/oh-pi/tree/main/extensions/review) | `/review` 指令 — 基於 git diff / PR 的互動式 code review。 |
| [tab-status](https://github.com/ohlulu/oh-pi/blob/main/extensions/tab-status.ts) | 終端 tab title 即時顯示 agent 狀態（☘️ 閒置 · 🔄 工作中 · 🛑 錯誤）。 |
| [todo](https://github.com/ohlulu/oh-pi/tree/main/extensions/todo) | 檔案式 todo 管理工具 — agent 可建立、更新和查詢待辦事項。 |
| [worktree](https://github.com/ohlulu/oh-pi/tree/main/extensions/worktree) | `/wt` 指令 — git worktree 管理。 |
| [yazi](https://github.com/ohlulu/oh-pi/blob/main/extensions/yazi.ts) | `/yazi` 指令 — 在 TUI 內啟動 yazi 檔案管理器。 |

## Skills

按需載入的能力套件 — 當任務匹配時 agent 會自動載入。

| 名稱 | 說明 |
|------|------|
| [bdd](https://github.com/ohlulu/oh-pi/tree/main/skills/bdd) | 使用 Gherkin 撰寫和審查 BDD 規格。 |
| [clean-architecture](https://github.com/ohlulu/oh-pi/tree/main/skills/clean-architecture) | Clean Architecture 思維 — 依賴方向、層級邊界、抽象決策。 |
| [commit](https://github.com/ohlulu/oh-pi/tree/main/skills/commit) | 結構化 Conventional Commits 工作流 — 分析變更、撰寫訊息、提交。 |
| [dev-principles](https://github.com/ohlulu/oh-pi/tree/main/skills/dev-principles) | 語言無關的開發原則與設計指引。 |
| [ralph-wiggum](https://github.com/ohlulu/oh-pi/tree/main/skills/ralph-wiggum) | ralph-wiggum extension 的 skill 搭檔 — 迭代循環節奏控制。 |
| [swift-coding-style](https://github.com/ohlulu/oh-pi/tree/main/skills/swift-coding-style) | Swift 編碼風格 — opaque vs existential types、命名、結構。 |
| [swift-concurrency](https://github.com/ohlulu/oh-pi/tree/main/skills/swift-concurrency) | Swift Concurrency 最佳實踐 — async/await、actors、Sendable、遷移至 Swift 6。 |
| [swiftui-expert-skill](https://github.com/ohlulu/oh-pi/tree/main/skills/swiftui-expert-skill) | SwiftUI 最佳實踐 — 狀態管理、View 組合、效能、現代 API。 |
| [swiftui-liquid-glass](https://github.com/ohlulu/oh-pi/tree/main/skills/swiftui-liquid-glass) | iOS 26+ Liquid Glass — `.glassEffect`、glass buttons、morphing transitions。 |
| [swiftui-performance-audit](https://github.com/ohlulu/oh-pi/tree/main/skills/swiftui-performance-audit) | SwiftUI 效能審計 — 慢渲染、過度更新、layout thrash 診斷。 |
| [update-changelog](https://github.com/ohlulu/oh-pi/tree/main/skills/update-changelog) | 將最近版本以來的使用者可見變更更新到 CHANGELOG.md。 |

### 第三方 Skills（pi-skills）

[`skills/pi-skills/`](https://github.com/ohlulu/oh-pi/tree/main/skills/pi-skills) 目錄包含來自 [badlogic/pi-skills](https://github.com/badlogic/pi-skills) 的 skills — 包括 brave-search、browser-tools、Google CLI 工具、語音轉錄等。詳細文件和更新請參閱原始 repo。

## Prompt Templates

斜線指令 prompt 模板 — 在編輯器中輸入 `/名稱` 即可展開。

| 指令 | 說明 |
|------|------|
| [/dig](https://github.com/ohlulu/oh-pi/blob/main/prompts/dig.md) | 深入研究主題 — 用教學方式研究並解釋。 |
| [/handoff](https://github.com/ohlulu/oh-pi/blob/main/prompts/handoff.md) | 將當前狀態打包成交接報告給下一位 agent。 |
| [/mcp](https://github.com/ohlulu/oh-pi/blob/main/prompts/mcp.md) | 快速流程：merge → close branch → push。 |
| [/pickup](https://github.com/ohlulu/oh-pi/blob/main/prompts/pickup.md) | 接手或恢復工作時快速恢復上下文。 |
| [/spec-workshop](https://github.com/ohlulu/oh-pi/blob/main/prompts/spec-workshop.md) | 需求規格工作坊 — 實作前的結構化討論（中文）。 |
| [/tech-stack-decision](https://github.com/ohlulu/oh-pi/blob/main/prompts/tech-stack-decision.md) | 技術選型工作坊 — 架構、套件、工具鏈評估（中文）。 |

## Shared Prompts

可重複使用的 prompt 片段，供 extensions 或其他 prompts 引用。

| 名稱 | 說明 |
|------|------|
| [review-rubric](https://github.com/ohlulu/oh-pi/blob/main/shared/prompts/review-rubric.md) | Code review 評分準則 — 要標記什麼、嚴重程度、review 結構。 |

## AGENTS.md

[`AGENTS.md`](https://github.com/ohlulu/oh-pi/blob/main/AGENTS.md) 包含我的全域 agent 指令 — 工作流規則、工具使用、編碼慣例和護欄。

> **注意：** `AGENTS.md` **不會**被 pi package 自動載入。如需使用，請手動複製到全域或專案設定：
>
> ```bash
> # 全域
> cp AGENTS.md ~/.pi/agent/AGENTS.md
>
> # 專案
> cp AGENTS.md .pi/agent/AGENTS.md
> ```

## 使用方式

**建議：挑選你需要的部分。**

```bash
# 複製單一 extension
cp oh-pi/extensions/done-sound.ts ~/.pi/agent/extensions/

# 複製一個 skill
cp -r oh-pi/skills/swift-concurrency ~/.pi/agent/skills/

# 複製一個 prompt template
cp oh-pi/prompts/handoff.md ~/.pi/agent/prompts/
```

如果仍想整包安裝（不建議用於個人配置）：

```bash
pi install /path/to/oh-pi
```

## 致謝

靈感與參考來源：

- [steipete/agent-scripts](https://github.com/steipete/agent-scripts)
- [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff)
- [ClaytonFarr/ralph-playbook](https://github.com/ClaytonFarr/ralph-playbook)
- [Th0rgal/open-ralph-wiggum](https://github.com/Th0rgal/open-ralph-wiggum)
- [michaelshimeles/ralphy](https://github.com/michaelshimeles/ralphy)
- [tmustier/pi-extensions](https://github.com/tmustier/pi-extensions)
- [arosstale/pi-pai](https://github.com/arosstale/pi-pai)
- [SwiftLee - AvdLee](https://github.com/AvdLee)