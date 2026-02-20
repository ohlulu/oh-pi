# Worktree (Extension)

Git worktree management via `/wt` command. Create isolated workspaces for features without juggling branches or stashing.

## Usage

On first use in a project, run `/wt init` to configure the sync command and parent directory. Then:

```
/wt create <name>    — create a worktree + feature branch
/wt list             — list all worktrees
/wt remove <name>    — remove a worktree
```

## How It Works

- Creates worktrees in a sibling directory (`<project>.worktrees/` by default)
- Each worktree gets a `feature/<name>` branch
- Optional sync command runs after creation (copy configs, install deps, etc.)
- Settings stored per-project in `~/.pi/agent/extensions/worktree/settings.json`

## Commands

| Command | What it does |
|---------|-------------|
| `/wt init` | Configure sync command + parent dir for current project |
| `/wt settings [key] [val]` | View or set project settings |
| `/wt create <name>` | Create worktree + feature branch, run sync |
| `/wt sync` | Run sync command in current worktree |
| `/wt list` | List all worktrees |
| `/wt status` | Show current project/branch/worktree info |
| `/wt cd <name>` | Print worktree path |
| `/wt remove <name>` | Remove worktree (confirms first, keeps branch) |
| `/wt prune` | Clean stale worktree metadata |

## Template Variables

Usable in sync command and parentDir settings:

| Variable | Example |
|----------|---------|
| `{{main}}` | `/Users/you/Developer/my-app` |
| `{{worktree}}` | `/Users/you/Developer/my-app.worktrees/auth` |
| `{{project}}` | `my-app` |
| `{{name}}` | `auth` |
| `{{branch}}` | `feature/auth` |

## Typical Setup

```bash
/wt init
# Set sync command, e.g.: cp {{main}}/.env {{worktree}}/.env && cd {{worktree}} && npm install
# Choose parent directory (default or custom)

/wt create auth
# Creates worktree at ../my-app.worktrees/auth on branch feature/auth
# Runs sync command automatically
```

## Settings

- `parentDir` — where worktrees are created (default: `../<project>.worktrees/`)
- `sync` — shell command to run after create and on `/wt sync`

## Source Files

- `index.ts` — command routing, git helpers, sync runner
- `config.ts` — settings load/save
- `settings.json` — per-project configuration
