/** Worktree Extension — /wt command for git worktree management */

import type { ExtensionCommandContext, ExtensionFactory } from '@mariozechner/pi-coding-agent';
import { execFileSync, spawn } from 'child_process';
import { appendFileSync, existsSync, readFileSync, statSync } from 'fs';
import { homedir } from 'os';
import { basename, dirname, join, relative, resolve } from 'path';
import {
  loadConfig,
  saveConfig,
  getProjectSettings,
  SETTINGS_FILE_PATH,
  type Config,
} from './config.ts';

// ============================================================================
// Types
// ============================================================================

interface WorktreeInfo {
  path: string;
  branch: string;
  head: string;
  isMain: boolean;
  isCurrent: boolean;
}

interface TemplateContext {
  path: string;
  name: string;
  branch: string;
  project: string;
  mainWorktree: string;
}

// ============================================================================
// Help Text
// ============================================================================

const HELP_TEXT = [
  '/wt - Git worktree management',
  '',
  'Commands:',
  '  init                   Configure sync command & parentDir for current project',
  '  settings [key] [val]   View or set project settings (parentDir, sync)',
  '  create <feature-name>  Create worktree + feature/<name> branch, runs sync after',
  '  sync                   Run sync command in current worktree (not in main repo)',
  '  list                   List all worktrees with path, branch, main/current markers',
  '  remove <name>          Remove worktree directory (branch kept, confirms first)',
  '  status                 Show current project / branch / worktree info',
  '  cd <name>              Print worktree path (no args = main repo path)',
  '  prune                  Clean up stale worktree metadata left by manual deletes',
  '',
  'Template vars (usable in sync command and parentDir):',
  '  {{main}}     Main repo absolute path     /Users/you/Developer/my-app',
  '  {{worktree}} Worktree absolute path      /Users/you/Developer/my-app.worktrees/auth',
  '  {{project}}  Repo directory name         my-app',
  '  {{name}}     Feature name                auth',
  '  {{branch}}   Full branch name            feature/auth',
].join('\n');

// ============================================================================
// Validation
// ============================================================================

const VALID_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

function isValidFeatureName(name: string): boolean {
  return VALID_NAME.test(name) && !name.includes('..');
}

/** Early return helper — notifies and returns true if not in a git repo */
function requireGitRepo(ctx: ExtensionCommandContext): boolean {
  if (!isGitRepo(ctx.cwd)) {
    ctx.ui.notify('Not in a git repository', 'error');
    return false;
  }
  return true;
}

// ============================================================================
// Git Utilities
// ============================================================================

function git(args: string[], cwd?: string): string {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    throw new Error(`git ${args[0]} failed: ${(error as Error).message}`);
  }
}

function isGitRepo(cwd: string): boolean {
  try {
    git(['rev-parse', '--git-dir'], cwd);
    return true;
  } catch {
    return false;
  }
}

function getMainWorktreePath(cwd: string): string {
  return dirname(git(['rev-parse', '--path-format=absolute', '--git-common-dir'], cwd));
}

function getCurrentBranch(cwd: string): string {
  try {
    return git(['branch', '--show-current'], cwd) || 'HEAD (detached)';
  } catch {
    return 'unknown';
  }
}

function isWorktreeDir(cwd: string): boolean {
  const gitPath = join(cwd, '.git');
  return existsSync(gitPath) && statSync(gitPath).isFile();
}

function listWorktrees(cwd: string): WorktreeInfo[] {
  const output = git(['worktree', 'list', '--porcelain'], cwd);
  const worktrees: WorktreeInfo[] = [];
  const currentPath = resolve(cwd);
  const mainPath = getMainWorktreePath(cwd);
  let current: Partial<WorktreeInfo> = {};

  for (const line of output.split('\n')) {
    if (line.startsWith('worktree ')) {
      current.path = line.slice(9);
    } else if (line.startsWith('HEAD ')) {
      current.head = line.slice(5);
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice(7).replace('refs/heads/', '');
    } else if (line === 'detached') {
      current.branch = 'HEAD (detached)';
    } else if (line === '') {
      if (current.path) {
        worktrees.push({
          path: current.path,
          branch: current.branch || 'unknown',
          head: current.head || 'unknown',
          isMain: current.path === mainPath,
          isCurrent: current.path === currentPath,
        });
      }
      current = {};
    }
  }

  if (current.path) {
    worktrees.push({
      path: current.path,
      branch: current.branch || 'unknown',
      head: current.head || 'unknown',
      isMain: current.path === mainPath,
      isCurrent: current.path === currentPath,
    });
  }

  return worktrees;
}

