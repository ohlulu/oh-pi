#!/usr/bin/env tsx

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative, resolve } from 'node:path';

const EXCLUDED_DIRS = new Set(['archive', 'research']);

function compactStrings(values: unknown[]): string[] {
  const result: string[] = [];
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized.length > 0) result.push(normalized);
  }
  return result;
}

function walkMarkdownFiles(dir: string, base: string = dir): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      files.push(...walkMarkdownFiles(fullPath, base));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relative(base, fullPath));
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function extractMetadata(fullPath: string): {
  summary: string | null;
  readWhen: string[];
  error?: string;
} {
  const content = readFileSync(fullPath, 'utf8');

  if (!content.startsWith('---')) {
    return { summary: null, readWhen: [], error: 'missing front matter' };
  }

  const endIndex = content.indexOf('\n---', 3);
  if (endIndex === -1) {
    return { summary: null, readWhen: [], error: 'unterminated front matter' };
  }

  const frontMatter = content.slice(3, endIndex).trim();
  const lines = frontMatter.split('\n');

  let summaryLine: string | null = null;
  const readWhen: string[] = [];
  let collectingField: 'read_when' | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith('summary:')) {
      summaryLine = line;
      collectingField = null;
      continue;
    }

    if (line.startsWith('read_when:')) {
      collectingField = 'read_when';
      const inline = line.slice('read_when:'.length).trim();
      if (inline.startsWith('[') && inline.endsWith(']')) {
        try {
          const parsed = JSON.parse(inline.replace(/'/g, '"')) as unknown;
          if (Array.isArray(parsed)) {
            readWhen.push(...compactStrings(parsed));
          }
        } catch {
          // ignore malformed inline arrays
        }
      }
      continue;
    }

    if (collectingField === 'read_when') {
      if (line.startsWith('- ')) {
        const hint = line.slice(2).trim();
        if (hint) readWhen.push(hint);
      } else if (line === '') {
        // skip blank lines within list
      } else {
        collectingField = null;
      }
    }
  }

  if (!summaryLine) {
    return { summary: null, readWhen, error: 'summary key missing' };
  }

  const summaryValue = summaryLine.slice('summary:'.length).trim();
  const normalized = summaryValue
    .replace(/^['"]|['"]$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return { summary: null, readWhen, error: 'summary is empty' };
  }

  return { summary: normalized, readWhen };
}

// Collect problems across all directories
const allProblems: string[] = [];

function listDocsIn(docsDir: string, label?: string): void {
  if (!existsSync(docsDir)) return;

  const header = label ? `[${label}] ${docsDir}` : docsDir;
  console.log(`\n${header}`);

  const markdownFiles = walkMarkdownFiles(docsDir);

  if (markdownFiles.length === 0) {
    console.log('  (no markdown files)');
    return;
  }

  for (const relativePath of markdownFiles) {
    const fullPath = join(docsDir, relativePath);
    const { summary, readWhen, error } = extractMetadata(fullPath);
    if (summary) {
      console.log(`  ${relativePath} - ${summary}`);
      if (readWhen.length > 0) {
        console.log(`    Read when: ${readWhen.join('; ')}`);
      }
    } else {
      const prefix = label ? `${label}/` : '';
      allProblems.push(`${prefix}${relativePath} → ${error}`);
    }
  }
}

// --- Main ---

const projectRoot = process.argv[2] || process.cwd();
const docsPaths: string[] = [];

// 1. Check .pi/docs-paths for explicit paths (relative to project root)
const docsPathsFile = join(projectRoot, '.pi', 'docs-paths');
if (existsSync(docsPathsFile)) {
  const lines = readFileSync(docsPathsFile, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
  for (const line of lines) {
    docsPaths.push(resolve(projectRoot, line));
  }
}

// 2. Fallback: default docs/ under project root
if (docsPaths.length === 0) {
  docsPaths.push(join(projectRoot, 'docs'));
}

// 3. Filter to existing dirs
const validPaths = docsPaths.filter((p) => existsSync(p));

// 4. Agent-level docs (~/.pi/agent/docs/)
const agentDocsDir = join(homedir(), '.pi', 'agent', 'docs');
const hasAgentDocs = existsSync(agentDocsDir);

if (validPaths.length === 0 && !hasAgentDocs) {
  console.error('No docs directories found.');
  process.exit(1);
}

if (validPaths.length > 0) {
  console.log('Listing project docs:');
  for (const docsDir of validPaths) {
    const label = validPaths.length > 1 ? relative(projectRoot, docsDir) || 'docs' : undefined;
    listDocsIn(docsDir, label);
  }
}

if (hasAgentDocs && !validPaths.includes(agentDocsDir)) {
  console.log('\nListing agent docs:');
  listDocsIn(agentDocsDir, 'agent');
}

if (allProblems.length > 0) {
  console.log(`\n⚠️  ${allProblems.length} doc(s) need front matter:`);
  for (const problem of allProblems) {
    console.log(`  • ${problem}`);
  }
}

console.log(
  '\nReminder: keep docs up to date as behavior changes. When your task matches any "Read when" hint above, read that doc before coding.'
);
