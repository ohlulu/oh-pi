---
summary: CLI tools available on Ohlulu's machines — peekaboo, imageoptim, oracle, gh, mcporter, xcp, tuist, lldb, axe, tmux, asc, nanobanana, wrangler.
read_when: Need to use a CLI tool; unsure about tool syntax or location; setting up dev environment
---

# Tools Reference

CLI tools available on Ohlulu's machines.

## peekaboo 👀
Screenshot, screen inspection, and click automation.

**Location**: `/opt/homebrew/bin/peekaboo`

**Commands**:
```bash
peekaboo capture                       # Take screenshot
peekaboo see                           # Describe what's on screen (OCR)
peekaboo click                         # Click at coordinates
peekaboo list                          # List windows/apps
peekaboo tools                         # Show available tools
peekaboo permissions status            # Check TCC permissions
```

**Requirements**: Screen Recording + Accessibility permissions.

---

## imageoptim 🖼️
Image compression CLI (wraps ImageOptim.app).

**Location**: `/opt/homebrew/bin/imageoptim`

**Usage**:
```bash
imageoptim <file-or-pattern>           # Optimize image(s)
imageoptim "*.png"                     # Batch optimize PNGs
imageoptim -a <file>                   # Enable ImageAlpha (lossy PNG)
```

**Requires**: ImageOptim.app installed at `/Applications/ImageOptim.app`.

---

## oracle 🧿
Hand prompts + files to other AIs (GPT-5 Pro, etc.).

**Usage**: `npx -y @steipete/oracle --help` (run once per session to learn syntax)

---

## gh
GitHub CLI for PRs, issues, CI, releases.

**Usage**: `gh help`

When someone shares a GitHub URL, use `gh` to read it:
```bash
gh issue view <url> --comments
gh pr view <url> --comments --files
gh run list / gh run view <id>
```

---

## mcporter
MCP → CLI bridge. Auto-discovers configs from `~/.claude.json`.

```bash
npx mcporter list                        # list all servers
npx mcporter list <server> --schema      # full tool docs for a server
npx mcporter call <server>.<tool> [k=v] # invoke a tool
```

### Configured MCP Servers

| Server | Source | Description |
|---|---|---|
| **XcodeBuildMCP** | `~/.claude.json` (user-global) | 82 tools — build, test, debug, log capture, coverage, simulator mgmt, scaffold for Xcode projects. [Docs](https://github.com/getsentry/XcodeBuildMCP/blob/main/docs/TOOLS.md) |
| **pencil** | `~/.claude.json` (user-global) | Pencil design tool MCP |

---

## xcp
Xcode project/workspace helper for managing targets, groups, files, build settings, and assets.

**Usage**: `xcp --help`

---

## tuist
Generates Xcode projects from manifest files.

**Usage**: `tuist --help`

---

## lldb
Use `lldb` inside tmux to debug native apps; attach to the running app to inspect state.

---

## axe
Simulator automation CLI for describing UI, tapping, typing, and hardware buttons.

**Commands**:
```bash
axe list-simulators                    # Enumerate devices
axe describe-ui --udid …              # Describe UI elements
axe tap --udid … -x … -y …           # Tap at coordinates
```

---

## tmux
Use only when you need persistence/interaction (debugger/server).

**Quick refs**:
```bash
tmux new -d -s codex-shell
tmux attach -t codex-shell
tmux list-sessions
tmux kill-session -t codex-shell
```

---

## asc 🛍️
Unofficial App Store Connect CLI — manage apps, builds, TestFlight, analytics, reviews, and more.

**Source**: https://github.com/rudrankriyam/App-Store-Connect-CLI

**Setup**:
```bash
asc auth          # Configure API key authentication
asc doctor        # Diagnose auth issues
```

**Common commands**:
```bash
asc --help                    # List all commands
asc builds --help             # List builds subcommands
asc builds list --help        # Show all flags for a command
```

Do not memorize commands. Always check --help for the current interface.

**Tip**: Run `asc <subcommand> --help` for full flag reference per command.

---

## nanobanana 🍌
Image editing via Gemini's image generation API.

**Location**: `~/.pi/agent/shared/scripts/nanobanana`

**Usage**:
```bash
nanobanana <image-path> "<prompt>" [output-path]
```

**Output**: defaults to `<name>_edited.<ext>` if no output path given.

---

## wrangler ☁️
Cloudflare Workers CLI — dev, deploy, KV, secrets, D1, R2, etc.

**Usage**: `wrangler --help` / `wrangler <command> --help`

**Key knowledge**:
- `wrangler dev` binds local KV/D1; add `--remote` for real Cloudflare infra.
- `wrangler tail` streams live production logs — essential for debugging deployed Workers.
- Secrets are set interactively: `wrangler secret put <NAME>` (never in wrangler.toml).
- KV commands need `--namespace-id`; get IDs from `wrangler kv namespace list`.