// ============================================================================
// Template & Path Helpers
// ============================================================================

function expandTemplate(template: string, ctx: TemplateContext): string {
  return template
    .replace(/\{\{worktree\}\}/g, ctx.path)
    .replace(/\{\{name\}\}/g, ctx.name)
    .replace(/\{\{branch\}\}/g, ctx.branch)
    .replace(/\{\{project\}\}/g, ctx.project)
    .replace(/\{\{main\}\}/g, ctx.mainWorktree)
    .replace(/^~/, homedir());
}

function getWorktreeParentDir(mainWorktree: string, parentDirSetting?: string): string {
  const project = basename(mainWorktree);

  if (parentDirSetting) {
    return expandTemplate(parentDirSetting, {
      path: '', name: '', branch: '', project, mainWorktree,
    });
  }

  return join(dirname(mainWorktree), `${project}.worktrees`);
}

// ============================================================================
// Exclude Management
// ============================================================================

function ensureExcluded(mainWorktree: string, worktreeParentDir: string): void {
  const relPath = relative(mainWorktree, worktreeParentDir);
  if (relPath.startsWith('..') || relPath.startsWith('/')) return;

  const excludePath = join(mainWorktree, '.git', 'info', 'exclude');
  const excludePattern = `/${relPath}/`;

  try {
    let content = '';
    if (existsSync(excludePath)) {
      content = readFileSync(excludePath, 'utf-8');
    }
    if (content.includes(excludePattern)) return;

    appendFileSync(
      excludePath,
      `\n# Worktree directory (added by wt extension)\n${excludePattern}\n`
    );
  } catch {
    // Not critical
  }
}

// ============================================================================
// Sync Runner
// ============================================================================

async function runSync(
  syncCmd: string,
  ctx: TemplateContext,
  notify: (msg: string, type: 'info' | 'error' | 'warning') => void
): Promise<void> {
  const command = expandTemplate(syncCmd, ctx);
  notify(`Running: ${command}`, 'info');

  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd: ctx.path,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      if (code === 0) {
        if (stdout.trim()) notify(stdout.trim().slice(0, 200), 'info');
        notify('✓ Sync complete', 'info');
      } else {
        notify(`Sync failed (exit ${code}): ${stderr.slice(0, 200)}`, 'error');
      }
      resolve();
    });

    child.on('error', (err) => {
      notify(`Sync error: ${err.message}`, 'error');
      resolve();
    });
  });
}

// ============================================================================
// Command Handlers
// ============================================================================

async function handleInit(_args: string, ctx: ExtensionCommandContext): Promise<void> {
  if (!ctx.hasUI) {
    ctx.ui.notify('init requires interactive mode', 'error');
    return;
  }
  if (!requireGitRepo(ctx)) return;

  const config = loadConfig();
  const mainPath = getMainWorktreePath(ctx.cwd);
  const project = basename(mainPath);
  const existing = config.projects[project] || {};

  ctx.ui.notify(`Worktree Setup for: ${project}\n━━━━━━━━━━━━━━━━━━━━━━━━`, 'info');

  if (existing.sync || existing.parentDir) {
    const lines = [
      'Current settings:',
      existing.parentDir ? `  parentDir: ${existing.parentDir}` : null,
      existing.sync ? `  sync: ${existing.sync}` : null,
    ].filter(Boolean).join('\n');
    ctx.ui.notify(lines, 'info');
  }

  // Step 1: sync command
  const sync = await ctx.ui.input(
    'Sync command (runs after create & on /wt sync, empty = none):\n{{main}}=main repo  {{worktree}}=worktree  {{project}}=repo name  {{name}}=feature  {{branch}}=branch',
    existing.sync || ''
  );
  if (sync === undefined) { ctx.ui.notify('Cancelled', 'info'); return; }

  // Step 2: parentDir
  const DIR_DEFAULT = 'Default (../{{project}}.worktrees/)';
  const DIR_CUSTOM = 'Custom path...';
  const DIR_KEEP = 'Keep current';

  const dirOptions = [
    DIR_DEFAULT,
    DIR_CUSTOM,
    existing.parentDir ? DIR_KEEP : null,
  ].filter(Boolean) as string[];

  const dirChoice = await ctx.ui.select('Where should worktrees be created?', dirOptions);
  if (dirChoice === undefined) { ctx.ui.notify('Cancelled', 'info'); return; }

  let parentDir: string | undefined;
  if (dirChoice === DIR_DEFAULT) {
    parentDir = undefined;
  } else if (dirChoice === DIR_CUSTOM) {
    const custom = await ctx.ui.input(
      'Enter custom path (supports {{project}}, {{name}}):',
      existing.parentDir || ''
    );
    if (custom === undefined) { ctx.ui.notify('Cancelled', 'info'); return; }
    parentDir = custom || undefined;
  } else {
    parentDir = existing.parentDir;
  }

  // Preview & confirm
  const preview = [
    `Project: ${project}`,
    '',
    sync?.trim() ? `  sync: "${sync.trim()}"` : '  sync: (none)',
    parentDir ? `  parentDir: "${parentDir}"` : '  parentDir: (default)',
    '',
    `File: ${SETTINGS_FILE_PATH}`,
  ].join('\n');

  if (!await ctx.ui.confirm('Save settings?', preview)) {
    ctx.ui.notify('Cancelled', 'info');
    return;
  }

  // Save
  const newProject = { ...existing };
  if (sync?.trim()) { newProject.sync = sync.trim(); } else { delete newProject.sync; }
  if (parentDir) { newProject.parentDir = parentDir; } else { delete newProject.parentDir; }

  config.projects[project] = newProject;
  if (Object.keys(newProject).length === 0) delete config.projects[project];

  try {
    saveConfig(config);
    ctx.ui.notify(`✓ Settings saved for "${project}"`, 'info');
  } catch (err) {
    ctx.ui.notify(`Failed to save: ${(err as Error).message}`, 'error');
  }
}

