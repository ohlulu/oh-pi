import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';

// ============================================================================
// Types
// ============================================================================

export interface WorktreeDefaults {
  parentDir?: string;
}

export interface ProjectSettings {
  parentDir?: string;
  sync?: string;
}

export interface Config {
  worktree: WorktreeDefaults;
  projects: Record<string, ProjectSettings>;
}

// ============================================================================
// Paths
// ============================================================================

export const SETTINGS_FILE_PATH = join(
  homedir(),
  '.pi',
  'agent',
  'extensions',
  'worktree',
  'settings.json'
);

// ============================================================================
// Read / Write
// ============================================================================

export function loadConfig(): Config {
  try {
    if (existsSync(SETTINGS_FILE_PATH)) {
      const raw = JSON.parse(readFileSync(SETTINGS_FILE_PATH, 'utf-8'));
      const w = raw?.worktree;
      const projects: Record<string, ProjectSettings> = {};

      if (raw?.projects && typeof raw.projects === 'object') {
        for (const [name, val] of Object.entries(raw.projects)) {
          const p = val as Record<string, unknown>;
          const entry: ProjectSettings = {};
          if (typeof p?.parentDir === 'string') entry.parentDir = p.parentDir;
          if (typeof p?.sync === 'string') entry.sync = p.sync;
          if (Object.keys(entry).length > 0) projects[name] = entry;
        }
      }

      return {
        worktree: {
          parentDir: typeof w?.parentDir === 'string' ? w.parentDir : undefined,
        },
        projects,
      };
    }
  } catch {
    // Corrupt file — fall back to defaults
  }
  return { worktree: {}, projects: {} };
}

export function saveConfig(config: Config): void {
  const dir = dirname(SETTINGS_FILE_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Clean empty objects before saving
  const out: Record<string, unknown> = {};

  if (config.worktree.parentDir) {
    out.worktree = { parentDir: config.worktree.parentDir };
  }

  const projects: Record<string, ProjectSettings> = {};
  for (const [name, settings] of Object.entries(config.projects)) {
    const entry: ProjectSettings = {};
    if (settings.parentDir) entry.parentDir = settings.parentDir;
    if (settings.sync) entry.sync = settings.sync;
    if (Object.keys(entry).length > 0) projects[name] = entry;
  }
  if (Object.keys(projects).length > 0) {
    out.projects = projects;
  }

  writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(out, null, 2) + '\n', 'utf-8');
}

// ============================================================================
// Helpers
// ============================================================================

/** Get resolved settings for a specific project (project-level overrides global) */
export function getProjectSettings(config: Config, projectName: string): {
  parentDir?: string;
  sync?: string;
} {
  const project = config.projects[projectName];
  return {
    parentDir: project?.parentDir ?? config.worktree.parentDir,
    sync: project?.sync,
  };
}
