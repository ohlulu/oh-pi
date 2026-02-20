# oh-pi

Ohlulu 的 pi agent 資源包 — extensions、skills、prompt templates。

## 安裝

```bash
# 本機路徑安裝（全域）
pi install /path/to/oh-pi

# 本機路徑安裝（專案）
pi install -l /path/to/oh-pi

# 從 git 安裝
pi install git:github.com/ohlulu/oh-pi
```

## 內容

| 類別 | 路徑 | 說明 |
|------|------|------|
| Extensions | `extensions/` | ask-me, context, done-sound, inject-docs, lazygit, notify, open-with, ralph-wiggum, review, tab-status, todo, worktree, yazi |
| Skills | `skills/` | bdd, clean-architecture, commit, dev-principles, pi-skills (brave-search, browser-tools, …), ralph-wiggum, swift-coding-style, swift-concurrency, swiftui-expert-skill, swiftui-liquid-glass, swiftui-performance-audit, update-changelog |
| Prompts | `prompts/` | dig, handoff, mcp, pickup, spec-workshop, tech-stack-decision |
| Shared Prompts | `shared/prompts/` | review-rubric |

## AGENTS.md

`AGENTS.md` 不會被 pi package 自動載入。  
如需使用，請手動複製到全域或專案位置：

```bash
# 全域
cp AGENTS.md ~/.pi/agent/AGENTS.md

# 專案
cp AGENTS.md .pi/agent/AGENTS.md
```

## Skills with Dependencies

部分 skills（如 `brave-search`、`browser-tools`）需要 `npm install`：

```bash
cd skills/pi-skills/brave-search && npm install
cd skills/pi-skills/browser-tools && npm install
```

## License

MIT