const VALID_SETTING_KEYS = ['parentDir', 'sync'] as const;
type SettingKey = (typeof VALID_SETTING_KEYS)[number];

async function handleSettings(args: string, ctx: ExtensionCommandContext): Promise<void> {
  if (!requireGitRepo(ctx)) return;

  const config = loadConfig();
  const project = basename(getMainWorktreePath(ctx.cwd));
  const resolved = getProjectSettings(config, project);

  const parts = args.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  const key = parts[0]?.trim() as SettingKey | undefined;
  const value = parts.slice(1).join(' ').replace(/^"(.*)"$/, '$1');

  // No args: show all
  if (!key) {
    ctx.ui.notify([
      `Worktree Settings (project: ${project}):`,
      '━━━━━━━━━━━━━━━━━━',
      '',
      `parentDir: ${resolved.parentDir || '(default: ../<project>.worktrees/)'}`,
      `sync:      ${resolved.sync || '(not set)'}`,
      '',
      `File: ${SETTINGS_FILE_PATH}`,
    ].join('\n'), 'info');
    return;
  }

  if (!VALID_SETTING_KEYS.includes(key as SettingKey)) {
    ctx.ui.notify(`Invalid key: "${key}"\nValid: ${VALID_SETTING_KEYS.join(', ')}`, 'error');
    return;
  }

  // Get
  if (!value && parts.length === 1) {
    const v = resolved[key];
    const defaults: Record<SettingKey, string> = {
      parentDir: '(default: ../<project>.worktrees/)',
      sync: '(not set)',
    };
    ctx.ui.notify(`${key}: ${v || defaults[key]}`, 'info');
    return;
  }

  // Set (project-level)
  const projectSettings = config.projects[project] || {};

  if (value === '' || value === '""' || value === 'null' || value === 'clear') {
    delete projectSettings[key];
    ctx.ui.notify(`✓ Cleared ${key} for "${project}"`, 'info');
  } else {
    projectSettings[key] = value;
    ctx.ui.notify(`✓ Set ${key} = "${value}" for "${project}"`, 'info');
  }

  config.projects[project] = projectSettings;
  if (Object.keys(projectSettings).length === 0) delete config.projects[project];

  try {
    saveConfig(config);
  } catch (err) {
    ctx.ui.notify(`Failed to save: ${(err as Error).message}`, 'error');
  }
}

async function handleSync(_args: string, ctx: ExtensionCommandContext): Promise<void> {
  if (!requireGitRepo(ctx)) return;

  if (!isWorktreeDir(ctx.cwd)) {
    ctx.ui.notify('Not in a worktree. /wt sync only runs inside a worktree.', 'error');
    return;
  }

  const mainPath = getMainWorktreePath(ctx.cwd);
  const project = basename(mainPath);
  const config = loadConfig();
  const resolved = getProjectSettings(config, project);

  if (!resolved.sync) {
    ctx.ui.notify(
      `No sync configured for "${project}".\nRun /wt init to set one up.`,
      'warning'
    );
    return;
  }

  const branch = getCurrentBranch(ctx.cwd);
  const templateCtx: TemplateContext = {
    path: ctx.cwd,
    name: basename(ctx.cwd),
    branch,
    project,
    mainWorktree: mainPath,
  };

  await runSync(resolved.sync, templateCtx, ctx.ui.notify.bind(ctx.ui));
}

async function handleCreate(args: string, ctx: ExtensionCommandContext): Promise<void> {
  const featureName = args.trim();
  if (!featureName) {
    ctx.ui.notify('Usage: /wt create <feature-name>', 'error');
    return;
  }
  if (!isValidFeatureName(featureName)) {
    ctx.ui.notify(
      `Invalid name: "${featureName}"\nAllowed: letters, digits, dash, dot, underscore.`,
      'error'
    );
    return;
  }
  if (!requireGitRepo(ctx)) return;

  const config = loadConfig();
  const mainWorktree = getMainWorktreePath(ctx.cwd);
  const project = basename(mainWorktree);
  const resolved = getProjectSettings(config, project);
  const parentDir = getWorktreeParentDir(mainWorktree, resolved.parentDir);
  const worktreePath = join(parentDir, featureName);
  const branchName = `feature/${featureName}`;

  // Check conflicts
  const existing = listWorktrees(ctx.cwd);
  if (existing.some((w) => w.path === worktreePath)) {
    ctx.ui.notify(`Worktree already exists at: ${worktreePath}`, 'error');
    return;
  }

  try {
    git(['rev-parse', '--verify', branchName], ctx.cwd);
    ctx.ui.notify(`Branch '${branchName}' already exists. Use a different name.`, 'error');
    return;
  } catch {
    // Branch doesn't exist — good
  }

  ensureExcluded(mainWorktree, parentDir);
  ctx.ui.notify(`Creating worktree: ${featureName}`, 'info');

  try {
    git(['worktree', 'add', '-b', branchName, worktreePath], mainWorktree);
  } catch (err) {
    ctx.ui.notify(`Failed to create worktree: ${(err as Error).message}`, 'error');
    return;
  }

  ctx.ui.notify(`✓ Worktree created!\n  Path: ${worktreePath}\n  Branch: ${branchName}`, 'info');

  // Run sync if configured
  if (resolved.sync) {
    const templateCtx: TemplateContext = {
      path: worktreePath,
      name: featureName,
      branch: branchName,
      project,
      mainWorktree,
    };
    await runSync(resolved.sync, templateCtx, ctx.ui.notify.bind(ctx.ui));
  }
}

async function handleList(_args: string, ctx: ExtensionCommandContext): Promise<void> {
  if (!requireGitRepo(ctx)) return;

  const worktrees = listWorktrees(ctx.cwd);
  if (worktrees.length === 0) {
    ctx.ui.notify('No worktrees found', 'info');
    return;
  }

  const lines = worktrees.map((w) => {
    const markers = [w.isMain ? '[main]' : '', w.isCurrent ? '[current]' : '']
      .filter(Boolean)
      .join(' ');
    return `${w.branch}${markers ? ' ' + markers : ''}\n    ${w.path}`;
  });

  ctx.ui.notify(`Worktrees:\n\n${lines.join('\n\n')}`, 'info');
}

async function handleRemove(args: string, ctx: ExtensionCommandContext): Promise<void> {
  const worktreeName = args.trim();
  if (!worktreeName) {
    ctx.ui.notify('Usage: /wt remove <name>', 'error');
    return;
  }
  if (!requireGitRepo(ctx)) return;

  const config = loadConfig();
  const mainPath = getMainWorktreePath(ctx.cwd);
  const project = basename(mainPath);
  const resolved = getProjectSettings(config, project);
  const parentDir = getWorktreeParentDir(mainPath, resolved.parentDir);
  const worktrees = listWorktrees(ctx.cwd);

  const target = worktrees.find(
    (w) =>
      basename(w.path) === worktreeName ||
      w.path === worktreeName ||
      w.path === join(parentDir, worktreeName)
  );

  if (!target) { ctx.ui.notify(`Worktree not found: ${worktreeName}`, 'error'); return; }
  if (target.isMain) { ctx.ui.notify('Cannot remove the main worktree', 'error'); return; }
  if (target.isCurrent) {
    ctx.ui.notify('Cannot remove the current worktree. Switch to another first.', 'error');
    return;
  }

  const confirmed = await ctx.ui.confirm(
    'Remove worktree?',
    `Path: ${target.path}\nBranch: ${target.branch}\n\nThe branch will NOT be deleted.`
  );
  if (!confirmed) { ctx.ui.notify('Cancelled', 'info'); return; }

  try {
    git(['worktree', 'remove', target.path], ctx.cwd);
    ctx.ui.notify(`✓ Worktree removed: ${target.path}`, 'info');
  } catch {
    const force = await ctx.ui.confirm(
      'Force remove?',
      'Worktree has uncommitted changes. Force remove anyway?'
    );
    if (!force) { ctx.ui.notify('Cancelled', 'info'); return; }

    try {
      git(['worktree', 'remove', '--force', target.path], ctx.cwd);
      ctx.ui.notify(`✓ Worktree force removed: ${target.path}`, 'info');
    } catch (err) {
      ctx.ui.notify(`Failed to remove: ${(err as Error).message}`, 'error');
    }
  }
}

async function handleStatus(_args: string, ctx: ExtensionCommandContext): Promise<void> {
  if (!requireGitRepo(ctx)) return;

  const mainPath = getMainWorktreePath(ctx.cwd);
  const project = basename(mainPath);
  const branch = getCurrentBranch(ctx.cwd);
  const worktrees = listWorktrees(ctx.cwd);
  const isWt = isWorktreeDir(ctx.cwd);

  const config = loadConfig();
  const resolved = getProjectSettings(config, project);

  ctx.ui.notify([
    `Project: ${project}`,
    `Current path: ${ctx.cwd}`,
    `Branch: ${branch}`,
    `Is worktree: ${isWt ? 'Yes' : 'No (main repository)'}`,
    `Main worktree: ${mainPath}`,
    `Total worktrees: ${worktrees.length}`,
    `Sync: ${resolved.sync || '(not set)'}`,
  ].join('\n'), 'info');
}

async function handleCd(args: string, ctx: ExtensionCommandContext): Promise<void> {
  const worktreeName = args.trim();
  if (!requireGitRepo(ctx)) return;

  const worktrees = listWorktrees(ctx.cwd);

  if (!worktreeName) {
    const main = worktrees.find((w) => w.isMain);
    if (main) ctx.ui.notify(`Main worktree: ${main.path}`, 'info');
    return;
  }

  const config = loadConfig();
  const mainPath = getMainWorktreePath(ctx.cwd);
  const resolved = getProjectSettings(config, basename(mainPath));
  const parentDir = getWorktreeParentDir(mainPath, resolved.parentDir);

  const target = worktrees.find(
    (w) =>
      basename(w.path) === worktreeName ||
      w.path === worktreeName ||
      w.path === join(parentDir, worktreeName)
  );

  if (!target) {
    ctx.ui.notify(`Worktree not found: ${worktreeName}`, 'error');
    return;
  }
  ctx.ui.notify(`Worktree path: ${target.path}`, 'info');
}

async function handlePrune(_args: string, ctx: ExtensionCommandContext): Promise<void> {
  if (!requireGitRepo(ctx)) return;

  let dryRun: string;
  try {
    dryRun = git(['worktree', 'prune', '--dry-run'], ctx.cwd);
  } catch (err) {
    ctx.ui.notify(`Failed to check: ${(err as Error).message}`, 'error');
    return;
  }

  if (!dryRun.trim()) {
    ctx.ui.notify('No stale worktree references to prune', 'info');
    return;
  }

  if (!await ctx.ui.confirm('Prune stale worktrees?', `Will remove:\n\n${dryRun}`)) {
    ctx.ui.notify('Cancelled', 'info');
    return;
  }

  try {
    git(['worktree', 'prune'], ctx.cwd);
    ctx.ui.notify('✓ Stale worktree references pruned', 'info');
  } catch (err) {
    ctx.ui.notify(`Failed to prune: ${(err as Error).message}`, 'error');
  }
}

// ============================================================================
// Command Router & Extension Export
// ============================================================================

const commands: Record<string, (args: string, ctx: ExtensionCommandContext) => Promise<void>> = {
  init: handleInit,
  settings: handleSettings,
  config: handleSettings,
  create: handleCreate,
  sync: handleSync,
  list: handleList,
  ls: handleList,
  remove: handleRemove,
  rm: handleRemove,
  status: handleStatus,
  cd: handleCd,
  prune: handlePrune,
};

const PiWorktreeExtension: ExtensionFactory = function (pi) {
  pi.registerCommand('wt', {
    description: 'Git worktree management for isolated workspaces',
    handler: async (args, ctx) => {
      const [cmd, ...rest] = args.trim().split(/\s+/);
      const handler = commands[cmd];
      if (handler) {
        await handler(rest.join(' '), ctx);
      } else {
        ctx.ui.notify(HELP_TEXT, 'info');
      }
    },
  });
};

export default PiWorktreeExtension;
